import { LayerRenderer } from "./LayerRenderer.js";
import { ColorManager } from "./ColorManager.js";
import { CONFIG } from "../config.js";

/**
 * @typedef {Object} TerrainRenderData
 * @property {Array<Array<number>>} heights - 2D array of terrain heights
 */

/**
 * Renderer for the terrain layer (height/depth visualization)
 */
export class TerrainLayerRenderer extends LayerRenderer {
  /**
   * Render the terrain layer
   * @override
   * @param {TerrainRenderData} renderData - Terrain data to render
   * @param {import('../core/Camera.js').Camera} camera - Camera instance
   */
  render(renderData, camera) {
    const { heights } = renderData;
    if (!heights || !this.ctx) return;

    this.clear();
    this.applyCameraTransform(camera);

    const tileSize = CONFIG.TILE_SIZE;

    for (let x = 0; x < CONFIG.WORLD_W; x++) {
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        const depth = heights[y][x];
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
