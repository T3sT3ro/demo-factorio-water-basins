// Main application controller - orchestrates all modules

// Cache busting for module imports
const moduleVersion = globalThis.moduleVersion || Date.now();

// Dynamic imports with cache busting
const configModule = import(`./modules/config.js?v=${moduleVersion}`);
const gameModule = import(`./modules/game.js?v=${moduleVersion}`);
const rendererModule = import(`./modules/renderer.js?v=${moduleVersion}`);
const uiModule = import(`./modules/ui.js?v=${moduleVersion}`);
const constantsModule = import(`./modules/constants.js?v=${moduleVersion}`);
const saveloadModule = import(`./modules/saveload.js?v=${moduleVersion}`);
const canvasControllerModule = import(`./modules/controllers/CanvasController.js?v=${moduleVersion}`);
const uiControllerModule = import(`./modules/controllers/UIController.js?v=${moduleVersion}`);
const keyboardControllerModule = import(`./modules/controllers/KeyboardController.js?v=${moduleVersion}`);

// Wait for all modules to load, then initialize the app
Promise.all([
  configModule, gameModule, rendererModule, uiModule, constantsModule, saveloadModule,
  canvasControllerModule, uiControllerModule, keyboardControllerModule
])
  .then(([config, game, renderer, ui, constants, saveload, canvasController, uiController, keyboardController]) => {
    const { setupCanvas, CONFIG } = config;
    const { GameState } = game;
    const { Renderer, LegendRenderer } = renderer;
    const { UISettings, NoiseControlUI, DebugDisplay } = ui;
    const { UI_CONSTANTS } = constants;
    const { SaveLoadManager } = saveload;
    const { CanvasController } = canvasController;
    const { UIController } = uiController;
    const { KeyboardController } = keyboardController;

    // Create and initialize the app
    const app = new TilemapWaterPumpingApp(
      setupCanvas,
      CONFIG,
      GameState,
      Renderer,
      LegendRenderer,
      UISettings,
      NoiseControlUI,
      DebugDisplay,
      UI_CONSTANTS,
      SaveLoadManager,
      CanvasController,
      UIController,
      KeyboardController,
    );
    
    // Store app globally and initialize when DOM is ready
    globalThis.tilemapApp = app;
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
      app.init();
    }
  })
  .catch((error) => {
    console.error("Failed to load modules:", error);
  });

class TilemapWaterPumpingApp {
  constructor(
    setupCanvas,
    CONFIG,
    GameState,
    Renderer,
    LegendRenderer,
    UISettings,
    NoiseControlUI,
    DebugDisplay,
    UI_CONSTANTS,
    SaveLoadManager,
    CanvasController,
    UIController,
    KeyboardController,
  ) {
    this.setupCanvas = setupCanvas;
    this.CONFIG = CONFIG;
    this.GameState = GameState;
    this.Renderer = Renderer;
    this.LegendRenderer = LegendRenderer;
    this.UISettings = UISettings;
    this.NoiseControlUI = NoiseControlUI;
    this.DebugDisplay = DebugDisplay;
    this.UI_CONSTANTS = UI_CONSTANTS;
    this.SaveLoadManager = SaveLoadManager;
    this.CanvasController = CanvasController;
    this.UIController = UIController;
    this.KeyboardController = KeyboardController;

    // Selected depth for drawing
    this.selectedDepth = 0;
  }

  init() {
    // Setup canvas and rendering
    const { canvas, ctx } = this.setupCanvas();
    this.canvas = canvas;
    this.renderer = new this.Renderer(canvas, ctx);

    // Initialize game state
    this.gameState = new this.GameState();

    // Initialize UI components
    this.uiSettings = new this.UISettings();

    // Perform initial basin computation
    this.gameState.performInitialBasinComputation();
    this.noiseControlUI = new this.NoiseControlUI(
      this.gameState.getHeightGenerator().getNoiseSettings(),
      () => this.onNoiseSettingsChanged(),
    );

    // Initialize controllers
    this.canvasController = new this.CanvasController(
      this.canvas,
      this.gameState,
      this.renderer,
      this.UI_CONSTANTS
    );
    this.uiController = new this.UIController(this.gameState, this.renderer);
    this.keyboardController = new this.KeyboardController();

    // Setup controller callbacks
    this.setupControllerCallbacks();

    this.debugDisplay = new this.DebugDisplay(this.gameState.getBasinManager(), this.gameState, {
      removePump: (index) => {
        this.gameState.getPumpManager().removePump(index);
        this.renderer.onPumpsChanged();
      },
      removeReservoir: (id) => {
        this.gameState.getReservoirManager().removeReservoir(id);
        this.renderer.onPumpsChanged();
        this.renderer.onWaterChanged(); // Reservoirs can contain water
      },
      updateControls: () => this.updateReservoirControls(),
      updateDisplays: () => this.updateBasinAnalysisDisplays(),
      clearSelection: () => this.clearReservoirSelection(),
      draw: () => this.draw(),
    });

    // Initialize save/load manager
    this.saveLoadManager = new this.SaveLoadManager(
      this.gameState,
      () => this.onGameStateChanged(),
    );

    // Make save load manager globally accessible for HTML onclick handlers
    globalThis.saveLoadManager = this.saveLoadManager;

    // Setup callbacks
    this.debugDisplay.setBasinHighlightChangeCallback((_basinId) => {
      this.renderer.onBasinHighlightChanged();
      this.draw();
    });

    this.initialize();
  }

