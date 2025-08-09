<template>
  <div class="app">
    <Map 
      :locations="locations" 
      :loading="loading" 
      :error="error" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Map from '~/components/Map.vue'

const locations = ref([])
const loading = ref(true)
const error = ref(null)

// Fetch bike location data
async function fetchBikeLocation() {
  try {
    loading.value = true
    error.value = null
    
    const response = await $fetch('/api/get-latest-location')
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch bike location')
    }
    
    const locationData = response.data
    
    // The API returns a coordinates array, so we use that
    if (!locationData.coordinates || !Array.isArray(locationData.coordinates)) {
      throw new Error('Invalid location data received - no coordinates array')
    }
    
    // Transform the coordinates array to match the expected format
    locations.value = locationData.coordinates.map((coord, index) => ({
      id: index,
      lat: coord.lat,
      lon: coord.lon,
      accuracy: coord.acc,
      datetime: coord.datetime,
      timezone: coord.timezone,
      firstTime: coord.firstTime,
      type: coord.type,
      measurements: coord.measurements,
      measured_by: coord.measured_by
    }))
    
    // console.log('Processed locations:', locations.value)
    
  } catch (err) {
    console.error('Error fetching bike location:', err)
    error.value = err.message || 'Failed to load bike location'
  } finally {
    loading.value = false
  }
}

// Fetch data when component mounts
onMounted(() => {
  fetchBikeLocation()
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app {
  height: 100vh;
  width: 100vw;
}
</style>
