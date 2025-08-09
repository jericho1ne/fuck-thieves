<template>
  <div class="map-view">
    <div v-if="props.loading" class="loading">Loading bike location...</div>
    <div v-else-if="props.error" class="error">{{ props.error }}</div>
    <div ref="mapContainer" class="map-view__container"></div>
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

// Create markers for locations
function createMarkers() {
  if (!map.value || !props.locations.length) return
  
  // Clear existing markers
  markers.value.forEach(marker => marker.remove())
  markers.value = []
  
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
          <p><strong>Accuracy:</strong> ${location.accuracy}m</p>
          <p><strong>Type:</strong> ${location.type}</p>
          <p><strong>Measurements:</strong> ${location.measurements}</p>
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
        maxZoom: 15
      })
    }
  }
}

// Initialize map when component mounts
onMounted(async () => {
  try {
    console.log('Initializing map...')
    console.log('Mapbox token:', MAPBOX_TOKEN ? 'Present' : 'Missing')
    
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN.trim() === '') {
      console.error('No mapbox token found')
      return
    }
    
    // Set mapbox access token
    mapboxgl.accessToken = MAPBOX_TOKEN
    
    // Wait for the DOM to be ready
    await nextTick()
    
    if (!mapContainer.value) {
      console.error('Map container element not found')
      return
    }
    
    console.log('Creating map instance...')
    
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
    
    // Log any map errors
    map.value.on('error', (e) => {
      console.error('Mapbox error:', e.error)
    })
    
  } catch (err) {
    console.error('Error initializing map:', err)
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
  padding: 12px;
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