  setupControllerCallbacks() {
    const commonCallbacks = {
      onTerrainChanged: () => this.renderer.onTerrainChanged(),
      onWaterChanged: () => this.renderer.onWaterChanged(),
      onPumpsChanged: () => this.renderer.onPumpsChanged(),
      onLabelsToggled: () => this.renderer.onLabelsToggled(),
      updateBasinAnalysis: () => this.updateBasinAnalysisDisplays(),
      updateReservoirControls: () => this.updateReservoirControls(),
      draw: () => this.draw(),
      setSelectedDepth: (depth) => this.setSelectedDepth(depth),
      updateInsights: (tileInfo) => this.updateInsightsDisplay(tileInfo),
      onGameStateChanged: () => this.onGameStateChanged()
    };

    this.canvasController.setCallbacks(commonCallbacks);
    this.uiController.setCallbacks(commonCallbacks);
    this.uiController.setUISettings(this.uiSettings);
    this.keyboardController.setCallbacks(commonCallbacks);
  }

  initialize() {
    // Setup controller event handlers
    this.canvasController.setupEventHandlers();
    this.uiController.setupEventHandlers();
    this.keyboardController.setupEventHandlers();
    
    // Setup remaining UI controls
    this.noiseControlUI.setupMainNoiseControls();
    this.noiseControlUI.createOctaveControls();

    // Create legend with selected depth highlight
    this.LegendRenderer.createLegend();
    this.updateLegendSelection();

    // Update reservoir controls
    this.updateReservoirControls();

    // Update insights display
    this.updateInsightsDisplay();

    // Update basin analysis displays with initial state
    this.updateBasinAnalysisDisplays();

    // Initial render
    this.draw();
  }

  onNoiseSettingsChanged() {
    performance.mark("noise-settings-change-start");

    performance.mark("terrain-regeneration-start");
    this.gameState.regenerateWithCurrentSettings();
    // Mark terrain layer as dirty after regeneration
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged(); // Water basins change with terrain
    // Basin labels also need to be updated when terrain changes affect basins
    this.renderer.onLabelsToggled();
    performance.mark("terrain-regeneration-end");
    performance.measure(
      "Terrain Regeneration",
      "terrain-regeneration-start",
      "terrain-regeneration-end",
    );

    performance.mark("rendering-start");
    this.draw();
    performance.mark("rendering-end");
    performance.measure("Rendering", "rendering-start", "rendering-end");

    performance.mark("basin-analysis-update-start");
    this.updateBasinAnalysisDisplays();
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
  }

  onGameStateChanged() {
    // Called when the game state is loaded from save/import
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged();
    this.renderer.onPumpsChanged();
    this.renderer.onLabelsToggled();
    this.draw();
    this.updateBasinAnalysisDisplays();
    this.updateReservoirControls();

    // Update noise control UI to reflect loaded settings
    this.noiseControlUI.updateUI();
  }

  setSelectedDepth(depth) {
    this.selectedDepth = Math.max(0, Math.min(9, depth));
    this.canvasController.setSelectedDepth(this.selectedDepth);
    this.updateLegendSelection();
    console.log(`Selected depth: ${this.selectedDepth}`);
  }

  updateLegendSelection() {
    this.LegendRenderer.updateSelectedDepth(this.selectedDepth);
  }

  // Debug stepping methods removed - functionality no longer supported

  updateDebugUI(_debugState) {
    const stageEl = document.getElementById("debugStage");
    
    // Only show stage, hardcoded to "not-implemented"
    if (stageEl) stageEl.textContent = 'not-implemented';
  }

  setupDebugEventHandlers() {
    const enableDebugCheckbox = document.getElementById("enableFloodFillDebug");
    const stepButton = document.getElementById("stepFloodFill");
    const stepOverBasinButton = document.getElementById("stepOverBasin");

    if (enableDebugCheckbox) {
      // Debug stepping is not implemented - keep checkbox unchecked and buttons disabled
      enableDebugCheckbox.checked = false;
      
      // Disable all debug buttons since functionality is not implemented
      if (stepButton) stepButton.disabled = true;
      if (stepOverBasinButton) stepOverBasinButton.disabled = true;
      
      // Set debug UI to show not-implemented status
      this.updateDebugUI({});

      enableDebugCheckbox.addEventListener("change", (e) => {
        const _enabled = e.target.checked;
        
        // Debug functionality is not implemented - just update UI
        this.updateDebugUI({});
        
        // Keep buttons disabled since debug stepping is not implemented
        if (stepButton) stepButton.disabled = true;
        if (stepOverBasinButton) stepOverBasinButton.disabled = true;
      });
    }

    // Debug button functionality removed - buttons are disabled
  }

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

  updateReservoirControls() {
    this.uiController.updateReservoirControls();
  }

  clearReservoirSelection() {
    this.uiController.clearReservoirSelection();
  }

  updateBasinAnalysisDisplays() {
    this.debugDisplay.updateBasinsDisplay();
    this.debugDisplay.updateReservoirsDisplay(
      this.gameState.getReservoirs(),
      this.gameState.getPumps(),
      this.gameState.getSelectedReservoir(),
    );
    this.debugDisplay.updateTickCounter(this.gameState.getTickCounter());
  }

  draw() {
    // Use optimized layered rendering - debug state removed
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
}
