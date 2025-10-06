// Keyboard controller for handling keyboard shortcuts
import { INTERACTION_CONFIG } from "../config/InteractionConfig.ts";

interface EventBusLike {
  emit(eventName: string, data?: unknown): void;
}

export class KeyboardController {
  private eventBus: EventBusLike;

  constructor(eventBus: EventBusLike) {
    this.eventBus = eventBus;
  }

  setupEventHandlers(): void {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e: KeyboardEvent): void {
    // Handle 0-9 keys for depth selection
    if ((INTERACTION_CONFIG as unknown as { KEYBOARD: { DEPTH_KEYS: string[] } }).KEYBOARD.DEPTH_KEYS.includes(e.key)) {
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
