// Core basin computation algorithm - flood fill, outlet detection, and ID assignment

import { CONFIG } from "../config.ts";
import {
  coordToKey,
  DIRECTIONS_8,
  isDiagonalBlocked,
  isInBounds,
  keyToCoord,
} from "../TileUtils.ts";
import type { BasinManager } from "./BasinManager.ts";
import type {
  BasinComputationYield,
  DebugStepGranularity,
  TempBasinData,
} from "./types.ts";

// ============================================================================
// Helper Functions
// ============================================================================

export function generateLetterSequence(index: number): string {
  let result = "";
  let num = index;

  do {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);

  return result;
}

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
    if (!isInBounds(x, y)) continue;
    if (visited[y]![x]) continue;
    if (heights[y]![x] !== depth) continue;

    visited[y]![x] = true;
    tiles.add(coordToKey(x, y));

    for (const [dx, dy] of DIRECTIONS_8) {
      const nx = x + dx, ny = y + dy;
      if (!isInBounds(nx, ny)) continue;
      if (heights[ny]![nx] !== depth || visited[ny]![nx]) continue;

      // Check diagonal blocking
      if (isDiagonalBlocked(x, y, dx, dy, heights)) continue;

      stack.push([nx, ny]);
    }
  }

  return tiles;
}

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
  granularity: DebugStepGranularity,
): Generator<BasinComputationYield, void, DebugStepGranularity> {
  const tiles = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  const startKey = coordToKey(startX, startY);
  pendingTiles.add(startKey);

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const key = coordToKey(x, y);

    pendingTiles.delete(key);

    if (visited[y]![x] || tiles.has(key)) continue;
    if (heights[y]![x] !== depth) continue;

    visited[y]![x] = true;
    tiles.add(key);
    processedTiles.add(key);

    // Only yield for "one" granularity (per-tile stepping)
    if (granularity === "one") {
      yield {
        stage: "flood-fill",
        depth,
        activeTile: { x, y },
        processedTiles,
        pendingTiles,
      };
    }

    for (const [dx, dy] of DIRECTIONS_8) {
      const nx = x + dx, ny = y + dy;
      if (!isInBounds(nx, ny)) continue;
      if (heights[ny]![nx] !== depth || visited[ny]![nx]) continue;

      // Check diagonal blocking
      if (isDiagonalBlocked(x, y, dx, dy, heights)) continue;

      const neighborKey = coordToKey(nx, ny);
      if (!pendingTiles.has(neighborKey)) {
        queue.push({ x: nx, y: ny });
        pendingTiles.add(neighborKey);
      }
    }
  }

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
  // For "stage" or "finish", process entire depth level without yielding
  if (stepSize === "stage" || stepSize === "finish") {
    floodFillDepthLevel(depth, heights, visited, basinsByLevel, tileToBasin);
    return;
  }

  // For "one" granularity, step through each tile
  for (let y = 0; y < CONFIG.WORLD_H; y++) {
    for (let x = 0; x < CONFIG.WORLD_W; x++) {
      if (visited[y]![x] || heights[y]![x] !== depth) continue;

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
        stepSize,
      );
    }
  }
}

function detectOutlets(
  basinsByLevel: Map<number, TempBasinData[]>,
  heights: number[][],
  tileToBasin: Map<string, TempBasinData>,
): void {
  basinsByLevel.forEach((basinsAtLevel, currentDepth) => {
    basinsAtLevel.forEach((basin) => {
      basin.tiles.forEach((tileKey) => {
        const { x: tx, y: ty } = keyToCoord(tileKey);

        for (const [dx, dy] of DIRECTIONS_8) {
          const nx = tx + dx, ny = ty + dy;
          if (!isInBounds(nx, ny)) continue;

          const neighborHeight = heights[ny]![nx]!;
          const neighborKey = coordToKey(nx, ny);

          if (
            neighborHeight > 0 && neighborHeight < currentDepth && tileToBasin.has(neighborKey)
          ) {
            const neighborBasin = tileToBasin.get(neighborKey)!;
            basin.outlets.add(neighborBasin);
          }
        }
      });
    });
  });
}

function assignBasinIds(
  basinsByLevel: Map<number, TempBasinData[]>,
  basinManager: BasinManager,
): void {
  const basinDataToId = new Map<TempBasinData, string>();

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
        const { x: tx, y: ty } = keyToCoord(k);
        basinManager.basinIdOf[ty]![tx] = id;
      });
    });
  });

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
// Main Generator Function
// ============================================================================

export function* computeBasinsGenerator(
  heights: number[][],
  basinManager: BasinManager,
): Generator<BasinComputationYield, void, DebugStepGranularity> {
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

  // STAGE 1: FLOOD FILL
  for (let depth = 1; depth <= CONFIG.MAX_DEPTH; depth++) {
    // Yield stage transition (for "one" and "stage" granularity)
    const stepSize = yield {
      stage: "flood-fill",
      depth,
      processedTiles,
      pendingTiles,
    };

    // Fast path: complete all remaining depths without yielding
    if (stepSize === "finish") {
      for (let d = depth; d <= CONFIG.MAX_DEPTH; d++) {
        floodFillDepthLevel(d, heights, visited, basinsByLevel, tileToBasin);
      }
      break;
    }

    // Process this depth level with appropriate granularity
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

  processedTiles.clear();
  pendingTiles.clear();

  // STAGE 2: OUTLET DETECTION (yield for "one" and "stage" granularity)
  yield {
    stage: "outlets",
    processedTiles,
    pendingTiles,
  };

  detectOutlets(basinsByLevel, heights, tileToBasin);

  // STAGE 3: ID ASSIGNMENT (yield for "one" and "stage" granularity)
  yield {
    stage: "assignment",
    processedTiles,
    pendingTiles,
  };

  assignBasinIds(basinsByLevel, basinManager);

  // STAGE 4: COMPLETE (always yield to signal completion)
  yield {
    stage: "complete",
    processedTiles,
    pendingTiles,
  };
}
