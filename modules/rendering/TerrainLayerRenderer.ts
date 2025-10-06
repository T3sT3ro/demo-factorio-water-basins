import { LayerRenderer } from "./LayerRenderer.ts";
import { ColorManager } from "./ColorManager.ts";
import { CONFIG } from "../config.ts";
import type { Camera } from "../core/Camera.ts";

interface TerrainRenderData {
  heights: number[][];
}

/**
 * Renderer for the terrain layer (height/depth visualization)
 */
export class TerrainLayerRenderer extends LayerRenderer {
  /**
   * Render the terrain layer
   * @param renderData - Terrain data to render
   * @param camera - Camera instance
   */
  override render(renderData: TerrainRenderData, camera: Camera): void {
    const { heights } = renderData;
    if (!heights || !this.ctx) return;

    this.clear();
    this.applyCameraTransform(camera);

    const tileSize = CONFIG.TILE_SIZE;

    for (let x = 0; x < CONFIG.WORLD_W; x++) {
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        const depth = heights[y]![x] ?? 0;
        this.ctx.fillStyle = ColorManager.getTerrainColor(depth);
        this.ctx.fillRect(
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize
        );
      }
    }

    this.resetTransform();
    this.isDirty = false;
  }
}
