/**
 * Main Renderer - Clean replacement for the obsolete renderer.js
 * Integrates RenderManager with Camera and UI components
 */

import { RenderManager } from "./RenderManager.js";
import { RenderUIManager } from "./RenderUIManager.js";
import { Camera } from "../core/Camera.js";
import { CONFIG } from "../config.js";
import { ColorManager } from "./ColorManager.js";

/**
 * Modern renderer that integrates all rendering components
 * This replaces the obsolete renderer.js with proper separation of concerns
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas - Main canvas element
   * @param {CanvasRenderingContext2D} ctx - 2D rendering context
   */
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Core components with proper separation
    this.camera = new Camera();
    this.renderManager = new RenderManager(canvas, ctx, this.camera);
    this.uiManager = new RenderUIManager();

    // Initialize UI components
    this.uiManager.initialize();
  }

  // === RENDER MANAGER DELEGATION ===
  // Delegate all rendering operations to RenderManager

  /**
   * Full optimized render pipeline
   * @param {*} gameState - Game state object
   * @param {*} uiSettings - UI settings
   * @param {*} selectedReservoir - Selected reservoir
   * @param {*} brushOverlay - Brush overlay
   * @param {*} brushCenter - Brush center
   * @param {*} brushSize - Brush size
   * @param {*} selectedDepth - Selected depth
   * @param {*} debugState - Debug state
   */
  renderOptimized(gameState, uiSettings, selectedReservoir, brushOverlay, brushCenter, brushSize, selectedDepth, debugState) {
    return this.renderManager.renderOptimized(gameState, uiSettings, selectedReservoir, brushOverlay, brushCenter, brushSize, selectedDepth, debugState);
  }

  /**
   * Quick render for real-time updates
   * @param {*} gameState - Game state object
   */
  quickRender(gameState) {
    return this.renderManager.quickRender(gameState);
  }

  /**
   * Legacy render method
   * @param {*} gameState - Game state object
   */
  render(gameState) {
    return this.renderManager.render(gameState);
  }

  /**
   * Resize renderer
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    return this.renderManager.resize(width, height);
  }

  // === EVENT HANDLERS ===
  // Delegate layer dirty marking to RenderManager

  onTerrainChanged() { this.renderManager.onTerrainChanged(); }
  onBasinsChanged() { this.renderManager.onBasinsChanged(); }
  onWaterChanged() { this.renderManager.onWaterChanged(); }
  onPumpsChanged() { this.renderManager.onPumpsChanged(); }
  onLabelsToggled() { this.renderManager.onLabelsToggled(); }

  // === COORDINATE TRANSFORMATIONS ===
  // Delegate to RenderManager which delegates to Camera

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} World coordinates
   */
  screenToWorld(screenX, screenY) {
    return this.renderManager.screenToWorld(screenX, screenY);
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Object} Screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return this.renderManager.worldToScreen(worldX, worldY);
  }

  /**
   * Get tile coordinates from screen position
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} Tile coordinates {x, y}
   */
  getTileFromScreen(screenX, screenY) {
    const world = this.screenToWorld(screenX, screenY);
    return {
      x: Math.floor((/** @type {any} */ (world)).x / CONFIG.TILE_SIZE),
      y: Math.floor((/** @type {any} */ (world)).y / CONFIG.TILE_SIZE)
    };
  }

  // === CAMERA CONTROLS ===
  // Delegate to RenderManager which handles camera and dirty state

  /**
   * Pan camera by screen delta
   * @param {number} deltaX - Screen delta X
   * @param {number} deltaY - Screen delta Y
   */
  pan(deltaX, deltaY) {
    this.renderManager.pan(deltaX, deltaY);
  }

  /**
   * Zoom at specific screen point
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @param {number} zoomFactor - Zoom factor
   */
  zoomAt(screenX, screenY, zoomFactor) {
    this.renderManager.zoomAt(screenX, screenY, zoomFactor);
  }

  /**
   * Legacy zoom method for compatibility
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @param {number} zoomFactor - Zoom factor
   */
  zoom(screenX, screenY, zoomFactor) {
    this.zoomAt(screenX, screenY, zoomFactor);
  }

  // === UI COMPONENT ACCESS ===
  // Provide access to UI components for external use

  /**
   * Get legend component
   * @returns {import('../ui/Legend.js').Legend} Legend instance
   */
  getLegend() {
    return this.uiManager.getLegend();
  }

  /**
   * Get legend component (alias for compatibility)
   * @returns {import('../ui/Legend.js').Legend} Legend instance
   */
  get legend() {
    return this.uiManager.getLegend();
  }

  /**
   * Get camera instance
   * @returns {Camera} Camera instance
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get basin label manager
   * @returns {import('../labels.js').BasinLabelManager} Basin label manager
   */
  getBasinLabelManager() {
    return this.uiManager.getBasinLabelManager();
  }
}

/**
 * Legacy compatibility function for getHeightColor
 * @param {number} depth - The depth value
 * @returns {string} CSS color string
 */
export function getHeightColor(depth) {
  return ColorManager.getTerrainColor(depth);
}
