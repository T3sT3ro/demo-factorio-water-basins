/**
 * RenderingCoordinator - Manages rendering updates and performance monitoring
 *
 * Responsibilities:
 * - Coordinate rendering operations between gameState and renderer
 * - Track performance metrics for rendering operations
 * - Handle UI updates for insights display
 * - Manage legend updates
 */

interface RendererLike {
  renderOptimized(
    gameState: GameStateLike,
    uiSettings: UISettingsLike,
    selectedReservoir: unknown,
    brushOverlay: unknown,
    brushCenter: unknown,
    brushSize: number,
    selectedDepth: number,
    debugState: null
  ): void;
  onTerrainChanged(): void;
  onWaterChanged(): void;
  onPumpsChanged(): void;
  onLabelsToggled(): void;
  onBasinsChanged(): void;
  getCamera(): { getState(): { zoom: number } };
  legend: { setSelectedDepth(depth: number): void };
}

interface GameStateLike {
  regenerateTerrainOnly(): void;
  recomputeBasins(): void;
  getSelectedReservoir(): unknown;
  getBasinManager(): { basins: Map<unknown, BasinInfo> };
  setSelectedReservoir(id: string | null): void;
}

type UISettingsLike = Record<string, unknown>;

interface CanvasControllerLike {
  getBrushOverlay(): unknown;
  getBrushCenter(): unknown;
  getBrushSize(): number;
}

interface BasinInfo {
  tileCount: number;
  volume: number;
}

interface NoiseControlUILike {
  updateUI(): void;
}

interface TileInfo {
  x: number;
  y: number;
  depth: number;
  basinId?: string;
  pumpInfo?: {
    mode: string;
    reservoirId?: string;
  };
}

export class RenderingCoordinator {
  private renderer: RendererLike;
  private gameState: GameStateLike;
  private uiSettings: UISettingsLike;
  private CONFIG: typeof import("../config.ts").CONFIG;
  private canvasController: CanvasControllerLike;
  private selectedDepth: number;
  private basinComputationTimeout: number | null;
  private basinComputationDelay: number;

  constructor(
    renderer: RendererLike,
    gameState: GameStateLike,
    uiSettings: UISettingsLike,
    CONFIG: typeof import("../config.ts").CONFIG,
    canvasController: CanvasControllerLike
  ) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.uiSettings = uiSettings;
    this.CONFIG = CONFIG;
    this.canvasController = canvasController;
    this.selectedDepth = 0;

    // Debouncing for expensive basin computation
    this.basinComputationTimeout = null;
    this.basinComputationDelay = 500; // 500ms delay
  }

  /**
   * Main rendering method using optimized layered rendering
   */
  draw(): void {
    this.renderer.renderOptimized(
      this.gameState,
      this.uiSettings,
      this.gameState.getSelectedReservoir(),
      this.canvasController.getBrushOverlay(),
      this.canvasController.getBrushCenter(),
      this.canvasController.getBrushSize(),
      this.selectedDepth,
      null, // Debug state no longer passed
    );
  }

  /**
   * Handle live noise settings change - only update terrain, no basin computation
   */
  onLiveNoiseUpdate(): void {
    performance.mark("live-noise-update-start");

    // Immediate terrain regeneration for visual feedback
    this.gameState.regenerateTerrainOnly();

    // Mark only terrain layer as dirty for immediate visual update
    this.renderer.onTerrainChanged();

    // Draw immediately for live feedback
    this.draw();

    performance.mark("live-noise-update-end");
    performance.measure(
      "🔥 Live Noise Update (Terrain Only)",
      "live-noise-update-start",
      "live-noise-update-end",
    );
  }

  /**
   * Handle final noise settings change - full recomputation including basins
   */
  onFinalNoiseUpdate(): void {
    performance.mark("final-noise-update-start");

    // Full recomputation including basins
    this.gameState.recomputeBasins();

    // Mark all layers as dirty since basins changed
    this.renderer.onBasinsChanged();

    // Draw with all updates
    this.draw();

    performance.mark("final-noise-update-end");
    performance.measure(
      "🔥 Final Noise Update (Full Recomputation)",
      "final-noise-update-start",
      "final-noise-update-end",
    );
  }

  /**
   * Handle noise settings change with immediate terrain update and debounced basin computation
   * @deprecated Use onLiveNoiseUpdate and onFinalNoiseUpdate instead
   */
  onNoiseSettingsChanged(_noiseControlUI: NoiseControlUILike): void {
    // Legacy method - delegate to final update for backward compatibility
    this.onFinalNoiseUpdate();
  }

  /**
   * Handle game state changes (load/import)
   */
  onGameStateChanged(noiseControlUI: NoiseControlUILike): void {
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged();
    this.renderer.onPumpsChanged();
    this.renderer.onLabelsToggled();

    // Update noise control UI to reflect loaded settings
    if (noiseControlUI) {
      noiseControlUI.updateUI();
    }
  }

  /**
   * Set selected depth and update legend
   */
  setSelectedDepth(depth: number): number {
    this.selectedDepth = Math.max(0, Math.min(9, depth));
    this.updateLegendSelection();
    console.log(`Selected depth: ${this.selectedDepth}`);
    return this.selectedDepth;
  }

  /**
   * Get current selected depth
   */
  getSelectedDepth(): number {
    return this.selectedDepth;
  }

  /**
   * Update legend selection highlight
   */
  updateLegendSelection(): void {
    this.renderer.legend.setSelectedDepth(this.selectedDepth);
  }

  /**
   * Update insights display (zoom, brush, tile, basin info)
   */
  updateInsightsDisplay(tileInfo: TileInfo | null = null): void {
    // Update zoom value
    const zoomValue = document.getElementById("zoomValue");
    if (zoomValue) {
      const zoomPercentage = Math.round(this.renderer.getCamera().getState().zoom * 100);
      zoomValue.textContent = `${zoomPercentage}%`;
    }

    // Update brush size
    const brushValue = document.getElementById("brushValue");
    if (brushValue) {
      brushValue.textContent = this.canvasController.getBrushSize().toString();
    }

    // Update tile info
    const tileInfoEl = document.getElementById("tileInfo");
    if (tileInfoEl) {
      if (tileInfo) {
        const { x, y, depth } = tileInfo;
        if (depth === 0) {
          tileInfoEl.textContent = `(${x},${y}) Land`;
        } else {
          tileInfoEl.textContent = `(${x},${y}) D${depth}`;
        }
      } else {
        tileInfoEl.textContent = "--";
      }
    }

    // Update basin info
    const basinInfoEl = document.getElementById("basinInfo");
    if (basinInfoEl) {
      if (tileInfo && tileInfo.basinId) {
        const basinManager = this.gameState.getBasinManager();
        const basin = basinManager.basins.get(tileInfo.basinId);
        if (basin) {
          const maxCapacity = basin.tileCount * this.CONFIG.VOLUME_UNIT * this.CONFIG.MAX_DEPTH;
          const currentVolume = Math.floor(basin.volume);
          basinInfoEl.textContent = `${tileInfo.basinId} ${currentVolume}/${maxCapacity}`;
        } else {
          basinInfoEl.textContent = tileInfo.basinId;
        }
      } else if (tileInfo && tileInfo.pumpInfo) {
        const { mode, reservoirId } = tileInfo.pumpInfo;
        basinInfoEl.textContent = `${mode} PS${reservoirId || "?"}`;
      } else {
        basinInfoEl.textContent = "--";
      }
    }
  }
}
