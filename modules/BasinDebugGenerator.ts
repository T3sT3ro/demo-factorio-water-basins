// Basin computation with step-by-step debugging support using generator

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
  processedTiles: Set<string>; // Purple - already processed and added to basin
  pendingTiles: Set<string>; // Pastel pink - in queue to be processed
  activeTile: { x: number; y: number } | null; // Green - currently being processed
}

type BasinComputationYield = {
  stage: "flood-fill" | "outlets" | "assignment" | "complete";
  depth?: number;
  activeTile?: { x: number; y: number };
  processedTiles: Set<string>;
  pendingTiles: Set<string>;
};

// ============================================================================
// Standalone Helper Functions
// ============================================================================

function generateLetterSequence(index: number): string {
  let result = "";
  let num = index;

  do {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);

  return result;
}

/**
 * Non-generator helper: Flood fill a single basin completely
 */
function floodFillBasin(
  startX: number,
  startY: number,
  depth: number,
  heights: number[][],
  visited: boolean[][],
): Set<string> {
  const tiles = new Set<string>();
  const stack: Array<[number, number]> = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= CONFIG.WORLD_W || y >= CONFIG.WORLD_H) continue;
    if (visited[y]![x]) continue;
    if (heights[y]![x] !== depth) continue;

    visited[y]![x] = true;
    tiles.add(`${x},${y}`);

    const directions: Array<[number, number]> = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= CONFIG.WORLD_W || ny >= CONFIG.WORLD_H) continue;
      if (heights[ny]![nx] !== depth || visited[ny]![nx]) continue;

      // Check diagonal blocking
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        const cross1x = x, cross1y = ny;
        const cross2x = nx, cross2y = y;
        const cross1IsLand = heights[cross1y]![cross1x] === 0;
        const cross2IsLand = heights[cross2y]![cross2x] === 0;
        if (cross1IsLand && cross2IsLand) continue;
      }

      stack.push([nx, ny]);
    }
  }

  return tiles;
}

/**
 * Generator for flood-filling a single basin tile-by-tile
 */
function* floodFillBasinGenerator(
  startX: number,
  startY: number,
  depth: number,
  heights: number[][],
  visited: boolean[][],
  basinsByLevel: Map<number, TempBasinData[]>,
  tileToBasin: Map<string, TempBasinData>,
  processedTiles: Set<string>,
  pendingTiles: Set<string>,
): Generator<BasinComputationYield, void, DebugStepGranularity> {
  const tiles = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  pendingTiles.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const key = `${x},${y}`;

    pendingTiles.delete(key);

    if (visited[y]![x] || tiles.has(key)) continue;
    if (heights[y]![x] !== depth) continue;

    visited[y]![x] = true;
    tiles.add(key);
    processedTiles.add(key);

    // Yield after processing each tile
    yield {
      stage: "flood-fill",
      depth,
      activeTile: { x, y },
      processedTiles,
      pendingTiles,
    };

    // Add 8-directional neighbors
    const directions: Array<[number, number]> = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1], // Cardinal
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1], // Diagonal
    ];

    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= CONFIG.WORLD_W || ny >= CONFIG.WORLD_H) continue;
      if (heights[ny]![nx] !== depth || visited[ny]![nx]) continue;

      // Check diagonal blocking
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        const cross1x = x, cross1y = ny;
        const cross2x = nx, cross2y = y;
        const cross1IsLand = heights[cross1y]![cross1x] === 0;
        const cross2IsLand = heights[cross2y]![cross2x] === 0;
        if (cross1IsLand && cross2IsLand) continue;
      }

      const neighborKey = `${nx},${ny}`;
      if (!pendingTiles.has(neighborKey)) {
        queue.push({ x: nx, y: ny });
        pendingTiles.add(neighborKey);
      }
    }
  }

  // Store the completed basin
  if (tiles.size > 0) {
    const basinData: TempBasinData = { tiles, height: depth, outlets: new Set() };

    if (!basinsByLevel.has(depth)) {
      basinsByLevel.set(depth, []);
    }
    basinsByLevel.get(depth)!.push(basinData);

    tiles.forEach((tileKey) => {
      tileToBasin.set(tileKey, basinData);
    });
  }
}

