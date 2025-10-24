import { CONFIG } from "./config.ts";

/**
 * Manages brush painting state and operations
 */
export class BrushTool {
  private overlay = new Map<string, number>();
  private center: { x: number; y: number } | null = null;
  private size: number;

  constructor(initialSize: number) {
    this.size = initialSize;
  }

  getBrushTiles(centerX: number, centerY: number): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];
    const radius = Math.floor(this.size / 2);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            tiles.push({ x, y });
          }
        }
      }
    }

    return tiles;
  }

  updateOverlay(centerX: number, centerY: number, depth: number): void {
    const tiles = this.getBrushTiles(centerX, centerY);

    for (const tile of tiles) {
      const key = `${tile.x},${tile.y}`;
      this.overlay.set(key, depth);
    }
  }

  getOverlay(): Map<string, number> {
    return this.overlay;
  }

  clearOverlay(): void {
    this.overlay.clear();
  }

  setCenter(x: number, y: number): void {
    this.center = { x, y };
  }

  clearCenter(): void {
    this.center = null;
  }

  getCenter(): { x: number; y: number } | null {
    return this.center;
  }

  setSize(size: number): void {
    this.size = size;
  }

  getSize(): number {
    return this.size;
  }
}
