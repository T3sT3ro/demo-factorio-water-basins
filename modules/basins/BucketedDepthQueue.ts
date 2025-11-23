/**
 * Bucketed queue for processing tiles by depth (deepest first)
 */

/**
 * Entry in bucketed depth queue with parent tile tracking
 */
export interface BucketEntry {
  x: number;
  y: number;
  parentTileKey: string | null; // Key of parent tile for basin traversal
}

/**
 * Bucketed queue for processing tiles by depth (deepest first).
 * Ensures deeper tiles are processed before shallower ones.
 */
export class BucketedDepthQueue {
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
