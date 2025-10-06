/**
 * Modern rendering manager - replaces the obsolete renderer.js
 * Focuses solely on layer composition and dirty state management
 */

import { TerrainLayerRenderer } from "./TerrainLayerRenderer.ts";
import { WaterLayerRenderer } from "./WaterLayerRenderer.ts";
import { PumpLayerRenderer } from "./PumpLayerRenderer.ts";
import type { Camera } from "../core/Camera.ts";

interface Basin {
  level: number;
  height: number;
}

interface BasinManager {
  getBasinTiles: (basinId: string) => string[];
}

interface Pump {
  x: number;
  y: number;
  mode: string;
  reservoirId: string;
}

interface RenderData {
  heights: number[][];
  basins: Map<string, Basin>;
  basinManager: BasinManager;
  pumps: Pump[];
  selectedReservoirId: string | null;
  brushOverlay: Map<string, unknown>;
  brushCenter: unknown;
  brushSize: number;
  selectedDepth: number;
}

export interface UISettings {
  showLabels: boolean;
  showGrid: boolean;
}

interface DirtyState {
  terrain: boolean;
  water: boolean;
  pumps: boolean;
  composition: boolean;
}

/**
 * Simplified render manager focused on layer composition
 */
export class RenderManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  terrainRenderer: TerrainLayerRenderer;
  waterRenderer: WaterLayerRenderer;
  pumpRenderer: PumpLayerRenderer;
  isDirty: DirtyState;

  /**
   * @param canvas - Main canvas element
   * @param ctx - 2D rendering context
   * @param camera - Camera instance
   */
  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, camera: Camera) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.camera = camera;

    // Initialize layer renderers
    this.terrainRenderer = new TerrainLayerRenderer(canvas.width, canvas.height);
    this.waterRenderer = new WaterLayerRenderer(canvas.width, canvas.height);
    this.pumpRenderer = new PumpLayerRenderer(canvas.width, canvas.height);

    // Track dirty state for efficient rendering
    this.isDirty = {
      terrain: true,
      water: true,
      pumps: true,
      composition: true,
    };
  }

  /**
   * Mark specific layers as dirty for re-rendering
   * @param layers - Layer name(s) or "all"
   */
  markDirty(layers: string | string[]): void {
    if (layers === "all") {
      this.isDirty.terrain = true;
      this.isDirty.water = true;
      this.isDirty.pumps = true;
      this.isDirty.composition = true;
      this.terrainRenderer.markDirty();
      this.waterRenderer.markDirty();
      this.pumpRenderer.markDirty();
      return;
    }

    const layerArray = Array.isArray(layers) ? layers : [layers];
    
    layerArray.forEach(layer => {
      switch (layer) {
        case "terrain":
          this.isDirty.terrain = true;
          this.isDirty.composition = true;
          this.terrainRenderer.markDirty();
          break;
        case "water":
        case "basins":
          this.isDirty.water = true;
          this.isDirty.composition = true;
          this.waterRenderer.markDirty();
          break;
        case "pumps":
        case "interactive":
          this.isDirty.pumps = true;
          this.isDirty.composition = true;
          this.pumpRenderer.markDirty();
          break;
      }
    });
  }

  /**
   * Event handlers for system changes
   */
  onTerrainChanged() { this.markDirty("terrain"); }
  onBasinsChanged() { this.markDirty("water"); }
  onWaterChanged() { this.markDirty("water"); }
  onPumpsChanged() { this.markDirty("pumps"); }
  onLabelsToggled() { 
    // Labels are rendered as part of water layer
    this.markDirty("water"); 
  }

  /**
   * Resize all layer canvases
   * @param width - New width
   * @param height - New height
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.terrainRenderer.resize(width, height);
    this.waterRenderer.resize(width, height);
    this.pumpRenderer.resize(width, height);
    
    this.markDirty("all");
  }

  /**
   * Render specific layers based on what changed
   * @param renderData - Data needed for rendering
   */
  renderLayers(renderData: RenderData): void {
    if (this.isDirty.terrain) {
      this.terrainRenderer.render({ heights: renderData.heights }, this.camera);
      this.isDirty.terrain = false;
    }

    if (this.isDirty.water) {
      this.waterRenderer.render({
        basins: renderData.basins,
        basinManager: renderData.basinManager
      }, this.camera);
      this.isDirty.water = false;
    }

    if (this.isDirty.pumps) {
      this.pumpRenderer.render({
        pumps: renderData.pumps,
        selectedReservoirId: renderData.selectedReservoirId
      }, this.camera);
      this.isDirty.pumps = false;
    }
  }

  /**
   * Composite all layers onto main canvas
   */
  compositeFrames() {
    if (!this.isDirty.composition) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Composite in Z-order: terrain -> water -> pumps
    this.ctx.drawImage(this.terrainRenderer.getCanvas(), 0, 0);
    this.ctx.drawImage(this.waterRenderer.getCanvas(), 0, 0);
    this.ctx.drawImage(this.pumpRenderer.getCanvas(), 0, 0);
    
    this.isDirty.composition = false;
  }

  /**
   * Full optimized render pipeline
   * @param gameState - Game state object
   * @param _uiSettings - UI settings (unused in current implementation)
   * @param selectedReservoir - Selected reservoir
   * @param brushOverlay - Brush overlay
   * @param brushCenter - Brush center
   * @param brushSize - Brush size
   * @param selectedDepth - Selected depth
   * @param _debugState - Debug state (unused)
   */
  renderOptimized(
    gameState: unknown,
    _uiSettings: UISettings,
    selectedReservoir: unknown,
    brushOverlay: Map<string, unknown>,
    brushCenter: unknown,
    brushSize: number,
    selectedDepth: number,
    _debugState: unknown
  ): void {
    const gs = gameState as Record<string, unknown>;
    const renderData: RenderData = {
      heights: (typeof gs?.getHeights === 'function' ? gs.getHeights() as number[][] : []) || [],
      basins: (typeof gs?.getBasins === 'function' ? gs.getBasins() as Map<string, Basin> : new Map()) || new Map(),
      basinManager: (typeof gs?.getBasinManager === 'function' ? gs.getBasinManager() as BasinManager : { getBasinTiles: () => [] }) || { getBasinTiles: () => [] },
      pumps: (typeof gs?.getPumps === 'function' ? gs.getPumps() as Pump[] : []) || [],
      selectedReservoirId: (selectedReservoir && typeof selectedReservoir === 'object' && selectedReservoir !== null && 'id' in selectedReservoir) ? String((selectedReservoir as {id: unknown}).id) || null : null,
      brushOverlay,
      brushCenter,
      brushSize,
      selectedDepth
    };

    this.renderLayers(renderData);
    this.compositeFrames();
  }

  /**
   * Quick render for real-time updates (water simulation)
   * @param gameState - Game state object
   */
  quickRender(gameState: unknown): void {
    const gs = gameState as Record<string, unknown>;
    const renderData = {
      basins: (typeof gs?.getBasins === 'function' ? gs.getBasins() as Map<string, Basin> : new Map()) || new Map(),
      basinManager: (typeof gs?.getBasinManager === 'function' ? gs.getBasinManager() as BasinManager : { getBasinTiles: () => [] }) || { getBasinTiles: () => [] }
    };

    // Only update water layer for performance
    this.waterRenderer.render(renderData, this.camera);
    this.isDirty.composition = true;
    this.compositeFrames();
  }

  /**
   * Legacy compatibility method - delegates to renderOptimized
   * @param gameState - Game state object
   */
  render(gameState: unknown): void {
    const defaultUISettings: UISettings = { showLabels: false, showGrid: false };
    this.renderOptimized(gameState, defaultUISettings, null, new Map(), null, 0, 0, null);
  }

  // === COORDINATE TRANSFORMATION DELEGATION ===
  // These methods delegate to the camera for coordinate transformations

  /**
   * Convert screen coordinates to world coordinates
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   * @returns World coordinates {x, y}
   */
  screenToWorld(screenX: number, screenY: number): {x: number, y: number} {
    return this.camera.screenToWorld(screenX, screenY);
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @returns Screen coordinates {x, y}
   */
  worldToScreen(worldX: number, worldY: number): {x: number, y: number} {
    return this.camera.worldToScreen(worldX, worldY);
  }

  /**
   * Pan camera and mark all layers dirty
   * @param deltaX - Screen delta X
   * @param deltaY - Screen delta Y
   */
  pan(deltaX: number, deltaY: number): void {
    if (this.camera.pan(deltaX, deltaY)) {
      this.markDirty("all");
    }
  }

  /**
   * Zoom camera at specific point and mark all layers dirty
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   * @param zoomFactor - Zoom factor
   */
  zoomAt(screenX: number, screenY: number, zoomFactor: number): void {
    if (this.camera.zoomAt(screenX, screenY, zoomFactor)) {
      this.markDirty("all");
    }
  }
}
