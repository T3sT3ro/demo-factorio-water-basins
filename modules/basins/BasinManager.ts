// Basin management - water levels, overflow, and queries

import { CONFIG } from "../config.ts";
import { computeBasinsGenerator } from "./BasinComputation.ts";
import type { BasinData, BasinDebugInfo } from "./types.ts";

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
        `        └─ Basin Computation (${this.basins.size} basins): ${measure.duration.toFixed(2)}ms`,
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

  floodFill(startX: number, startY: number, fillWithWater: boolean): void {
    const startBasinId = this.basinIdOf[startY]![startX];
    if (!startBasinId) return;

    const basin = this.basins.get(startBasinId);
    if (!basin) return;

    if (fillWithWater) {
      basin.volume = basin.tiles.size * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
    } else {
      basin.volume = 0;
    }

    this.updateWaterLevels();
  }

  updateWaterLevels(): void {
    this.handleWaterOverflow();

    this.basins.forEach((basin) => {
      const capacityPerLevel = basin.tiles.size * CONFIG.VOLUME_UNIT;
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

      const maxCapacity = basin.tiles.size * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
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

  getDebugInfo(heights: number[][]): BasinDebugInfo {
    const connections = new Map<string, Set<string>>();
    const basinArray = Array.from(this.basins.entries()).sort((a, b) => {
      const [levelA, lettersA] = a[0].split("#");
      const [levelB, lettersB] = b[0].split("#");
      if (levelA !== levelB) return parseInt(levelA!) - parseInt(levelB!);
      return lettersA!.localeCompare(lettersB!);
    });

    basinArray.forEach(([id, basin]) => {
      connections.set(id, new Set());
      basin.tiles.forEach((tileKey) => {
        const parts = tileKey.split(",");
        const tx = parseInt(parts[0]!);
        const ty = parseInt(parts[1]!);

        const directions: [number, number][] = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
        ];

        directions.forEach(([dx, dy]) => {
          const nx = tx + dx, ny = ty + dy;
          if (nx >= 0 && ny >= 0 && nx < CONFIG.WORLD_W && ny < CONFIG.WORLD_H) {
            const neighborBasinId = this.basinIdOf[ny]![nx];
            if (neighborBasinId && neighborBasinId !== id) {
              const isDiagonal = Math.abs(dx) + Math.abs(dy) === 2;
              if (isDiagonal && heights) {
                const cross1x = tx + dx, cross1y = ty;
                const cross2x = tx, cross2y = ty + dy;

                if (
                  cross1x >= 0 && cross1x < CONFIG.WORLD_W && cross1y >= 0 &&
                  cross1y < CONFIG.WORLD_H &&
                  cross2x >= 0 && cross2x < CONFIG.WORLD_W && cross2y >= 0 &&
                  cross2y < CONFIG.WORLD_H
                ) {
                  const cross1IsLand = heights[cross1y]![cross1x] === 0;
                  const cross2IsLand = heights[cross2y]![cross2x] === 0;

                  if (cross1IsLand && cross2IsLand) return;
                }
              }

              connections.get(id)!.add(neighborBasinId);
            }
          }
        });
      });
    });

    const basinCount = this.basins.size;
    const maxDepth = basinArray.length > 0
      ? Math.max(...basinArray.map(([id]) => parseInt(id.split("#")[0]!)))
      : 0;

    let maxDegree = 0;
    connections.forEach((connectionSet) => {
      maxDegree = Math.max(maxDegree, connectionSet.size);
    });

    return {
      basinCount,
      maxDepth,
      maxDegree,
      basinArray,
      connections,
    };
  }
}
