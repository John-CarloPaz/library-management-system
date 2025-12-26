/**
 * Real-time Service
 * Handles WebSocket connections using Laravel Echo + Pusher
 * For multi-user, multi-branch real-time updates
 */

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Pusher configuration
const PUSHER_CONFIG = {
  broadcaster: 'pusher',
  key: import.meta.env.VITE_PUSHER_KEY || '57bc0eb6de62fba6ca94',
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'ap1',
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
}

// Real-time channels to subscribe to
const CHANNELS = {
  PROCUREMENTS: 'procurements',
  ACQUISITIONS: 'acquisitions',
  CATALOGUES: 'catalogues',
  BOOKS: 'books',
  ACTIONS: 'actions', // Generic actions channel from Laravel backend
}

// Event types
const EVENTS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  ARCHIVED: 'archived',
  RESTORED: 'restored',
}

// Global Echo instance
let echoInstance = null
let isConnected = false
const eventListeners = new Map() // Store callbacks for each channel

/**
 * Initialize Laravel Echo connection
 * Should be called once when app starts (in main.js or App.vue)
 */
export function initializeEcho() {
  if (echoInstance) {
    console.log('Echo already initialized')
    return echoInstance
  }

  try {
    // Initialize Pusher
    window.Pusher = Pusher

    // Create Echo instance
    echoInstance = new Echo({
      ...PUSHER_CONFIG,
      client: new Pusher(PUSHER_CONFIG.key, {
        cluster: PUSHER_CONFIG.cluster,
        forceTLS: PUSHER_CONFIG.forceTLS,
        enabledTransports: PUSHER_CONFIG.enabledTransports,
      }),
    })

    // Listen for connection events
    echoInstance.connector.pusher.connection.bind('connected', () => {
      isConnected = true
      console.log('✅ Real-time connection established')
      dispatchConnectionEvent('connected')
    })

    echoInstance.connector.pusher.connection.bind('disconnected', () => {
      isConnected = false
      console.warn('⚠️ Real-time connection lost')
      dispatchConnectionEvent('disconnected')
    })

    echoInstance.connector.pusher.connection.bind('error', (err) => {
      console.error('❌ Real-time connection error:', err)
      dispatchConnectionEvent('error', err)
    })

    return echoInstance
  } catch (error) {
    console.error('Failed to initialize Echo:', error)
    return null
  }
}

/**
 * Wait for Echo connection to be ready
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>}
 */
export function waitForEchoConnection(maxWaitTime = 5000) {
  return new Promise((resolve) => {
    if (isConnected) {
      resolve(true)
      return
    }

    const startTime = Date.now()
    const checkInterval = setInterval(() => {
      if (isConnected) {
        clearInterval(checkInterval)
        resolve(true)
      } else if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkInterval)
        console.warn('Echo connection timeout after', maxWaitTime, 'ms')
        resolve(false)
      }
    }, 100)
  })
}

/**
 * Get Echo instance (initialize if needed)
 */
export function getEcho() {
  if (!echoInstance) {
    initializeEcho()
  }
  return echoInstance
}

/**
 * Check if real-time connection is active
 */
export function isRealTimeConnected() {
  return isConnected
}

/**
 * Subscribe to a channel and listen for events
 * @param {string} channelName - Channel to subscribe to
 * @param {function} callback - Callback function to execute on event
 * @param {array} eventTypes - Array of event types to listen for (optional)
 */
export function subscribeToChannel(channelName, callback, eventTypes = null) {
  const echo = getEcho()
  if (!echo) {
    console.error('Echo not initialized')
    return
  }

  try {
    const channel = echo.channel(channelName)

    // Store callback for cleanup
    if (!eventListeners.has(channelName)) {
      eventListeners.set(channelName, [])
    }

    // Determine which events to listen for
    const eventsToListen = eventTypes || Object.values(EVENTS)

    // Listen to each event type
    eventsToListen.forEach((eventType) => {
      channel.listen(eventType, (data) => {
        console.log(`📡 [${channelName}] ${eventType}:`, data)
        callback(data, eventType)
      })
    })

    eventListeners.get(channelName).push({ callback, eventTypes: eventsToListen })
    console.log(`✅ Subscribed to channel: ${channelName}`)
  } catch (error) {
    console.error(`Failed to subscribe to channel ${channelName}:`, error)
  }
}

/**
 * Unsubscribe from a channel
 * @param {string} channelName - Channel to unsubscribe from
 */
export function unsubscribeFromChannel(channelName) {
  const echo = getEcho()
  if (!echo) return

  try {
    echo.leaveChannel(channelName)
    eventListeners.delete(channelName)
    console.log(`✅ Unsubscribed from channel: ${channelName}`)
  } catch (error) {
    console.error(`Failed to unsubscribe from channel ${channelName}:`, error)
  }
}

/**
 * Subscribe to procurements channel
 */
export function subscribeToProcurements(callback) {
  subscribeToChannel(CHANNELS.PROCUREMENTS, callback)
}

/**
 * Subscribe to acquisitions channel
 */
export function subscribeToAcquisitions(callback) {
  subscribeToChannel(CHANNELS.ACQUISITIONS, callback)
}

/**
 * Subscribe to catalogues channel
 */
export function subscribeToCatalogues(callback) {
  subscribeToChannel(CHANNELS.CATALOGUES, callback)
}

/**
 * Subscribe to books channel
 */
export function subscribeToBooks(callback) {
  subscribeToChannel(CHANNELS.BOOKS, callback)
}

// Global flag to track if actions channel is already subscribed
let actionsChannelSubscribed = false

export function subscribeToActions(callback) {
  const echo = getEcho()
  if (!echo) {
    console.error('Echo not initialized')
    return
  }

  // Prevent duplicate subscriptions
  if (actionsChannelSubscribed) {
    return
  }

  try {
    // Use direct Pusher for better reliability
    const pusher = echo.connector.pusher
    const channel = pusher.subscribe('actions')
    
    channel.bind('generic-action', (data) => {
      // Parse data if it's a string
      let parsedData = data
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data)
        } catch (e) {
          console.warn('Failed to parse event data:', e)
          parsedData = data
        }
      }
      
      // Call the main callback
      if (typeof callback === 'function') {
        try {
          callback(parsedData)
        } catch (e) {
          console.error('Error in subscribeToActions callback:', e)
        }
      }
    })

    actionsChannelSubscribed = true
  } catch (error) {
    console.error('Failed to subscribe to generic actions channel:', error)
  }
}


/**
 * Unsubscribe from all channels
 */
export function unsubscribeFromAll() {
  eventListeners.forEach((_, channelName) => {
    unsubscribeFromChannel(channelName)
  })
}

/**
 * Dispatch connection status event globally
 */
function dispatchConnectionEvent(status, data = null) {
  const event = new CustomEvent('realtime:connection', {
    detail: { status, data, timestamp: new Date() },
  })
  window.dispatchEvent(event)
}

/**
 * Get subscription status for debugging
 */
export function getSubscriptionStatus() {
  return {
    isConnected,
    channels: Array.from(eventListeners.keys()),
    connectionInstance: echoInstance ? 'initialized' : 'not initialized',
  }
}

export default {
  initializeEcho,
  getEcho,
  waitForEchoConnection,
  isRealTimeConnected,
  subscribeToChannel,
  unsubscribeFromChannel,
  subscribeToProcurements,
  subscribeToAcquisitions,
  subscribeToCatalogues,
  subscribeToBooks,
  subscribeToActions,
  unsubscribeFromAll,
  getSubscriptionStatus,
  CHANNELS,
  EVENTS,
}
