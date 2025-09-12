// Camera/Viewport management for pan and zoom functionality

import { UI_CONSTANTS } from "../constants.js";

/**
 * @typedef {Object} CameraState
 * @property {number} x - Camera X position in world coordinates
 * @property {number} y - Camera Y position in world coordinates
 * @property {number} zoom - Current zoom level
 * @property {number} minZoom - Minimum allowed zoom
 * @property {number} maxZoom - Maximum allowed zoom
 */

/**
 * @typedef {Object} WorldCoordinate
 * @property {number} x - World X coordinate
 * @property {number} y - World Y coordinate
 */

/**
 * @typedef {Object} ScreenCoordinate
 * @property {number} x - Screen X coordinate
 * @property {number} y - Screen Y coordinate
 */

/**
 * Camera class for managing viewport transformations, pan, and zoom
 */
export class Camera {
  /** @type {CameraState} */
  #state;

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
   * @returns {Readonly<CameraState>} Current camera state
   */
  getState() {
    return Object.freeze({ ...this.#state });
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {WorldCoordinate} World coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX / this.#state.zoom) + this.#state.x,
      y: (screenY / this.#state.zoom) + this.#state.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {ScreenCoordinate} Screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.#state.x) * this.#state.zoom,
      y: (worldY - this.#state.y) * this.#state.zoom,
    };
  }

  /**
   * Pan camera by given offset
   * @param {number} deltaX - X offset in screen pixels
   * @param {number} deltaY - Y offset in screen pixels
   * @returns {boolean} Whether camera state changed
   */
  pan(deltaX, deltaY) {
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
   * @param {number} screenX - Screen X coordinate to zoom at
   * @param {number} screenY - Screen Y coordinate to zoom at
   * @param {number} zoomFactor - Zoom multiplier (e.g., 1.1 for zoom in, 0.9 for zoom out)
   * @returns {boolean} Whether camera state changed
   */
  zoomAt(screenX, screenY, zoomFactor) {
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
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  applyTransform(ctx) {
    ctx.setTransform(
      this.#state.zoom, 0, 0, this.#state.zoom,
      -this.#state.x * this.#state.zoom,
      -this.#state.y * this.#state.zoom
    );
  }

  /**
   * Reset transformation on a canvas context
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Set camera position
   * @param {number} x - New X position
   * @param {number} y - New Y position
   * @returns {boolean} Whether camera state changed
   */
  setPosition(x, y) {
    if (x !== this.#state.x || y !== this.#state.y) {
      this.#state.x = x;
      this.#state.y = y;
      return true;
    }
    return false;
  }

  /**
   * Set zoom level
   * @param {number} zoom - New zoom level
   * @returns {boolean} Whether camera state changed
   */
  setZoom(zoom) {
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
   * @returns {boolean} Whether camera state changed
   */
  reset() {
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
