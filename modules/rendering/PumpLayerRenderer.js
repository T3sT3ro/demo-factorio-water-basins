import { LayerRenderer } from "./LayerRenderer.js";
import { ColorManager } from "./ColorManager.js";
import { CONFIG } from "../config.js";
import { UI_CONSTANTS } from "../constants.js";

/**
 * @typedef {Object} Pump
 * @property {number} x - X position of the pump
 * @property {number} y - Y position of the pump
 * @property {string} mode - Pump mode (e.g., 'inlet', 'outlet')
 * @property {string} reservoirId - ID of the reservoir this pump belongs to
 */

/**
 * @typedef {Object} PumpRenderData
 * @property {Array<Pump>} pumps - Array of pump data
 * @property {string|null} selectedReservoirId - Currently selected reservoir ID
 */

/**
 * Renderer for the pump/interactive layer
 */
export class PumpLayerRenderer extends LayerRenderer {
  /**
   * Get scaled line width based on zoom level
   * @param {number} baseWidth - Base line width
   * @param {number} zoom - Current zoom level
   * @returns {number} Scaled line width
   */
  getScaledLineWidth(baseWidth, zoom) {
    return Math.max(baseWidth / zoom, 1);
  }

  /**
   * Get scaled radius based on zoom level
   * @param {number} baseRadius - Base radius
   * @param {number} zoom - Current zoom level
   * @returns {number} Scaled radius
   */
  getScaledRadius(baseRadius, zoom) {
    return Math.max(baseRadius / zoom, 2);
  }

  /**
   * Render the pump layer
   * @override
   * @param {PumpRenderData} renderData - Pump data to render
   * @param {import('../core/Camera.js').Camera} camera - Camera instance
   */
  render(renderData, camera) {
    const { pumps, selectedReservoirId } = renderData;
    if (!pumps || pumps.length === 0 || !this.ctx) return;

    this.clear();
    this.applyCameraTransform(camera);

    const cameraState = camera.getState();
    const scaledLineWidth = this.getScaledLineWidth(
      (/** @type {any} */ (UI_CONSTANTS)).SCALING.LINE_WIDTH.PUMP_BASE_WIDTH,
      cameraState.zoom
    );
    const pumpRadius = this.getScaledRadius(
      (/** @type {any} */ (UI_CONSTANTS)).SCALING.PUMP.RADIUS_MULTIPLIER * CONFIG.TILE_SIZE,
      cameraState.zoom
    );
    const highlightRadius = this.getScaledRadius(
      (/** @type {any} */ (UI_CONSTANTS)).SCALING.PUMP.HIGHLIGHT_RADIUS_MULTIPLIER * CONFIG.TILE_SIZE,
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
