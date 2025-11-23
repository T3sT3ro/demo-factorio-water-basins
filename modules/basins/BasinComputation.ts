// Core basin computation algorithm - tree-based flood fill with parent tracking

import { CONFIG } from "../config.ts";
import {
  coordToKey,
  DIRECTIONS_8,
  isDiagonalBlocked,
  isInBounds,
  keyToCoord,
} from "../TileUtils.ts";
import type { BasinManager } from "./BasinManager.ts";
import type { BasinComputationYield, BasinTreeDebugInfo, DebugStepGranularity } from "./types.ts";
import { BasinCursor, type BasinNode } from "./BasinCursor.ts";
import { BucketedDepthQueue } from "./BucketedDepthQueue.ts";

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



/**
 * Extract basin tree structure for debugging
 */
function extractBasinTreeDebugInfo(
  nodesByDepth: Map<number, Map<string, BasinNode>>,
  childrenMap: Map<string, Set<BasinNode>>,
): BasinTreeDebugInfo[] {
  const debugInfo: BasinTreeDebugInfo[] = [];

  nodesByDepth.forEach((depthMap) => {
    depthMap.forEach((node) => {
      const children = childrenMap.get(node.id);
      const childrenIds = children ? Array.from(children).map((c) => c.id) : [];

      debugInfo.push({
        nodeId: node.id,
        depth: node.depth,
        ownTiles: node.ownTiles,
        descendantTiles: node.descendantTiles,
        parentId: node.parent?.id ?? null,
        childrenIds,
      });
    });
  });

  return debugInfo;
}

// Granularity levels (like logging levels)
const GRANULARITY_LEVELS = {
  finish: 0,  // No yielding
  island: 1,  // Yield on island change
  level: 2,   // Yield on depth/level change
  tile: 3,    // Yield on every tile
} as const;

/**
 * Process a single basin island starting from a seed tile.
 * Uses bucketed depth queue to process deepest tiles first.
 */
