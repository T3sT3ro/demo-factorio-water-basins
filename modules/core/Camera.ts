// Camera/Viewport management for pan and zoom functionality

import { UI_CONSTANTS } from "../constants.ts";

interface CameraState {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

interface WorldCoordinate {
  x: number;
  y: number;
}

interface ScreenCoordinate {
  x: number;
  y: number;
}

/**
 * Camera class for managing viewport transformations, pan, and zoom
 */
export class Camera {
  #state: CameraState;

  constructor() {
    this.#state = {
      x: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_X,
      y: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_Y,
      zoom: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_ZOOM,
      minZoom: UI_CONSTANTS.RENDERING.CAMERA.MIN_ZOOM,
      maxZoom: UI_CONSTANTS.RENDERING.CAMERA.MAX_ZOOM,
    };
  }

  /**
   * Get current camera state (read-only)
   * @returns Current camera state
   */
  getState(): Readonly<CameraState> {
    return Object.freeze({ ...this.#state });
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   * @returns World coordinates
   */
  screenToWorld(screenX: number, screenY: number): WorldCoordinate {
    return {
      x: (screenX / this.#state.zoom) + this.#state.x,
      y: (screenY / this.#state.zoom) + this.#state.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @returns Screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): ScreenCoordinate {
    return {
      x: (worldX - this.#state.x) * this.#state.zoom,
      y: (worldY - this.#state.y) * this.#state.zoom,
    };
  }

  /**
   * Pan camera by given offset
   * @param deltaX - X offset in screen pixels
   * @param deltaY - Y offset in screen pixels
   * @returns Whether camera state changed
   */
  pan(deltaX: number, deltaY: number): boolean {
    const newX = this.#state.x + deltaX / this.#state.zoom;
    const newY = this.#state.y + deltaY / this.#state.zoom;

    if (newX !== this.#state.x || newY !== this.#state.y) {
      this.#state.x = newX;
      this.#state.y = newY;
      return true;
    }
    return false;
  }

  /**
   * Zoom camera at given screen point
   * @param screenX - Screen X coordinate to zoom at
   * @param screenY - Screen Y coordinate to zoom at
   * @param zoomFactor - Zoom multiplier (e.g., 1.1 for zoom in, 0.9 for zoom out)
   * @returns Whether camera state changed
   */
  zoomAt(screenX: number, screenY: number, zoomFactor: number): boolean {
    const worldBefore = this.screenToWorld(screenX, screenY);

    const newZoom = Math.max(
      this.#state.minZoom,
      Math.min(this.#state.maxZoom, this.#state.zoom * zoomFactor)
    );

    if (newZoom !== this.#state.zoom) {
      this.#state.zoom = newZoom;

      const worldAfter = this.screenToWorld(screenX, screenY);
      this.#state.x += worldBefore.x - worldAfter.x;
      this.#state.y += worldBefore.y - worldAfter.y;
      return true;
    }
    return false;
  }

  /**
   * Apply camera transformation to a canvas context
   * @param ctx - Canvas rendering context
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this.#state.zoom, 0, 0, this.#state.zoom,
      -this.#state.x * this.#state.zoom,
      -this.#state.y * this.#state.zoom
    );
  }

  /**
   * Reset transformation on a canvas context
   * @param ctx - Canvas rendering context
   */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Set camera position
   * @param x - New X position
   * @param y - New Y position
   * @returns Whether camera state changed
   */
  setPosition(x: number, y: number): boolean {
    if (x !== this.#state.x || y !== this.#state.y) {
      this.#state.x = x;
      this.#state.y = y;
      return true;
    }
    return false;
  }

  /**
   * Set zoom level
   * @param zoom - New zoom level
   * @returns Whether camera state changed
   */
  setZoom(zoom: number): boolean {
    const clampedZoom = Math.max(
      this.#state.minZoom,
      Math.min(this.#state.maxZoom, zoom)
    );

    if (clampedZoom !== this.#state.zoom) {
      this.#state.zoom = clampedZoom;
      return true;
    }
    return false;
  }

  /**
   * Reset camera to initial state
   * @returns Whether camera state changed
   */
  reset(): boolean {
    const initialState = {
      x: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_X,
      y: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_Y,
      zoom: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_ZOOM,
      minZoom: this.#state.minZoom,
      maxZoom: this.#state.maxZoom,
    };

    const changed =
      this.#state.x !== initialState.x ||
      this.#state.y !== initialState.y ||
      this.#state.zoom !== initialState.zoom;

    if (changed) {
      this.#state = initialState;
    }
    return changed;
  }
}
