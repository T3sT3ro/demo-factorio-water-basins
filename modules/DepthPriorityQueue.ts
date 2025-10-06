// Bucket-based priority queue for depth-ordered processing

interface DepthItem {
  depth: number;
  [key: string]: unknown;
}

class DepthPriorityQueue {
  #buckets: Map<number, DepthItem[]>;
  #minDepth: number;
  #size: number;

  constructor() {
    this.#buckets = new Map();
    this.#minDepth = Infinity;
    this.#size = 0;
  }

  push(item: DepthItem): void {
    const depth = item.depth;
    if (!this.#buckets.has(depth)) {
      this.#buckets.set(depth, []);
    }
    this.#buckets.get(depth)!.push(item);
    this.#minDepth = Math.min(this.#minDepth, depth);
    this.#size++;
  }

  pop(): DepthItem | undefined {
    while (this.#minDepth < Infinity) {
      const bucket = this.#buckets.get(this.#minDepth);
      if (bucket && bucket.length > 0) {
        this.#size--;
        return bucket.shift(); // FIFO within each bucket
      }

      // Find next non-empty bucket
      this.#minDepth++;
      while (this.#minDepth < Infinity && (!this.#buckets.has(this.#minDepth) || this.#buckets.get(this.#minDepth)!.length === 0)) {
        this.#minDepth++;
      }

      // If no more buckets found, reset
      if (this.#minDepth >= Infinity) {
        this.#minDepth = Infinity;
      }
    }
    return undefined;
  }

  get length(): number {
    return this.#size;
  }
}

export { DepthPriorityQueue };
