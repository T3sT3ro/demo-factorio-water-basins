// Configuration constants for the tilemap water pumping simulation

export const CONFIG = {
  CHUNK_SIZE: 16,
  CHUNKS_X: 10,
  CHUNKS_Y: 10,
  TILE_SIZE: 6, // pixels
  MAX_DEPTH: 9,
  VOLUME_UNIT: 1,
  PUMP_RATE: 1, // volume per tick

  get WORLD_W() {
    return this.CHUNKS_X * this.CHUNK_SIZE;
  },
  get WORLD_H() {
    return this.CHUNKS_Y * this.CHUNK_SIZE;
  },
};

/**
 * Helper to create 2D array filled with initial value
 */
export function Array2D<T>(w: number, h: number, initialValue: T): T[][] {
  return Array.from({ length: h }, () => Array(w).fill(initialValue));
}

/**
 * Setup canvas element and context
 */
export function setupCanvas() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element not found");

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context");

  canvas.width = CONFIG.WORLD_W * CONFIG.TILE_SIZE;
  canvas.height = CONFIG.WORLD_H * CONFIG.TILE_SIZE;

  return { canvas, ctx };
}
