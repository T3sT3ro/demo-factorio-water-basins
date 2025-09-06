// Keyboard controller for handling keyboard shortcuts
export class KeyboardController {
  constructor() {
    this.callbacks = {};
  }

  setCallbacks(callbacks) {
    this.callbacks = {
      setSelectedDepth: callbacks.setSelectedDepth || (() => {})
    };
  }

  setupEventHandlers() {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    // Handle 0-9 keys for depth selection
    if (e.key >= "0" && e.key <= "9") {
      const depth = parseInt(e.key);
      this.callbacks.setSelectedDepth(depth);
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
