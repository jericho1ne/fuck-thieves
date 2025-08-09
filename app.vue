<template>
  <div class="app">
    <Map />
    <Sidebar 
      v-if="locationStore"
      :locations="locationStore.locations"
      :selectedLocationIndex="locationStore.selectedLocationIndex"
      @location-click="locationStore.handleSidebarLocationClick"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Map from '~/components/Map.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useLocationStore } from '~/stores/location-store'

// Only access the store after mounting to avoid SSR issues
const locationStore = ref(null)

// Fetch bike location data
async function fetchBikeLocation() {
  if (!locationStore.value) return
  
  try {
    locationStore.value.setLoading(true)
    locationStore.value.clearError()
    
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
    const transformedLocations = locationData.coordinates.map((coord, index) => ({
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
    
    locationStore.value.setLocations(transformedLocations)
    
  } catch (err) {
    console.error('Error fetching bike location:', err)
    locationStore.value.setError(err.message || 'Failed to load bike location')
  } finally {
    locationStore.value.setLoading(false)
  }
}

// Fetch data when component mounts
onMounted(() => {
  locationStore.value = useLocationStore()
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
