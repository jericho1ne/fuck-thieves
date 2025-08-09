<template>
  <div class="map-view">
    <div v-if="locationStore?.loading" class="loading">Loading recent locations...</div>
    <div v-else-if="locationStore?.error" class="error">{{ locationStore.error }}</div>
    <div ref="mapContainer" class="map-view__container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'
import { useLocationStore } from '~/stores/location-store'

const config = useRuntimeConfig()
const MAPBOX_TOKEN = config.public.mapboxToken

const mapContainer = ref(null)
const map = ref(null)
const markers = ref([])
const locationStore = ref(null)

// Clear accuracy circles from the map
function clearAccuracyCircles() {
  if (!map.value) return
  
  // Remove layers if they exist
  if (map.value.getLayer('accuracy-circles-fill')) {
    map.value.removeLayer('accuracy-circles-fill')
  }
  if (map.value.getLayer('accuracy-circles-border')) {
    map.value.removeLayer('accuracy-circles-border')
  }
  
  // Remove source if it exists
  if (map.value.getSource('accuracy-circles')) {
    map.value.removeSource('accuracy-circles')
  }
}

// Select a location and highlight its marker
function selectLocation(index) {
  if (!locationStore.value) return
  
  locationStore.value.selectLocation(index)
  
  if (markers.value[index] && map.value) {
    const location = locationStore.value.locations[index]
    
    // Close all existing popups first
    markers.value.forEach(marker => {
      if (marker.getPopup().isOpen()) {
        marker.getPopup().remove()
      }
    })
    
    // Pan to the selected marker
    map.value.flyTo({
      center: [location.lon, location.lat],
      zoom: 16,
      duration: 1000
    })
    
    // Open the popup for the selected marker
    markers.value[index].getPopup().addTo(map.value)
  }
}

// Watch for changes in locations and update markers
watch(() => locationStore.value?.locations, () => {
  if (map.value && map.value.loaded() && locationStore.value) {
    createMarkers()
  }
}, { deep: true })

// Watch for changes in selected location and update map view
watch(() => locationStore.value?.selectedLocationIndex, (newIndex) => {
  if (newIndex !== null && markers.value[newIndex] && map.value) {
    selectLocation(newIndex)
  }
})

// Helper function to calculate marker positions with anti-overlap offsets
function calculateMarkerPositions(locations) {
  const OVERLAP_THRESHOLD = 10 // meters - consider markers overlapping if closer than this
  const OFFSET_DISTANCE = 0.00008 // degrees - roughly 8-10 meters offset
  
  return locations.map((location, index) => {
    if (!location.lat || !location.lon) return { ...location, displayLat: location.lat, displayLon: location.lon }
    
    let displayLat = location.lat
    let displayLon = location.lon
    
    // Check for overlaps with previous markers
    for (let i = 0; i < index; i++) {
      const otherLocation = locations[i]
      if (!otherLocation.lat || !otherLocation.lon) continue
      
      const distance = calculateDistance(location.lat, location.lon, otherLocation.lat, otherLocation.lon)
      
      if (distance < OVERLAP_THRESHOLD) {
        // Calculate offset angle - spread overlapping markers in a circle
        const overlapCount = locations.slice(0, index).filter(loc => 
          loc.lat && loc.lon && calculateDistance(location.lat, location.lon, loc.lat, loc.lon) < OVERLAP_THRESHOLD
        ).length
        
        const angle = (overlapCount * 60) * (Math.PI / 180) // 60 degrees apart
        displayLat = location.lat + (OFFSET_DISTANCE * Math.sin(angle))
        displayLon = location.lon + (OFFSET_DISTANCE * Math.cos(angle))
        break
      }
    }
    
    return {
      ...location,
      displayLat,
      displayLon
    }
  })
}

