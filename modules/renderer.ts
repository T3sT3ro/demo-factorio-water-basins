// Rendering and drawing functionality

import { CONFIG } from "./config.ts";
import { UI_CONSTANTS } from "./constants.ts";
import type { Pump } from "./pumps.ts";
import type { BasinManager } from "./basins.ts";
import { CameraController } from "./CameraController.ts";
import { LayerManager, type LayerName } from "./rendering/LayerManager.ts";
import { TerrainLayerRenderer } from "./rendering/TerrainLayerRenderer.ts";
import { WaterLayerRenderer } from "./rendering/WaterLayerRenderer.ts";
import { InfrastructureLayerRenderer } from "./rendering/InfrastructureLayerRenderer.ts";
import { InteractiveLayerRenderer } from "./rendering/InteractiveLayerRenderer.ts";
import { HighlightLayerRenderer } from "./rendering/HighlightLayerRenderer.ts";
import { getHeightColor } from "./rendering/ColorUtils.ts";

export interface LabelSettings {
  showDepthLabels: boolean;
  showBasinLabels: boolean;
  showPumpLabels: boolean;
}

interface BasinData {
  tiles: Set<string>;
  volume: number;
  level: number;
  height: number;
  outlets: string[];
}

interface GameState {
  getHeights(): number[][];
  getPumpsByReservoir(): Map<number, Array<Pump & { index: number }>>;
  getBasins(): Map<string, BasinData>;
  getBasinManager(): BasinManager;
  getHighlightedBasin(): string | null;
  getPumps(): Pump[];
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cameraController: CameraController;

  // Modular layer architecture
  private layerManager: LayerManager;
  private terrainRenderer: TerrainLayerRenderer;
  private waterRenderer: WaterLayerRenderer;
  private infrastructureRenderer: InfrastructureLayerRenderer;
  private interactiveRenderer: InteractiveLayerRenderer;
  private highlightRenderer: HighlightLayerRenderer;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Camera controller for pan and zoom
    this.cameraController = new CameraController(() => {
      this.layerManager.markDirty("all");
    });

    // Initialize modular layer system
    this.layerManager = new LayerManager(canvas, ctx);

