import { LayerRenderer } from "./LayerRenderer.ts";
import { ColorManager } from "./ColorManager.ts";
import { CONFIG } from "../config.ts";
import type { Camera } from "../core/Camera.ts";

interface Basin {
  level: number;
  height: number;
}

interface BasinManager {
  getBasinTiles(basinId: string): string[];
}

interface WaterRenderData {
  basins: Map<string, Basin>;
  basinManager: BasinManager;
}

/**
 * Renderer for the water layer (basin water visualization)
 */
export class WaterLayerRenderer extends LayerRenderer {
  /**
   * Render the water layer
   * @param renderData - Water data to render
   * @param camera - Camera instance
   */
  override render(renderData: WaterRenderData, camera: Camera): void {
    const { basins, basinManager } = renderData;
    if (!basins || basins.size === 0 || !this.ctx) return;

    this.clear();
    this.applyCameraTransform(camera);

    const tileSize = CONFIG.TILE_SIZE;

    for (const [basinId, basin] of basins) {
      if (basin.level <= 0) continue;

      this.ctx.fillStyle = ColorManager.getWaterColor(basin.level);

      const basinTiles = basinManager.getBasinTiles(basinId) || [];
      basinTiles.forEach((tileKey: string) => {
        const parts = tileKey.split(",").map(Number);
        const tx = parts[0] ?? 0;
        const ty = parts[1] ?? 0;
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
