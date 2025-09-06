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

// Import coordinators
const renderingCoordinatorModule = import(`./modules/coordinators/RenderingCoordinator.js?v=${moduleVersion}`);
const callbackManagerModule = import(`./modules/coordinators/CallbackManager.js?v=${moduleVersion}`);
const initializationCoordinatorModule = import(`./modules/coordinators/InitializationCoordinator.js?v=${moduleVersion}`);
const debugManagerModule = import(`./modules/coordinators/DebugManager.js?v=${moduleVersion}`);

// Wait for all modules to load, then initialize the app
Promise.all([
  configModule, gameModule, rendererModule, uiModule, constantsModule, saveloadModule,
  canvasControllerModule, uiControllerModule, keyboardControllerModule,
  renderingCoordinatorModule, callbackManagerModule, initializationCoordinatorModule, debugManagerModule
])
  .then(([config, game, renderer, ui, constants, saveload, canvasController, uiController, keyboardController, renderingCoordinator, callbackManager, initializationCoordinator, debugManager]) => {
    const { setupCanvas, CONFIG } = config;
    const { GameState } = game;
    const { Renderer, LegendRenderer } = renderer;
    const { UISettings, NoiseControlUI, DebugDisplay } = ui;
    const { UI_CONSTANTS } = constants;
    const { SaveLoadManager } = saveload;
    const { CanvasController } = canvasController;
    const { UIController } = uiController;
    const { KeyboardController } = keyboardController;
    const { RenderingCoordinator } = renderingCoordinator;
    const { CallbackManager } = callbackManager;
    const { InitializationCoordinator } = initializationCoordinator;
    const { DebugManager } = debugManager;

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
      RenderingCoordinator,
      CallbackManager,
      InitializationCoordinator,
      DebugManager,
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
    RenderingCoordinator,
    CallbackManager,
    InitializationCoordinator,
    DebugManager,
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
    this.RenderingCoordinator = RenderingCoordinator;
    this.CallbackManager = CallbackManager;
    this.InitializationCoordinator = InitializationCoordinator;
    this.DebugManager = DebugManager;

    // Selected depth for drawing - will be managed by RenderingCoordinator
    this.selectedDepth = 0;
  }

  init() {
    // Initialize using the InitializationCoordinator
    const initCoordinator = new this.InitializationCoordinator(
      this.setupCanvas,
      this.CONFIG,
      this.GameState,
      this.Renderer,
      this.LegendRenderer,
      this.UISettings,
      this.NoiseControlUI,
      this.DebugDisplay,
      this.SaveLoadManager,
      this.CanvasController,
      this.UIController,
      this.KeyboardController,
      this.UI_CONSTANTS
    );

    // Initialize rendering system
    const { canvas, renderer } = initCoordinator.initializeRenderingSystem();
    this.canvas = canvas;
    this.renderer = renderer;

    // Initialize game state
    this.gameState = initCoordinator.initializeGameState();

    // Initialize UI components FIRST
    const { uiSettings, noiseControlUI } = initCoordinator.initializeUIComponents(
      this.gameState,
      () => this.onNoiseSettingsChanged()
    );
    this.uiSettings = uiSettings;
    this.noiseControlUI = noiseControlUI;

    // Initialize rendering coordinator AFTER uiSettings is available
    this.renderingCoordinator = new this.RenderingCoordinator(
      this.renderer,
      this.gameState,
      this.uiSettings,
      this.LegendRenderer,
      this.CONFIG
    );

    // Initialize controllers
    const { canvasController, uiController, keyboardController } = initCoordinator.initializeControllers(
      this.canvas,
      this.gameState,
      this.renderer
    );
    this.canvasController = canvasController;
    this.uiController = uiController;
    this.keyboardController = keyboardController;

    // Initialize callback manager
    this.callbackManager = new this.CallbackManager(
      this.renderingCoordinator,
      null, // debugDisplay will be set later
      this.uiSettings
    );

    // Setup controller callbacks
    this.setupControllerCallbacks();

    // Initialize debug display with callbacks
    const debugCallbacks = this.callbackManager.createDebugCallbacks(
      this.gameState,
      this.renderer,
      () => this.updateReservoirControls(),
      () => this.updateBasinAnalysisDisplays(),
      () => this.clearReservoirSelection()
    );
    this.debugDisplay = initCoordinator.initializeDebugDisplay(this.gameState, debugCallbacks);

    // Update callback manager with debug display
    this.callbackManager.debugDisplay = this.debugDisplay;

    // Setup debug callbacks
    this.callbackManager.setupDebugCallbacks(
      this.gameState,
      this.renderer,
      () => this.updateReservoirControls(),
      () => this.updateBasinAnalysisDisplays(),
      () => this.clearReservoirSelection()
    );

    // Initialize save/load manager
    this.saveLoadManager = initCoordinator.initializeSaveLoadManager(
      this.gameState,
      () => this.onGameStateChanged()
    );

    this.initialize();
  }

  initialize() {
    // Initialize debug manager
    this.debugManager = new this.DebugManager();

    // Setup controller event handlers using existing InitializationCoordinator
    const initCoordinator = new this.InitializationCoordinator(
      this.setupCanvas,
      this.CONFIG,
      this.GameState,
      this.Renderer,
      this.LegendRenderer,
      this.UISettings,
      this.NoiseControlUI,
      this.DebugDisplay,
      this.SaveLoadManager,
      this.CanvasController,
      this.UIController,
      this.KeyboardController,
      this.UI_CONSTANTS
    );
    initCoordinator.setupControllerEventHandlers(
      this.canvasController,
      this.uiController,
      this.keyboardController
    );

    // Setup final UI and initial state
    initCoordinator.setupFinalUI(this.noiseControlUI, this.renderingCoordinator);

    // Setup debug event handlers
    this.debugManager.setupDebugEventHandlers();

    // Update reservoir controls
    this.updateReservoirControls();

    // Update insights display
    this.renderingCoordinator.updateInsightsDisplay(this.canvasController);

    // Update basin analysis displays with initial state
    this.updateBasinAnalysisDisplays();

    // Initial render
    this.renderingCoordinator.draw(this.canvasController);
  }

  setupControllerCallbacks() {
    this.callbackManager.setupControllerCallbacks(
      this.canvasController,
      this.uiController,
      this.keyboardController,
      this.renderer,
      () => this.updateBasinAnalysisDisplays(),
      () => this.updateReservoirControls(),
      () => this.onGameStateChanged()
    );
  }

  onNoiseSettingsChanged() {
    this.renderingCoordinator.onNoiseSettingsChanged(this.noiseControlUI);
    this.updateBasinAnalysisDisplays();
  }

  onGameStateChanged() {
    // Called when the game state is loaded from save/import
    this.renderingCoordinator.onGameStateChanged(this.noiseControlUI);
    this.updateBasinAnalysisDisplays();
    this.updateReservoirControls();
  }

  setSelectedDepth(depth) {
    const actualDepth = this.renderingCoordinator.setSelectedDepth(depth);
    this.canvasController.setSelectedDepth(actualDepth);
    this.selectedDepth = actualDepth;
  }

  updateLegendSelection() {
    this.renderingCoordinator.updateLegendSelection();
  }

  // Debug stepping methods removed - functionality no longer supported

  updateDebugUI(_debugState) {
    this.debugManager.updateDebugUI(_debugState);
  }

  setupDebugEventHandlers() {
    this.debugManager.setupDebugEventHandlers();
  }

  updateInsightsDisplay(tileInfo = null) {
    this.renderingCoordinator.updateInsightsDisplay(this.canvasController, tileInfo);
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
    this.renderingCoordinator.draw(this.canvasController);
  }
}
