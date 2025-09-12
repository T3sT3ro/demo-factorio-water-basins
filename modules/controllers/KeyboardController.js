// Keyboard controller for handling keyboard shortcuts
import { INTERACTION_CONFIG } from "../config/InteractionConfig.js";
export class KeyboardController {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  setupEventHandlers() {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    // Handle 0-9 keys for depth selection
    if (INTERACTION_CONFIG.KEYBOARD.DEPTH_KEYS.includes(e.key)) {
      const depth = parseInt(e.key);
      this.eventBus.emit('depth.selected', { depth });
      e.preventDefault();
    }
    
    // Add more keyboard shortcuts here as needed
    // Examples:
    // - Space: Toggle play/pause
    // - R: Randomize
    // - C: Clear water
    // - etc.
  }
}
