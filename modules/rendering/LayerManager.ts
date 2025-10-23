// Manages off-screen canvas layers and compositing

/**
 * Layer names in the order they are composited (bottom to top)
 */
export const LAYER_NAMES = [
  "terrain",
  "water",
  "infrastructure",
  "highlight",
  "interactive",
] as const;

export type LayerName = typeof LAYER_NAMES[number];

export interface CanvasLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export class LayerManager {
  private layers: Record<LayerName, CanvasLayer>;
  private layerDirty: Record<LayerName, boolean>;
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;

  constructor(mainCanvas: HTMLCanvasElement, mainCtx: CanvasRenderingContext2D) {
    this.mainCanvas = mainCanvas;
    this.mainCtx = mainCtx;

    // Initialize layers
    const width = mainCanvas.width;
    const height = mainCanvas.height;

    this.layers = {} as Record<LayerName, CanvasLayer>;
    this.layerDirty = {} as Record<LayerName, boolean>;

    for (const name of LAYER_NAMES) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(`Failed to get 2D context for layer: ${name}`);

      this.layers[name] = { canvas, ctx };
      this.layerDirty[name] = true;
    }
  }

  getLayer(name: LayerName): CanvasLayer {
    return this.layers[name];
  }

  markDirty(layer: LayerName | "all"): void {
    if (layer === "all") {
      for (const name of LAYER_NAMES) {
        this.layerDirty[name] = true;
      }
    } else {
      this.layerDirty[layer] = true;
    }
  }

  isDirty(layer: LayerName): boolean {
    return this.layerDirty[layer];
  }

  markClean(layer: LayerName): void {
    this.layerDirty[layer] = false;
  }

  compositeToMain(): void {
    // Clear main canvas
    this.mainCtx.save();
    this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.mainCtx.restore();

    // Composite layers in hardcoded order
    for (const layerName of LAYER_NAMES) {
      this.mainCtx.drawImage(this.layers[layerName].canvas, 0, 0);
    }
  }
}
