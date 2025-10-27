// Basin computation with step-by-step debugging support

import { CONFIG } from "./config.ts";
import type { BasinManager } from "./basins.ts";

export type DebugStepGranularity = "one" | "stage" | "finish";

interface TempBasinData {
  tiles: Set<string>;
  height: number;
  outlets: Set<TempBasinData>;
}

export interface DebugState {
  currentStage: "flood-fill" | "outlets" | "assignment" | "complete";
  currentDepth: number;
  currentTileIndex: number;
  currentBasinIndex: number;
  processedTiles: Set<string>; // Purple - already processed and added to basin
  pendingTiles: Set<string>; // Pastel pink - in queue to be processed
  activeTile: { x: number; y: number } | null; // Green - currently being processed
  currentBasinTiles: Set<string> | null; // Tiles in the current basin being built
  tempBasins: Map<number, TempBasinData[]>;
  basinDataToId: Map<TempBasinData, string>;
  heights: number[][];
  visited: boolean[][];
  tileToBasin: Map<string, TempBasinData>;
  floodFillQueue: Array<{ x: number; y: number; depth: number }>;
}

export class BasinDebugGenerator {
  private basinManager: BasinManager;
  private debugState: DebugState | null = null;
  private isDebugging = false;

  constructor(basinManager: BasinManager) {
    this.basinManager = basinManager;
  }

  startDebugging(heights: number[][]): void {
    this.isDebugging = true;

    // Clear existing basin data
    this.basinManager.basinIdOf.forEach((row) => row.fill(""));
    this.basinManager.basins.clear();

    // Initialize debug state
    const visited = new Array(CONFIG.WORLD_H);
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      visited[y] = new Array(CONFIG.WORLD_W).fill(false);
    }

