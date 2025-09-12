/**
 * Base class for rendering different layers
 * Provides common functionality for layer-based rendering
 */
export class LayerRenderer {
  /** @type {HTMLCanvasElement} */
  canvas;
  
  /** @type {CanvasRenderingContext2D} */
  ctx;
  
  /** @type {boolean} */
  isDirty = true;

  /**
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  constructor(width, height) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("Failed to get 2D rendering context");
    }
  }

  /**
   * Mark this layer as needing a redraw
   */
  markDirty() {
    this.isDirty = true;
  }

  /**
   * Clear the layer
   */
  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Apply camera transform to the context
   * @param {import('../core/Camera.js').Camera} camera - Camera instance
   */
  applyCameraTransform(camera) {
    if (!this.ctx) return;
    this.ctx.save();
    camera.applyTransform(this.ctx);
  }

  /**
   * Reset camera transform
   */
  resetTransform() {
    if (!this.ctx) return;
    this.ctx.restore();
  }

  /**
   * Render this layer - to be implemented by subclasses
   * @param {Object} _renderData - Data needed for rendering
   * @param {import('../core/Camera.js').Camera} _camera - Camera instance
   */
  render(_renderData, _camera) {
    throw new Error("render() must be implemented by subclasses");
  }

  /**
   * Get the canvas for compositing
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Resize the layer canvas
   * @param {number} width - New canvas width
   * @param {number} height - New canvas height
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.markDirty();
  }
}