/**
 * Non-generator helper: Process entire depth level at once
 */
function floodFillDepthLevel(
  depth: number,
  heights: number[][],
  visited: boolean[][],
  basinsByLevel: Map<number, TempBasinData[]>,
  tileToBasin: Map<string, TempBasinData>,
): void {
  for (let y = 0; y < CONFIG.WORLD_H; y++) {
    for (let x = 0; x < CONFIG.WORLD_W; x++) {
      if (visited[y]![x] || heights[y]![x] !== depth) continue;

      const tiles = floodFillBasin(x, y, depth, heights, visited);

      if (tiles.size > 0) {
        const basinData: TempBasinData = { tiles, height: depth, outlets: new Set() };

        if (!basinsByLevel.has(depth)) {
          basinsByLevel.set(depth, []);
        }
        basinsByLevel.get(depth)!.push(basinData);

        tiles.forEach((tileKey) => {
          tileToBasin.set(tileKey, basinData);
        });
      }
    }
  }
}

/**
 * Generator for processing a single depth level with step control
 */
function* floodFillDepthLevelGenerator(
  depth: number,
  heights: number[][],
  visited: boolean[][],
  basinsByLevel: Map<number, TempBasinData[]>,
  tileToBasin: Map<string, TempBasinData>,
  processedTiles: Set<string>,
  pendingTiles: Set<string>,
  stepSize: DebugStepGranularity,
): Generator<BasinComputationYield, void, DebugStepGranularity> {
  if (stepSize === "stage" || stepSize === "finish") {
    // Process entire depth level at once
    floodFillDepthLevel(depth, heights, visited, basinsByLevel, tileToBasin);
    return;
  }

  // stepSize === "one": Process tile-by-tile
  for (let y = 0; y < CONFIG.WORLD_H; y++) {
    for (let x = 0; x < CONFIG.WORLD_W; x++) {
      if (visited[y]![x] || heights[y]![x] !== depth) continue;

      // Found a new basin starting point
      yield* floodFillBasinGenerator(
        x,
        y,
        depth,
        heights,
        visited,
        basinsByLevel,
        tileToBasin,
        processedTiles,
        pendingTiles,
      );
    }
  }
}

/**
 * Detect outlets for all basins
 */
