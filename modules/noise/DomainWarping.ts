/// Domain Warping Algorithms - Advanced noise techniques using recursive domain warping
import { type NoiseFunction, noise2D } from './NoiseAlgorithms.ts';

/// Domain warping parameters
export interface WarpParameters {
  /// Number of recursive warping iterations
  iterations: number;
  /// Strength of warping effect
  strength: number;
  /// Base frequency for warping
  baseFreq: number;
}

/// Octave generation parameters
export interface OctaveParameters {
  /// Number of octaves
  octaves: number;
  /// Frequency multiplier between octaves
  lacunarity: number;
  /// Amplitude multiplier between octaves
  persistence: number;
  /// Overall gain/amplification
  gain: number;
}

/// Simple domain warping - single iteration
export function simpleWarp2D(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  warpStrength: number,
  seedOffset = 0
): number {
  if (warpStrength <= 0) {
    return noiseFunc(x, y);
  }

  const warpX = x + noise2D(x * 0.01 + seedOffset, y * 0.01) * warpStrength;
  const warpY = y + noise2D(x * 0.01, y * 0.01 + seedOffset) * warpStrength;
  
  return noiseFunc(warpX, warpY);
}

/// Recursive domain warping (Book of Shaders style) - f(p) = fbm( p + fbm( p + fbm( p ) ) )
export function recursiveWarp2D(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  octaveParams: OctaveParameters,
  warpParams: WarpParameters
): number {
  let px = x * warpParams.baseFreq;
  let py = y * warpParams.baseFreq;

  /// Apply recursive domain warping
  for (let i = 0; i < warpParams.iterations; i++) {
    const warpScale = warpParams.strength / Math.pow(2, i);
    const freq = warpParams.baseFreq * Math.pow(2, i);

    const warpX = noise2D(px * freq, py * freq) * warpScale;
    const warpY = noise2D(px * freq + 100, py * freq + 100) * warpScale;

    px += warpX;
    py += warpY;
  }

  return generateOctaves(px, py, noiseFunc, octaveParams);
}

/// Generate fractal octaves of noise
export function generateOctaves(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  params: OctaveParameters
): number {
  let value = 0;
  let maxValue = 0;
  let frequency = 1.0;
  let amplitude = 1.0;

  for (let i = 0; i < params.octaves; i++) {
    const n = noiseFunc(x * frequency, y * frequency);
    value += n * amplitude * params.gain;
    maxValue += amplitude;

    frequency *= params.lacunarity;
    amplitude *= params.persistence;
  }

  return maxValue > 0 ? value / maxValue : 0;
}

/// Generate octaves with custom per-octave settings
export function generateCustomOctaves(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  octaveSettings: Array<{ frequency: number; amplitude: number }>,
  gain: number
): number {
  let value = 0;
  let maxValue = 0;

  for (const octave of octaveSettings) {
    const n = noiseFunc(x * octave.frequency, y * octave.frequency);
    value += n * octave.amplitude * gain;
    maxValue += octave.amplitude;
  }

  return maxValue > 0 ? value / maxValue : 0;
}

/// Default octave parameters for standard FBM
export const DEFAULT_OCTAVE_PARAMS: OctaveParameters = {
  octaves: 3,
  lacunarity: 2.0,
  persistence: 0.5,
  gain: 1.0
};

/**
 * Default warp parameters for subtle warping
 */
export const DEFAULT_WARP_PARAMS: WarpParameters = {
  iterations: 2,
  strength: 1.0,
  baseFreq: 1.0
};
