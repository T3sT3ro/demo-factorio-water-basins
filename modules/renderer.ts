// Rendering and drawing functionality

import { CONFIG } from "./config.ts";
import { BasinLabelManager } from "./labels.ts";
import { CSS_CLASSES, UI_CONSTANTS } from "./constants.ts";
import type { Pump } from "./pumps.ts";
import type { BasinManager } from "./basins.ts";
import { CameraController } from "./CameraController.ts";

interface LayerDirty {
  terrain: boolean;
  infrastructure: boolean;
  water: boolean;
  interactive: boolean;
  highlight: boolean;
}

interface LabelSettings {
  showDepthLabels: boolean;
  showBasinLabels: boolean;
  showPumpLabels: boolean;
}

interface BasinData {
  tiles: Set<string>;
  volume: number;
  level: number;
  height: number;
  outlets: string[];
}

interface GameState {
  getHeights(): number[][];
  getPumpsByReservoir(): Map<number, Array<Pump & { index: number }>>;
  getBasins(): Map<string, BasinData>;
  getBasinManager(): BasinManager;
  getHighlightedBasin(): string | null;
  getPumps(): Pump[];
}

export function getHeightColor(depth: number): string {
  // Only depth 0 = surface (brown), all others = gray
  if (depth === 0) {
    return UI_CONSTANTS.RENDERING.COLORS.TERRAIN.SURFACE;
  } else {
    // Gray gradient for all depths > 0
    const ratio = depth / CONFIG.MAX_DEPTH;
    const lightGray = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_LIGHT_GRAY;
    const range = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_GRAY_RANGE;
    const v = Math.floor(lightGray - ratio * range);
    return `rgb(${v},${v},${v})`;
  }
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  basinLabelManager: BasinLabelManager;
  cameraController: CameraController;
  private terrainCanvas: HTMLCanvasElement;
  private terrainCtx: CanvasRenderingContext2D;
  private infrastructureCanvas: HTMLCanvasElement;
  private infrastructureCtx: CanvasRenderingContext2D;
  private waterCanvas: HTMLCanvasElement;
  private waterCtx: CanvasRenderingContext2D;
  private interactiveCanvas: HTMLCanvasElement;
  private interactiveCtx: CanvasRenderingContext2D;
  private highlightCanvas: HTMLCanvasElement;
  private highlightCtx: CanvasRenderingContext2D;
  private layerDirty: LayerDirty;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.basinLabelManager = new BasinLabelManager();

    // Camera controller for pan and zoom
    this.cameraController = new CameraController(() => this.markLayerDirty("all"));

    // Initialize off-screen canvases for layered rendering
    const layers = this.initializeOffScreenCanvases();
    this.terrainCanvas = layers[0]!.canvas;
    this.terrainCtx = layers[0]!.ctx;
    this.infrastructureCanvas = layers[1]!.canvas;
    this.infrastructureCtx = layers[1]!.ctx;
    this.waterCanvas = layers[2]!.canvas;
    this.waterCtx = layers[2]!.ctx;
    this.interactiveCanvas = layers[3]!.canvas;
    this.interactiveCtx = layers[3]!.ctx;
    this.highlightCanvas = layers[4]!.canvas;
    this.highlightCtx = layers[4]!.ctx;

    // Track which layers need updates
    this.layerDirty = {
      terrain: true,
      infrastructure: true,
      water: true,
      interactive: true,
      highlight: true,
    };
  }

  private initializeOffScreenCanvases(): Array<
    { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
  > {
    const width = this.canvas.width;
    const height = this.canvas.height;

    const createLayer = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2D context for off-screen canvas");
      return { canvas, ctx };
    };

    return [
      createLayer(), // terrain
      createLayer(), // infrastructure
      createLayer(), // water
      createLayer(), // interactive
      createLayer(), // highlight
    ];
  }

  // Mark specific layers as needing updates
  markLayerDirty(layer: keyof LayerDirty | "all"): void {
    if (layer === "all") {
      Object.keys(this.layerDirty).forEach((key) => {
        this.layerDirty[key as keyof LayerDirty] = true;
      });
    } else if (layer in this.layerDirty) {
      this.layerDirty[layer] = true;
    }
  }

  // Apply camera transformation to any context
  private applyCameraTransformToContext(ctx: CanvasRenderingContext2D): void {
    this.cameraController.applyTransform(ctx);
  }

  // Apply camera transformation to main context
  applyCameraTransform(): void {
    this.cameraController.applyTransform(this.ctx);
  }

  // Reset camera transformation for any context
  private resetTransformForContext(ctx: CanvasRenderingContext2D): void {
    this.cameraController.resetTransform(ctx);
  }

  // Reset camera transformation
  resetTransform(): void {
    this.cameraController.resetTransform(this.ctx);
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return this.cameraController.screenToWorld(screenX, screenY);
  }

  // Pan camera by given offset
  pan(deltaX: number, deltaY: number): void {
    this.cameraController.pan(deltaX, deltaY);
  }

  // Zoom camera at given point
  zoomAt(screenX: number, screenY: number, zoomFactor: number): void {
    this.cameraController.zoomAt(screenX, screenY, zoomFactor);
  }

  // Get current zoom level
  getZoom(): number {
    return this.cameraController.getZoom();
  }

  // Get zoom percentage for UI display
  getZoomPercentage(): number {
    return this.cameraController.getZoomPercentage();
  }

  clear(): void {
    this.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.applyCameraTransform();
  }

  private clearLayer(ctx: CanvasRenderingContext2D): void {
    this.resetTransformForContext(ctx);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.applyCameraTransformToContext(ctx);
  }

  renderTerrainLayer(heights: number[][]): void {
    if (!this.layerDirty.terrain) return;

    this.clearLayer(this.terrainCtx);

    // Draw all terrain tiles
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const depth = heights[y]![x]!;
        this.terrainCtx.fillStyle = getHeightColor(depth);
        this.terrainCtx.fillRect(
          x * CONFIG.TILE_SIZE,
          y * CONFIG.TILE_SIZE,
          CONFIG.TILE_SIZE,
          CONFIG.TILE_SIZE,
        );
      }
    }

    this.layerDirty.terrain = false;
  }

  renderInfrastructureLayer(
    pumpsByReservoir: Map<number, Array<Pump & { index: number }>>,
    showChunkBoundaries: boolean = true,
  ): void {
    if (!this.layerDirty.infrastructure) return;

    this.clearLayer(this.infrastructureCtx);

    // Draw chunk boundaries
    if (showChunkBoundaries) {
      this.infrastructureCtx.strokeStyle =
        UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.CHUNK_BOUNDARIES;
      this.infrastructureCtx.lineWidth = this.getScaledLineWidth(
        UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.BASE_WIDTH,
      );

      // Vertical lines
      for (let cx = 0; cx <= CONFIG.WORLD_W; cx += CONFIG.CHUNK_SIZE) {
        this.infrastructureCtx.beginPath();
        this.infrastructureCtx.moveTo(cx * CONFIG.TILE_SIZE, 0);
        this.infrastructureCtx.lineTo(cx * CONFIG.TILE_SIZE, CONFIG.WORLD_H * CONFIG.TILE_SIZE);
        this.infrastructureCtx.stroke();
      }

      // Horizontal lines
      for (let cy = 0; cy <= CONFIG.WORLD_H; cy += CONFIG.CHUNK_SIZE) {
        this.infrastructureCtx.beginPath();
        this.infrastructureCtx.moveTo(0, cy * CONFIG.TILE_SIZE);
        this.infrastructureCtx.lineTo(CONFIG.WORLD_W * CONFIG.TILE_SIZE, cy * CONFIG.TILE_SIZE);
        this.infrastructureCtx.stroke();
      }
    }

    // Draw pump connections
    const scaledLineWidth = this.getScaledLineWidth(
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.PUMP_BASE_WIDTH,
    );
    const zoom = this.cameraController.getZoom();
    const dashPattern = zoom < UI_CONSTANTS.RENDERING.PATTERNS.PUMP_CONNECTIONS.DASH_THRESHOLD
      ? UI_CONSTANTS.RENDERING.PATTERNS.PUMP_CONNECTIONS.DASH_ZOOMED_OUT
      : UI_CONSTANTS.RENDERING.PATTERNS.PUMP_CONNECTIONS.DASH_NORMAL;

    pumpsByReservoir.forEach((pumpsInReservoir) => {
      if (pumpsInReservoir.length > 1) {
        this.infrastructureCtx.strokeStyle =
          UI_CONSTANTS.RENDERING.COLORS.INFRASTRUCTURE.PUMP_CONNECTIONS;
        this.infrastructureCtx.lineWidth = scaledLineWidth;
        this.infrastructureCtx.setLineDash(dashPattern);

        for (let i = 0; i < pumpsInReservoir.length - 1; i++) {
          const pump1 = pumpsInReservoir[i]!;
          const pump2 = pumpsInReservoir[i + 1]!;

          const x1 = pump1.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const y1 = pump1.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const x2 = pump2.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const y2 = pump2.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

          this.infrastructureCtx.beginPath();
          this.infrastructureCtx.moveTo(x1, y1);
          this.infrastructureCtx.lineTo(x2, y2);
          this.infrastructureCtx.stroke();
        }

        this.infrastructureCtx.setLineDash([]); // Reset to solid lines
      }
    });

    this.layerDirty.infrastructure = false;
  }

  // Get appropriate font size based on zoom level to keep text readable
  private getScaledFontSize(
    baseFontSize: number = UI_CONSTANTS.RENDERING.SCALING.FONT.BASE_SIZE,
  ): number {
    const { MIN_SIZE, MAX_SIZE, SCALE_THRESHOLD_MIN, SCALE_THRESHOLD_MAX } =
      UI_CONSTANTS.RENDERING.SCALING.FONT;
    const zoom = this.cameraController.getZoom();

    // Simplified scaling - only scale at extreme zoom levels
    if (zoom < SCALE_THRESHOLD_MIN) {
      return Math.max(MIN_SIZE, baseFontSize / zoom);
    } else if (zoom > SCALE_THRESHOLD_MAX) {
      return Math.min(MAX_SIZE, baseFontSize);
    }
    return baseFontSize;
  }

  // Get scaled line width for better visibility at different zoom levels
  private getScaledLineWidth(
    baseWidth: number = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.BASE_WIDTH,
  ): number {
    const { MIN_WIDTH, SCALE_THRESHOLD } = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH;
    const zoom = this.cameraController.getZoom();

    // Only scale line width at very low zoom levels
    return zoom < SCALE_THRESHOLD ? Math.max(MIN_WIDTH, baseWidth / zoom) : baseWidth;
  }

  renderWaterLayer(basins: Map<string, BasinData>): void {
    if (!this.layerDirty.water) return;

    this.clearLayer(this.waterCtx);

    for (const [, basin] of basins) {
      if (basin.level <= 0) continue;

      const { BASE_COLOR, MIN_ALPHA, ALPHA_PER_LEVEL, MAX_ALPHA } =
        UI_CONSTANTS.RENDERING.COLORS.WATER;
      const alpha = Math.min(MAX_ALPHA, MIN_ALPHA + basin.level * ALPHA_PER_LEVEL);
      this.waterCtx.fillStyle = `rgba(${BASE_COLOR},${alpha})`;

      basin.tiles.forEach((tileKey) => {
        const parts = tileKey.split(",");
        const tx = parseInt(parts[0]!);
        const ty = parseInt(parts[1]!);
        // Only draw water if it's above the terrain height
        if (basin.level > basin.height) {
          this.waterCtx.fillRect(
            tx * CONFIG.TILE_SIZE,
            ty * CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
          );
        }
      });
    }

    this.layerDirty.water = false;
  }

  renderInteractiveLayer(
    pumps: Pump[],
    selectedReservoirId: number | null,
    heights: number[][],
    basins: Map<string, BasinData>,
    labelSettings: LabelSettings,
  ): void {
    if (!this.layerDirty.interactive) return;

    this.clearLayer(this.interactiveCtx);

    // Draw pumps
    const scaledLineWidth = this.getScaledLineWidth(
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.PUMP_BASE_WIDTH,
    );
    const pumpRadius = CONFIG.TILE_SIZE * UI_CONSTANTS.RENDERING.SCALING.PUMP.RADIUS_MULTIPLIER;
    const highlightRadius = CONFIG.TILE_SIZE *
      UI_CONSTANTS.RENDERING.SCALING.PUMP.HIGHLIGHT_RADIUS_MULTIPLIER;

    for (const pump of pumps) {
      const cx = pump.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const cy = pump.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

      // Highlight pumps in selected reservoir with a thicker circle
      if (selectedReservoirId && pump.reservoirId === selectedReservoirId) {
        this.interactiveCtx.beginPath();
        this.interactiveCtx.arc(cx, cy, highlightRadius, 0, Math.PI * 2);
        this.interactiveCtx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.PUMPS.SELECTED_HIGHLIGHT;
        this.interactiveCtx.lineWidth = scaledLineWidth + 1;
        this.interactiveCtx.stroke();
      }

      this.interactiveCtx.beginPath();
      this.interactiveCtx.arc(cx, cy, pumpRadius, 0, Math.PI * 2);
      this.interactiveCtx.strokeStyle = pump.mode === "inlet"
        ? UI_CONSTANTS.RENDERING.COLORS.PUMPS.INLET
        : UI_CONSTANTS.RENDERING.COLORS.PUMPS.OUTLET;
      this.interactiveCtx.lineWidth = scaledLineWidth;
      this.interactiveCtx.stroke();
    }

    // Draw labels
    const fontSize = this.getScaledFontSize();
    this.interactiveCtx.font = `${fontSize}px Arial`;
    this.interactiveCtx.textAlign = "center";
    this.interactiveCtx.textBaseline = "middle";

    // Draw depth labels
    if (labelSettings.showDepthLabels) {
      this.drawDepthLabelsToContext(this.interactiveCtx, heights);
    }

    // Draw basin labels with smart positioning
    if (labelSettings.showBasinLabels) {
      this.basinLabelManager.draw(
        this.interactiveCtx,
        basins,
        heights,
        pumps,
        this.cameraController.getZoom(),
      );
    }

    // Draw pump labels
    if (labelSettings.showPumpLabels) {
      this.drawPumpLabelsToContext(this.interactiveCtx, pumps);
    }

    this.layerDirty.interactive = false;
  }

  renderHighlightLayer(basinManager: BasinManager | null, highlightedBasin: string | null): void {
    if (!this.layerDirty.highlight) return;

    this.clearLayer(this.highlightCtx);

    // Only render if there's a basin to highlight
    if (basinManager && highlightedBasin) {
      // Use optimized tile lookup from basin data instead of scanning all world tiles
      const basin = basinManager.basins.get(highlightedBasin);
      if (basin) {
        this.highlightCtx.fillStyle = UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.FILL;
        this.highlightCtx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.BASIN_HIGHLIGHT.STROKE;
        this.highlightCtx.lineWidth = this.getScaledLineWidth(
          UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.HIGHLIGHT_BASE_WIDTH,
        );

        // Draw highlight for each tile in the basin
        basin.tiles.forEach((tileKey) => {
          const parts = tileKey.split(",");
          const x = parseInt(parts[0]!);
          const y = parseInt(parts[1]!);
          const params: [number, number, number, number] = [
            x * CONFIG.TILE_SIZE,
            y * CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
          ];
          this.highlightCtx.fillRect(...params);
          this.highlightCtx.strokeRect(...params);
        });
      }
    }

    this.layerDirty.highlight = false;
  }

  private drawDepthLabelsToContext(ctx: CanvasRenderingContext2D, heights: number[][]): void {
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const depth = heights[y]![x]!;
        if (depth > 0) { // Only show depth for non-land tiles
          const labelX = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
          const labelY = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

          // Choose text color based on background
          const lightGray = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_LIGHT_GRAY;
          const range = UI_CONSTANTS.RENDERING.COLORS.TERRAIN.DEPTH_GRAY_RANGE;
          const grayValue = Math.floor(lightGray - (depth / CONFIG.MAX_DEPTH) * range);
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

  private drawPumpLabelsToContext(ctx: CanvasRenderingContext2D, pumps: Pump[]): void {
    const fontSize = this.getScaledFontSize();
    ctx.font = `${fontSize}px Arial`;
    const scaledLineWidth = this.getScaledLineWidth(
      UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.BASE_WIDTH,
    );
    const strokeMultiplier = UI_CONSTANTS.RENDERING.SCALING.LINE_WIDTH.LABEL_STROKE_MULTIPLIER;
    const labelYOffset = CONFIG.TILE_SIZE *
      UI_CONSTANTS.RENDERING.SCALING.PUMP.LABEL_Y_OFFSET_MULTIPLIER;

    // Group pumps by reservoir to get proper pump indices per reservoir
    const pumpsByReservoir = new Map<number, Array<Pump & { globalIndex: number }>>();
    pumps.forEach((pump, globalIndex) => {
      if (!pumpsByReservoir.has(pump.reservoirId)) {
        pumpsByReservoir.set(pump.reservoirId, []);
      }
      pumpsByReservoir.get(pump.reservoirId)!.push({ ...pump, globalIndex });
    });

    // Draw labels for each pump with proper P{reservoirId}.{reservoirPumpIndex} naming
    pumpsByReservoir.forEach((reservoirPumps) => {
      reservoirPumps.forEach((pump, reservoirPumpIndex) => {
        const labelX = pump.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const labelY = pump.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 + labelYOffset;

        const pumpText = `P${pump.reservoirId || "?"}.${reservoirPumpIndex + 1}`;

        ctx.strokeStyle = UI_CONSTANTS.RENDERING.COLORS.LABELS.STROKE_LIGHT_BG;
        ctx.fillStyle = pump.mode === "inlet"
          ? UI_CONSTANTS.RENDERING.COLORS.PUMPS.INLET_LABEL
          : UI_CONSTANTS.RENDERING.COLORS.PUMPS.OUTLET_LABEL;

        ctx.lineWidth = scaledLineWidth * strokeMultiplier;
        ctx.strokeText(pumpText, labelX, labelY);
        ctx.lineWidth = scaledLineWidth;
        ctx.fillText(pumpText, labelX, labelY);
      });
    });
  }

  // New optimized render method that uses layered rendering
  renderOptimized(
    gameState: GameState,
    uiSettings: LabelSettings,
    selectedReservoirId: number | null,
    brushOverlay: Map<string, number>,
    brushCenter: { x: number; y: number } | null,
    brushSize: number,
    selectedDepth: number,
  ): void {
    // Render each layer only if it's dirty
    this.renderTerrainLayer(gameState.getHeights());

    this.renderInfrastructureLayer(
      gameState.getPumpsByReservoir(),
      true, // show chunk boundaries
    );

    this.renderWaterLayer(gameState.getBasins());

    this.renderHighlightLayer(
      gameState.getBasinManager(),
      gameState.getHighlightedBasin(),
    );

    this.renderInteractiveLayer(
      gameState.getPumps(),
      selectedReservoirId,
      gameState.getHeights(),
      gameState.getBasins(),
      uiSettings,
    );

    // Clear main canvas and reset transform for compositing
    this.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Composite all layers to main canvas without any additional transforms
    // (the layers already have the camera transform applied)
    this.ctx.drawImage(this.terrainCanvas, 0, 0);
    this.ctx.drawImage(this.waterCanvas, 0, 0);
    this.ctx.drawImage(this.infrastructureCanvas, 0, 0);
    this.ctx.drawImage(this.highlightCanvas, 0, 0);
    this.ctx.drawImage(this.interactiveCanvas, 0, 0);

    // Apply camera transform for UI overlays (these need to move with the camera)
    this.applyCameraTransform();

    // Draw UI overlays directly to main canvas (these change frequently)
    this.drawBrushOverlay(brushOverlay, selectedDepth);
    if (brushCenter) {
      this.drawBrushPreview(brushCenter.x, brushCenter.y, brushSize);
    }
  }

  // Legacy method for backward compatibility
  drawTerrain(
    heights: number[][],
    basinManager: BasinManager | null = null,
    highlightedBasin: string | null = null,
  ): void {
    this.markLayerDirty("terrain");
    this.renderTerrainLayer(heights);

    // Handle highlighting if provided (legacy support)
    if (basinManager && highlightedBasin) {
      this.markLayerDirty("highlight");
      this.renderHighlightLayer(basinManager, highlightedBasin);
    }
  }

  // Legacy method for backward compatibility
  drawWater(basins: Map<string, BasinData>): void {
    this.markLayerDirty("water");
    this.renderWaterLayer(basins);
  }

  // Legacy method for backward compatibility
  drawPumps(_pumps: Pump[], _selectedReservoirId: number | null): void {
    this.markLayerDirty("interactive");
    // Will be handled in renderInteractiveLayer
  }

  // Legacy method for backward compatibility
  drawPumpConnections(_pumpsByReservoir: Map<number, Array<Pump & { index: number }>>): void {
    this.markLayerDirty("infrastructure");
    // Will be handled in renderInfrastructureLayer
  }

  // Legacy method for backward compatibility
  drawChunkBoundaries(): void {
    this.markLayerDirty("infrastructure");
    // Will be handled in renderInfrastructureLayer
  }

  // Legacy method for backward compatibility
  drawLabels(
    _heights: number[][],
    _basins: Map<string, BasinData>,
    _pumps: Pump[],
    _labelSettings: LabelSettings,
  ): void {
    this.markLayerDirty("interactive");
    // Will be handled in renderInteractiveLayer
  }

  // Public methods to mark layers dirty for specific changes
  onTerrainChanged(): void {
    this.markLayerDirty("terrain");
  }

  onWaterChanged(): void {
    this.markLayerDirty("water");
  }

  onPumpsChanged(): void {
    this.markLayerDirty("infrastructure");
    this.markLayerDirty("interactive");
  }

  onLabelsToggled(): void {
    this.markLayerDirty("interactive");
  }

  onBasinHighlightChanged(): void {
    this.markLayerDirty("highlight");
  }

  drawBrushOverlay(overlayMap: Map<string, number>, selectedDepth: number): void {
    if (overlayMap.size === 0) return;

    // Set overlay style using constants
    this.ctx.fillStyle = UI_CONSTANTS.BRUSH.OVERLAY_FILL;
    this.ctx.strokeStyle = getHeightColor(selectedDepth);
    this.ctx.lineWidth = this.getScaledLineWidth(UI_CONSTANTS.BRUSH.OVERLAY_LINE_WIDTH);

    // Draw overlay tiles
    for (const [key] of overlayMap) {
      const parts = key.split(",");
      const x = parseInt(parts[0]!);
      const y = parseInt(parts[1]!);

      const tileX = x * CONFIG.TILE_SIZE;
      const tileY = y * CONFIG.TILE_SIZE;

      // Fill with semi-transparent white
      this.ctx.fillRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

      // Stroke with target depth color
      this.ctx.strokeRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    }
  }

  drawBrushPreview(centerX: number, centerY: number, brushSize: number): void {
    if (centerX < 0 || centerY < 0 || centerX >= CONFIG.WORLD_W || centerY >= CONFIG.WORLD_H) {
      return;
    }

    const radius = Math.floor(brushSize / 2);

    this.ctx.strokeStyle = UI_CONSTANTS.BRUSH.PREVIEW_COLOR;
    this.ctx.lineWidth = this.getScaledLineWidth(1);
    this.ctx.setLineDash(UI_CONSTANTS.BRUSH.PREVIEW_DASH);

    // Draw preview tiles
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;

        // Check if tile is within world bounds
        if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
          // For circular brush, check distance
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const tileX = x * CONFIG.TILE_SIZE;
            const tileY = y * CONFIG.TILE_SIZE;

            this.ctx.strokeRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
          }
        }
      }
    }

    // Reset line dash
    this.ctx.setLineDash([]);
  }
}

