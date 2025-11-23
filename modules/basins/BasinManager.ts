// Basin management - water levels, overflow, and queries

import { CONFIG } from "../config.ts";
import { computeBasinsGenerator } from "./BasinComputation.ts";
import type { BasinData } from "./types.ts";

export class BasinManager {
  basins: Map<string, BasinData>;
  basinIdOf: string[][];
  private nextBasinId: number;
  highlightedBasin: string | null;

  constructor() {
    this.basins = new Map();
    this.basinIdOf = new Array(CONFIG.WORLD_H);
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      this.basinIdOf[y] = new Array(CONFIG.WORLD_W).fill("");
    }
    this.nextBasinId = 1;
    this.highlightedBasin = null;
  }

  computeBasins(heights: number[][]): void {
    performance.mark("basin-computation-start");

    const generator = computeBasinsGenerator(heights, this);

    let result = generator.next("finish");
    while (!result.done) {
      result = generator.next("finish");
    }

    performance.mark("basin-computation-end");
    performance.measure(
      "Total Basin Computation",
      "basin-computation-start",
      "basin-computation-end",
    );

    const measure = performance.getEntriesByName("Total Basin Computation")[0];
    if (measure) {
      console.log(
        `        └─ Basin Computation (${this.basins.size} basins): ${
          measure.duration.toFixed(2)
        }ms`,
      );
    }
  }

  getBasinAt(x: number, y: number): BasinData | null {
    if (x < 0 || y < 0 || x >= CONFIG.WORLD_W || y >= CONFIG.WORLD_H) return null;
    const basinId = this.basinIdOf[y]![x];
    return basinId ? this.basins.get(basinId) || null : null;
  }

  getBasinIdAt(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= CONFIG.WORLD_W || y >= CONFIG.WORLD_H) return null;
    return this.basinIdOf[y]![x] || null;
  }

  getBasin(basinId: string): BasinData | null {
    return this.basins.get(basinId) || null;
  }

  /**
   * Fill basin and its subtree with water or empty it.
   * When filling:
   *   - If basin is empty: fill entire subtree to 100%
   *   - If basin has water: find first ancestor with available capacity and fill from there
   * When emptying: find and empty only the topmost basin with water
   */
  floodFill(startX: number, startY: number, fillWithWater: boolean): void {
    const startBasinId = this.basinIdOf[startY]![startX];
    if (!startBasinId) return;

    const basin = this.basins.get(startBasinId);
    if (!basin) return;

    if (fillWithWater) {
      // Determine which basin subtree to fill
      let fillRootId = startBasinId;

      // If basin has water, find first ancestor with available capacity
      if (basin.volume > 0) {
        fillRootId = this.findFirstAncestorWithCapacity(startBasinId) ?? startBasinId;
      }

      // Fill the entire subtree starting from fillRootId
      this.fillSubtree(fillRootId);
    } else {
      // Find and empty only the topmost basin with water
      const topmostBasin = this.findTopmostBasinWithWater(startBasinId);
      if (topmostBasin) {
        const basin = this.basins.get(topmostBasin);
        if (basin) {
          basin.volume = 0;
        }
      }
    }

    this.updateWaterLevels();
  }

  /**
   * Find first ancestor with available capacity
   */
  private findFirstAncestorWithCapacity(startBasinId: string): string | null {
    let currentId: string | null = startBasinId;

    while (currentId) {
      const current = this.basins.get(currentId);
      if (!current) break;

      if (current.volume < current.capacity) {
        return currentId;
      }

      currentId = current.outlets[0] ?? null;
    }

    return null;
  }

  /**
   * Recursively fill a basin and all its descendants to 100% capacity
   */
  private fillSubtree(basinId: string): void {
    const basin = this.basins.get(basinId);
    if (!basin) return;

    basin.volume = basin.capacity;

    // Find and fill all children (basins that have this basin as outlet/parent)
    for (const [childId, childBasin] of this.basins) {
      if (childBasin.outlets[0] === basinId) {
        this.fillSubtree(childId);
      }
    }
  }

  /**
   * Find the topmost (shallowest) basin with water in the ancestry chain.
   */
  private findTopmostBasinWithWater(startBasinId: string): string | null {
    let topmostWithWater: string | null = null;
    let currentId: string | null = startBasinId;

    while (currentId) {
      const current = this.basins.get(currentId);
      if (!current) break;

      if (current.volume > 0) {
        topmostWithWater = currentId;
      }

      currentId = current.outlets[0] ?? null;
    }

    return topmostWithWater;
  }

  updateWaterLevels(): void {
    this.handleWaterOverflow();

    this.basins.forEach((basin) => {
      const capacityPerLevel = basin.capacity / basin.height; // Use total capacity
      basin.level = Math.floor(basin.volume / capacityPerLevel);
      if (basin.level < 0) basin.level = 0;
      if (basin.level > CONFIG.MAX_DEPTH) basin.level = CONFIG.MAX_DEPTH;
    });
  }

  handleWaterOverflow(): void {
    const sortedBasins = Array.from(this.basins.entries()).sort((a, b) =>
      b[1].height - a[1].height
    );

    sortedBasins.forEach(([, basin]) => {
      if (!basin.outlets || basin.outlets.length === 0) return;

      const maxCapacity = basin.capacity; // Use pre-computed total capacity
      if (basin.volume > maxCapacity) {
        const overflow = basin.volume - maxCapacity;
        basin.volume = maxCapacity;

        const outletCount = basin.outlets.length;
        const overflowPerOutlet = overflow / outletCount;

        basin.outlets.forEach((outletId) => {
          const outletBasin = this.basins.get(outletId);
          if (outletBasin) {
            outletBasin.volume += overflowPerOutlet;
          }
        });
      }
    });
  }

  clearAllWater(): void {
    this.basins.forEach((basin) => {
      basin.volume = 0;
      basin.level = 0;
    });
  }

  setHighlightedBasin(basinId: string | null): void {
    this.highlightedBasin = basinId;
  }

  getHighlightedBasin(): string | null {
    return this.highlightedBasin;
  }
}
