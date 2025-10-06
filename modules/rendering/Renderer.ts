/**
 * Main Renderer - Clean replacement for the obsolete renderer.js
 * Integrates RenderManager with Camera and UI components
 */

import { RenderManager, UISettings } from "./RenderManager.ts";
import { RenderUIManager } from "./RenderUIManager.ts";
import { Camera } from "../core/Camera.ts";
import { CONFIG } from "../config.ts";
import { ColorManager } from "./ColorManager.ts";

/**
 * Modern renderer that integrates all rendering components
 * This replaces the obsolete renderer.js with proper separation of concerns
 */
export class Renderer {
  [key: string]: unknown;

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  renderManager: RenderManager;
  uiManager: RenderUIManager;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
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

  renderOptimized(
    gameState: unknown,
    uiSettings: UISettings,
    selectedReservoir: unknown,
    brushOverlay: Map<string, unknown>,
    brushCenter: unknown,
    brushSize: number,
    selectedDepth: number,
    debugState: unknown
  ) {
    return this.renderManager.renderOptimized(
      gameState,
      uiSettings,
      selectedReservoir,
      brushOverlay,
      brushCenter,
      brushSize,
      selectedDepth,
      debugState
    );
  }

  /** Quick render for real-time updates */
  quickRender(gameState: unknown) {
    return this.renderManager.quickRender(gameState);
  }

  /** Legacy render method */
  render(gameState: unknown) {
    return this.renderManager.render(gameState);
  }

  /** Resize renderer */
  resize(width: number, height: number) {
    return this.renderManager.resize(width, height);
  }

  // === EVENT HANDLERS ===
  onTerrainChanged() { this.renderManager.onTerrainChanged(); }
  onBasinsChanged() { this.renderManager.onBasinsChanged(); }
  onWaterChanged() { this.renderManager.onWaterChanged(); }
  onPumpsChanged() { this.renderManager.onPumpsChanged(); }
  onLabelsToggled() { this.renderManager.onLabelsToggled(); }

  // === COORDINATE TRANSFORMATIONS ===
  screenToWorld(screenX: number, screenY: number) {
    return this.renderManager.screenToWorld(screenX, screenY);
  }

  worldToScreen(worldX: number, worldY: number) {
    return this.renderManager.worldToScreen(worldX, worldY);
  }

  getTileFromScreen(screenX: number, screenY: number) {
    const world = this.screenToWorld(screenX, screenY) as {x: number, y: number};
    return {
      x: Math.floor(world.x / CONFIG.TILE_SIZE),
      y: Math.floor(world.y / CONFIG.TILE_SIZE)
    };
  }

  // === CAMERA CONTROLS ===
  pan(deltaX: number, deltaY: number) {
    this.renderManager.pan(deltaX, deltaY);
  }

  zoomAt(screenX: number, screenY: number, zoomFactor: number) {
    this.renderManager.zoomAt(screenX, screenY, zoomFactor);
  }

  zoom(screenX: number, screenY: number, zoomFactor: number) {
    this.zoomAt(screenX, screenY, zoomFactor);
  }

  // === UI COMPONENT ACCESS ===
  getLegend() {
    return this.uiManager.getLegend();
  }

  get legend() {
    return this.uiManager.getLegend();
  }

  getCamera() {
    return this.camera;
  }

  getBasinLabelManager() {
    return this.uiManager.getBasinLabelManager();
  }
}

export function getHeightColor(depth: number): string {
  return ColorManager.getTerrainColor(depth);
}
