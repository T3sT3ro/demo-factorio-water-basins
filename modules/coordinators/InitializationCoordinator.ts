/**
 * InitializationCoordinator - Manages the complex initialization sequence
 *
 * Responsibilities:
 * - Coordinate module initialization in correct order
 * - Setup dependencies between modules
 * - Handle initial state setup
 */

interface CanvasSetupResult {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

interface GameStateLike {
  performInitialBasinComputation(): void;
  getHeightGenerator(): { getNoiseSettings(): unknown };
  getBasinManager(): unknown;
}

interface RendererConstructor {
  new (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): unknown;
}

interface UISettingsConstructor {
  new (): unknown;
}

interface NoiseControlUIConstructor {
  new (noiseSettings: unknown, onLiveUpdate: () => void, onFinalUpdate: () => void): unknown;
}

interface DebugDisplayConstructor {
  new (basinManager: unknown, gameState: GameStateLike, debugCallbacks: unknown): unknown;
}

interface SaveLoadManagerConstructor {
  new (gameState: GameStateLike, onGameStateChanged: (noiseControlUI: unknown) => void): unknown;
}

interface CanvasControllerConstructor {
  new (canvas: HTMLCanvasElement, gameState: GameStateLike, renderer: unknown, uiConstants: unknown): unknown;
}

interface UIControllerConstructor {
  new (gameState: GameStateLike, renderer: unknown): unknown;
}

interface NoiseControlUILike {
  setupMainNoiseControls(): void;
  createOctaveControls(): void;
}

interface RenderingCoordinatorLike {
  updateLegendSelection(): void;
}

interface ControllerLike {
  setupEventHandlers(): void;
}

interface KeyboardControllerConstructor {
  new (): ControllerLike;
}

export class InitializationCoordinator {
  private setupCanvas: () => CanvasSetupResult;
  private CONFIG: typeof import("../config.ts").CONFIG;
  private GameState: new () => GameStateLike;
  private Renderer: RendererConstructor;
  private UISettings: UISettingsConstructor;
  private NoiseControlUI: NoiseControlUIConstructor;
  private DebugDisplay: DebugDisplayConstructor;
  private SaveLoadManager: SaveLoadManagerConstructor;
  private CanvasController: CanvasControllerConstructor;
  private UIController: UIControllerConstructor;
  private KeyboardController: KeyboardControllerConstructor;
  private UI_CONSTANTS: typeof import("../constants.ts").UI_CONSTANTS;

  constructor(
    setupCanvas: () => CanvasSetupResult,
    CONFIG: typeof import("../config.ts").CONFIG,
    GameState: new () => GameStateLike,
    Renderer: RendererConstructor,
    UISettings: UISettingsConstructor,
    NoiseControlUI: NoiseControlUIConstructor,
    DebugDisplay: DebugDisplayConstructor,
    SaveLoadManager: SaveLoadManagerConstructor,
    CanvasController: CanvasControllerConstructor,
    UIController: UIControllerConstructor,
    KeyboardController: KeyboardControllerConstructor,
    UI_CONSTANTS: typeof import("../constants.ts").UI_CONSTANTS
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
  initializeRenderingSystem(): { canvas: HTMLCanvasElement; renderer: unknown } {
    const { canvas, ctx } = this.setupCanvas();
    const renderer = new this.Renderer(canvas, ctx);

    return { canvas, renderer };
  }

  /**
   * Initialize game state and perform initial computation
   */
  initializeGameState(): GameStateLike {
    const gameState = new this.GameState();
    gameState.performInitialBasinComputation();
    return gameState;
  }

  /**
   * Initialize UI components
   */
  initializeUIComponents(
    gameState: GameStateLike,
    onLiveNoiseUpdate: () => void,
    onFinalNoiseUpdate: () => void
  ): { uiSettings: unknown; noiseControlUI: unknown } {
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
  initializeControllers(
    canvas: HTMLCanvasElement,
    gameState: GameStateLike,
    renderer: unknown
  ): { canvasController: unknown; uiController: unknown; keyboardController: unknown } {
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
  initializeDebugDisplay(gameState: GameStateLike, debugCallbacks: unknown): unknown {
    return new this.DebugDisplay(
      gameState.getBasinManager(),
      gameState,
      debugCallbacks
    );
  }

  /**
   * Initialize save/load manager
   */
  initializeSaveLoadManager(gameState: GameStateLike, onGameStateChanged: (noiseControlUI: unknown) => void): unknown {
    const saveLoadManager = new this.SaveLoadManager(
      gameState,
      onGameStateChanged,
    );

    // Make save load manager globally accessible for HTML onclick handlers
    // @ts-ignore - Global assignment for HTML onclick handlers
    globalThis.saveLoadManager = saveLoadManager;

    return saveLoadManager;
  }

  /**
   * Setup final UI elements and initial state
   */
  setupFinalUI(noiseControlUI: NoiseControlUILike, renderingCoordinator: RenderingCoordinatorLike): void {
    // Setup noise control UI
    noiseControlUI.setupMainNoiseControls();
    noiseControlUI.createOctaveControls();

    // Legend is now auto-initialized in the Renderer constructor
    renderingCoordinator.updateLegendSelection();
  }

  /**
   * Setup controller event handlers
   */
  setupControllerEventHandlers(
    canvasController: ControllerLike,
    uiController: ControllerLike,
    keyboardController: ControllerLike
  ): void {
    canvasController.setupEventHandlers();
    uiController.setupEventHandlers();
    keyboardController.setupEventHandlers();
  }
}
