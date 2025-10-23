// Terrain layer renderer - renders heightmap tiles

import { CONFIG } from "../config.ts";
import { BaseLayerRenderer } from "./LayerRenderer.ts";
import { getHeightColor } from "./ColorUtils.ts";
import type { CameraController } from "./CameraController.ts";

export class TerrainLayerRenderer extends BaseLayerRenderer {
  private heights: number[][] = [];

  updateHeights(heights: number[][]): void {
    this.heights = heights;
  }

  render(ctx: CanvasRenderingContext2D, camera: CameraController): void {
    this.clear(ctx);
    this.applyCamera(ctx, camera);

    // Draw terrain tiles
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const depth = this.heights[y]?.[x] ?? 0;
        const color = getHeightColor(depth);

        ctx.fillStyle = color;
        ctx.fillRect(
          x * CONFIG.TILE_SIZE,
          y * CONFIG.TILE_SIZE,
          CONFIG.TILE_SIZE,
          CONFIG.TILE_SIZE,
        );
      }
    }
  }
}