// Create markers for locations
function createMarkers() {
  if (!map.value || !locationStore.value || !locationStore.value.locations.length) return

  // Clear existing markers
  markers.value.forEach(marker => marker.remove())
  markers.value = []

  // Clear existing accuracy circles
  clearAccuracyCircles()

  // Create GeoJSON polygons for accuracy circles using turf
  const circleFeatures = locationStore.value.locations.map((location, index) => {
    if (!location.lat || !location.lon || !location.accuracy) return null;
    // Use turf to create a circle polygon in meters
    const circle = turf.circle([location.lon, location.lat], location.accuracy, {
      steps: 64,
      units: 'meters',
      properties: {
        id: `accuracy-${index}`,
        accuracy: location.accuracy,
        lat: location.lat
      }
    });
    return circle;
  }).filter(Boolean)

  // Add accuracy circles source and layers
  if (circleFeatures.length > 0) {
    map.value.addSource('accuracy-circles', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: circleFeatures
      }
    })

    // Add fill polygons (dark gray with 20% opacity)
    map.value.addLayer({
      id: 'accuracy-circles-fill',
      type: 'fill',
      source: 'accuracy-circles',
      paint: {
        'fill-color': '#4a4a4a',
        'fill-opacity': 0.2
      }
    })

    // Add border polygons (white outline)
    map.value.addLayer({
      id: 'accuracy-circles-border',
      type: 'line',
      source: 'accuracy-circles',
      paint: {
        'line-color': '#ffffff',
        'line-width': 2,
        'line-opacity': 0.8
      }
    })
  }
  
  // Create new markers
  locationStore.value.locations.forEach((location, index) => {
    if (!location.lat || !location.lon) return
    
    // Create popup content
    const popupHTML = `
      <div class="bike-popup">
        <h3>🚲 Bike Location ${index + 1}</h3>
        <div class="bike-popup__content">
          <p><strong>Latitude:</strong> ${location.lat}</p>
          <p><strong>Longitude:</strong> ${location.lon}</p>
          <p><strong>Accuracy:</strong> ${location.accuracy}</p>
          <p><small>Bike Time: ${location.datetime?.bike?.date} ${location.datetime?.bike?.time}</small></p>
        </div>
      </div>
    `
    
    const popup = new mapboxgl.Popup({ 
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      closeOnMove: false,
      focusAfterOpen: false // Prevents automatic focus that causes the aria-hidden warning
    }).setHTML(popupHTML)
    
    // Add event listeners to handle focus issues
    popup.on('open', () => {
      // Remove aria-hidden to prevent the warning
      const popupElement = popup.getElement()
      if (popupElement) {
        popupElement.removeAttribute('aria-hidden')
        
        // Find and handle the close button
        const closeButton = popupElement.querySelector('.mapboxgl-popup-close-button')
        if (closeButton) {
          // Ensure close button can be focused but doesn't interfere with aria-hidden
          closeButton.setAttribute('tabindex', '0')
        }
      }
    })
    
    popup.on('close', () => {
      // Blur any focused elements when popup closes
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur()
      }
    })
    
    const marker = new mapboxgl.Marker({
      color: '#FF5E5B'
    })
      .setLngLat([location.lon, location.lat])
      .setPopup(popup)
      .addTo(map.value)
    
    // Add click handler to marker
    marker.getElement().addEventListener('click', () => {
      locationStore.value.handleMarkerClick(index)
    })
    
    markers.value.push(marker)
  })
  
  // Fit map to show all markers if we have any
  if (markers.value.length > 0) {
    const bounds = new mapboxgl.LngLatBounds()
    locationStore.value.locations.forEach(location => {
      if (location.lat && location.lon) {
        bounds.extend([location.lon, location.lat])
      }
    })
    
    if (!bounds.isEmpty()) {
      map.value.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15.75
      })
    }
  }
}

// Initialize map when component mounts
onMounted(async () => {
  try {
    // Initialize the store
    locationStore.value = useLocationStore()
    
    console.log('Initializing map...')
    console.log('Runtime config:', config)
    console.log('Mapbox token:', MAPBOX_TOKEN ? 'Present' : 'Missing')
    console.log('Mapbox token length:', MAPBOX_TOKEN?.length)
    console.log('Current domain:', window.location.hostname)
    console.log('Current URL:', window.location.href)
    
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN.trim() === '') {
      console.error('No mapbox token found')
      throw new Error('Mapbox token is missing')
    }
    
    // Set mapbox access token
    mapboxgl.accessToken = MAPBOX_TOKEN
    console.log('Set mapboxgl.accessToken')
    
    // Wait for the DOM to be ready
    await nextTick()
    
    if (!mapContainer.value) {
      console.error('Map container element not found')
      return
    }
    
    
    // Initialize the map with a simpler configuration
    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/streets-v12', // Use a simpler style
      center: [-118.41, 33.99373],
      zoom: 15.5
    })
    
    console.log('Map instance created')
    
    // Log when map loads successfully
    map.value.on('load', () => {
      console.log('Map loaded successfully!')
      createMarkers()
    })
    
    // Log any map errors with more detail
    map.value.on('error', (e) => {
      console.error('Mapbox error details:', {
        error: e.error,
        target: e.target,
        type: e.type,
        originalEvent: e.originalEvent
      })
    })
    
  } catch (err) {
    console.error('Error initializing map:', err)
    console.error('Error stack:', err.stack)
  }
})

// Clean up map when component unmounts
onUnmounted(() => {
  // Remove markers
  markers.value.forEach(marker => marker.remove())
  
  // Clear accuracy circles
  clearAccuracyCircles()
  
  if (map.value) {
    map.value.remove()
  }
})
</script>

<!-- UNSCOPED CSS -->
<style lang="scss">
.mapboxgl-marker {
  cursor: pointer;
}
  
.mapboxgl-popup-content {
  display: block;
  min-width: 180px;
  padding: 10px;
  z-index: 3;
  
  .mapboxgl-popup-close-button {
    font-size: 16px;
    width: 20px;
    height: 20px;
    line-height: 16px;
    top: 2px;
    right: 2px;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    
    &:focus {
      outline: 2px solid #FF5E5B;
      outline-offset: 1px;
    }
    
    &:hover {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 2px;
    }
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: #333;
  }
  
  p {
    margin: 4px 0;
    color: #666;
  }
  
  small {
    color: #999;
  }
}
</style>

<style lang="scss" scoped>
.map-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f0f0f0;
  position: relative;
  overflow: hidden;

  &__container {
    width: 100%;
    height: 100%;
    background-color: #e0e0e0;
    position: relative;
  }
}

.loading, .error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  padding: 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.loading {
  background-color: rgba(255, 255, 255, 0.95);
  color: #666;
}

.error {
  background-color: rgba(244, 67, 54, 0.95);
  color: white;
  max-width: 300px;
}
</style>


<style lang="scss" scoped>
@use "sass:color";

.map-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden; // Restrict overflow only for the map view

  &__container {
    width: 100%;
    height: 100%;
    background-color: #e0e0e0;
    position: relative;
  }
}

</style>
