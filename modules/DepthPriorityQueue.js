// Bucket-based priority queue for depth-ordered processing
class DepthPriorityQueue {
  /** @type {Map<number, Array<{depth: number} & Record<string, any>>>} */
  #buckets;

  /** @type {number} */
  #minDepth;

  /** @type {number} */
  #size;

  constructor() {
    this.#buckets = new Map();
    this.#minDepth = Infinity;
    this.#size = 0;
  }

  /**
   * @param {{depth: number} & Record<string, any>} item
   */
  push(item) {
    const depth = item.depth;
    if (!this.#buckets.has(depth)) {
      this.#buckets.set(depth, []);
    }
    this.#buckets.get(depth).push(item);
    this.#minDepth = Math.min(this.#minDepth, depth);
    this.#size++;
  }

  /**
   * @returns {{depth: number} & Record<string, any> | undefined}
   */
  pop() {
    while (this.#minDepth < Infinity) {
      const bucket = this.#buckets.get(this.#minDepth);
      if (bucket && bucket.length > 0) {
        this.#size--;
        return bucket.shift(); // FIFO within each bucket
      }

      // Find next non-empty bucket
      this.#minDepth++;
      while (this.#minDepth < Infinity && (!this.#buckets.has(this.#minDepth) || this.#buckets.get(this.#minDepth).length === 0)) {
        this.#minDepth++;
      }

      // If no more buckets found, reset
      if (this.#minDepth >= Infinity) {
        this.#minDepth = Infinity;
      }
    }
    return undefined;
  }

  /**
   * @returns {number}
   */
  get length() {
    return this.#size;
  }
}

export { DepthPriorityQueue };