    // Initialize all layer renderers
    this.terrainRenderer = new TerrainLayerRenderer();
    this.waterRenderer = new WaterLayerRenderer();
    this.infrastructureRenderer = new InfrastructureLayerRenderer();
    this.interactiveRenderer = new InteractiveLayerRenderer();
    this.highlightRenderer = new HighlightLayerRenderer();
  }

  // Mark specific layers as needing updates
  markLayerDirty(layer: LayerName | "all"): void {
    this.layerManager.markDirty(layer);
  }

  // Apply camera transformation to main context
  applyCameraTransform(): void {
    this.cameraController.applyTransform(this.ctx);
  }

  // Reset camera transformation
  resetTransform(): void {
    this.cameraController.resetTransform(this.ctx);
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return this.cameraController.screenToWorld(screenX, screenY);
  }

  // Pan camera by given offset
  pan(deltaX: number, deltaY: number): void {
    this.cameraController.pan(deltaX, deltaY);
  }

  // Zoom camera at given point
  zoomAt(screenX: number, screenY: number, zoomFactor: number): void {
    this.cameraController.zoomAt(screenX, screenY, zoomFactor);
  }

  // Get current zoom level
  getZoom(): number {
    return this.cameraController.getZoom();
  }

  // Get zoom percentage for UI display
  getZoomPercentage(): number {
    return this.cameraController.getZoomPercentage();
  }

  clear(): void {
    this.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.applyCameraTransform();
  }

  renderTerrainLayer(heights: number[][]): void {
    if (!this.layerManager.isDirty("terrain")) return;

    const terrainLayer = this.layerManager.getLayer("terrain");
    this.terrainRenderer.updateHeights(heights);
    this.terrainRenderer.render(terrainLayer.ctx, this.cameraController);

    this.layerManager.markClean("terrain");
  }

  renderInfrastructureLayer(
    pumpsByReservoir: Map<number, Array<Pump & { index: number }>>,
    showChunkBoundaries: boolean,
  ): void {
    if (!this.layerManager.isDirty("infrastructure")) return;

    const infraLayer = this.layerManager.getLayer("infrastructure");
    this.infrastructureRenderer.updateData(showChunkBoundaries, pumpsByReservoir);
    this.infrastructureRenderer.render(infraLayer.ctx, this.cameraController);

    this.layerManager.markClean("infrastructure");
  }

  renderWaterLayer(basins: Map<string, BasinData>): void {
    if (!this.layerManager.isDirty("water")) return;

    const waterLayer = this.layerManager.getLayer("water");
    this.waterRenderer.updateBasins(basins);
    this.waterRenderer.render(waterLayer.ctx, this.cameraController);

    this.layerManager.markClean("water");
  }

  renderInteractiveLayer(
    pumps: Pump[],
    selectedReservoirId: number | null,
    heights: number[][],
    basins: Map<string, BasinData>,
    labelSettings: LabelSettings,
  ): void {
    if (!this.layerManager.isDirty("interactive")) return;

    const interactiveLayer = this.layerManager.getLayer("interactive");
    this.interactiveRenderer.updateData(
      pumps,
      selectedReservoirId,
      heights,
      basins,
      labelSettings,
    );
    this.interactiveRenderer.render(interactiveLayer.ctx, this.cameraController);

    this.layerManager.markClean("interactive");
  }

  renderHighlightLayer(basinManager: BasinManager | null, highlightedBasin: string | null): void {
    if (!this.layerManager.isDirty("highlight")) return;

    const highlightLayer = this.layerManager.getLayer("highlight");
    this.highlightRenderer.updateData(basinManager, highlightedBasin);
    this.highlightRenderer.render(highlightLayer.ctx, this.cameraController);

    this.layerManager.markClean("highlight");
  }

  // Helper method for UI overlays that need scaled line width
  private getScaledLineWidth(
    baseWidth: number = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.BASE_WIDTH,
  ): number {
    const { MIN_WIDTH, SCALE_THRESHOLD } = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH;
    const zoom = this.cameraController.getZoom();
    return zoom < SCALE_THRESHOLD ? Math.max(MIN_WIDTH, baseWidth / zoom) : baseWidth;
  }

  // Optimized render method that uses layered rendering
  renderOptimized(
    gameState: GameState,
    uiSettings: LabelSettings,
    selectedReservoirId: number | null,
    brushOverlay: Map<string, number>,
    brushCenter: { x: number; y: number } | null,
    brushSize: number,
    selectedDepth: number,
  ): void {
    // Render each layer only if it's dirty
    this.renderTerrainLayer(gameState.getHeights());

    this.renderInfrastructureLayer(
      gameState.getPumpsByReservoir(),
      true, // show chunk boundaries
    );

    this.renderWaterLayer(gameState.getBasins());

    this.renderHighlightLayer(
      gameState.getBasinManager(),
      gameState.getHighlightedBasin(),
    );

    this.renderInteractiveLayer(
      gameState.getPumps(),
      selectedReservoirId,
      gameState.getHeights(),
      gameState.getBasins(),
      uiSettings,
    );

    // Clear main canvas and reset transform for compositing
    this.resetTransform();

    // Composite all layers to main canvas in hardcoded order
    this.layerManager.compositeToMain();

    // Apply camera transform for UI overlays (these need to move with the camera)
    this.applyCameraTransform();

    // Draw UI overlays directly to main canvas (these change frequently)
    this.drawBrushOverlay(brushOverlay, selectedDepth);
    if (brushCenter) {
      this.drawBrushPreview(brushCenter.x, brushCenter.y, brushSize);
    }
  }

  // Legacy method for backward compatibility
  drawTerrain(
    heights: number[][],
    basinManager: BasinManager | null = null,
    highlightedBasin: string | null = null,
  ): void {
    this.markLayerDirty("terrain");
    this.renderTerrainLayer(heights);

    // Handle highlighting if provided (legacy support)
    if (basinManager && highlightedBasin) {
      this.markLayerDirty("highlight");
      this.renderHighlightLayer(basinManager, highlightedBasin);
    }
  }

  // Legacy method for backward compatibility
  drawWater(basins: Map<string, BasinData>): void {
    this.markLayerDirty("water");
    this.renderWaterLayer(basins);
  }

  // Legacy method for backward compatibility
  drawPumps(_pumps: Pump[], _selectedReservoirId: number | null): void {
    this.markLayerDirty("interactive");
    // Will be handled in renderInteractiveLayer
  }

  // Legacy method for backward compatibility
  drawPumpConnections(_pumpsByReservoir: Map<number, Array<Pump & { index: number }>>): void {
    this.markLayerDirty("infrastructure");
    // Will be handled in renderInfrastructureLayer
  }

  // Legacy method for backward compatibility
  drawChunkBoundaries(): void {
    this.markLayerDirty("infrastructure");
    // Will be handled in renderInfrastructureLayer
  }

  // Legacy method for backward compatibility
  drawLabels(
    _heights: number[][],
    _basins: Map<string, BasinData>,
    _pumps: Pump[],
    _labelSettings: LabelSettings,
  ): void {
    this.markLayerDirty("interactive");
    // Will be handled in renderInteractiveLayer
  }

  // Public methods to mark layers dirty for specific changes
  onTerrainChanged(): void {
    this.markLayerDirty("terrain");
  }

  onWaterChanged(): void {
    this.markLayerDirty("water");
  }

  onPumpsChanged(): void {
    this.markLayerDirty("infrastructure");
    this.markLayerDirty("interactive");
  }

  onLabelsToggled(): void {
    this.markLayerDirty("interactive");
  }

  onBasinHighlightChanged(): void {
    this.markLayerDirty("highlight");
  }

  drawBrushOverlay(overlayMap: Map<string, number>, selectedDepth: number): void {
    if (overlayMap.size === 0) return;

    // Set overlay style using constants
    this.ctx.fillStyle = UI_CONSTANTS.BRUSH.OVERLAY_FILL;
    this.ctx.strokeStyle = getHeightColor(selectedDepth);
    this.ctx.lineWidth = this.getScaledLineWidth(UI_CONSTANTS.BRUSH.OVERLAY_LINE_WIDTH);

    // Draw overlay tiles
    for (const [key] of overlayMap) {
      const parts = key.split(",");
      const x = parseInt(parts[0]!);
      const y = parseInt(parts[1]!);

      const tileX = x * CONFIG.TILE_SIZE;
      const tileY = y * CONFIG.TILE_SIZE;

      // Fill with semi-transparent white
      this.ctx.fillRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

      // Stroke with target depth color
      this.ctx.strokeRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    }
  }

  drawBrushPreview(centerX: number, centerY: number, brushSize: number): void {
    if (centerX < 0 || centerY < 0 || centerX >= CONFIG.WORLD_W || centerY >= CONFIG.WORLD_H) {
      return;
    }

    const radius = Math.floor(brushSize / 2);

    this.ctx.strokeStyle = UI_CONSTANTS.BRUSH.PREVIEW_COLOR;
    this.ctx.lineWidth = this.getScaledLineWidth(1);
    this.ctx.setLineDash(UI_CONSTANTS.BRUSH.PREVIEW_DASH);

    // Draw preview tiles
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;

        // Check if tile is within world bounds
        if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
          // For circular brush, check distance
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const tileX = x * CONFIG.TILE_SIZE;
            const tileY = y * CONFIG.TILE_SIZE;

            this.ctx.strokeRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
          }
        }
      }
    }

    // Reset line dash
    this.ctx.setLineDash([]);
  }
}
