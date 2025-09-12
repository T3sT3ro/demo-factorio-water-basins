/**
 * Modern rendering manager - replaces the obsolete renderer.js
 * Focuses solely on layer composition and dirty state management
 */

import { TerrainLayerRenderer } from "./TerrainLayerRenderer.js";
import { WaterLayerRenderer } from "./WaterLayerRenderer.js";
import { PumpLayerRenderer } from "./PumpLayerRenderer.js";

/**
 * @typedef {Object} RenderData
 * @property {Array<Array<number>>} heights - 2D array of terrain heights
 * @property {Map<string, *>} basins - Map of basin data
 * @property {*} basinManager - Basin manager instance
 * @property {Array<*>} pumps - Array of pump objects
 * @property {string|null} selectedReservoirId - Currently selected reservoir ID
 * @property {Map<string, *>} brushOverlay - Brush overlay data
 * @property {*} brushCenter - Brush center position
 * @property {number} brushSize - Brush size
 * @property {number} selectedDepth - Currently selected depth
 */

/**
 * @typedef {Object} UISettings
 * @property {boolean} showLabels - Whether to show basin labels
 * @property {boolean} showGrid - Whether to show grid
 */

/**
 * Simplified render manager focused on layer composition
 */
export class RenderManager {
  /**
   * @param {HTMLCanvasElement} canvas - Main canvas element
   * @param {CanvasRenderingContext2D} ctx - 2D rendering context
   * @param {import('../core/Camera.js').Camera} camera - Camera instance
   */
  constructor(canvas, ctx, camera) {
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
   * @param {string|string[]} layers - Layer name(s) or "all"
   */
  markDirty(layers) {
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
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.terrainRenderer.resize(width, height);
    this.waterRenderer.resize(width, height);
    this.pumpRenderer.resize(width, height);
    
    this.markDirty("all");
  }

  /**
   * Render specific layers based on what changed
   * @param {RenderData} renderData - Data needed for rendering
   */
  renderLayers(renderData) {
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
   * @param {*} gameState - Game state object
   * @param {UISettings} _uiSettings - UI settings (unused in current implementation)
   * @param {*} selectedReservoir - Selected reservoir
   * @param {Map<string, *>} brushOverlay - Brush overlay
   * @param {*} brushCenter - Brush center
   * @param {number} brushSize - Brush size
   * @param {number} selectedDepth - Selected depth
   * @param {*} _debugState - Debug state (unused)
   */
  renderOptimized(gameState, _uiSettings, selectedReservoir, brushOverlay, brushCenter, brushSize, selectedDepth, _debugState) {
    const renderData = {
      heights: gameState.getHeights?.() || [],
      basins: gameState.getBasins?.() || new Map(),
      basinManager: gameState.getBasinManager?.() || {},
      pumps: gameState.getPumps?.() || [],
      selectedReservoirId: selectedReservoir?.id || null,
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
   * @param {*} gameState - Game state object
   */
  quickRender(gameState) {
    const renderData = {
      basins: gameState.getBasins?.() || new Map(),
      basinManager: gameState.getBasinManager?.() || {}
    };

    // Only update water layer for performance
    this.waterRenderer.render(renderData, this.camera);
    this.isDirty.composition = true;
    this.compositeFrames();
  }

  /**
   * Legacy compatibility method - delegates to renderOptimized
   * @param {*} gameState - Game state object
   */
  render(gameState) {
    const defaultUISettings = { showLabels: false, showGrid: false };
    this.renderOptimized(gameState, defaultUISettings, null, new Map(), null, 0, 0, null);
  }

  // === COORDINATE TRANSFORMATION DELEGATION ===
  // These methods delegate to the camera for coordinate transformations

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} World coordinates {x, y}
   */
  screenToWorld(screenX, screenY) {
    return this.camera.screenToWorld(screenX, screenY);
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Object} Screen coordinates {x, y}
   */
  worldToScreen(worldX, worldY) {
    return this.camera.worldToScreen(worldX, worldY);
  }

  /**
   * Pan camera and mark all layers dirty
   * @param {number} deltaX - Screen delta X
   * @param {number} deltaY - Screen delta Y
   */
  pan(deltaX, deltaY) {
    if (this.camera.pan(deltaX, deltaY)) {
      this.markDirty("all");
    }
  }

  /**
   * Zoom camera at specific point and mark all layers dirty
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @param {number} zoomFactor - Zoom factor
   */
  zoomAt(screenX, screenY, zoomFactor) {
    if (this.camera.zoomAt(screenX, screenY, zoomFactor)) {
      this.markDirty("all");
    }
  }
}
