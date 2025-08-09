import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLocationStore = defineStore('location', () => {
  // State
  const locations = ref([])
  const selectedLocationIndex = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const selectedLocation = computed(() => {
    if (selectedLocationIndex.value !== null && locations.value[selectedLocationIndex.value]) {
      return locations.value[selectedLocationIndex.value]
    }
    return null
  })

  const hasLocations = computed(() => locations.value.length > 0)

  // Actions
  function setLocations(newLocations) {
    locations.value = newLocations
    // Reset selection if it's out of bounds
    if (selectedLocationIndex.value !== null && selectedLocationIndex.value >= newLocations.length) {
      selectedLocationIndex.value = null
    }
  }

  function selectLocation(index) {
    if (index >= 0 && index < locations.value.length) {
      selectedLocationIndex.value = index
    } else {
      selectedLocationIndex.value = null
    }
  }

  function clearSelection() {
    selectedLocationIndex.value = null
  }

  function setLoading(isLoading) {
    loading.value = isLoading
  }

  function setError(errorMessage) {
    error.value = errorMessage
  }

  function clearError() {
    error.value = null
  }

  // Map-specific actions (to be called by Map component)
  function handleMarkerClick(index) {
    selectLocation(index)
  }

  // Sidebar-specific actions (to be called by Sidebar component)
  function handleSidebarLocationClick(index) {
    selectLocation(index)
  }

  return {
    // State
    locations,
    selectedLocationIndex,
    loading,
    error,

    // Getters
    selectedLocation,
    hasLocations,

    // Actions
    setLocations,
    selectLocation,
    clearSelection,
    setLoading,
    setError,
    clearError,
    handleMarkerClick,
    handleSidebarLocationClick
  }
})
