// Main noise module - height generation with performance tracking

import { NoiseSettings, type NoiseType } from "./NoiseSettings.ts";
import {
  billowyNoise2D,
  noise2D,
  type NoiseFunction,
  ridgedNoise2D,
  simplex2D,
} from "./NoiseAlgorithms.ts";
import { warpedNoise2D } from "./DomainWarping.ts";

export { NoiseSettings, type NoiseType };
export { billowyNoise2D, noise2D, type NoiseFunction, ridgedNoise2D, simplex2D };
export { warpedNoise2D };

// Height generation using Perlin noise
export class HeightGenerator {
  private worldW: number;
  private worldH: number;
  private maxDepth: number;
  private noiseSettings: NoiseSettings;

  constructor(worldW: number, worldH: number, maxDepth: number) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.maxDepth = maxDepth;
    this.noiseSettings = new NoiseSettings();
  }

  generate(seedOffset: number = 0): number[][] {
    performance.mark("noise-generation-start");

    const heights: number[][] = new Array(this.worldH);
    for (let y = 0; y < this.worldH; y++) {
      heights[y] = new Array(this.worldW).fill(0);
    }

    performance.mark("noise-function-selection-start");
    // Select noise function based on type
    let noiseFunc: NoiseFunction;
    switch (this.noiseSettings.noiseType) {
      case "simplex":
        noiseFunc = simplex2D;
        break;
      case "ridged":
        noiseFunc = ridgedNoise2D;
        break;
      case "billowy":
        noiseFunc = billowyNoise2D;
        break;
      default:
        noiseFunc = noise2D;
        break;
    }
    performance.mark("noise-function-selection-end");

    performance.mark("noise-calculation-start");
    let warpedPixels = 0;
    let standardPixels = 0;

    for (let y = 0; y < this.worldH; y++) {
      for (let x = 0; x < this.worldW; x++) {
        let value = 0;

        // Apply recursive domain warping if enabled
        if (this.noiseSettings.warpStrength > 0 && this.noiseSettings.warpIterations > 1) {
          warpedPixels++;
          // Use recursive warping with proper octaves
          value = warpedNoise2D(
            x,
            y,
            noiseFunc,
            this.noiseSettings.octaves,
            this.noiseSettings.lacunarity,
            this.noiseSettings.persistence,
            this.noiseSettings.gain,
            this.noiseSettings.warpIterations,
            this.noiseSettings.warpStrength,
            this.noiseSettings.baseFreq,
            seedOffset,
            this.noiseSettings.octaveSettings,
          );
        } else {
          standardPixels++;
          // Standard octave generation with optional simple warping
          let warpX = x;
          let warpY = y;
          if (this.noiseSettings.warpStrength > 0) {
            warpX += noise2D(x * 0.01 + seedOffset, y * 0.01) * this.noiseSettings.warpStrength;
            warpY += noise2D(x * 0.01, y * 0.01 + seedOffset) * this.noiseSettings.warpStrength;
          }

          // Generate octaves with enhanced controls
          let maxValue = 0;
          let frequency = this.noiseSettings.baseFreq;
          let amplitude = 1.0;

          for (let i = 0; i < this.noiseSettings.octaves; i++) {
            // Use custom octave settings if available
            const octaveSetting = this.noiseSettings.octaveSettings[i];
            if (octaveSetting) {
              frequency = octaveSetting.frequency;
              amplitude = octaveSetting.amplitude;
            } else {
              // Use lacunarity and persistence
              frequency = this.noiseSettings.baseFreq * Math.pow(this.noiseSettings.lacunarity, i);
              amplitude = Math.pow(this.noiseSettings.persistence, i);
            }

            const n = noiseFunc(warpX * frequency + seedOffset, warpY * frequency - seedOffset);
            value += n * amplitude * this.noiseSettings.gain;
            maxValue += amplitude;
          }

          // Normalize
          if (maxValue > 0) {
            value = value / maxValue;
          }
        }

        // Apply offset and final scaling
        value = (value + this.noiseSettings.offset) * 0.5 + 0.5; // Apply offset and normalize to 0..1
        value = Math.max(0, Math.min(1, value)); // Clamp to 0-1 range
        heights[y]![x] = Math.floor(value * (this.maxDepth + 1));
      }
    }
    performance.mark("noise-calculation-end");

    performance.mark("noise-generation-end");

    // Measure performance
    performance.measure(
      "Noise Function Selection",
      "noise-function-selection-start",
      "noise-function-selection-end",
    );
    performance.measure("Noise Calculation", "noise-calculation-start", "noise-calculation-end");
    performance.measure("Total Noise Generation", "noise-generation-start", "noise-generation-end");

    // Log detailed performance info
    const measures = performance.getEntriesByType("measure");
    const recentMeasures = measures.slice(-3);
    console.log(
      `      └─ Noise Performance (${this.worldW}x${this.worldH}, ${this.noiseSettings.octaves} octaves):`,
    );
    recentMeasures.forEach((measure) => {
      console.log(`         ${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });

    if (warpedPixels > 0) {
      console.log(
        `         Warped pixels: ${warpedPixels} (${
          ((warpedPixels / (this.worldW * this.worldH)) * 100).toFixed(1)
        }%)`,
      );
    }
    if (standardPixels > 0) {
      console.log(
        `         Standard pixels: ${standardPixels} (${
          ((standardPixels / (this.worldW * this.worldH)) * 100).toFixed(1)
        }%)`,
      );
    }

    return heights;
  }

  getNoiseSettings(): NoiseSettings {
    return this.noiseSettings;
  }
}
