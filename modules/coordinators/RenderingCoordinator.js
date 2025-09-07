/**
 * RenderingCoordinator - Manages rendering updates and performance monitoring
 * 
 * Responsibilities:
 * - Coordinate rendering operations between gameState and renderer
 * - Track performance metrics for rendering operations
 * - Handle UI updates for insights display
 * - Manage legend updates
 */
export class RenderingCoordinator {
  constructor(renderer, gameState, uiSettings, LegendRenderer, CONFIG, canvasController) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.uiSettings = uiSettings;
    this.LegendRenderer = LegendRenderer;
    this.CONFIG = CONFIG;
    this.canvasController = canvasController;
    this.selectedDepth = 0;
  }

  /**
   * Main rendering method using optimized layered rendering
   */
  draw() {
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
   * Handle noise settings change with performance monitoring
   */
  onNoiseSettingsChanged(noiseControlUI) {
    performance.mark("noise-settings-change-start");

    performance.mark("terrain-regeneration-start");
    this.gameState.regenerateWithCurrentSettings();
    
    // Mark layers as dirty after regeneration
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged(); // Water basins change with terrain
    this.renderer.onLabelsToggled(); // Basin labels also need to be updated
    
    performance.mark("terrain-regeneration-end");
    performance.measure(
      "Terrain Regeneration",
      "terrain-regeneration-start",
      "terrain-regeneration-end",
    );

    performance.mark("rendering-start");
    // Note: Basin analysis update callback will be handled by caller
    performance.mark("rendering-end");
    performance.measure("Rendering", "rendering-start", "rendering-end");

    performance.mark("basin-analysis-update-start");
    // Basin analysis update will be handled by callback
    performance.mark("basin-analysis-update-end");
    performance.measure(
      "Basin Analysis Display Update",
      "basin-analysis-update-start",
      "basin-analysis-update-end",
    );

    performance.mark("noise-settings-change-end");
    performance.measure(
      "🔥 Noise Settings Change - Total Time",
      "noise-settings-change-start",
      "noise-settings-change-end",
    );

    // Log the results
    const measures = performance.getEntriesByType("measure");
    const recentMeasures = measures.slice(-4); // Get the 4 most recent measures
    recentMeasures.forEach((measure) => {
      console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });

    // Update noise control UI to reflect loaded settings
    if (noiseControlUI) {
      noiseControlUI.updateUI();
    }
  }

  /**
   * Handle game state changes (load/import)
   */
  onGameStateChanged(noiseControlUI) {
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
  setSelectedDepth(depth) {
    this.selectedDepth = Math.max(0, Math.min(9, depth));
    this.updateLegendSelection();
    console.log(`Selected depth: ${this.selectedDepth}`);
    return this.selectedDepth;
  }

  /**
   * Get current selected depth
   */
  getSelectedDepth() {
    return this.selectedDepth;
  }

  /**
   * Update legend selection highlight
   */
  updateLegendSelection() {
    this.LegendRenderer.updateSelectedDepth(this.selectedDepth);
  }

  /**
   * Update insights display (zoom, brush, tile, basin info)
   */
  updateInsightsDisplay(tileInfo = null) {
    // Update zoom value
    const zoomValue = document.getElementById("zoomValue");
    if (zoomValue) {
      const zoomPercentage = Math.round(this.renderer.camera.zoom * 100);
      zoomValue.textContent = `${zoomPercentage}%`;
    }

    // Update brush size
    const brushValue = document.getElementById("brushValue");
    if (brushValue) {
      brushValue.textContent = this.canvasController.getBrushSize();
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
