import { BaseLayerRenderer } from "./LayerRenderer.ts";
import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";
import type { Pump } from "../pumps.ts";
import type { CameraController } from "../CameraController.ts";

/**
 * Renders infrastructure elements: chunk boundaries and pump connections
 */
export class InfrastructureLayerRenderer extends BaseLayerRenderer {
  private showChunkBoundaries = false;
  private pumpsByReservoir = new Map<number, Pump[]>();

  updateData(
    showChunkBoundaries: boolean,
    pumpsByReservoir: Map<number, Pump[]>,
  ): void {
    this.showChunkBoundaries = showChunkBoundaries;
    this.pumpsByReservoir = pumpsByReservoir;
  }

  render(ctx: CanvasRenderingContext2D, camera: CameraController): void {
    this.clear(ctx);
    this.applyCamera(ctx, camera);

    if (this.showChunkBoundaries) {
      this.renderChunkBoundaries(ctx, camera);
    }

    this.renderPumpConnections(ctx, camera);
  }

  private renderChunkBoundaries(
    ctx: CanvasRenderingContext2D,
    camera: CameraController,
  ): void {
    ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.CHUNK_BOUNDARIES;
    ctx.lineWidth = this.getScaledLineWidth(
      camera,
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.BASE_WIDTH,
    );

    // Vertical lines
    for (let cx = 0; cx <= CONFIG.WORLD_W; cx += CONFIG.CHUNK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(cx * CONFIG.TILE_SIZE, 0);
      ctx.lineTo(cx * CONFIG.TILE_SIZE, CONFIG.WORLD_H * CONFIG.TILE_SIZE);
      ctx.stroke();
    }

    // Horizontal lines
    for (let cy = 0; cy <= CONFIG.WORLD_H; cy += CONFIG.CHUNK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, cy * CONFIG.TILE_SIZE);
      ctx.lineTo(CONFIG.WORLD_W * CONFIG.TILE_SIZE, cy * CONFIG.TILE_SIZE);
      ctx.stroke();
    }
  }

  private renderPumpConnections(
    ctx: CanvasRenderingContext2D,
    camera: CameraController,
  ): void {
    const scaledLineWidth = this.getScaledLineWidth(
      camera,
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.PUMP_BASE_WIDTH,
    );
    const zoom = camera.getZoom();
    const dashPattern = zoom <
        UI_CONSTANTS.RENDERING.PATTERNS.PUMP_CONNECTIONS.DASH_THRESHOLD
      ? UI_CONSTANTS.RENDERING.PATTERNS.PUMP_CONNECTIONS.DASH_ZOOMED_OUT
      : UI_CONSTANTS.RENDERING.PATTERNS.PUMP_CONNECTIONS.DASH_NORMAL;

    this.pumpsByReservoir.forEach((pumpsInReservoir) => {
      if (pumpsInReservoir.length > 1) {
        ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.PUMP_CONNECTIONS;
        ctx.lineWidth = scaledLineWidth;
        ctx.setLineDash(dashPattern);

        for (let i = 0; i < pumpsInReservoir.length - 1; i++) {
          const pump1 = pumpsInReservoir[i]!;
          const pump2 = pumpsInReservoir[i + 1]!;

          const x1 = pump1.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const y1 = pump1.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const x2 = pump2.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const y2 = pump2.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        ctx.setLineDash([]);
      }
    });
  }

  private getScaledLineWidth(
    camera: CameraController,
    baseWidth: number,
  ): number {
    const { MIN_WIDTH, SCALE_THRESHOLD } = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH;
    const zoom = camera.getZoom();
    return zoom < SCALE_THRESHOLD ? Math.max(MIN_WIDTH, baseWidth / zoom) : baseWidth;
  }
}
