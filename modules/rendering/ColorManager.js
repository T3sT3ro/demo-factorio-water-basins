// Color management for terrain, UI, and visual elements

import { CONFIG } from "../config.js";
import { UI_CONSTANTS } from "../constants.js";

/**
 * @typedef {Object} ColorScheme
 * @property {string} surface - Color for surface terrain (depth 0)
 * @property {string} water - Color for water
 * @property {string} highlight - Color for highlighting
 */

/**
 * @typedef {Object} RGB
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 */

/**
 * Color manager for consistent theming across the application
 */
export class ColorManager {
  /**
   * Get color for terrain height/depth
   * @param {number} depth - The depth value (0 = surface, > 0 = underground)
   * @returns {string} CSS color string
   */
  static getTerrainColor(depth) {
    // Only depth 0 = surface (brown), all others = gray
    if (depth === 0) {
      return UI_CONSTANTS.RENDERING.COLORS.TERRAIN.SURFACE;
    } else {
      // Gray gradient for all depths > 0
      const ratio = depth / CONFIG.MAX_DEPTH;
      const lightGray = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_LIGHT_GRAY;
      const range = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_GRAY_RANGE;
      const v = Math.floor(lightGray - ratio * range);
      return `rgb(${v},${v},${v})`;
    }
  }

  /**
   * Get color for water at different levels
   * @param {number} level - Water level (0-1)
   * @returns {string} CSS color string with alpha
   */
  static getWaterColor(level) {
    const baseColor = UI_CONSTANTS.RENDERING.COLORS.WATER.BASE_COLOR;
    const minAlpha = UI_CONSTANTS.RENDERING.COLORS.WATER.MIN_ALPHA;
    const maxAlpha = UI_CONSTANTS.RENDERING.COLORS.WATER.MAX_ALPHA;
    
    // Calculate alpha based on water level
    const alpha = minAlpha + (level * (maxAlpha - minAlpha));
    return `rgba(${baseColor}, ${alpha})`;
  }

  /**
   * Get color for pump based on mode
   * @param {string} mode - Pump mode ("inlet" or "outlet")
   * @param {boolean} [isSelected=false] - Whether pump is selected
   * @returns {string} CSS color string
   */
  static getPumpColor(mode, isSelected = false) {
    if (isSelected) {
      return UI_CONSTANTS.RENDERING.COLORS.PUMPS.SELECTED_HIGHLIGHT;
    }
    
    return mode === "inlet" 
      ? UI_CONSTANTS.RENDERING.COLORS.PUMPS.INLET
      : UI_CONSTANTS.RENDERING.COLORS.PUMPS.OUTLET;
  }

  /**
   * Get basin highlight colors
   * @returns {Object} Object with fill and stroke colors
   */
  static getBasinHighlightColors() {
    return {
      fill: UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.FILL,
      stroke: UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.STROKE
    };
  }

  /**
   * Get color scheme for brush overlay
   * @param {number} depth - Target depth for painting
   * @returns {string} CSS color string with alpha
   */
  static getBrushOverlayColor(depth) {
    const baseColor = ColorManager.getTerrainColor(depth);
    // Convert RGB to RGBA with transparency
    if (baseColor.startsWith('rgb(')) {
      return baseColor.replace('rgb(', 'rgba(').replace(')', ', 0.5)');
    }
    return baseColor + '80'; // Add alpha for hex colors
  }

  /**
   * Get infrastructure colors (chunk boundaries, connections)
   * @returns {Object} Object with various infrastructure colors
   */
  static getInfrastructureColors() {
    return {
      chunkBoundaries: UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.CHUNK_BOUNDARIES,
      pumpConnections: UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.PUMP_CONNECTIONS
    };
  }

  /**
   * Interpolate between two colors
   * @param {string} color1 - First color (hex format)
   * @param {string} color2 - Second color (hex format)
   * @param {number} factor - Interpolation factor (0-1)
   * @returns {string} Interpolated color
   */
  static interpolateColors(color1, color2, factor) {
    // Simple RGB interpolation - could be enhanced for better color spaces
    const c1 = ColorManager.#hexToRgb(color1);
    const c2 = ColorManager.#hexToRgb(color2);
    
    if (!c1 || !c2) return color1;
    
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert hex color to RGB object
   * @param {string} hex - Hex color string
   * @returns {RGB|null} RGB object or null if invalid
   */
  static #hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Get appropriate text color (black or white) for given background
   * @param {string} backgroundColor - Background color
   * @returns {string} Text color for good contrast
   */
  static getContrastTextColor(backgroundColor) {
    const rgb = ColorManager.#hexToRgb(backgroundColor);
    if (!rgb) return '#000000';
    
    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
