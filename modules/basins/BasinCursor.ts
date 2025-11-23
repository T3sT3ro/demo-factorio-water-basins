/**
 * Basin cursor for navigating basin tree and managing tile counts.
 * Handles basin creation, navigation, and tile count propagation.
 */

import { generateLetterSequence } from "./BasinComputation.ts";

/**
 * A node in the basin tree representing a basin at a specific depth.
 * Forms a parent-child hierarchy from depth 0 (root) to max depth.
 */
export interface BasinNode {
  depth: number;
  id: string;
  parent: BasinNode | null;
  ownTiles: number; // Count of tiles directly in this basin
  descendantTiles: number; // Count of tiles in all descendant basins
}

/**
 * Basin cursor manages navigation through basin tree during island processing.
 * Handles basin creation, navigation, and tile count propagation.
 *
 * Key invariant: Propagation to descendantTiles only happens during upward depth movement.
 */
export class BasinCursor {
  private currentBasin: BasinNode | null = null;

  constructor(
    private root: BasinNode,
    private nodesByDepth: Map<number, Map<string, BasinNode>>,
    private childrenMap: Map<string, Set<BasinNode>>,
    private tileToNode: Map<string, BasinNode>,
  ) {}

  /**
   * Get the current basin node the cursor is at
   */
  getCurrentBasin(): BasinNode | null {
    return this.currentBasin;
  }

  /**
   * Navigate to the appropriate basin for a tile at given depth.
   * Creates basins as needed based on parent tile context.
   *
   * Important: Does NOT propagate counts - that only happens on upward depth movement.
   */
  navigateToTileBasin(tileDepth: number, parentTileKey: string | null): BasinNode {
    let targetBasin: BasinNode;

    if (!parentTileKey) {
      // Seed tile - create complete chain from root to this depth
      targetBasin = this.ensureBasinChain(this.root, tileDepth);
    } else {
      const parentNode = this.tileToNode.get(parentTileKey);
      if (!parentNode) {
        throw new Error(`Parent tile ${parentTileKey} has no basin node assigned`);
      }

      if (tileDepth === parentNode.depth) {
        // Same depth - reuse parent's basin (horizontal propagation within same level)
        targetBasin = parentNode;
      } else if (tileDepth > parentNode.depth) {
        // Deeper - create chain for intermediate depths
        targetBasin = this.ensureBasinChain(parentNode, tileDepth);
      } else {
        // Shallower - traverse up to find basin at this depth
        let current = parentNode.parent;
        while (current && current.depth > tileDepth) {
          current = current.parent;
        }
        if (!current || current.depth !== tileDepth) {
          // No basin exists at this depth - create chain from nearest ancestor
          const ancestor = current || this.root;
          targetBasin = this.ensureBasinChain(ancestor, tileDepth);
        } else {
          targetBasin = current;
        }
      }
    }

    // Simply move cursor - no propagation on horizontal movement
    this.currentBasin = targetBasin;

    return targetBasin;
  }

  /**
   * Move cursor up from current basin, propagating tile counts through ALL ancestor levels.
   * This is the ONLY place where descendantTiles propagation happens.
   */
  moveUp(): void {
    if (!this.currentBasin) return;

    const startBasin = this.currentBasin;
    const tilesToPropagate = startBasin.ownTiles + startBasin.descendantTiles;

    // Propagate the total tile count (own + descendants) to ALL ancestors
    let node: BasinNode | null = startBasin.parent;
    while (node) {
      node.descendantTiles += tilesToPropagate;
      node = node.parent;
    }

    this.currentBasin = null;
  }

  /**
   * Ensure a chain of basin nodes exists from startNode to targetDepth.
   * Creates missing intermediate basins as needed.
   * Returns the basin node at targetDepth.
   */
  private ensureBasinChain(startNode: BasinNode, targetDepth: number): BasinNode {
    let current = startNode;

    // Create nodes for each depth level from startNode.depth+1 to targetDepth
    for (let depth = startNode.depth + 1; depth <= targetDepth; depth++) {
      current = this.createBasinNode(current, depth);
    }

    return current;
  }

  /**
   * Create a single basin node at targetDepth with given parent.
   */
  private createBasinNode(parentNode: BasinNode, targetDepth: number): BasinNode {
    const depthMap = this.nodesByDepth.get(targetDepth);
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
      ownTiles: 0,
      descendantTiles: 0,
    };

    depthMap.set(id, newNode);

    // Track parent-child relationship
    if (!this.childrenMap.has(parentNode.id)) {
      this.childrenMap.set(parentNode.id, new Set());
    }
    this.childrenMap.get(parentNode.id)!.add(newNode);

    return newNode;
  }

  /**
   * Add a tile to the current basin (increments ownTiles directly)
   */
  addTile(tileKey: string): void {
    if (!this.currentBasin) {
      throw new Error("Cannot add tile: cursor not positioned at any basin");
    }

    this.tileToNode.set(tileKey, this.currentBasin);
    this.currentBasin.ownTiles++;
  }

  /**
   * Finalize the cursor by propagating remaining counts to root.
   * Called when processing of an island is complete.
   */
  finalize(): void {
    if (this.currentBasin) {
      this.moveUp();
    }
  }
}
