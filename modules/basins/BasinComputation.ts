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

// ============================================================================
// Basin Node Tree Structure
// ============================================================================

/**
 * A node in the basin tree representing a basin at a specific depth.
 * Forms a parent-child hierarchy from depth 0 (root) to max depth.
 * Tiles and children are tracked separately in external maps for efficiency.
 */
interface BasinNode {
  depth: number;
  id: string;
  parent: BasinNode | null;
  tileCount: number; // Count of tiles in this basin + all descendants
}

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
 * Create a fresh basin node at target depth as child of parent.
 * Always creates a new basin (used when descending depth).
 */
function createBasinNode(
  parentNode: BasinNode,
  targetDepth: number,
  nodesByDepth: Map<number, Map<string, BasinNode>>,
  childrenMap: Map<string, Set<BasinNode>>,
): BasinNode {
  // Create new basin node at target depth
  const depthMap = nodesByDepth.get(targetDepth);
  if (!depthMap) {
    throw new Error(`No depth map for depth ${targetDepth}`);
  }

  const index = depthMap.size;
  const letters = generateLetterSequence(index);
  const id = `${targetDepth}#${letters}`;

  const newNode: BasinNode = {
    depth: targetDepth,
    id,
    parent: parentNode,
    tileCount: 0,
  };

  depthMap.set(id, newNode);

  // Track parent-child relationship
  if (!childrenMap.has(parentNode.id)) {
    childrenMap.set(parentNode.id, new Set());
  }
  childrenMap.get(parentNode.id)!.add(newNode);

  return newNode;
}

/**
 * Create a complete path from root to target depth.
 * Used for seed tiles to establish the full basin hierarchy.
 * For example, seed at depth 2 creates: root(0) -> 1#A -> 2#A
 */
function createBasinPath(
  rootNode: BasinNode,
  targetDepth: number,
  nodesByDepth: Map<number, Map<string, BasinNode>>,
  childrenMap: Map<string, Set<BasinNode>>,
): BasinNode {
  let current = rootNode;
  
  // Create nodes for each depth level from 1 to targetDepth
  for (let depth = 1; depth <= targetDepth; depth++) {
    current = createBasinNode(current, depth, nodesByDepth, childrenMap);
  }
  
  return current;
}/**
 * Entry in bucketed depth queue with parent tile tracking
 */
interface BucketEntry {
  x: number;
  y: number;
  parentTileKey: string | null; // Key of parent tile for basin traversal
}

/**
 * Bucketed queue for processing tiles by depth (deepest first)
 */
class BucketedDepthQueue {
  private buckets: Map<number, BucketEntry[]> = new Map();
  private maxDepth = 0;

  add(x: number, y: number, depth: number, parentTileKey: string | null): void {
    if (!this.buckets.has(depth)) {
      this.buckets.set(depth, []);
    }
    this.buckets.get(depth)!.push({ x, y, parentTileKey });
    this.maxDepth = Math.max(this.maxDepth, depth);
  }

  shift(): (BucketEntry & { depth: number }) | undefined {
    // Process deepest buckets first
    for (let d = this.maxDepth; d > 0; d--) {
      const bucket = this.buckets.get(d);
      if (bucket && bucket.length > 0) {
        const entry = bucket.shift()!;
        if (bucket.length === 0) {
          // Update maxDepth if this was the last entry at this depth
          if (d === this.maxDepth) {
            while (
              this.maxDepth > 0 &&
              (!this.buckets.has(this.maxDepth) || this.buckets.get(this.maxDepth)!.length === 0)
            ) {
              this.maxDepth--;
            }
          }
        }
        return { ...entry, depth: d };
      }
    }
    return undefined;
  }

  get currentDepth(): number {
    return this.maxDepth;
  }

  isEmpty(): boolean {
    return this.maxDepth === 0;
  }

  clear(): void {
    this.buckets.clear();
    this.maxDepth = 0;
  }
}

/**
 * Update tile counts up the basin tree path
 */
