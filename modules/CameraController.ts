// Camera controller for canvas pan and zoom operations

import { UI_CONSTANTS } from "./constants.ts";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export class CameraController {
  private camera: Camera;
  private onCameraChange: () => void;

  constructor(onCameraChange: () => void) {
    this.camera = {
      x: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_X,
      y: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_Y,
      zoom: UI_CONSTANTS.RENDERING.CAMERA.INITIAL_ZOOM,
      minZoom: UI_CONSTANTS.RENDERING.CAMERA.MIN_ZOOM,
      maxZoom: UI_CONSTANTS.RENDERING.CAMERA.MAX_ZOOM,
    };
    this.onCameraChange = onCameraChange;
  }

  getCamera(): Readonly<Camera> {
    return this.camera;
  }

  getZoom(): number {
    return this.camera.zoom;
  }

  getZoomPercentage(): number {
    return Math.round(this.camera.zoom * 100);
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.camera.zoom + this.camera.x,
      y: screenY / this.camera.zoom + this.camera.y,
    };
  }

  // Pan camera by given offset in screen pixels
  pan(deltaX: number, deltaY: number): void {
    this.camera.x += deltaX / this.camera.zoom;
    this.camera.y += deltaY / this.camera.zoom;
    this.onCameraChange();
  }

  // Zoom camera at given screen point
  zoomAt(screenX: number, screenY: number, zoomFactor: number): void {
    const worldBefore = this.screenToWorld(screenX, screenY);

    this.camera.zoom *= zoomFactor;
    this.camera.zoom = Math.max(
      this.camera.minZoom,
      Math.min(this.camera.maxZoom, this.camera.zoom),
    );

    const worldAfter = this.screenToWorld(screenX, screenY);
    this.camera.x += worldBefore.x - worldAfter.x;
    this.camera.y += worldBefore.y - worldAfter.y;

    this.onCameraChange();
  }

  // Apply camera transformation to a canvas context
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this.camera.zoom,
      0,
      0,
      this.camera.zoom,
      -this.camera.x * this.camera.zoom,
      -this.camera.y * this.camera.zoom,
    );
  }

  // Reset transformation on a canvas context
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Reset camera to initial state
  reset(): void {
    this.camera.x = UI_CONSTANTS.RENDERING.CAMERA.INITIAL_X;
    this.camera.y = UI_CONSTANTS.RENDERING.CAMERA.INITIAL_Y;
    this.camera.zoom = UI_CONSTANTS.RENDERING.CAMERA.INITIAL_ZOOM;
    this.onCameraChange();
  }
}
