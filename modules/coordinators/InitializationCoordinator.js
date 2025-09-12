/**
 * InitializationCoordinator - Manages the complex initialization sequence
 * 
 * Responsibilities:
 * - Coordinate module initialization in correct order
 * - Setup dependencies between modules
 * - Handle initial state setup
 */
export class InitializationCoordinator {
  constructor(
    setupCanvas,
    CONFIG,
    GameState,
    Renderer,
    UISettings,
    NoiseControlUI,
    DebugDisplay,
    SaveLoadManager,
    CanvasController,
    UIController,
    KeyboardController,
    UI_CONSTANTS
  ) {
    this.setupCanvas = setupCanvas;
    this.CONFIG = CONFIG;
    this.GameState = GameState;
    this.Renderer = Renderer;
    this.UISettings = UISettings;
    this.NoiseControlUI = NoiseControlUI;
    this.DebugDisplay = DebugDisplay;
    this.SaveLoadManager = SaveLoadManager;
    this.CanvasController = CanvasController;
    this.UIController = UIController;
    this.KeyboardController = KeyboardController;
    this.UI_CONSTANTS = UI_CONSTANTS;
  }

  /**
   * Initialize core rendering components
   */
  initializeRenderingSystem() {
    const { canvas, ctx } = this.setupCanvas();
    const renderer = new this.Renderer(canvas, ctx);
    
    return { canvas, renderer };
  }

  /**
   * Initialize game state and perform initial computation
   */
  initializeGameState() {
    const gameState = new this.GameState();
    gameState.performInitialBasinComputation();
    return gameState;
  }

  /**
   * Initialize UI components
   */
  initializeUIComponents(gameState, onLiveNoiseUpdate, onFinalNoiseUpdate) {
    const uiSettings = new this.UISettings();
    
    const noiseControlUI = new this.NoiseControlUI(
      gameState.getHeightGenerator().getNoiseSettings(),
      onLiveNoiseUpdate,
      onFinalNoiseUpdate,
    );

    return { uiSettings, noiseControlUI };
  }

  /**
   * Initialize controllers
   */
  initializeControllers(canvas, gameState, renderer) {
    const canvasController = new this.CanvasController(
      canvas,
      gameState,
      renderer,
      this.UI_CONSTANTS
    );
    
    const uiController = new this.UIController(gameState, renderer);
    const keyboardController = new this.KeyboardController();

    return { canvasController, uiController, keyboardController };
  }

  /**
   * Initialize debug display with callbacks
   */
  initializeDebugDisplay(gameState, debugCallbacks) {
    return new this.DebugDisplay(
      gameState.getBasinManager(), 
      gameState, 
      debugCallbacks
    );
  }

  /**
   * Initialize save/load manager
   */
  initializeSaveLoadManager(gameState, onGameStateChanged) {
    const saveLoadManager = new this.SaveLoadManager(
      gameState,
      onGameStateChanged,
    );

    // Make save load manager globally accessible for HTML onclick handlers
    globalThis.saveLoadManager = saveLoadManager;
    
    return saveLoadManager;
  }

  /**
   * Setup final UI elements and initial state
   */
  setupFinalUI(noiseControlUI, renderingCoordinator) {
    // Setup noise control UI
    noiseControlUI.setupMainNoiseControls();
    noiseControlUI.createOctaveControls();

    // Legend is now auto-initialized in the Renderer constructor
    renderingCoordinator.updateLegendSelection();
  }

  /**
   * Setup controller event handlers
   */
  setupControllerEventHandlers(canvasController, uiController, keyboardController) {
    canvasController.setupEventHandlers();
    uiController.setupEventHandlers();
    keyboardController.setupEventHandlers();
  }
}