function propagateTileCountUp(node: BasinNode, count: number): void {
  let current: BasinNode | null = node;
  while (current) {
    current.tileCount += count;
    current = current.parent;
  }
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
        tileCount: node.tileCount,
        parentId: node.parent?.id ?? null,
        childrenIds,
      });
    });
  });

  return debugInfo;
}

/**
 * Determine basin node for a tile by traversing parent tile chain.
 * Always creates fresh basin when descending (exploring new contiguous area).
 * Reuses node when propagating horizontally at same level.
 */
function determineBasinNode(
  tileDepth: number,
  parentTileKey: string | null,
  tileToNode: Map<string, BasinNode>,
  rootNode: BasinNode,
  nodesByDepth: Map<number, Map<string, BasinNode>>,
  childrenMap: Map<string, Set<BasinNode>>,
): BasinNode {
  if (!parentTileKey) {
    // Seed tile - create complete path from root to this depth
    // For example, depth 2 creates: root(0) -> 1#A -> 2#A
    return createBasinPath(rootNode, tileDepth, nodesByDepth, childrenMap);
  }

  const parentNode = tileToNode.get(parentTileKey);
  if (!parentNode) {
    throw new Error(`Parent tile ${parentTileKey} has no basin node assigned`);
  }

  if (tileDepth === parentNode.depth) {
    // Same depth - reuse parent's basin node (horizontal propagation)
    return parentNode;
  } else if (tileDepth > parentNode.depth) {
    // Deeper - always create fresh basin (descending into new area)
    return createBasinNode(parentNode, tileDepth, nodesByDepth, childrenMap);
  } else {
    // Shallower - traverse up to parent basin at this depth
    let current = parentNode.parent;
    while (current && current.depth > tileDepth) {
      current = current.parent;
    }
    if (!current || current.depth !== tileDepth) {
      // Create new basin as child of nearest ancestor
      const ancestor = current || rootNode;
      return createBasinNode(ancestor, tileDepth, nodesByDepth, childrenMap);
    }
    return current;
  }
}

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

  let currentDepth = seedDepth;

  while (!bucketQueue.isEmpty()) {
    const entry = bucketQueue.shift();
    if (!entry) break;

    const { x, y, depth } = entry;
    const key = coordToKey(x, y);

    // Get the best parent for this tile
    const parentInfo = pendingParents.get(key);
    const parentTileKey = parentInfo?.parentTileKey ?? null;

    // Detect depth change for stage yielding
    if (depth !== currentDepth) {
      currentDepth = depth;
      if (granularity === "stage") {
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

    // Determine basin node by traversing parent tile path
    const currentNode = determineBasinNode(
      depth,
      parentTileKey,
      tileToNode,
      root,
      nodesByDepth,
      childrenMap,
    );

    // Assign tile to basin
    tileToNode.set(key, currentNode);
    tileToBasin.set(key, currentNode.id);
    propagateTileCountUp(currentNode, 1);
    processedTiles.add(key);

    // Yield for "one" granularity (per-tile stepping)
    if (granularity === "one") {
      granularity = yield {
        stage: "flood-fill",
        depth,
        activeTile: { x, y },
        processedTiles,
        pendingTiles,
        basinTree: extractBasinTreeDebugInfo(nodesByDepth, childrenMap),
        currentNodeId: currentNode.id,
      };

      // Fast finish requested
      if (granularity === "finish") {
        // Process all remaining tiles in this island without yielding
        while (!bucketQueue.isEmpty()) {
          const e = bucketQueue.shift();
          if (!e) break;

          const k = coordToKey(e.x, e.y);
          const pInfo = pendingParents.get(k);
          const pTileKey = pInfo?.parentTileKey ?? null;

          pendingParents.delete(k);

          if (visited[e.y]![e.x]) continue;

          visited[e.y]![e.x] = true;
          const node = determineBasinNode(
            e.depth,
            pTileKey,
            tileToNode,
            root,
            nodesByDepth,
            childrenMap,
          );
          tileToNode.set(k, node);
          tileToBasin.set(k, node.id);
          propagateTileCountUp(node, 1);
          processedTiles.add(k);
        }
        return granularity;
      }
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
  let granularity: DebugStepGranularity = "one";

  while (primaryQueue.length > 0) {
    const seedKey = primaryQueue.shift()!;
    const { x, y } = keyToCoord(seedKey);

    // Skip if already visited or not a valid depth
    if (!isInBounds(x, y) || visited[y]![x]) continue;

    const depth = heights[y]![x]!;
    if (depth === 0) continue;

    // Process this basin island
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

    // If finish was requested, process remaining primary queue without yielding
    if (granularity === "finish") {
      for (const key of primaryQueue) {
        const coord = keyToCoord(key);
        const sx = coord.x, sy = coord.y;

        if (!isInBounds(sx, sy) || visited[sy]![sx]) continue;

        const d = heights[sy]![sx]!;
        if (d === 0) continue;

        // Process island in fast mode
        const bucketQueue = new BucketedDepthQueue();
        const fastPendingParents = new Map<string, { parentTileKey: string | null; parentDepth: number }>();
        const seedKey = coordToKey(sx, sy);

        bucketQueue.add(sx, sy, d, null);
        fastPendingParents.set(seedKey, { parentTileKey: null, parentDepth: 0 });

        while (!bucketQueue.isEmpty()) {
          const e = bucketQueue.shift();
          if (!e) break;

          const k = coordToKey(e.x, e.y);
          const pInfo = fastPendingParents.get(k);
          const pTileKey = pInfo?.parentTileKey ?? null;

          fastPendingParents.delete(k);

          if (visited[e.y]![e.x]) continue;

          visited[e.y]![e.x] = true;
          const node = determineBasinNode(
            e.depth,
            pTileKey,
            tileToNode,
            root,
            nodesByDepth,
            childrenMap,
          );
          tileToNode.set(k, node);
          tileToBasin.set(k, node.id);
          propagateTileCountUp(node, 1);

          // Add neighbors
          for (const [dx, dy] of DIRECTIONS_8) {
            const nx = e.x + dx, ny = e.y + dy;
            if (!isInBounds(nx, ny) || visited[ny]![nx]) continue;

            const nd = heights[ny]![nx]!;
            if (nd === 0) continue;
            if (isDiagonalBlocked(e.x, e.y, dx, dy, heights)) continue;

            const nk = coordToKey(nx, ny);
            const existingParent = fastPendingParents.get(nk);

            // Only add or update if this parent is deeper
            if (!existingParent || e.depth > existingParent.parentDepth) {
              if (!existingParent) {
                bucketQueue.add(nx, ny, nd, k);
              }
              fastPendingParents.set(nk, { parentTileKey: k, parentDepth: e.depth });
            }
          }
        }
      }
      return granularity;
    }
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
  heights: number[][],
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

  // Detect outlets (tiles that flow to shallower basins)
  nodesByDepth.forEach((depthMap) => {
    depthMap.forEach((node) => {
      if (node.depth === 0) return;

      const outlets = new Set<string>();
      const tiles = basinTiles.get(node.id);
      if (!tiles) return;

      tiles.forEach((tileKey) => {
        const { x, y } = keyToCoord(tileKey);

        for (const [dx, dy] of DIRECTIONS_8) {
          const nx = x + dx, ny = y + dy;
          if (!isInBounds(nx, ny)) continue;

          const neighborHeight = heights[ny]![nx]!;
          if (neighborHeight === 0 || neighborHeight >= node.depth) continue;

          const neighborBasinId = tileToBasin.get(coordToKey(nx, ny));

          if (neighborBasinId && neighborBasinId !== node.id) {
            outlets.add(neighborBasinId);
          }
        }
      });

      const basin = basinManager.basins.get(node.id);
      if (basin) {
        basin.outlets = Array.from(outlets);
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
    tileCount: 0,
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
