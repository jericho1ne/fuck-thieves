<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <h3>🚲 X3 Locations</h3>
    </div>
    
    <div class="sidebar__content">
      <div 
        v-for="(location, index) in locations" 
        :key="index"
        :class="['location-item', { 'location-item--selected': selectedLocationIndex === index }]"
        @click="onLocationClick(index)"
      >
        <div class="location-item__header">
          <span class="location-item__number">
            #{{ index + 1 }} {{ index === 0 ? '(most recent)' : '' }}</span>
        </div>
        
        <div class="location-item__time">
          <p class="time-label">Timestamp</p>
          <p class="time-value">{{ formatDate(location.datetime?.bike?.date) }} {{ location.datetime?.bike?.time }}</p>
        </div>
        
        <div class="location-item__coordinates">
          <p><strong>Lat</strong> {{ Number(location.lat).toFixed(2) }}</p>
          <p><strong>Lon</strong> {{ Number(location.lon).toFixed(2) }}</p>
        </div>
        
        <div class="location-item__details">
          <p><strong>Acc.</strong> {{ location.accuracy }}m</p>
          <p><strong>Pings</strong> {{ location.measurements }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDate } from '~/utils/common'

const props = defineProps({
  locations: {
    type: Array,
    default: () => []
  },
  selectedLocationIndex: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['location-click'])

function onLocationClick(index) {
  emit('location-click', index)
}
</script>

<style lang="scss" scoped>
.sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 100vh;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  z-index: 2;
  
  &__content {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    gap: 10px;
    
    // Modern scrollbar styling
    scrollbar-width: thin;
    scrollbar-color: #777 #999;
    
    // Webkit scrollbar styling for Chrome/Safari
    &::-webkit-scrollbar {
      height: 1px !important; // Horizontal scrollbar height
      width: 1px !important; // Vertical scrollbar width
    }

    &::-webkit-scrollbar-track {
      background: rgba(0,0,0, 0.5) !important;
      border-radius: 3px !important;
      width: 3px !important;
    }

    &::-webkit-scrollbar-thumb {
      background: #111 !important;
    }
  }
  
  &__header {
    padding: 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.9);
    
    h3 {
      margin: 0;
      color: #333;
      font-size: 14px;
      font-weight: 600;
    }
  }
  
  &__count {
    margin: 0;
    color: #666;
  }
  
  
  // Mobile/tablet responsive layout
  @media (max-width: 768px) {
    height: fit-content;
    min-height: 120px;
    
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100vw;
    overflow-x: auto;
    border-left: none;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    flex-direction: column;
    
    &__header {
      display: none;
    }
    
    &__content {
      flex-direction: row;
      
      overflow-x: auto;
      overflow-y: hidden;
      padding: 6px;
      gap: 8px;
      
      p {
        font-size: 10px !important;
      }
    }
    
    .location-item {
      flex-shrink: 0;
      gap: 4px;
      
      &__number {
        font-size: 12px;
      }
    }
  }
}


.location-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  background: white;
  border-radius: 8px;
  padding: 6px;
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
    margin-bottom: 2px;
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
    
    p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }
  }
  
  &__time {
    border-top: 1px solid #eee;
    padding-top: 2px;
    
    .time-label {
      color: #999;
      margin: 0;
      font-weight: 500;
    }
    
    .time-value {
      color: #333;
      margin: 0;
      font-family: monospace;
    }
  }
}
</style>
