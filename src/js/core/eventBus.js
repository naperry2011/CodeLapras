/* ============================================
   EVENT BUS MODULE
   CodeLapras - Cross-Module Communication
   ============================================ */

/**
 * Simple pub/sub event bus for cross-module communication
 * Allows modules to emit events and other modules to listen for them
 */
const EventBus = (function() {
  // Private storage for event listeners
  const listeners = {};

  return {
    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event is emitted
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
      if (!eventName || typeof callback !== 'function') {
        console.warn('EventBus.on: Invalid eventName or callback');
        return () => {};
      }

      // Initialize listener array if it doesn't exist
      if (!listeners[eventName]) {
        listeners[eventName] = [];
      }

      // Add callback to listeners
      listeners[eventName].push(callback);

      // Return unsubscribe function
      return () => {
        this.off(eventName, callback);
      };
    },

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to remove
     */
    off(eventName, callback) {
      if (!listeners[eventName]) return;

      if (callback) {
        // Remove specific callback
        listeners[eventName] = listeners[eventName].filter(cb => cb !== callback);
      } else {
        // Remove all callbacks for this event
        delete listeners[eventName];
      }
    },

    /**
     * Emit an event to all subscribers
     * @param {string} eventName - Name of the event
     * @param {*} data - Data to pass to listeners
     */
    emit(eventName, data = null) {
      if (!eventName) {
        console.warn('EventBus.emit: Invalid eventName');
        return;
      }

      const eventListeners = listeners[eventName];

      if (!eventListeners || eventListeners.length === 0) {
        // No listeners for this event (not an error)
        return;
      }

      // Call each listener with the data
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`EventBus: Error in listener for "${eventName}":`, err);
        }
      });
    },

    /**
     * Subscribe to an event for one-time execution
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event is emitted
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback) {
      if (!eventName || typeof callback !== 'function') {
        console.warn('EventBus.once: Invalid eventName or callback');
        return () => {};
      }

      const onceCallback = (data) => {
        callback(data);
        this.off(eventName, onceCallback);
      };

      return this.on(eventName, onceCallback);
    },

    /**
     * Clear all listeners for a specific event, or all events
     * @param {string} eventName - Optional event name to clear
     */
    clear(eventName) {
      if (eventName) {
        delete listeners[eventName];
      } else {
        // Clear all listeners
        Object.keys(listeners).forEach(key => {
          delete listeners[key];
        });
      }
    },

    /**
     * Get count of listeners for an event
     * @param {string} eventName - Event name
     * @returns {number} Number of listeners
     */
    getListenerCount(eventName) {
      return listeners[eventName] ? listeners[eventName].length : 0;
    },

    /**
     * Get all registered event names
     * @returns {Array} Array of event names
     */
    getEventNames() {
      return Object.keys(listeners);
    },

    /**
     * Check if an event has listeners
     * @param {string} eventName - Event name
     * @returns {boolean} True if event has listeners
     */
    hasListeners(eventName) {
      return !!(listeners[eventName] && listeners[eventName].length > 0);
    }
  };
})();

// Export to window for global access
if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
}

// Log initialization in development
if (typeof console !== 'undefined') {
  console.log('EventBus initialized');
}