function detectOutlets(
  basinsByLevel: Map<number, TempBasinData[]>,
  heights: number[][],
  tileToBasin: Map<string, TempBasinData>,
): void {
  basinsByLevel.forEach((basinsAtLevel, currentDepth) => {
    basinsAtLevel.forEach((basin) => {
      basin.tiles.forEach((tileKey) => {
        const parts = tileKey.split(",");
        const tx = parseInt(parts[0]!);
        const ty = parseInt(parts[1]!);

        const directions: Array<[number, number]> = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
        ];

        directions.forEach(([dx, dy]) => {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= CONFIG.WORLD_W || ny >= CONFIG.WORLD_H) return;

          const neighborHeight = heights[ny]![nx]!;
          const neighborKey = `${nx},${ny}`;

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

/**
 * Assign IDs to all basins and populate BasinManager
 */
function assignBasinIds(
  basinsByLevel: Map<number, TempBasinData[]>,
  basinManager: BasinManager,
): void {
  const basinDataToId = new Map<TempBasinData, string>();

  // First pass: Assign IDs
  basinsByLevel.forEach((basinsAtLevel, level) => {
    basinsAtLevel.forEach((basinData, index) => {
      const letters = generateLetterSequence(index);
      const id = `${level}#${letters}`;

      basinDataToId.set(basinData, id);

      basinManager.basins.set(id, {
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
        basinManager.basinIdOf[ty]![tx] = id;
      });
    });
  });

  // Second pass: Fill in outlet IDs
  basinsByLevel.forEach((basinsAtLevel) => {
    basinsAtLevel.forEach((basinData) => {
      const basinId = basinDataToId.get(basinData);
      const basin = basinManager.basins.get(basinId!);

      if (basin) {
        basin.outlets = Array.from(basinData.outlets)
          .map((outletBasin) => basinDataToId.get(outletBasin))
          .filter((id): id is string => id !== undefined);
      }
    });
  });
}

// ============================================================================
// Main Generator Function (Exported)
// ============================================================================

/**
 * Generator function that computes basins step-by-step
 * Yields debug state at configurable granularity based on passed-in step size
 *
 * This is the core basin computation algorithm used by both debug mode and normal computation
 */
export function* computeBasinsGenerator(
  heights: number[][],
  basinManager: BasinManager,
): Generator<BasinComputationYield, void, DebugStepGranularity> {
  // Clear existing basin data
  basinManager.basinIdOf.forEach((row) => row.fill(""));
  basinManager.basins.clear();

  const visited = new Array(CONFIG.WORLD_H);
  for (let y = 0; y < CONFIG.WORLD_H; y++) {
    visited[y] = new Array(CONFIG.WORLD_W).fill(false);
  }

  const basinsByLevel = new Map<number, TempBasinData[]>();
  const tileToBasin = new Map<string, TempBasinData>();

  const processedTiles = new Set<string>();
  const pendingTiles = new Set<string>();

  // ========== STAGE 1: FLOOD FILL ==========
  for (let depth = 1; depth <= CONFIG.MAX_DEPTH; depth++) {
    const stepSize = yield {
      stage: "flood-fill",
      depth,
      processedTiles,
      pendingTiles,
    };

    if (stepSize === "finish") {
      // Fast-forward through all remaining depths
      for (let d = depth; d <= CONFIG.MAX_DEPTH; d++) {
        floodFillDepthLevel(d, heights, visited, basinsByLevel, tileToBasin);
      }
      break;
    }

    // Process one depth level
    yield* floodFillDepthLevelGenerator(
      depth,
      heights,
      visited,
      basinsByLevel,
      tileToBasin,
      processedTiles,
      pendingTiles,
      stepSize,
    );
  }

  // Clear visual state after flood fill
  processedTiles.clear();
  pendingTiles.clear();

  // ========== STAGE 2: OUTLET DETECTION ==========
  yield {
    stage: "outlets",
    processedTiles,
    pendingTiles,
  };

  detectOutlets(basinsByLevel, heights, tileToBasin);

  // ========== STAGE 3: ID ASSIGNMENT ==========
  yield {
    stage: "assignment",
    processedTiles,
    pendingTiles,
  };

  assignBasinIds(basinsByLevel, basinManager);

  // ========== STAGE 4: COMPLETE ==========
  yield {
    stage: "complete",
    processedTiles,
    pendingTiles,
  };
}

// ============================================================================
// Debug Wrapper Class
// ============================================================================

export class BasinDebugGenerator {
  private basinManager: BasinManager;
  private generator: Generator<BasinComputationYield, void, DebugStepGranularity> | null = null;
  private currentDebugState: DebugState | null = null;

  constructor(basinManager: BasinManager) {
    this.basinManager = basinManager;
  }

  startDebugging(heights: number[][]): void {
    // Create the generator
    this.generator = computeBasinsGenerator(heights, this.basinManager);
    this.currentDebugState = {
      currentStage: "flood-fill",
      currentDepth: 1,
      processedTiles: new Set(),
      pendingTiles: new Set(),
      activeTile: null,
    };
  }

  isInDebugMode(): boolean {
    return this.generator !== null;
  }

  getDebugState(): DebugState | null {
    return this.currentDebugState;
  }

  step(granularity: DebugStepGranularity): { complete: boolean } {
    if (!this.generator) return { complete: true };

    const result = this.generator.next(granularity);

    if (result.done) {
      this.currentDebugState = {
        currentStage: "complete",
        currentDepth: 0,
        processedTiles: new Set(),
        pendingTiles: new Set(),
        activeTile: null,
      };
      this.generator = null;
      return { complete: true };
    }

    // Update debug state from yielded value
    const yielded = result.value;
    this.currentDebugState = {
      currentStage: yielded.stage,
      currentDepth: yielded.depth ?? 0,
      processedTiles: yielded.processedTiles,
      pendingTiles: yielded.pendingTiles,
      activeTile: yielded.activeTile ?? null,
    };

    return { complete: false };
  }
}