export class LegendRenderer {
  static selectedDepth = 0;

  static createLegend(): void {
    const legendItems = document.getElementById("legendItems");
    const template = document.getElementById("template-legend-item") as HTMLTemplateElement | null;
    if (!legendItems || !template) return;

    legendItems.innerHTML = "";

    for (let depth = 0; depth <= CONFIG.MAX_DEPTH; depth++) {
      const clone = template.content.cloneNode(true) as DocumentFragment;
      const item = clone.querySelector(".legend-item") as HTMLElement;
      const label = clone.querySelector(".legend-label") as HTMLElement;
      const colorBox = clone.querySelector(".legend-color-box") as HTMLElement;

      if (item && label && colorBox) {
        item.id = `legend-item-${depth}`;
        item.classList.add(CSS_CLASSES.LEGEND_ITEM);
        label.textContent = `${depth}`;
        colorBox.classList.add(CSS_CLASSES.LEGEND_COLOR);
        colorBox.style.backgroundColor = getHeightColor(depth);

        legendItems.appendChild(clone);
      }
    }
  }

  static updateSelectedDepth(depth: number): void {
    this.selectedDepth = depth;

    // Remove previous selection styling by removing CSS class
    const allItems = document.querySelectorAll(`.${CSS_CLASSES.LEGEND_ITEM}`);
    allItems.forEach((item) => {
      item.classList.remove(CSS_CLASSES.LEGEND_ITEM_SELECTED);
    });

    // Add selection styling to current depth using CSS class
    const selectedItem = document.getElementById(`legend-item-${depth}`);
    if (selectedItem) {
      selectedItem.classList.add(CSS_CLASSES.LEGEND_ITEM_SELECTED);
    }
  }
}
