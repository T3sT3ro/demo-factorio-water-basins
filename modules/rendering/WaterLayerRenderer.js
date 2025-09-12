import { LayerRenderer } from "./LayerRenderer.js";
import { ColorManager } from "./ColorManager.js";
import { CONFIG } from "../config.js";

/**
 * @typedef {Object} Basin
 * @property {number} level - Current water level in the basin
 * @property {number} height - Maximum height/capacity of the basin
 */

/**
 * @typedef {Object} BasinManager
 * @property {function(string): Array<string>} getBasinTiles - Get tiles for a basin ID
 */

/**
 * @typedef {Object} WaterRenderData
 * @property {Map<string, Basin>} basins - Map of basin ID to basin data
 * @property {BasinManager} basinManager - Basin manager instance
 */

/**
 * Renderer for the water layer (basin water visualization)
 */
export class WaterLayerRenderer extends LayerRenderer {
  /**
   * Render the water layer
   * @override
   * @param {WaterRenderData} renderData - Water data to render
   * @param {import('../core/Camera.js').Camera} camera - Camera instance
   */
  render(renderData, camera) {
    const { basins, basinManager } = renderData;
    if (!basins || basins.size === 0 || !this.ctx) return;

    this.clear();
    this.applyCameraTransform(camera);

    const tileSize = CONFIG.TILE_SIZE;

    for (const [basinId, basin] of basins) {
      if (basin.level <= 0) continue;

      this.ctx.fillStyle = ColorManager.getWaterColor(basin.level);

      const basinTiles = basinManager.getBasinTiles(basinId);
      basinTiles.forEach((/** @type {string} */ tileKey) => {
        const [tx, ty] = tileKey.split(",").map(Number);
        // Only draw water if it's above the terrain height
        if (basin.level > basin.height) {
          this.ctx.fillRect(
            tx * tileSize,
            ty * tileSize,
            tileSize,
            tileSize
          );
        }
      });
    }

    this.resetTransform();
    this.isDirty = false;
  }
}
