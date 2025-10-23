// Base interface for layer renderers

import type { CameraController } from "./CameraController.ts";

export interface LayerRenderer {
  render(ctx: CanvasRenderingContext2D, camera: CameraController): void;
  clear(ctx: CanvasRenderingContext2D): void;
}

export abstract class BaseLayerRenderer implements LayerRenderer {
  constructor() {
  }

  abstract render(ctx: CanvasRenderingContext2D, camera: CameraController): void;

  clear(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  protected applyCamera(ctx: CanvasRenderingContext2D, camera: CameraController): void {
    camera.applyTransform(ctx);
  }
}