function* processSingleBasinIsland(
  seedX: number,
  seedY: number,
  heights: number[][],
  visited: boolean[][],
  root: BasinNode,
  nodesByDepth: Map<number, Map<string, BasinNode>>,
  tileToNode: Map<string, BasinNode>,
  tileToBasin: Map<string, string>,
  childrenMap: Map<string, Set<BasinNode>>,
  processedTiles: Set<string>,
  pendingTiles: Set<string>,
  granularity: DebugStepGranularity,
): Generator<BasinComputationYield, DebugStepGranularity, DebugStepGranularity> {
  const bucketQueue = new BucketedDepthQueue();
  const seedDepth = heights[seedY]![seedX]!;

  // Track the best (deepest) parent for each pending tile
  const pendingParents = new Map<string, { parentTileKey: string | null; parentDepth: number }>();

  // Add seed tile to bucketed queue (no parent)
  bucketQueue.add(seedX, seedY, seedDepth, null);
  const seedKey = coordToKey(seedX, seedY);
  pendingTiles.add(seedKey);
  pendingParents.set(seedKey, { parentTileKey: null, parentDepth: 0 });

  // Basin cursor manages navigation and tile count propagation
  const cursor = new BasinCursor(root, nodesByDepth, childrenMap, tileToNode);
  let currentDepth = seedDepth;

  while (!bucketQueue.isEmpty()) {
    const entry = bucketQueue.shift();
    if (!entry) break;

    const { x, y, depth } = entry;
    const key = coordToKey(x, y);

    // Get the best parent for this tile
    const parentInfo = pendingParents.get(key);
    const parentTileKey = parentInfo?.parentTileKey ?? null;

    // Detect depth change (step-up phase) - move cursor up through levels
    if (depth !== currentDepth) {
      cursor.moveUp();
      currentDepth = depth;
      
      if (GRANULARITY_LEVELS[granularity] >= GRANULARITY_LEVELS.level) {
        const currentNode = parentTileKey ? tileToNode.get(parentTileKey) : null;
        granularity = yield {
          stage: "flood-fill",
          depth: currentDepth,
          processedTiles,
          pendingTiles,
          basinTree: extractBasinTreeDebugInfo(nodesByDepth, childrenMap),
          currentNodeId: currentNode?.id ?? root.id,
        };
      }
    }

    pendingTiles.delete(key);
    pendingParents.delete(key);

    if (visited[y]![x]) continue;
    if (heights[y]![x] !== depth) continue;

    visited[y]![x] = true;

    // Navigate to appropriate basin for this tile (creates basins if needed)
    const tileBasinNode = cursor.navigateToTileBasin(depth, parentTileKey);
    
    // Add tile to current basin via cursor
    cursor.addTile(key);
    tileToBasin.set(key, tileBasinNode.id);
    
    processedTiles.add(key);

    // Yield if granularity includes tile level
    if (GRANULARITY_LEVELS[granularity] >= GRANULARITY_LEVELS.tile) {
      granularity = yield {
        stage: "flood-fill",
        depth,
        activeTile: { x, y },
        processedTiles,
        pendingTiles,
        basinTree: extractBasinTreeDebugInfo(nodesByDepth, childrenMap),
        currentNodeId: tileBasinNode.id,
      };
    }

    // Add unvisited neighbors with depth > 0 to bucketed queue
    for (const [dx, dy] of DIRECTIONS_8) {
      const nx = x + dx, ny = y + dy;
      if (!isInBounds(nx, ny)) continue;
      if (visited[ny]![nx]) continue;

      const neighborDepth = heights[ny]![nx]!;
      if (neighborDepth === 0) continue;

      // Check diagonal blocking
      if (isDiagonalBlocked(x, y, dx, dy, heights)) continue;

      const neighborKey = coordToKey(nx, ny);
      const existingParent = pendingParents.get(neighborKey);

      // Only add or update if this parent is deeper (or if not yet added)
      if (!existingParent || depth > existingParent.parentDepth) {
        if (!pendingTiles.has(neighborKey)) {
          // First time adding this tile
          bucketQueue.add(nx, ny, neighborDepth, key);
          pendingTiles.add(neighborKey);
        }
        // Update to the deepest parent
        pendingParents.set(neighborKey, { parentTileKey: key, parentDepth: depth });
      }
    }
  }

  // Finalize cursor to propagate any remaining counts
  cursor.finalize();

  return granularity;
}

/**
 * Tree-based basin computation generator with change set support.
 * Processes basin islands separately using a two-queue system.
 * Returns the final granularity to indicate if "finish" was requested.
 */
function* treeBasedBasinComputationGenerator(
  heights: number[][],
  changeSet: Set<string>,
  root: BasinNode,
  nodesByDepth: Map<number, Map<string, BasinNode>>,
  tileToNode: Map<string, BasinNode>,
  tileToBasin: Map<string, string>,
  childrenMap: Map<string, Set<BasinNode>>,
  processedTiles: Set<string>,
  pendingTiles: Set<string>,
): Generator<BasinComputationYield, DebugStepGranularity, DebugStepGranularity> {
  const visited = new Array(CONFIG.WORLD_H);
  for (let y = 0; y < CONFIG.WORLD_H; y++) {
    visited[y] = new Array(CONFIG.WORLD_W).fill(false);
  }

  // Primary queue: unordered change set
  const primaryQueue = Array.from(changeSet);
  let granularity: DebugStepGranularity = "tile";

  while (primaryQueue.length > 0) {
    const seedKey = primaryQueue.shift()!;
    const { x, y } = keyToCoord(seedKey);

    // Skip if already visited or not a valid depth
    if (!isInBounds(x, y) || visited[y]![x]) continue;

    const depth = heights[y]![x]!;
    if (depth === 0) continue;

    // Yield before processing each island if granularity includes island level
    if (GRANULARITY_LEVELS[granularity] >= GRANULARITY_LEVELS.island) {
      granularity = yield {
        stage: "flood-fill",
        depth,
        processedTiles,
        pendingTiles,
        basinTree: extractBasinTreeDebugInfo(nodesByDepth, childrenMap),
        currentNodeId: root.id,
      };
    }

    // Process this basin island (will handle granularity internally)
    granularity = yield* processSingleBasinIsland(
      x,
      y,
      heights,
      visited,
      root,
      nodesByDepth,
      tileToNode,
      tileToBasin,
      childrenMap,
      processedTiles,
      pendingTiles,
      granularity,
    );
  }

  return granularity;
}

