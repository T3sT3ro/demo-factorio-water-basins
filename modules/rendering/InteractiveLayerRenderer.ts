import { BaseLayerRenderer } from "./LayerRenderer.ts";
import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";
import type { Pump } from "../pumps.ts";
import type { BasinData } from "../basins/index.ts";
import type { CameraController } from "./CameraController.ts";
import { BasinLabelManager } from "../labels.ts";
import { UISettings } from "../ui/UISettings.ts";

/**
 * Renders interactive elements: pumps, labels, and basin highlights
 */
export class InteractiveLayerRenderer extends BaseLayerRenderer {
  private pumps: Pump[] = [];
  private selectedReservoirId: number | null = null;
  private heights: number[][] = [];
  private basins = new Map<string, BasinData>();
  private uiSettings: UISettings | null = null;
  private basinLabelManager: BasinLabelManager;

  constructor() {
    super();
    this.basinLabelManager = new BasinLabelManager();
  }

  updateData(
    pumps: Pump[],
    selectedReservoirId: number | null,
    heights: number[][],
    basins: Map<string, BasinData>,
    uiSettings: UISettings,
  ): void {
    this.pumps = pumps;
    this.selectedReservoirId = selectedReservoirId;
    this.heights = heights;
    this.basins = basins;
    this.uiSettings = uiSettings;
  }

  render(ctx: CanvasRenderingContext2D, camera: CameraController): void {
    this.clear(ctx);
    this.applyCamera(ctx, camera);

    this.renderPumps(ctx, camera);
    this.renderLabels(ctx, camera);
  }

  private renderPumps(
    ctx: CanvasRenderingContext2D,
    camera: CameraController,
  ): void {
    const scaledLineWidth = this.getScaledLineWidth(
      camera,
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.PUMP_BASE_WIDTH,
    );
    const pumpRadius = CONFIG.TILE_SIZE *
      UI_CONSTANTS.RENDERING.SCALING.PUMP.RADIUS_MULTIPLIER;
    const highlightRadius = CONFIG.TILE_SIZE *
      UI_CONSTANTS.RENDERING.SCALING.PUMP.HIGHLIGHT_RADIUS_MULTIPLIER;

    for (const pump of this.pumps) {
      const cx = pump.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const cy = pump.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

      // Highlight pumps in selected reservoir
      if (
        this.selectedReservoirId && pump.reservoirId === this.selectedReservoirId
      ) {
        ctx.beginPath();
        ctx.arc(cx, cy, highlightRadius, 0, Math.PI * 2);
        ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.PUMP.SELECTED_HIGHLIGHT;
        ctx.lineWidth = scaledLineWidth + 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, pumpRadius, 0, Math.PI * 2);
      ctx.strokeStyle = pump.mode === "inlet"
        ? UI_CONSTANTS.RENDERING.COLORS.PUMP.INLET
        : UI_CONSTANTS.RENDERING.COLORS.PUMP.OUTLET;
      ctx.lineWidth = scaledLineWidth;
      ctx.stroke();
    }
  }

  private renderLabels(
    ctx: CanvasRenderingContext2D,
    camera: CameraController,
  ): void {
    const fontSize = this.getScaledFontSize(camera);
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.uiSettings?.showDepthLabels) {
      this.renderDepthLabels(ctx);
    }

    if (this.uiSettings?.showBasinLabels) {
      this.basinLabelManager.draw(
        ctx,
        this.basins,
        this.heights,
        this.pumps,
        camera.getZoom(),
      );
    }

