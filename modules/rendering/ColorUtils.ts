// Utility functions for color generation

import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";

export function getHeightColor(depth: number): string {
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
 * Calculate water color based on water level (depth)
 * Uses alpha blending to show water depth
 */
export function getWaterColor(waterLevel: number, _maxLevel: number): string {
  const { BASE_COLOR, MIN_ALPHA, ALPHA_PER_LEVEL, MAX_ALPHA } = UI_CONSTANTS.RENDERING.COLORS.WATER;

  const alpha = Math.min(
    MIN_ALPHA + waterLevel * ALPHA_PER_LEVEL,
    MAX_ALPHA,
  );
  return `rgba(${BASE_COLOR}, ${alpha})`;
}

function _interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = parseRgb(color1);
  const c2 = parseRgb(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r},${g},${b})`;
}

function parseRgb(color: string): { r: number; g: number; b: number } {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(match[1]!),
    g: parseInt(match[2]!),
    b: parseInt(match[3]!),
  };
}
