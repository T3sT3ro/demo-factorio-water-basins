import { LayerRenderer } from "./LayerRenderer.ts";
import { ColorManager } from "./ColorManager.ts";
import { CONFIG } from "../config.ts";
import { UI_CONSTANTS, UIConstants } from "../constants.ts";

interface Pump {
  x: number;
  y: number;
  mode: string;
  reservoirId: string;
}

interface PumpRenderData {
  pumps: Pump[];
  selectedReservoirId: string | null;
}

/** Renderer for the pump/interactive layer */
export class PumpLayerRenderer extends LayerRenderer {
  /**
   * Get scaled line width based on zoom level
   * @param {number} baseWidth - Base line width
   * @param {number} zoom - Current zoom level
   * @returns {number} Scaled line width
   */
  getScaledLineWidth(baseWidth: number, zoom: number): number {
    return Math.max(baseWidth / zoom, 1);
  }

  /**
   * Get scaled radius based on zoom level
   * @param {number} baseRadius - Base radius
   * @param {number} zoom - Current zoom level
   * @returns {number} Scaled radius
   */
  getScaledRadius(baseRadius: number, zoom: number): number {
    return Math.max(baseRadius / zoom, 2);
  }

  /**
   * Render the pump layer
   * @override
   * @param {PumpRenderData} renderData - Pump data to render
   * @param {import('../core/Camera.js').Camera} camera - Camera instance
   */
  override render(renderData: PumpRenderData, camera: import('../core/Camera.ts').Camera): void {
    const { pumps, selectedReservoirId } = renderData;
    if (!pumps || pumps.length === 0 || !this.ctx) return;

    this.clear();
    this.applyCameraTransform(camera);

    const cameraState = camera.getState();
    const ui = UI_CONSTANTS as UIConstants;
    const scaledLineWidth = this.getScaledLineWidth(
      ui.RENDERING.SCALING.LINE_WIDTH.PUMP_BASE_WIDTH,
      cameraState.zoom
    );
    const pumpRadius = this.getScaledRadius(
      ui.RENDERING.SCALING.PUMP.RADIUS_MULTIPLIER * CONFIG.TILE_SIZE,
      cameraState.zoom
    );
    const highlightRadius = this.getScaledRadius(
      ui.RENDERING.SCALING.PUMP.HIGHLIGHT_RADIUS_MULTIPLIER * CONFIG.TILE_SIZE,
      cameraState.zoom
    );

    // Draw pumps
    pumps.forEach((pump) => {
      const cx = pump.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const cy = pump.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

      // Draw highlight for selected reservoir
      if (selectedReservoirId && pump.reservoirId === selectedReservoirId) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, highlightRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.PUMPS.SELECTED_HIGHLIGHT;
        this.ctx.lineWidth = scaledLineWidth + 1;
        this.ctx.stroke();
      }

      // Draw pump
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, pumpRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = ColorManager.getPumpColor(pump.mode);
      this.ctx.lineWidth = scaledLineWidth;
      this.ctx.stroke();
    });

    this.resetTransform();
    this.isDirty = false;
  }
}
