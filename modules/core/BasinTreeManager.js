// BasinTreeManager: handles basin tree structure, encoding, decoding, and analysis
// @ts-check
import { BasinManager } from "../basins.js";

export class BasinTreeManager {
  /** @type {BasinManager} */
  #basinManager;

  constructor() {
    this.#basinManager = new BasinManager();
  }

  /** @param {number[][]} heights */
  computeBasins(heights) {
    this.#basinManager.computeBasins(heights);
  }

  /** @param {number} x @param {number} y @param {boolean} fillWithWater */
  floodFill(x, y, fillWithWater) {
    this.#basinManager.floodFill(x, y, fillWithWater);
  }

  clearAllWater() {
    this.#basinManager.clearAllWater();
  }

  /** @param {string} basinId */
  setHighlightedBasin(basinId) {
    this.#basinManager.setHighlightedBasin(basinId);
  }

  getHighlightedBasin() {
    return this.#basinManager.getHighlightedBasin();
  }

  get basins() { return this.#basinManager.basins; }
  get basinIdOf() { return this.#basinManager.basinIdOf; }
  get basinManager() { return this.#basinManager; }
}
