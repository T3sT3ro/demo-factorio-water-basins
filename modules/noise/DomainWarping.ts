// Recursive domain warping - Book of Shaders style
// f(p) = fbm( p + fbm( p + fbm( p ) ) )

import { noise2D, type NoiseFunction } from "./NoiseAlgorithms.ts";

export function warpedNoise2D(
  x: number,
  y: number,
  noiseFunc: NoiseFunction,
  octaves: number,
  lacunarity: number,
  persistence: number,
  gain: number,
  iterations: number = 2,
  warpStrength: number = 1.0,
  baseFreq: number = 1.0,
): number {
  let px = x * baseFreq;
  let py = y * baseFreq;

  // Apply recursive domain warping
  for (let i = 0; i < iterations; i++) {
    const warpScale = warpStrength / Math.pow(2, i); // Reduce strength each iteration
    const freq = baseFreq * Math.pow(2, i); // Increase frequency each iteration

    // Generate warp offsets using noise
    const warpX = noise2D(px * freq, py * freq) * warpScale;
    const warpY = noise2D(px * freq + 100, py * freq + 100) * warpScale;

    // Apply warp
    px += warpX;
    py += warpY;
  }

  // Now generate octaves of noise at the warped coordinates
  let value = 0;
  let maxValue = 0;
  let frequency = 1.0;
  let amplitude = 1.0;

  for (let i = 0; i < octaves; i++) {
    const n = noiseFunc(px * frequency, py * frequency);
    value += n * amplitude * gain;
    maxValue += amplitude;

    frequency *= lacunarity;
    amplitude *= persistence;
  }

  return maxValue > 0 ? value / maxValue : 0;
}
