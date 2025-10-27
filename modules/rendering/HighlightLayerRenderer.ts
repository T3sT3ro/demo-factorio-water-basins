import { BaseLayerRenderer } from "./LayerRenderer.ts";
import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";
import type { BasinManager, DebugState } from "../basins/index.ts";
import type { CameraController } from "./CameraController.ts";

/**
 * Renders highlight elements: basin highlights and debug overlays
 */
export class HighlightLayerRenderer extends BaseLayerRenderer {
  private basinManager: BasinManager | null = null;
  private highlightedBasin: string | null = null;
  private debugState: DebugState | null = null;

  updateData(
    basinManager: BasinManager | null,
    highlightedBasin: string | null,
    debugState: DebugState | null = null,
  ): void {
    this.basinManager = basinManager;
    this.highlightedBasin = highlightedBasin;
    this.debugState = debugState;
  }

  render(ctx: CanvasRenderingContext2D, camera: CameraController): void {
    this.clear(ctx);
    this.applyCamera(ctx, camera);

    // Render debug state overlay if in debug mode
    if (this.debugState) {
      this.renderDebugOverlay(ctx, camera);
    }

    // Only render basin highlight if there's a basin to highlight and not in debug mode
    if (this.basinManager && this.highlightedBasin && !this.debugState) {
      const basin = this.basinManager.basins.get(this.highlightedBasin);
      if (basin) {
        this.renderBasinHighlight(ctx, basin, camera);
      }
    }
  }

  private renderDebugOverlay(ctx: CanvasRenderingContext2D, camera: CameraController): void {
    if (!this.debugState) return;

    const lineWidth = this.getScaledLineWidth(camera, 1);
    const { DEBUG_OVERLAY } = UI_CONSTANTS.RENDERING.COLORS;

    // Render processed tiles (purple)
    ctx.fillStyle = DEBUG_OVERLAY.PROCESSED.FILL;
    ctx.strokeStyle = DEBUG_OVERLAY.PROCESSED.STROKE;
    ctx.lineWidth = lineWidth;
    this.debugState.processedTiles.forEach((tileKey) => {
      const parts = tileKey.split(",");
      const x = parseInt(parts[0]!);
      const y = parseInt(parts[1]!);
      const params: [number, number, number, number] = [
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
      ];
      ctx.fillRect(...params);
      ctx.strokeRect(...params);
    });

    // Render pending tiles (pastel pink)
    ctx.fillStyle = DEBUG_OVERLAY.PENDING.FILL;
    ctx.strokeStyle = DEBUG_OVERLAY.PENDING.STROKE;
    ctx.lineWidth = lineWidth;
    this.debugState.pendingTiles.forEach((tileKey) => {
      const parts = tileKey.split(",");
      const x = parseInt(parts[0]!);
      const y = parseInt(parts[1]!);
      const params: [number, number, number, number] = [
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
      ];
      ctx.fillRect(...params);
      ctx.strokeRect(...params);
    });

    // Render active tile (bright green)
    if (this.debugState.activeTile) {
      ctx.fillStyle = DEBUG_OVERLAY.ACTIVE.FILL;
      ctx.strokeStyle = DEBUG_OVERLAY.ACTIVE.STROKE;
      ctx.lineWidth = lineWidth * DEBUG_OVERLAY.ACTIVE.LINE_WIDTH_MULTIPLIER;
      const { x, y } = this.debugState.activeTile;
      const params: [number, number, number, number] = [
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
      ];
      ctx.fillRect(...params);
      ctx.strokeRect(...params);
    }
  }

  private renderBasinHighlight(
    ctx: CanvasRenderingContext2D,
    basin: { tiles: Set<string> },
    camera: CameraController,
  ): void {
    ctx.fillStyle = UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.FILL;
    ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.STROKE;
    ctx.lineWidth = this.getScaledLineWidth(
      camera,
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.HIGHLIGHT_BASE_WIDTH,
    );

    basin.tiles.forEach((tileKey) => {
      const parts = tileKey.split(",");
      const x = parseInt(parts[0]!);
      const y = parseInt(parts[1]!);
      const params: [number, number, number, number] = [
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
      ];
      ctx.fillRect(...params);
      ctx.strokeRect(...params);
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
