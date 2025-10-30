// Water layer renderer - renders water in basins

import { CONFIG } from "../config.ts";
import { keyToTuple } from "../TileUtils.ts";
import { BaseLayerRenderer } from "./LayerRenderer.ts";
import { getWaterColor } from "./ColorUtils.ts";
import type { CameraController } from "./CameraController.ts";
import type { BasinData } from "../basins/index.ts";

export class WaterLayerRenderer extends BaseLayerRenderer {
  private basins = new Map<string, BasinData>();

  updateBasins(basins: Map<string, BasinData>): void {
    this.basins = basins;
  }

  render(ctx: CanvasRenderingContext2D, camera: CameraController): void {
    this.clear(ctx);
    this.applyCamera(ctx, camera);

    // Draw water in each basin
    for (const basin of this.basins.values()) {
      if (basin.level > 0) {
        const waterColor = getWaterColor(basin.level, basin.height);
        ctx.fillStyle = waterColor;

        for (const tileKey of basin.tiles) {
          const [x, y] = keyToTuple(tileKey);
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
}
