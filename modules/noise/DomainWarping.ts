// Domain warping based on Inigo Quilez's technique
// https://iquilezles.org/articles/warp/
// Pattern: f(p) = fbm( p + warpStrength * fbm( p + warpStrength * fbm( p ) ) )

import type { NoiseFunction } from "./NoiseAlgorithms.ts";
import type { OctaveSettings } from "./NoiseSettings.ts";

/**
 * Compute fbm (Fractal Brownian Motion) for a 2D point
 * Note: Coordinates should already be scaled by baseFreq before calling this
 */
export function computeFBM(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  octaves: number,
  lacunarity: number,
  persistence: number,
  gain: number,
  seedOffset: number,
  octaveSettings?: OctaveSettings[],
): number {
  let value = 0;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    let frequency: number;
    let amplitude: number;

    const octaveSetting = octaveSettings?.[i];
    if (octaveSetting) {
      // When using custom octave settings, use them directly
      // (they already incorporate the desired frequency/amplitude)
      frequency = octaveSetting.frequency;
      amplitude = octaveSetting.amplitude;
    } else {
      // Standard FBM: each octave doubles frequency and halves amplitude
      frequency = Math.pow(lacunarity, i);
      amplitude = Math.pow(persistence, i);
    }

    const n = noiseFunc(x * frequency + seedOffset, y * frequency - seedOffset);
    value += n * amplitude * gain;
    maxValue += amplitude;
  }

  return maxValue > 0 ? value / maxValue : 0;
}

/**
 * Internal FBM for warping (uses fixed settings for consistent behavior)
 */
function fbmForWarp(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  octaves: number,
  lacunarity: number,
  persistence: number,
): number {
  let value = 0;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    const frequency = Math.pow(lacunarity, i);
    const amplitude = Math.pow(persistence, i);
    const n = noiseFunc(x * frequency, y * frequency);
    value += n * amplitude;
    maxValue += amplitude;
  }

  return value / maxValue;
}

/**
 * Apply progressive domain warping to coordinates
 * Returns warped (x, y) coordinates based on warp iterations and strength
 * When iterations = 0 or strength = 0, returns original coordinates
 *
 * Normalized parameter meanings:
 * - baseFreq: Derived from scale (0-1), where 1.0 = one feature across world (10 chunks)
 * - warpStrength: In tile units, typically 0-32 (0 to ~2 chunks of distortion)
 * - iterations: Recursive warping depth (0-3), each adds more organic distortion
 */
export function applyDomainWarp(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  iterations: number,
  warpStrength: number,
  baseFreq: number,
  seedOffset: number,
): { x: number; y: number } {
  // No warping if disabled
  if (iterations === 0 || warpStrength === 0) {
    return { x: x * baseFreq, y: y * baseFreq };
  }

  const seed = seedOffset * 0.001;
  let px = x * baseFreq;
  let py = y * baseFreq;

  // Warp settings: use fixed octaves for consistent warp behavior
  const warpOctaves = 4;
  const warpLacunarity = 2.0;
  const warpPersistence = 0.5;

  // Progressive warping: apply up to 3 iterations
  if (iterations >= 1) {
    const strength = warpStrength / 2.0;
    const qx = fbmForWarp(
      px + 0.0 + seed,
      py + 0.0 + seed,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    const qy = fbmForWarp(
      px + 5.2 + seed,
      py + 1.3 + seed,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    px = px + strength * qx;
    py = py + strength * qy;
  }

  if (iterations >= 2) {
    const strength = warpStrength / 4.0;
    const rx = fbmForWarp(
      px + 1.7 + seed * 2,
      py + 9.2 + seed * 2,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    const ry = fbmForWarp(
      px + 8.3 + seed * 2,
      py + 2.8 + seed * 2,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    px = px + strength * rx;
    py = py + strength * ry;
  }

  if (iterations >= 3) {
    const strength = warpStrength / 8.0;
    const sx = fbmForWarp(
      px + 3.1 + seed * 3,
      py + 7.4 + seed * 3,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    const sy = fbmForWarp(
      px + 6.9 + seed * 3,
      py + 4.5 + seed * 3,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    px = px + strength * sx;
    py = py + strength * sy;
  }

  return { x: px, y: py };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use applyDomainWarp + computeFBM instead
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
  const seed = seedOffset * 0.001;
  let px = x * baseFreq;
  let py = y * baseFreq;

  const warpOctaves = Math.min(4, octaves);
  const warpLacunarity = 2.0;
  const warpPersistence = 0.5;

  if (iterations >= 1) {
    const strength = warpStrength / 2.0;
    const qx = fbmForWarp(
      px + 0.0 + seed,
      py + 0.0 + seed,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    const qy = fbmForWarp(
      px + 5.2 + seed,
      py + 1.3 + seed,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );

    px = px + strength * qx;
    py = py + strength * qy;
  }

  if (iterations >= 2) {
    const strength = warpStrength / 4.0;
    const rx = fbmForWarp(
      px + 1.7 + seed * 2,
      py + 9.2 + seed * 2,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    const ry = fbmForWarp(
      px + 8.3 + seed * 2,
      py + 2.8 + seed * 2,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );

    px = px + strength * rx;
    py = py + strength * ry;
  }

  if (iterations >= 3) {
    const strength = warpStrength / 8.0;
    const sx = fbmForWarp(
      px + 3.1 + seed * 3,
      py + 7.4 + seed * 3,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );
    const sy = fbmForWarp(
      px + 6.9 + seed * 3,
      py + 4.5 + seed * 3,
      noiseFunc,
      warpOctaves,
      warpLacunarity,
      warpPersistence,
    );

    px = px + strength * sx;
    py = py + strength * sy;
  }

  // Use computeFBM for final evaluation
  return computeFBM(
    px,
    py,
    noiseFunc,
    octaves,
    lacunarity,
    persistence,
    gain,
    seedOffset,
    octaveSettings,
  );
}
