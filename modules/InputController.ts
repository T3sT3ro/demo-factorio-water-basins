import { CONFIG } from "./config.ts";
import type { Renderer } from "./rendering/renderer.ts";

export interface InputCallbacks {
  onPaint: (x: number, y: number) => void;
  onPaintStart: () => void;
  onPaintEnd: () => void;
  onFloodFill: (x: number, y: number, fill: boolean) => void;
  onAddPump: (x: number, y: number, mode: "inlet" | "outlet") => void;
  onLinkPump: (x: number, y: number) => void;
  onPickDepth: (x: number, y: number) => void;
  onBrushSizeChange: (size: number) => void;
  onDepthChange: (delta: number) => void;
  onZoom: (screenX: number, screenY: number, factor: number) => void;
  onHover: (x: number, y: number) => void;
  onHoverEnd: () => void;
  onClearSelection: () => void;
}

/**
 * Handles all canvas input events and translates them to high-level actions
 */
export class InputController {
  private isPanning = false;
  private isDrawing = false;
  private lastPanX = 0;
  private lastPanY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: Renderer,
    private callbacks: InputCallbacks,
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    this.canvas.addEventListener("mouseleave", () => this.handleMouseLeave());
    this.canvas.addEventListener("wheel", (e) => this.handleWheel(e));
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private getWorldTile(screenX: number, screenY: number): { x: number; y: number } | null {
    const worldPos = this.renderer.screenToWorld(screenX, screenY);
    const x = Math.floor(worldPos.x / CONFIG.TILE_SIZE);
    const y = Math.floor(worldPos.y / CONFIG.TILE_SIZE);

    if (x < 0 || y < 0 || x >= CONFIG.WORLD_W || y >= CONFIG.WORLD_H) {
      return null;
    }

    return { x, y };
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Middle mouse button - pan
    if (e.button === 1) {
      this.isPanning = true;
      this.lastPanX = screenX;
      this.lastPanY = screenY;
      this.canvas.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }

    const tile = this.getWorldTile(screenX, screenY);
    if (!tile) return;

    if (e.button === 2) {
      e.preventDefault();
    }

    // Alt + Right click - pick depth
    if (e.altKey && e.button === 2) {
      this.callbacks.onPickDepth(tile.x, tile.y);
      return;
    } // Ctrl + Shift + Left click - link pump to reservoir
    if (e.ctrlKey && e.shiftKey && e.button === 0) {
      this.callbacks.onLinkPump(tile.x, tile.y);
      return;
    }

    // Ctrl + Left/Right click - flood fill
    if (e.ctrlKey) {
      if (e.button === 0) {
        this.callbacks.onFloodFill(tile.x, tile.y, true);
      } else if (e.button === 2) {
        this.callbacks.onFloodFill(tile.x, tile.y, false);
      }
      return;
    }

    // Shift + Left/Right click - add pump
    if (e.shiftKey) {
      if (e.button === 0) {
        this.callbacks.onAddPump(tile.x, tile.y, "outlet");
      } else if (e.button === 2) {
        this.callbacks.onAddPump(tile.x, tile.y, "inlet");
      }
      return;
    }

    // Left click - paint
    if (e.button === 0) {
      this.isDrawing = true;
      this.callbacks.onPaintStart();
      this.callbacks.onPaint(tile.x, tile.y);
      this.callbacks.onClearSelection();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isPanning) {
      const deltaX = screenX - this.lastPanX;
      const deltaY = screenY - this.lastPanY;

      this.renderer.pan(-deltaX, -deltaY);

      this.lastPanX = screenX;
      this.lastPanY = screenY;

      this.callbacks.onZoom(0, 0, 1); // Just trigger view update
      return;
    }

    const tile = this.getWorldTile(screenX, screenY);
    if (!tile) return;

    if (this.isDrawing) {
      this.callbacks.onPaint(tile.x, tile.y);
    }

    this.callbacks.onHover(tile.x, tile.y);
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 1 && this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = "default";
    } else if (e.button === 0 && this.isDrawing) {
      this.isDrawing = false;
      this.callbacks.onPaintEnd();
    }
  }

  private handleMouseLeave(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = "default";
    }
    if (this.isDrawing) {
      this.isDrawing = false;
      this.callbacks.onPaintEnd();
    }
    this.callbacks.onHoverEnd();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (e.shiftKey) {
      const delta = e.deltaY > 0 ? -1 : 1;
      this.callbacks.onBrushSizeChange(delta);
    } else if (e.altKey) {
      const delta = e.deltaY > 0 ? -1 : 1;
      this.callbacks.onDepthChange(delta);
    } else {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.callbacks.onZoom(screenX, screenY, zoomFactor);
    }
  }

  getDrawingState(): boolean {
    return this.isDrawing;
  }
}
