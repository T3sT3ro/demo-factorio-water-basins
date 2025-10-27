// Rendering and drawing functionality

import type { Pump } from "../pumps.ts";
import type { BasinManager } from "../basins.ts";
import type { DebugState } from "../BasinDebugGenerator.ts";
import { CONFIG } from "../config.ts";
import { CameraController } from "./CameraController.ts";
import { LayerManager } from "./LayerManager.ts";
import { TerrainLayerRenderer } from "./TerrainLayerRenderer.ts";
import { WaterLayerRenderer } from "./WaterLayerRenderer.ts";
import { InfrastructureLayerRenderer } from "./InfrastructureLayerRenderer.ts";
import { InteractiveLayerRenderer } from "./InteractiveLayerRenderer.ts";
import { HighlightLayerRenderer } from "./HighlightLayerRenderer.ts";
import { BrushOverlayRenderer, BrushPreviewRenderer } from "./BrushRenderer.ts";

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

  // Optimized brush rendering
  private brushOverlayRenderer: BrushOverlayRenderer;
  private brushPreviewRenderer: BrushPreviewRenderer;

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

    // Initialize brush renderers
    this.brushOverlayRenderer = new BrushOverlayRenderer(
      CONFIG.WORLD_W,
      CONFIG.WORLD_H,
    );
    this.brushPreviewRenderer = new BrushPreviewRenderer();
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

  // Get zoom percentage for UI display
  getZoomPercentage(): number {
    return this.cameraController.getZoomPercentage();
  }

  private renderTerrainLayer(heights: number[][]): void {
    if (!this.layerManager.isDirty("terrain")) return;

    const terrainLayer = this.layerManager.getLayer("terrain");
    this.terrainRenderer.updateHeights(heights);
    this.terrainRenderer.render(terrainLayer.ctx, this.cameraController);

    this.layerManager.markClean("terrain");
  }

  private renderInfrastructureLayer(
    pumpsByReservoir: Map<number, Array<Pump & { index: number }>>,
    showChunkBoundaries: boolean,
  ): void {
    if (!this.layerManager.isDirty("infrastructure")) return;

    const infraLayer = this.layerManager.getLayer("infrastructure");
    this.infrastructureRenderer.updateData(showChunkBoundaries, pumpsByReservoir);
    this.infrastructureRenderer.render(infraLayer.ctx, this.cameraController);

    this.layerManager.markClean("infrastructure");
  }

  private renderWaterLayer(basins: Map<string, BasinData>): void {
    if (!this.layerManager.isDirty("water")) return;

    const waterLayer = this.layerManager.getLayer("water");
    this.waterRenderer.updateBasins(basins);
    this.waterRenderer.render(waterLayer.ctx, this.cameraController);

    this.layerManager.markClean("water");
  }

  private renderInteractiveLayer(
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

  private renderHighlightLayer(
    basinManager: BasinManager | null,
    highlightedBasin: string | null,
    debugState: DebugState | null = null,
  ): void {
    if (!this.layerManager.isDirty("highlight")) return;

    const highlightLayer = this.layerManager.getLayer("highlight");
    this.highlightRenderer.updateData(basinManager, highlightedBasin, debugState);
    this.highlightRenderer.render(highlightLayer.ctx, this.cameraController);

    this.layerManager.markClean("highlight");
  }

  render(
    gameState: GameState,
    uiSettings: LabelSettings,
    selectedReservoirId: number | null,
    brushOverlay: Map<string, number>,
    brushCenter: { x: number; y: number } | null,
    brushSize: number,
    selectedDepth: number,
    debugState: DebugState | null = null,
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
      debugState,
    );

    this.renderInteractiveLayer(
      gameState.getPumps(),
      selectedReservoirId,
      gameState.getHeights(),
      gameState.getBasins(),
      uiSettings,
    );

    // Clear main canvas and reset transform for compositing
    this.cameraController.resetTransform(this.ctx);

    // Composite all layers to main canvas in hardcoded order
    this.layerManager.compositeToMain();

    // Apply camera transform for UI overlays (these need to move with the camera)
    this.cameraController.applyTransform(this.ctx);

    // Update brush overlay with incremental rendering (only changed tiles)
    this.brushOverlayRenderer.updateOverlay(brushOverlay, selectedDepth);

    // Composite the overlay canvas (already in world space)
    this.brushOverlayRenderer.compositeToCanvas(this.ctx);

    // Render brush preview if cursor is active
    if (brushCenter) {
      this.brushPreviewRenderer.render(
        this.ctx,
        brushCenter.x,
        brushCenter.y,
        brushSize,
        this.cameraController,
      );
    }
  }

  // Layer state management - mark layers dirty when content changes
  onTerrainChanged(): void {
    this.layerManager.markDirty("terrain");
  }

  onWaterChanged(): void {
    this.layerManager.markDirty("water");
  }

  onPumpsChanged(): void {
    this.layerManager.markDirty("infrastructure");
    this.layerManager.markDirty("interactive");
  }

  onLabelsToggled(): void {
    this.layerManager.markDirty("interactive");
  }

  onBasinHighlightChanged(): void {
    this.layerManager.markDirty("highlight");
  }

  onDepthSelectionChanged(): void {
    this.layerManager.markDirty("all");
  }

  clearBrushOverlay(): void {
    this.brushOverlayRenderer.clear();
  }
}
