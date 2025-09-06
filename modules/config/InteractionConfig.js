// Configuration for user interaction behaviors and controls

export const INTERACTION_CONFIG = {
  // Mouse and touch interaction settings
  MOUSE: {
    // Zoom behavior
    ZOOM_FACTOR_IN: 1.1,
    ZOOM_FACTOR_OUT: 0.9,
    
    // Panning settings
    PAN_CURSOR: "grabbing",
    DEFAULT_CURSOR: "default",
  },

  // Brush painting settings
  BRUSH: {
    // Sizes match UI_CONSTANTS.BRUSH for consistency
    MIN_SIZE: 1,
    MAX_SIZE: 16,
    DEFAULT_SIZE: 3,
    
    // Brush shape
    SHAPE: "circular", // could be "square" in future
  },

  // Keyboard shortcuts
  KEYBOARD: {
    // Depth selection keys (0-9)
    DEPTH_KEYS: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    
    // Modifier keys
    MODIFIERS: {
      BRUSH_SIZE: "shiftKey",    // Shift + wheel = brush size
      DEPTH_CHANGE: "altKey",    // Alt + wheel = depth change
      FLOOD_FILL: "ctrlKey",     // Ctrl + click = flood fill
      PIPETTE: "altKey",         // Alt + right-click = pipette
      PUMP_ACTIONS: "shiftKey",  // Shift + click = pump actions
    }
  },

  // UI control timing
  TIMING: {
    // Tick button hold-to-continue
    TICK_HOLD_DELAY_MS: 500,      // Delay before continuous ticking starts
    TICK_CONTINUOUS_INTERVAL_MS: 100,  // Interval for continuous ticking
    
    // UI responsiveness
    THROTTLE_MS: 16,              // ~60fps for smooth interactions
    
    // Animation durations (for future use)
    FAST_ANIMATION_MS: 150,
    NORMAL_ANIMATION_MS: 300,
    SLOW_ANIMATION_MS: 500,
  },

  // Visual feedback
  VISUAL: {
    // Hover effects
    HOVER_OPACITY: 0.8,
    
    // Selection highlighting
    SELECTION_OPACITY: 0.6,
    
    // Animation easing (for future CSS transitions)
    EASING: "ease-out",
  },

  // Game interaction settings
  GAME: {
    // Depth range for painting
    MIN_DEPTH: 0,
    MAX_DEPTH: 9,
    
    // Default values
    DEFAULT_DEPTH: 0,
    DEFAULT_RESERVOIR_ID: 1,
    
    // Validation
    MIN_RESERVOIR_ID: 1,
  }
};

// Validation functions
export function validateDepth(depth) {
  return Math.max(
    INTERACTION_CONFIG.GAME.MIN_DEPTH, 
    Math.min(INTERACTION_CONFIG.GAME.MAX_DEPTH, depth)
  );
}

export function validateBrushSize(size) {
  return Math.max(
    INTERACTION_CONFIG.BRUSH.MIN_SIZE,
    Math.min(INTERACTION_CONFIG.BRUSH.MAX_SIZE, size)
  );
}

export function validateReservoirId(id) {
  return Math.max(INTERACTION_CONFIG.GAME.MIN_RESERVOIR_ID, id);
}
