import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false, // SPA mode
  css: ['mapbox-gl/dist/mapbox-gl.css'],
  runtimeConfig: {
    public: {
      mapboxToken: process.env.NUXT_PUBLIC_MAPBOX_TOKEN
    }
  }
})
