// Basin computation and management

import { CONFIG } from "./config.ts";

interface Basin {
  volume: number;
  level: number;
  height: number;
  outlets: Array<{x: number, y: number, height: number}>;
  parent: number | null;
  tileCount: number;
}

interface BasinComputeOptions {
  forceRecompute?: boolean;
  skipOptimization?: boolean;
}

export class BasinManager {
  basins: Map<string, Basin>;
  basinIdOf: string[][];
  nextBasinId: number;
  highlightedBasin: string | null;
  lastHeights: number[][] | null;

  constructor() {
    this.basins = new Map(); // id -> {volume, level, height, outlets, parent, tileCount}
    this.basinIdOf = new Array(CONFIG.WORLD_H);
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      this.basinIdOf[y] = new Array(CONFIG.WORLD_W).fill("0");
    }
    this.nextBasinId = 1;
    this.highlightedBasin = null;
    
    // Optimization state
    this.lastHeights = null;
  }

  /**
   * Get all tiles that belong to a specific basin
   * @param basinId - The basin ID to get tiles for
   * @returns Array of tile coordinates as "x,y" strings
   */
  getBasinTiles(basinId: string): string[] {
    const tiles: string[] = [];
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        if (this.basinIdOf[y]![x] === basinId) {
          tiles.push(`${x},${y}`);
        }
      }
    }
    return tiles;
  }

  /**
   * Get tile count for a specific basin
   * @param basinId - The basin ID
   * @returns Number of tiles in the basin
   */
  getBasinTileCount(basinId: string): number {
    const basin = this.basins.get(basinId);
    return basin ? basin.tileCount : 0;
  }

  /**
   * Update tile count for a basin (called during basin creation)
   * @param basinId - The basin ID
   * @param count - The new tile count
   */
  updateBasinTileCount(basinId: string, count: number): void {
    const basin = this.basins.get(basinId);
    if (basin) {
      basin.tileCount = count;
    }
  }

  /**
   * Compute basins from height map
   * @param heights - 2D array of height values
   * @param _options - Computation options
   */
  computeBasins(heights: number[][], _options: BasinComputeOptions = {}): void {
    console.log('BasinManager.computeBasins called');

    performance.mark("basin-computation-start");

    // Check if we can skip computation
    const changedTiles = this.detectChangedTiles(heights);
    if (changedTiles.size === 0 && this.lastHeights !== null) {
      performance.mark("basin-computation-end");
      performance.measure("Total Basin Computation", "basin-computation-start", "basin-computation-end");
      return;
    }

    // Clear existing data
    this.clearBasinData();

    // Generate single basin for all water tiles
    this.generateSingleBasin(heights);

    // Store current heights for next comparison
    this.lastHeights = heights.map(row => [...row]);

    performance.mark("basin-computation-end");
    performance.measure("Total Basin Computation", "basin-computation-start", "basin-computation-end");

    // Log performance info
    this.logPerformance(changedTiles.size);
  }

  clearBasinData() {
    this.basinIdOf.forEach(row => row.fill("0"));
    this.basins.clear();
    this.nextBasinId = 1;
  }

  logPerformance(changedTilesCount: number): void {
    const measures = performance.getEntriesByType("measure");
    const lastMeasure = measures[measures.length - 1];
    if (lastMeasure) {
      console.log(
        `        └─ Basin Computation (${changedTilesCount} changed tiles, ${this.basins.size} basins): ${lastMeasure.duration.toFixed(2)}ms`
      );
    }
  }

  generateSingleBasin(heights: number[][]): void {
    const basinId = "0#A";
    let waterTileCount = 0;
    
    // Process all water tiles and assign them to the single basin
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const depth = heights[y]![x]!;
        if (depth > 0) { // Water tile
          this.basinIdOf[y]![x] = basinId;
          waterTileCount++;
        }
      }
    }
    
    // Create the single basin if there are water tiles
    if (waterTileCount > 0) {
      const basin = this.createBasin([], 1); // Use depth 1 for all water
      basin.tileCount = waterTileCount;
      this.basins.set(basinId, basin);
    }
  }

  detectChangedTiles(heights: number[][]): Set<string> {
    const changed = new Set<string>();

    if (!this.lastHeights) {
      // First run - everything is "changed"
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (heights[y]![x]! > 0) {
            changed.add(`${x},${y}`);
          }
        }
      }
      return changed;
    }

    // Find actually changed tiles
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        if (heights[y]![x]! !== this.lastHeights[y]![x]!) {
          changed.add(`${x},${y}`);
        }
      }
    }

    return changed;
  }

  // Helper methods
  isValidTile(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H;
  }

  createBasin(tiles: unknown, depth: number): Basin {
    return {
      volume: 0,
      level: 0,
      height: depth,
      outlets: [],
      parent: null,
      tileCount: tiles instanceof Array ? tiles.length : (typeof tiles === 'object' && tiles !== null && 'size' in tiles ? (tiles as Set<unknown>).size : 0)
    };
  }

  // Basin management and water simulation methods

  // Basin management methods (rest of the API)
  getBasinAt(x: number, y: number): Basin | null {
    if (!this.isValidTile(x, y)) return null;
    const basinId = this.basinIdOf[y]![x];
    return basinId ? this.basins.get(basinId) || null : null;
  }

  getBasinIdAt(x: number, y: number): string | null {
    if (!this.isValidTile(x, y)) return null;
    return this.basinIdOf[y]![x] || null;
  }

  floodFill(startX: number, startY: number, fillWithWater: boolean): void {
    const startBasinId = this.basinIdOf[startY]![startX];
    if (!startBasinId) return;

    const basin = this.basins.get(startBasinId);
    if (!basin) return;

    if (fillWithWater) {
      basin.volume = basin.tileCount * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
    } else {
      basin.volume = 0;
    }

    this.updateWaterLevels();
  }

  updateWaterLevels(): void {
    this.handleWaterOverflow();

    this.basins.forEach((basin) => {
      const capacityPerLevel = basin.tileCount * CONFIG.VOLUME_UNIT;
      basin.level = Math.floor(basin.volume / capacityPerLevel);
      if (basin.level < 0) basin.level = 0;
      if (basin.level > CONFIG.MAX_DEPTH) basin.level = CONFIG.MAX_DEPTH;
    });
  }

  handleWaterOverflow(): void {
    const sortedBasins = Array.from(this.basins.entries()).sort((a, b) =>
      b[1].height - a[1].height
    );

    sortedBasins.forEach(([_basinId, basin]) => {
      if (!basin.outlets || basin.outlets.length === 0) return;

      const maxCapacity = basin.tileCount * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
      if (basin.volume > maxCapacity) {
        const overflow = basin.volume - maxCapacity;
        basin.volume = maxCapacity;

        const outletCount = basin.outlets.length;
        const overflowPerOutlet = overflow / outletCount;

        basin.outlets.forEach((outlet) => {
          const outletBasin = this.basins.get(outlet.x + "," + outlet.y);
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

  getBasinAnalysis(heights: number[][] | null): {
    basinCount: number;
    maxDepth: number;
    maxDegree: number;
    basinArray: [string, Basin][];
    connections: Map<string, Set<string>>;
  } {
    const connections = new Map<string, Set<string>>();
    const basinArray = Array.from(this.basins.entries()).sort((a, b) => {
      const [levelA, lettersA] = a[0].split("#");
      const [levelB, lettersB] = b[0].split("#");
      if (levelA !== levelB) return parseInt(levelA || "0") - parseInt(levelB || "0");
      return (lettersA || "").localeCompare(lettersB || "");
    });

    // Build connection graph
    basinArray.forEach(([id]) => {
      connections.set(id, new Set());

      // Iterate through all tiles to find those belonging to this basin
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (this.basinIdOf[y]![x] === id) {
            CONFIG.BASIN_COMPUTATION.DIRECTIONS.ALL.forEach((direction) => {
              const dx = direction[0]!, dy = direction[1]!;
              const nx = x + dx, ny = y + dy;
              if (this.isValidTile(nx, ny)) {
                const neighborBasinId = this.basinIdOf[ny]![nx];
                if (neighborBasinId && neighborBasinId !== id) {
                  const isDiagonal = Math.abs(dx) + Math.abs(dy) === 2;
                  if (isDiagonal && heights) {
                    const cross1x = x + dx, cross1y = y;
                    const cross2x = x, cross2y = y + dy;

                    if (this.isValidTile(cross1x, cross1y) && this.isValidTile(cross2x, cross2y)) {
                      const cross1IsLand = heights[cross1y]![cross1x] === 0;
                      const cross2IsLand = heights[cross2y]![cross2x] === 0;

                      if (cross1IsLand && cross2IsLand) return;
                    }
                  }

                  connections.get(id)!.add(neighborBasinId);
                }
              }
            });
          }
        }
      }
    });

    const basinCount = this.basins.size;
    const maxDepth = basinArray.length > 0
      ? Math.max(...basinArray.map(([id]) => parseInt(id.split("#")[0] || "0")))
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