/**
 * Convert basin tree to BasinManager format with outlet detection
 */
function finalizeBasins(
  _root: BasinNode,
  nodesByDepth: Map<number, Map<string, BasinNode>>,
  tileToBasin: Map<string, string>,
  _heights: number[][],
  basinManager: BasinManager,
): void {
  // Build basin tiles from tileToBasin map
  const basinTiles = new Map<string, Set<string>>();
  tileToBasin.forEach((basinId, tileKey) => {
    if (!basinTiles.has(basinId)) {
      basinTiles.set(basinId, new Set());
    }
    basinTiles.get(basinId)!.add(tileKey);
  });

  // Assign basins to manager
  nodesByDepth.forEach((depthMap) => {
    depthMap.forEach((node) => {
      if (node.depth === 0) return; // Skip root

      const tiles = basinTiles.get(node.id) || new Set<string>();

      basinManager.basins.set(node.id, {
        tiles,
        volume: 0,
        level: 0,
        height: node.depth,
        outlets: [], // Will be filled in next step
      });

      // Update basinIdOf map
      tiles.forEach((tileKey) => {
        const { x, y } = keyToCoord(tileKey);
        basinManager.basinIdOf[y]![x] = node.id;
      });
    });
  });

  // Set outlets based on basin tree parent relationships
  // A basin's outlet is its direct parent basin in the tree (one level shallower)
  nodesByDepth.forEach((depthMap) => {
    depthMap.forEach((node) => {
      if (node.depth === 0) return; // Skip root

      const basin = basinManager.basins.get(node.id);
      if (!basin) return;

      // The outlet is the parent basin node
      if (node.parent && node.parent.depth > 0) {
        basin.outlets = [node.parent.id];
      } else {
        basin.outlets = []; // No parent (top-level basin) or parent is root
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

  const processedTiles = new Set<string>();
  const pendingTiles = new Set<string>();

  // Create root node (depth 0, virtual)
  const root: BasinNode = {
    depth: 0,
    id: "0#ROOT",
    parent: null,
    ownTiles: 0,
    descendantTiles: 0,
  };

  // Initialize depth maps
  const nodesByDepth = new Map<number, Map<string, BasinNode>>();
  for (let d = 0; d <= CONFIG.MAX_DEPTH; d++) {
    nodesByDepth.set(d, new Map());
  }
  nodesByDepth.get(0)!.set(root.id, root);

  const tileToNode = new Map<string, BasinNode>();
  const tileToBasin = new Map<string, string>();
  const childrenMap = new Map<string, Set<BasinNode>>();

  // Build change set: all tiles with depth > 0
  const changeSet = new Set<string>();
  for (let y = 0; y < CONFIG.WORLD_H; y++) {
    for (let x = 0; x < CONFIG.WORLD_W; x++) {
      if (heights[y]![x]! > 0) {
        changeSet.add(coordToKey(x, y));
      }
    }
  }

  // STAGE 1: TREE-BASED FLOOD FILL
  const finalGranularity = yield* treeBasedBasinComputationGenerator(
    heights,
    changeSet,
    root,
    nodesByDepth,
    tileToNode,
    tileToBasin,
    childrenMap,
    processedTiles,
    pendingTiles,
  );

  processedTiles.clear();
  pendingTiles.clear();

  // If "finish" was requested during flood fill, skip remaining yields
  if (finalGranularity === "finish") {
    finalizeBasins(root, nodesByDepth, tileToBasin, heights, basinManager);
    return;
  }

  // STAGE 2: OUTLET DETECTION & FINALIZATION
  yield {
    stage: "outlets",
    processedTiles,
    pendingTiles,
  };

  finalizeBasins(root, nodesByDepth, tileToBasin, heights, basinManager);

  // STAGE 3: COMPLETE (always yield to signal completion)
  yield {
    stage: "complete",
    processedTiles,
    pendingTiles,
  };
}