    this.debugState = {
      currentStage: "flood-fill",
      currentDepth: 1,
      currentTileIndex: 0,
      currentBasinIndex: 0,
      processedTiles: new Set(),
      pendingTiles: new Set(),
      activeTile: null,
      currentBasinTiles: null,
      tempBasins: new Map(),
      basinDataToId: new Map(),
      heights: heights,
      visited: visited,
      tileToBasin: new Map(),
      floodFillQueue: [],
    };
  }

  isInDebugMode(): boolean {
    return this.isDebugging;
  }

  getDebugState(): DebugState | null {
    return this.debugState;
  }

  step(
    granularity: DebugStepGranularity,
  ): { complete: boolean; currentTile?: { x: number; y: number } } {
    if (!this.debugState) return { complete: true };

    switch (this.debugState.currentStage) {
      case "flood-fill":
        return this.stepFloodFill(granularity);
      case "outlets":
        return this.stepOutlets(granularity);
      case "assignment":
        return this.stepAssignment(granularity);
      case "complete":
        return { complete: true };
    }
  }

  private stepFloodFill(
    granularity: DebugStepGranularity,
  ): { complete: boolean; currentTile?: { x: number; y: number } } {
    if (!this.debugState) return { complete: true };

    const { heights: _heights, visited: _visited } = this.debugState;

    // Process tiles at current depth
    if (granularity === "finish") {
      // Complete all remaining flood fill
      for (let depth = this.debugState.currentDepth; depth <= CONFIG.MAX_DEPTH; depth++) {
        this.processDepthLevel(depth);
      }
      this.debugState.currentStage = "outlets";
      return { complete: false };
    } else if (granularity === "stage") {
      // Complete current depth level
      this.processDepthLevel(this.debugState.currentDepth);
      this.debugState.currentDepth++;
      if (this.debugState.currentDepth > CONFIG.MAX_DEPTH) {
        this.debugState.currentStage = "outlets";
      }
      return { complete: false };
    } else {
      // Process one tile
      const result = this.processSingleTile();
      return result;
    }
  }

  private processDepthLevel(depth: number): void {
    if (!this.debugState) return;

    const { heights, visited, tileToBasin, tempBasins } = this.debugState;

    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        if (!visited[y]![x] && heights[y]![x] === depth) {
          const tiles = this.floodFillFrom(x, y, depth);
          const basinData: TempBasinData = {
            tiles,
            height: depth,
            outlets: new Set<TempBasinData>(),
          };

          if (!tempBasins.has(depth)) {
            tempBasins.set(depth, []);
          }
          tempBasins.get(depth)!.push(basinData);

          tiles.forEach((tileKey) => {
            tileToBasin.set(tileKey, basinData);
          });
        }
      }
    }
  }

  private processSingleTile(): { complete: boolean; currentTile?: { x: number; y: number } } {
    if (!this.debugState) return { complete: true };

    const { heights, visited, currentDepth } = this.debugState;

    // If we have tiles in the flood fill queue, process one tile from it
    if (this.debugState.floodFillQueue.length > 0) {
      const { x, y, depth } = this.debugState.floodFillQueue.shift()!;
      const key = `${x},${y}`;

      // Remove from pending since we're processing it now
      this.debugState.pendingTiles.delete(key);

      // Set as active tile
      this.debugState.activeTile = { x, y };

      // Skip if already visited or wrong depth
      if (visited[y]![x] || heights[y]![x] !== depth) {
        // Continue to next tile without marking complete
        return this.processSingleTile();
      }

      // Mark as visited and processed
      visited[y]![x] = true;
      this.debugState.processedTiles.add(key);

      // Add to current basin if it exists
      if (this.debugState.currentBasinTiles) {
        this.debugState.currentBasinTiles.add(key);
      }

      // Add 8-directional neighbors to queue
      const neighbors: Array<[number, number]> = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && ny >= 0 && nx < CONFIG.WORLD_W && ny < CONFIG.WORLD_H) {
          if (heights[ny]![nx] === depth && !visited[ny]![nx]) {
            // Check diagonal blocking
            if (Math.abs(nx - x) === 1 && Math.abs(ny - y) === 1) {
              const cross1x = x, cross1y = ny;
              const cross2x = nx, cross2y = y;
              const cross1IsLand = heights[cross1y]![cross1x] === 0;
              const cross2IsLand = heights[cross2y]![cross2x] === 0;
              if (cross1IsLand && cross2IsLand) continue;
            }
            const neighborKey = `${nx},${ny}`;
            this.debugState.floodFillQueue.push({ x: nx, y: ny, depth });
            this.debugState.pendingTiles.add(neighborKey);
          }
        }
      }

      return { complete: false, currentTile: { x, y } };
    }

    // No more tiles in current basin's queue, finalize current basin
    if (this.debugState.currentBasinTiles && this.debugState.currentBasinTiles.size > 0) {
      const basinData: TempBasinData = {
        tiles: this.debugState.currentBasinTiles,
        height: currentDepth,
        outlets: new Set<TempBasinData>(),
      };

      if (!this.debugState.tempBasins.has(currentDepth)) {
        this.debugState.tempBasins.set(currentDepth, []);
      }
      this.debugState.tempBasins.get(currentDepth)!.push(basinData);

      this.debugState.currentBasinTiles.forEach((tileKey) => {
        this.debugState!.tileToBasin.set(tileKey, basinData);
      });

      this.debugState.currentBasinTiles = null;
      this.debugState.activeTile = null;
    }

    // Find next unvisited tile at current depth to start new basin
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        if (!visited[y]![x] && heights[y]![x] === currentDepth) {
          // Start new basin from this tile
          const key = `${x},${y}`;
          this.debugState.currentBasinTiles = new Set<string>();
          this.debugState.floodFillQueue.push({ x, y, depth: currentDepth });
          this.debugState.pendingTiles.add(key);
          return { complete: false };
        }
      }
    }

    // No more tiles at current depth, move to next
    this.debugState.currentDepth++;
    if (this.debugState.currentDepth > CONFIG.MAX_DEPTH) {
      this.debugState.currentStage = "outlets";
    }
    return { complete: false };
  }

  private floodFillFrom(startX: number, startY: number, targetDepth: number): Set<string> {
    if (!this.debugState) return new Set();

    const { heights, visited } = this.debugState;
    const tiles = new Set<string>();
    const queue: [number, number][] = [[startX, startY]];

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (visited[y]![x] || tiles.has(key)) continue;
      if (heights[y]![x] !== targetDepth) continue;

      visited[y]![x] = true;
      tiles.add(key);
      this.debugState.processedTiles.add(key);

      // Add 8-directional neighbors
      const neighbors: [number, number][] = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ];

      for (const neighbor of neighbors) {
        const nx = neighbor[0];
        const ny = neighbor[1];
        if (nx >= 0 && ny >= 0 && nx < CONFIG.WORLD_W && ny < CONFIG.WORLD_H) {
          if (heights[ny]![nx] === targetDepth && !visited[ny]![nx]) {
            // Check diagonal blocking
            if (Math.abs(nx - x) === 1 && Math.abs(ny - y) === 1) {
              const cross1x = x, cross1y = ny;
              const cross2x = nx, cross2y = y;
              const cross1IsLand = heights[cross1y]![cross1x] === 0;
              const cross2IsLand = heights[cross2y]![cross2x] === 0;
              if (cross1IsLand && cross2IsLand) continue;
            }
            queue.push([nx, ny]);
          }
        }
      }
    }
    return tiles;
  }

  private stepOutlets(_granularity: DebugStepGranularity): { complete: boolean } {
    if (!this.debugState) return { complete: true };

    // Outlet detection logic (simplified for now)
    // TODO: Implement step-by-step outlet detection
    this.completeOutlets();
    this.debugState.currentStage = "assignment";
    return { complete: false };
  }

  private completeOutlets(): void {
    if (!this.debugState) return;

    const { tempBasins, heights, tileToBasin } = this.debugState;

    tempBasins.forEach((basinsAtLevel, currentDepth) => {
      basinsAtLevel.forEach((basin) => {
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
            if (nx < 0 || ny < 0 || nx >= CONFIG.WORLD_W || ny >= CONFIG.WORLD_H) return;

            const neighborHeight = heights[ny]![nx]!;
            const neighborKey = nx + "," + ny;

            if (
              neighborHeight > 0 && neighborHeight < currentDepth && tileToBasin.has(neighborKey)
            ) {
              const neighborBasin = tileToBasin.get(neighborKey)!;
              basin.outlets.add(neighborBasin);
            }
          });
        });
      });
    });
  }

  private stepAssignment(_granularity: DebugStepGranularity): { complete: boolean } {
    if (!this.debugState) return { complete: true };

    // Complete assignment and finish
    this.completeAssignment();
    this.debugState.currentStage = "complete";
    this.isDebugging = false;
    return { complete: true };
  }

  private completeAssignment(): void {
    if (!this.debugState) return;

    const { tempBasins, basinDataToId } = this.debugState;

    // Assign IDs to all basins
    tempBasins.forEach((basinsAtLevel, level) => {
      basinsAtLevel.forEach((basinData, index) => {
        const letters = this.generateLetterSequence(index);
        const id = `${level}#${letters}`;
        basinDataToId.set(basinData, id);

        this.basinManager.basins.set(id, {
          tiles: basinData.tiles,
          volume: 0,
          level: 0,
          height: level,
          outlets: [],
        });

        basinData.tiles.forEach((k) => {
          const parts = k.split(",");
          const tx = parseInt(parts[0]!);
          const ty = parseInt(parts[1]!);
          this.basinManager.basinIdOf[ty]![tx] = id;
        });
      });
    });

    // Fill in outlet IDs
    tempBasins.forEach((basinsAtLevel) => {
      basinsAtLevel.forEach((basinData) => {
        const basinId = basinDataToId.get(basinData);
        const basin = this.basinManager.basins.get(basinId!);

        if (basin) {
          basin.outlets = Array.from(basinData.outlets)
            .map((outletData) => basinDataToId.get(outletData))
            .filter((id): id is string => id !== undefined);
        }
      });
    });
  }

  private generateLetterSequence(index: number): string {
    let result = "";
    let num = index;

    do {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    } while (num >= 0);

    return result;
  }
}
