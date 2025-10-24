// Domain warping based on Inigo Quilez's technique
// https://iquilezles.org/articles/warp/
// Pattern: f(p) = fbm( p + warpStrength * fbm( p + warpStrength * fbm( p ) ) )

import type { NoiseFunction } from "./NoiseAlgorithms.ts";
import type { OctaveSettings } from "./NoiseSettings.ts";

/**
 * Compute fbm (Fractal Brownian Motion) for a 2D point
 */
function fbm(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  octaves: number,
  lacunarity: number,
  persistence: number,
  octaveSettings?: OctaveSettings[],
): number {
  let value = 0;
  let maxValue = 0;
  let frequency = 1.0;
  let amplitude = 1.0;

  for (let i = 0; i < octaves; i++) {
    const octaveSetting = octaveSettings?.[i];
    if (octaveSetting) {
      frequency = octaveSetting.frequency;
      amplitude = octaveSetting.amplitude;
    } else {
      frequency = Math.pow(lacunarity, i);
      amplitude = Math.pow(persistence, i);
    }

    const n = noiseFunc(x * frequency, y * frequency);
    value += n * amplitude;
    maxValue += amplitude;
  }

  return value / maxValue;
}

/**
 * Domain warping using nested fbm calls to create organic patterns
 * Following Inigo Quilez's approach with configurable warp depth
 * 
 * Key principles:
 * - Warp fbm uses FIXED settings (not user octave settings) for consistent behavior
 * - Warp strength is divided by iteration to prevent exponential growth
 * - Seed offset varies per layer to ensure randomization affects all levels
 * - Final fbm uses user's octave settings for controllable detail
 */
export function warpedNoise2D(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  octaves: number,
  lacunarity: number,
  persistence: number,
  gain: number,
  iterations: number = 2,
  warpStrength: number = 4.0,
  baseFreq: number = 1.0,
  seedOffset: number = 0,
  octaveSettings?: OctaveSettings[],
): number {
  const seed = seedOffset * 0.001; // Scale seed to reasonable range
  let px = x * baseFreq;
  let py = y * baseFreq;

  // Warp settings: use fixed octaves (fewer, coarser) for warping
  // This ensures warp behavior is independent of user's detail settings
  const warpOctaves = Math.min(4, octaves); // Max 4 octaves for warping
  const warpLacunarity = 2.0; // Fixed lacunarity for consistent warp scale
  const warpPersistence = 0.5; // Fixed persistence

  // Apply domain warping iterations (typically 1-3)
  // Each iteration warps coordinates using fbm at different offsets
  if (iterations >= 1) {
    // First warp: q = fbm(p + offset)
    // Scale strength down for first iteration to prevent over-warping
    const strength = warpStrength / 2.0;
    const qx = fbm(px + 0.0 + seed, py + 0.0 + seed, noiseFunc, warpOctaves, warpLacunarity, warpPersistence);
    const qy = fbm(px + 5.2 + seed, py + 1.3 + seed, noiseFunc, warpOctaves, warpLacunarity, warpPersistence);
    
    px = px + strength * qx;
    py = py + strength * qy;
  }

  if (iterations >= 2) {
    // Second warp: r = fbm(p + q + offset)
    // Reduce strength further to avoid compounding
    const strength = warpStrength / 4.0;
    const rx = fbm(px + 1.7 + seed * 2, py + 9.2 + seed * 2, noiseFunc, warpOctaves, warpLacunarity, warpPersistence);
    const ry = fbm(px + 8.3 + seed * 2, py + 2.8 + seed * 2, noiseFunc, warpOctaves, warpLacunarity, warpPersistence);
    
    px = px + strength * rx;
    py = py + strength * ry;
  }

  if (iterations >= 3) {
    // Third warp (optional, for extreme warping)
    const strength = warpStrength / 8.0;
    const sx = fbm(px + 3.1 + seed * 3, py + 7.4 + seed * 3, noiseFunc, warpOctaves, warpLacunarity, warpPersistence);
    const sy = fbm(px + 6.9 + seed * 3, py + 4.5 + seed * 3, noiseFunc, warpOctaves, warpLacunarity, warpPersistence);
    
    px = px + strength * sx;
    py = py + strength * sy;
  }

  // Final fbm evaluation at warped coordinates
  // This uses the user's octave settings for full control over final detail
  return fbm(px + seed * 4, py + seed * 4, noiseFunc, octaves, lacunarity, persistence, octaveSettings) * gain;
}
