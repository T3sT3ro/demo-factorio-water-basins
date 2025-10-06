// Color management for terrain, UI, and visual elements

import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";

interface ColorScheme {
  surface: string;
  water: string;
  highlight: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface BasinHighlightColors {
  fill: string;
  stroke: string;
}

interface InfrastructureColors {
  chunkBoundaries: string;
  pumpConnections: string;
}

/**
 * Color manager for consistent theming across the application
 */
export class ColorManager {
  /**
   * Get color for terrain height/depth
   */
  static getTerrainColor(depth: number): string {
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
   */
  static getWaterColor(level: number): string {
    const baseColor = UI_CONSTANTS.RENDERING.COLORS.WATER.BASE_COLOR;
    const minAlpha = UI_CONSTANTS.RENDERING.COLORS.WATER.MIN_ALPHA;
    const maxAlpha = UI_CONSTANTS.RENDERING.COLORS.WATER.MAX_ALPHA;
    
    // Calculate alpha based on water level
    const alpha = minAlpha + (level * (maxAlpha - minAlpha));
    return `rgba(${baseColor}, ${alpha})`;
  }

  /**
   * Get color for pump based on mode
   */
  static getPumpColor(mode: string, isSelected: boolean = false): string {
    if (isSelected) {
      return UI_CONSTANTS.RENDERING.COLORS.PUMPS.SELECTED_HIGHLIGHT;
    }
    
    return mode === "inlet" 
      ? UI_CONSTANTS.RENDERING.COLORS.PUMPS.INLET
      : UI_CONSTANTS.RENDERING.COLORS.PUMPS.OUTLET;
  }

  /**
   * Get basin highlight colors
   */
  static getBasinHighlightColors(): BasinHighlightColors {
    return {
      fill: UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.FILL,
      stroke: UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.STROKE
    };
  }

  /**
   * Get color scheme for brush overlay
   */
  static getBrushOverlayColor(depth: number): string {
    const baseColor = ColorManager.getTerrainColor(depth);
    // Convert RGB to RGBA with transparency
    if (baseColor.startsWith('rgb(')) {
      return baseColor.replace('rgb(', 'rgba(').replace(')', ', 0.5)');
    }
    return baseColor + '80'; // Add alpha for hex colors
  }

  /**
   * Get infrastructure colors (chunk boundaries, connections)
   */
  static getInfrastructureColors(): InfrastructureColors {
    return {
      chunkBoundaries: UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.CHUNK_BOUNDARIES,
      pumpConnections: UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.PUMP_CONNECTIONS
    };
  }

  /**
   * Interpolate between two colors
   */
  static interpolateColors(color1: string, color2: string, factor: number): string {
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
   */
  static #hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1]!, 16),
      g: parseInt(result[2]!, 16),
      b: parseInt(result[3]!, 16)
    } : null;
  }

  /**
   * Get appropriate text color (black or white) for given background
   */
  static getContrastTextColor(backgroundColor: string): string {
    const rgb = ColorManager.#hexToRgb(backgroundColor);
    if (!rgb) return '#000000';
    
    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
