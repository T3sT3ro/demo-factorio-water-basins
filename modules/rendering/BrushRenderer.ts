import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";
import { getHeightColor } from "./ColorUtils.ts";
import type { CameraController } from "./CameraController.ts";

/**
 * Optimized brush overlay renderer with incremental updates
 * Uses off-screen canvas in world space for accumulated strokes
 * Only draws changed tiles, then composites the entire overlay
 */
export class BrushOverlayRenderer {
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private drawnTiles = new Set<string>();
  private selectedDepth = 0;

  constructor(worldWidth: number, worldHeight: number) {
    // Create canvas in world space (not screen space)
    const worldPixelWidth = worldWidth * CONFIG.TILE_SIZE;
    const worldPixelHeight = worldHeight * CONFIG.TILE_SIZE;

    this.overlayCanvas = document.createElement("canvas");
    this.overlayCanvas.width = worldPixelWidth;
    this.overlayCanvas.height = worldPixelHeight;
    const ctx = this.overlayCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create brush overlay context");
    this.overlayCtx = ctx;
  }

  /**
   * Update overlay with incremental rendering - only draws changed tiles
   */
  updateOverlay(
    currentTiles: Map<string, number>,
    selectedDepth: number,
  ): void {
    // If depth changed, clear and redraw everything
    if (this.selectedDepth !== selectedDepth) {
      this.selectedDepth = selectedDepth;
      this.clear();
      this.drawnTiles.clear();
      for (const key of currentTiles.keys()) {
        this.drawTile(key, selectedDepth);
        this.drawnTiles.add(key);
      }
      return;
    }

    // Find tiles to add and remove
    const tilesToAdd = new Set<string>();
    const tilesToRemove = new Set<string>();

    for (const key of currentTiles.keys()) {
      if (!this.drawnTiles.has(key)) {
        tilesToAdd.add(key);
      }
    }

    for (const key of this.drawnTiles) {
      if (!currentTiles.has(key)) {
        tilesToRemove.add(key);
      }
    }

    // Clear removed tiles
    for (const key of tilesToRemove) {
      this.clearTile(key);
      this.drawnTiles.delete(key);
    }

    // Draw new tiles
    for (const key of tilesToAdd) {
      this.drawTile(key, selectedDepth);
      this.drawnTiles.add(key);
    }
  }

  /**
   * Draw a single tile in world space (no transform needed)
   */
  private drawTile(tileKey: string, selectedDepth: number): void {
    const parts = tileKey.split(",");
    const x = parseInt(parts[0]!);
    const y = parseInt(parts[1]!);

    const tileX = x * CONFIG.TILE_SIZE;
    const tileY = y * CONFIG.TILE_SIZE;

    // Draw directly in world space - no transform needed
    this.overlayCtx.fillStyle = UI_CONSTANTS.BRUSH.OVERLAY_FILL;
    this.overlayCtx.fillRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    this.overlayCtx.strokeStyle = getHeightColor(selectedDepth);
    this.overlayCtx.lineWidth = UI_CONSTANTS.BRUSH.OVERLAY_LINE_WIDTH;
    this.overlayCtx.strokeRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
  }

  /**
   * Clear a single tile in world space
   */
  private clearTile(tileKey: string): void {
    const parts = tileKey.split(",");
    const x = parseInt(parts[0]!);
    const y = parseInt(parts[1]!);

    const tileX = x * CONFIG.TILE_SIZE;
    const tileY = y * CONFIG.TILE_SIZE;

    // Clear with padding for stroke width
    this.overlayCtx.clearRect(
      tileX - 2,
      tileY - 2,
      CONFIG.TILE_SIZE + 4,
      CONFIG.TILE_SIZE + 4,
    );
  }

  /**
   * Composite the overlay canvas to the target (with camera transform already applied)
   */
  compositeToCanvas(targetCtx: CanvasRenderingContext2D): void {
    if (this.drawnTiles.size > 0) {
      // Canvas is already in world space, target context has camera transform applied
      targetCtx.drawImage(this.overlayCanvas, 0, 0);
    }
  }

  clear(): void {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.drawnTiles.clear();
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

/**
 * Brush preview renderer - shows cursor preview of brush area
 */
export class BrushPreviewRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    brushSize: number,
    camera: CameraController,
  ): void {
    if (
      centerX < 0 || centerY < 0 || centerX >= CONFIG.WORLD_W ||
      centerY >= CONFIG.WORLD_H
    ) {
      return;
    }

    const radius = Math.floor(brushSize / 2);

    ctx.save();
    ctx.strokeStyle = UI_CONSTANTS.BRUSH.PREVIEW_COLOR;
    ctx.lineWidth = this.getScaledLineWidth(camera, 1);
    ctx.setLineDash(UI_CONSTANTS.BRUSH.PREVIEW_DASH);

    // Draw preview tiles in a circular pattern
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const tileX = x * CONFIG.TILE_SIZE;
            const tileY = y * CONFIG.TILE_SIZE;
            ctx.strokeRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
          }
        }
      }
    }

    ctx.restore();
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
