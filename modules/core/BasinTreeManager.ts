// BasinTreeManager: handles basin tree structure, encoding, decoding, and analysis
import { BasinManager } from "../basins.ts";

export class BasinTreeManager {
  #basinManager: BasinManager;

  constructor() {
    this.#basinManager = new BasinManager();
  }

  computeBasins(heights: number[][]): void {
    this.#basinManager.computeBasins(heights);
  }

  floodFill(x: number, y: number, fillWithWater: boolean): void {
    this.#basinManager.floodFill(x, y, fillWithWater);
  }

  clearAllWater(): void {
    this.#basinManager.clearAllWater();
  }

  setHighlightedBasin(basinId: string): void {
    this.#basinManager.setHighlightedBasin(basinId);
  }

  getHighlightedBasin(): string | null {
    return this.#basinManager.getHighlightedBasin();
  }

  get basins() { return this.#basinManager.basins; }
  get basinIdOf() { return this.#basinManager.basinIdOf; }
  get basinManager() { return this.#basinManager; }
}
