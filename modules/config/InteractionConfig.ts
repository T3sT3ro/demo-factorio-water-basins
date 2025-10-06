// Configuration for user interaction behaviors and controls

// Type definitions
type MouseButton = 'LEFT' | 'MIDDLE' | 'RIGHT';
type ZoomDirection = 1 | -1;
type CursorType = 'grabbing' | 'default' | 'pointer';

interface MouseConfig {
  BUTTONS: {
    LEFT: 0;
    MIDDLE: 1;
    RIGHT: 2;
  };
  ZOOM: {
    IN: 1;
    OUT: -1;
  };
  ZOOM_FACTOR_IN: number;
  ZOOM_FACTOR_OUT: number;
  PAN_CURSOR: CursorType;
  DEFAULT_CURSOR: CursorType;
}

interface CoordinatesConfig {
  MIN_BOUNDARY: 0;
  BRUSH_RADIUS_DIVISOR: 2;
  EMPTY_SIZE: 0;
}

interface BrushConfig {
  MIN_SIZE: 1;
  MAX_SIZE: 16;
  DEFAULT_SIZE: 3;
  SHAPE: 'circular';
}

interface KeyboardConfig {
  DEPTH_KEYS: string[];
  MODIFIERS: {
    BRUSH_SIZE: string;
    DEPTH_CHANGE: string;
    FLOOD_FILL: string;
    PIPETTE: string;
    PUMP_ACTIONS: string;
  };
}

interface TimingConfig {
  TICK_HOLD_DELAY_MS: number;
  TICK_CONTINUOUS_INTERVAL_MS: number;
  THROTTLE_MS: number;
  FAST_ANIMATION_MS: number;
  NORMAL_ANIMATION_MS: number;
  SLOW_ANIMATION_MS: number;
}

interface VisualConfig {
  HOVER_OPACITY: number;
  SELECTION_OPACITY: number;
  EASING: string;
}

interface GameConfig {
  MIN_DEPTH: number;
  MAX_DEPTH: number;
  DEFAULT_DEPTH: number;
  DEFAULT_RESERVOIR_ID: number;
  MIN_RESERVOIR_ID: number;
}

interface InteractionConfiguration {
  MOUSE: MouseConfig;
  COORDINATES: CoordinatesConfig;
  BRUSH: BrushConfig;
  KEYBOARD: KeyboardConfig;
  TIMING: TimingConfig;
  VISUAL: VisualConfig;
  GAME: GameConfig;
}

export const INTERACTION_CONFIG: InteractionConfiguration = {
  // Mouse interaction settings
  MOUSE: {
    // Mouse button constants for cleaner event handling
    BUTTONS: {
      LEFT: 0,     // Primary button (usually left)
      MIDDLE: 1,   // Auxiliary button (usually wheel or middle)
      RIGHT: 2     // Secondary button (usually right)
    },
    
    // Zoom direction constants
    ZOOM: {
      IN: 1,       // Zoom in direction
      OUT: -1      // Zoom out direction
    },
    
    // Zoom behavior
    ZOOM_FACTOR_IN: 1.1,
    ZOOM_FACTOR_OUT: 0.9,
    
    // Panning settings
    PAN_CURSOR: "grabbing",
    DEFAULT_CURSOR: "default",
  },

  // Coordinate boundary constants
  COORDINATES: {
    MIN_BOUNDARY: 0,    // Minimum valid coordinate
    BRUSH_RADIUS_DIVISOR: 2,  // Divisor for calculating brush radius
    EMPTY_SIZE: 0       // Empty/no size indicator
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

/**
 * Validates and clamps depth value to valid range
 * @param depth - The depth value to validate
 * @returns Clamped depth value between MIN_DEPTH and MAX_DEPTH
 */
export function validateDepth(depth: number): number {
  return Math.max(
    INTERACTION_CONFIG.GAME.MIN_DEPTH,
    Math.min(INTERACTION_CONFIG.GAME.MAX_DEPTH, depth)
  );
}

/**
 * Validates and clamps brush size to valid range
 * @param size - The brush size to validate
 * @returns Clamped brush size between MIN_SIZE and MAX_SIZE
 */
export function validateBrushSize(size: number): number {
  return Math.max(
    INTERACTION_CONFIG.BRUSH.MIN_SIZE,
    Math.min(INTERACTION_CONFIG.BRUSH.MAX_SIZE, size)
  );
}

/**
 * Validates and ensures minimum reservoir ID
 * @param id - The reservoir ID to validate
 * @returns Validated reservoir ID (minimum MIN_RESERVOIR_ID)
 */
export function validateReservoirId(id: number): number {
  return Math.max(INTERACTION_CONFIG.GAME.MIN_RESERVOIR_ID, id);
}
