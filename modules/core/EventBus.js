/**
 * Event Bus - Centralized event system for loose coupling
 * 
 * Enables event-driven architecture by replacing direct method calls
 * with publish/subscribe pattern
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.debugMode = false;
  }

  /**
   * Subscribe to an event
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to an event (one-time only)
   */
  once(eventName, callback) {
    if (!this.onceListeners.has(eventName)) {
      this.onceListeners.set(eventName, []);
    }
    this.onceListeners.get(eventName).push(callback);

    // Return unsubscribe function
    return () => this.offOnce(eventName, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventName, callback) {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Unsubscribe from a once event
   */
  offOnce(eventName, callback) {
    const listeners = this.onceListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit(eventName, data = null) {
    if (this.debugMode) {
      console.log(`[EventBus] Emitting: ${eventName}`, data);
    }

    // Call regular listeners
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${eventName}:`, error);
        }
      });
    }

    // Call once listeners and remove them
    const onceListeners = this.onceListeners.get(eventName);
    if (onceListeners) {
      onceListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in once listener for ${eventName}:`, error);
        }
      });
      // Clear once listeners after calling
      this.onceListeners.delete(eventName);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(eventName) {
    this.listeners.delete(eventName);
    this.onceListeners.delete(eventName);
  }

  /**
   * Remove all listeners for all events
   */
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * Get list of all event names with listeners
   */
  getEventNames() {
    const regularEvents = Array.from(this.listeners.keys());
    const onceEvents = Array.from(this.onceListeners.keys());
    return [...new Set([...regularEvents, ...onceEvents])];
  }

  /**
   * Get listener count for an event
   */
  listenerCount(eventName) {
    const regular = this.listeners.get(eventName)?.length || 0;
    const once = this.onceListeners.get(eventName)?.length || 0;
    return regular + once;
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}
