<template>
  <v-app>
    <Navigation />
    <v-main>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script>
import Navigation from './components/Navigation.vue'
import { initializeEcho, subscribeToActions } from '@/services/realtime'

export default {
  name: 'App',
  components: {
    Navigation,
  },
  mounted() {
    // Initialize real-time connection when app starts
    const echo = initializeEcho()
    
    // Wait a moment for connection to establish, then subscribe to actions
    setTimeout(() => {
      subscribeToActions((data) => {
        // Dispatch window event for components to react
        const eventName = `action:${data.resource_type || data.type}`
        try {
          window.dispatchEvent(new CustomEvent(eventName, { detail: data }))
        } catch (e) {
          console.error('Failed to dispatch real-time event:', e)
        }
      })
    }, 500)
  },
};
</script>