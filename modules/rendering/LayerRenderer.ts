/**
 * Base class for rendering different layers
 * Provides common functionality for layer-based rendering
 */
import type { Camera } from "../core/Camera.ts";

export class LayerRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDirty = true;

  /**
   * @param width - Canvas width
   * @param height - Canvas height
   */
  constructor(width: number, height: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D rendering context");
    }
    this.ctx = ctx;
  }

  /** Mark this layer as needing a redraw */
  markDirty(): void {
    this.isDirty = true;
  }

  /** Clear the layer */
  clear(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Apply camera transform to the context */
  applyCameraTransform(camera: Camera): void {
    if (!this.ctx) return;
    this.ctx.save();
    camera.applyTransform(this.ctx);
  }

  /** Reset camera transform */
  resetTransform(): void {
    if (!this.ctx) return;
    this.ctx.restore();
  }

  /** Render this layer - to be implemented by subclasses */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(_renderData: unknown, _camera: Camera): void {
    throw new Error("render() must be implemented by subclasses");
  }

  /** Get the canvas for compositing */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Resize the layer canvas */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.markDirty();
  }
}