    if (this.uiSettings?.showPumpLabels) {
      this.renderPumpLabels(ctx, camera);
    }
  }

  private renderDepthLabels(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const depth = this.heights[y]![x]!;
        if (depth > 0) {
          const labelX = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const labelY = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

          const lightGray = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_LIGHT_GRAY;
          const range = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_GRAY_RANGE;
          const grayValue = Math.floor(
            lightGray - (depth / CONFIG.MAX_DEPTH) * range,
          );
          const threshold = UI_CONSTANTS.RENDERING.COLORS.LABELS.GRAY_THRESHOLD;

          if (grayValue > threshold) {
            ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.LABELS.STROKE_LIGHT_BG;
            ctx.fillStyle = UI_CONSTANTS.RENDERING.COLORS.LABELS.TEXT_LIGHT_BG;
          } else {
            ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.LABELS.STROKE_DARK_BG;
            ctx.fillStyle = UI_CONSTANTS.RENDERING.COLORS.LABELS.TEXT_DARK_BG;
          }

          ctx.lineWidth = 1;
          ctx.strokeText(depth.toString(), labelX, labelY);
          ctx.fillText(depth.toString(), labelX, labelY);
        }
      }
    }
  }

  private renderPumpLabels(
    ctx: CanvasRenderingContext2D,
    camera: CameraController,
  ): void {
    const fontSize = this.getScaledFontSize(camera);
    ctx.font = `${fontSize}px Arial`;
    const scaledLineWidth = this.getScaledLineWidth(
      camera,
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.BASE_WIDTH,
    );
    const strokeMultiplier = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.LABEL_STROKE_MULTIPLIER;
    const labelYOffset = CONFIG.TILE_SIZE *
      UI_CONSTANTS.RENDERING.SCALING.PUMP.LABEL_Y_OFFSET_MULTIPLIER;

    // Group pumps by reservoir
    const pumpsByReservoir = new Map<
      number,
      Array<Pump & { globalIndex: number }>
    >();
    this.pumps.forEach((pump, globalIndex) => {
      if (!pumpsByReservoir.has(pump.reservoirId)) {
        pumpsByReservoir.set(pump.reservoirId, []);
      }
      pumpsByReservoir.get(pump.reservoirId)!.push({ ...pump, globalIndex });
    });

    pumpsByReservoir.forEach((reservoirPumps) => {
      reservoirPumps.forEach((pump, reservoirPumpIndex) => {
        const labelX = pump.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const labelY = pump.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 +
          labelYOffset;

        const pumpText = `P${pump.reservoirId || "?"}.${reservoirPumpIndex + 1}`;

        ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.LABELS.STROKE_LIGHT_BG;
        ctx.fillStyle = pump.mode === "inlet"
          ? UI_CONSTANTS.RENDERING.COLORS.PUMP.INLET_LABEL
          : UI_CONSTANTS.RENDERING.COLORS.PUMP.OUTLET_LABEL;

        ctx.lineWidth = scaledLineWidth * strokeMultiplier;
        ctx.strokeText(pumpText, labelX, labelY);
        ctx.lineWidth = scaledLineWidth;
        ctx.fillText(pumpText, labelX, labelY);
      });
    });
  }

  private getScaledLineWidth(
    camera: CameraController,
    baseWidth: number,
  ): number {
    const { MIN_WIDTH, SCALE_THRESHOLD } = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH;
    const zoom = camera.getZoom();
    return zoom < SCALE_THRESHOLD ? Math.max(MIN_WIDTH, baseWidth / zoom) : baseWidth;
  }

  private getScaledFontSize(
    camera: CameraController,
    baseFontSize: number = UI_CONSTANTS.RENDERING.SCALING.FONT.BASE_SIZE,
  ): number {
    const { MIN_SIZE, MAX_SIZE, SCALE_THRESHOLD_MIN, SCALE_THRESHOLD_MAX } =
      UI_CONSTANTS.RENDERING.SCALING.FONT;
    const zoom = camera.getZoom();

    if (zoom < SCALE_THRESHOLD_MIN) {
      return Math.max(MIN_SIZE, baseFontSize / zoom);
    } else if (zoom > SCALE_THRESHOLD_MAX) {
      return Math.min(MAX_SIZE, baseFontSize);
    }
    return baseFontSize;
  }
}
