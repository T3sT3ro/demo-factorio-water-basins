// TerrainManager: handles terrain generation, encoding, decoding
import { CONFIG } from "../config.js";
import { HeightGenerator } from "../noise.js";

export class TerrainManager {
  readonly #heightGenerator: HeightGenerator;
  #heights: number[][];
  #seed: number;

  constructor({ width, height, maxDepth, seed = 0 }: TerrainManagerOptions) {
    this.#heightGenerator = new HeightGenerator(width, height, maxDepth);
    this.#seed = seed;
    this.#heights = this.#heightGenerator.generate(this.#seed);
  }

  setDepthAt(x: number, y: number, depth: number): void {
    if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
      this.#heights[y][x] = Math.max(0, Math.min(CONFIG.MAX_DEPTH, depth));
    }
  }

  getMinNeighborHeight(x: number, y: number): number {
    let minHeight = CONFIG.MAX_DEPTH + 1;
    const neighbors: [number, number][] = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && ny >= 0 && nx < CONFIG.WORLD_W && ny < CONFIG.WORLD_H) {
        minHeight = Math.min(minHeight, this.#heights[ny][nx]);
      }
    }
    
    return minHeight <= CONFIG.MAX_DEPTH ? minHeight : this.#heights[y][x];
  }

  randomizeHeights(): void {
    this.#seed = Math.random() * 1000;
    this.#heights = this.#heightGenerator.generate(this.#seed);
  }

  regenerateWithCurrentSettings(): void {
    this.#heights = this.#heightGenerator.generate(this.#seed);
  }

  get heights(): number[][] { 
    return this.#heights; 
  }
  
  get seed(): number { 
    return this.#seed; 
  }
  
  get heightGenerator(): HeightGenerator { 
    return this.#heightGenerator; 
  }
}
