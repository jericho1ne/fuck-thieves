<template>
  <div class="map-view">
    <div v-if="props.loading" class="loading">Loading bike location...</div>
    <div v-else-if="props.error" class="error">{{ props.error }}</div>
    <div ref="mapContainer" class="map-view__container"></div>
    
    <!-- Right floating sidebar -->
    <div class="sidebar">
      <div class="sidebar__header">
        <h3>🚲 Bike Locations</h3>
        <p class="sidebar__count">{{ props.locations.length }} locations</p>
      </div>
      
      <div class="sidebar__content">
        <div 
          v-for="(location, index) in props.locations" 
          :key="index"
          :class="['location-item', { 'location-item--selected': selectedLocationIndex === index }]"
          @click="selectLocation(index)"
        >
          <div class="location-item__header">
            <span class="location-item__number">#{{ index + 1 }}</span>
          </div>
          
          <div class="location-item__time">
            <p class="time-label">Timestamp</p>
            <p class="time-value">{{ location.datetime?.bike?.date }} {{ location.datetime?.bike?.time }}</p>
          </div>
          
          <div class="location-item__coordinates">
            <p><strong>Lat:</strong> {{ location.lat }}</p>
            <p><strong>Lon:</strong> {{ location.lon }}</p>
          </div>
          
          <div class="location-item__details">
            <p><strong>Accuracy:</strong> {{ location.accuracy }}m</p>
            <p><strong>Pings:</strong> {{ location.measurements }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import mapboxgl from 'mapbox-gl'

const config = useRuntimeConfig()
const MAPBOX_TOKEN = config.public.mapboxToken

const props = defineProps({
  locations: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

const mapContainer = ref(null)
const map = ref(null)
const markers = ref([])
const selectedLocationIndex = ref(null)

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
  selectedLocationIndex.value = index
  
  if (markers.value[index] && map.value) {
    const location = props.locations[index]
    
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

// Create markers for locations
function createMarkers() {
  if (!map.value || !props.locations.length) return
  
  // Clear existing markers
  markers.value.forEach(marker => marker.remove())
  markers.value = []
  
  // Clear existing accuracy circles
  clearAccuracyCircles()
  
  // Create GeoJSON features for accuracy circles
  const circleFeatures = props.locations.map((location, index) => {
    if (!location.lat || !location.lon || !location.accuracy) return null
    
    return {
      type: 'Feature',
      properties: {
        id: `accuracy-${index}`,
        accuracy: location.accuracy
      },
      geometry: {
        type: 'Point',
        coordinates: [location.lon, location.lat]
      }
    }
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
    
    // Add fill circles (dark gray with 30% opacity)
    map.value.addLayer({
      id: 'accuracy-circles-fill',
      type: 'circle',
      source: 'accuracy-circles',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, ['*', ['/', ['get', 'accuracy'], 3.28084], 0.03],
          20, ['*', ['/', ['get', 'accuracy'], 3.28084], 0.6]
        ],
        'circle-color': '#4a4a4a',
        'circle-opacity': 0.3
      }
    })
    
    // Add border circles (white outline)
    map.value.addLayer({
      id: 'accuracy-circles-border',
      type: 'circle',
      source: 'accuracy-circles',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, ['*', ['/', ['get', 'accuracy'], 3.28084], 0.03],
          20, ['*', ['/', ['get', 'accuracy'], 3.28084], 0.6]
        ],
        'circle-color': 'transparent',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.8
      }
    })
  }
  
  // Create new markers
  props.locations.forEach((location, index) => {
    if (!location.lat || !location.lon) return
    
    // Create popup content
    const popupHTML = `
      <div class="bike-popup">
        <h3>🚲 Bike Location ${index + 1}</h3>
        <div class="bike-popup__content">
          <p><strong>Latitude:</strong> ${location.lat}</p>
          <p><strong>Longitude:</strong> ${location.lon}</p>
          <p><strong>Accuracy:</strong> ${location.accuracy}</p>
          <p><strong>Pings:</strong> ${location.measurements}</p>
          <p><small>User Time: ${location.datetime?.user?.date} ${location.datetime?.user?.time}</small></p>
          <p><small>Bike Time: ${location.datetime?.bike?.date} ${location.datetime?.bike?.time}</small></p>
        </div>
      </div>
    `
    
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML)
    
    const marker = new mapboxgl.Marker({
      color: '#FF5E5B'
    })
      .setLngLat([location.lon, location.lat])
      .setPopup(popup)
      .addTo(map.value)
    
    markers.value.push(marker)
  })
  
  // Fit map to show all markers if we have any
  if (markers.value.length > 0) {
    const bounds = new mapboxgl.LngLatBounds()
    props.locations.forEach(location => {
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
    
    console.log('Creating map instance...')
    console.log('Using style: mapbox://styles/mapbox/satellite-v9')
    
    // Initialize the map with a simpler configuration
    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/satellite-v9', // Use a simpler style
      center: [-118.41, 33.99373], // New York City coordinates as default
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

// Watch for changes in locations and update markers
watch(() => props.locations, () => {
  if (map.value && map.value.loaded()) {
    createMarkers()
  }
}, { deep: true })

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

.sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  
  &__header {
    padding: 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.9);
    
    h3 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }
  }
  
  &__count {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
  
  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }
}

.location-item {
  background: white;
  border-radius: 8px;
  padding: 6px;
  margin-bottom: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &:hover {
    border-color: #FF5E5B;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  &--selected {
    border-color: #FF5E5B;
    background: #fff5f5;
  }
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  &__number {
    font-weight: bold;
    color: #FF5E5B;
    font-size: 16px;
  }
  
  &__type {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
  }
  
  &__coordinates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
    margin-bottom: 10px;
    
    p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }
  }
  
  &__details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
    margin-bottom: 2px;
    
    p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }
  }
  
  &__time {
    border-top: 1px solid #eee;
    padding-top: 8px;
    
    .time-label {
      font-size: 11px;
      color: #999;
      margin: 0 0 2px 0;
      font-weight: 500;
    }
    
    .time-value {
      font-size: 12px;
      color: #333;
      margin: 0 0 8px 0;
      font-family: monospace;
    }
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
