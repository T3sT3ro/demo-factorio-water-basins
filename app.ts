import { EventBus } from './modules/core/EventBus.ts';
import { Renderer } from './modules/rendering/Renderer.ts';
import { NoiseControlUI } from './modules/ui/NoiseControlUI.ts';
import { BasinDebugDisplay } from './modules/ui/BasinDebugDisplay.ts';
import { UISettings } from './modules/ui/UISettings.ts';

import { SaveLoadManager } from './modules/saves/saveload.js';
import { CanvasController } from './modules/controllers/CanvasController.ts';
import { UIController } from './modules/controllers/UIController.ts';
import { KeyboardController } from './modules/controllers/KeyboardController.ts';
import { CONFIG, setupCanvas } from './modules/config.ts';
import { UI_CONSTANTS } from './modules/constants.ts';
import { GameState } from './modules/domain/GameState.ts';

/// Extend globalThis for development
declare global {
  interface Window {
    tilemapApp?: Application;
    saveLoadManager?: SaveLoadManager;
  }
  var tilemapApp: Application | undefined;
  var saveLoadManager: SaveLoadManager;
}

/// Main Application Class - Clean Architecture with Dependency Injection
class Application {
  private eventBus: EventBus;
  private gameState: GameState;
  private renderer: Renderer;
  private uiSettings: UISettings;
  private renderSettings: { showLabels: boolean; showGrid: boolean };
  private noiseControlUI: NoiseControlUI;
  private debugDisplay: BasinDebugDisplay;
  private saveLoadManager: SaveLoadManager;
  private canvasController: CanvasController;
  private uiController: UIController;
  private keyboardController: KeyboardController;

  constructor(
    eventBus: EventBus,
    gameState: GameState,
    renderer: Renderer,
    uiSettings: UISettings,
    renderSettings: { showLabels: boolean; showGrid: boolean },
    noiseControlUI: NoiseControlUI,
    debugDisplay: BasinDebugDisplay,
    saveLoadManager: SaveLoadManager,
    canvasController: CanvasController,
    uiController: UIController,
    keyboardController: KeyboardController
  ) {
    this.eventBus = eventBus;
    this.gameState = gameState;
    this.renderer = renderer;
    this.uiSettings = uiSettings;
    this.renderSettings = renderSettings;
    this.noiseControlUI = noiseControlUI;
    this.debugDisplay = debugDisplay;
    this.saveLoadManager = saveLoadManager;
    this.canvasController = canvasController;
    this.uiController = uiController;
    this.keyboardController = keyboardController;

    this.setupEventListeners();
  }

  /// Setup event-driven communication
  private setupEventListeners(): void {
    /// Terrain changes
    this.eventBus.on('terrain.changed', () => {
      this.renderer.onTerrainChanged();
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    /// Water changes
    this.eventBus.on('water.changed', () => {
      this.renderer.onWaterChanged();
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    /// Pump changes
    this.eventBus.on('pumps.changed', () => {
      this.renderer.onPumpsChanged();
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    /// Labels toggle
    this.eventBus.on('labels.toggled', () => {
      this.renderer.onLabelsToggled();
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    /// Basin analysis update
    this.eventBus.on('analysis.update', () => {
      this.updateBasinAnalysisDisplays();
    });

    /// Reservoir controls update
    this.eventBus.on('reservoir.controls.update', () => {
      this.uiController.updateReservoirControls();
    });

    /// Insights update
    this.eventBus.on('insights.update', (_data) => {
      // Simplified - just trigger render
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    /// Rendering requests
    this.eventBus.on('render.request', () => {
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    /// Depth selection
    this.eventBus.on('depth.selected', (_data) => {
      // Simplified - just trigger render
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    /// Game state changes
    this.eventBus.on('gamestate.changed', () => {
      this.onGameStateChanged();
    });

    /// Noise settings changes (legacy)
    this.eventBus.on('noise.settings.changed', () => {
      this.onNoiseSettingsChanged();
    });

    /// New noise control events
    this.eventBus.on('noise.live.update', () => {
      // Simplified
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });

    this.eventBus.on('noise.final.update', () => {
      // Simplified
      this.renderer.renderOptimized(this.gameState, this.renderSettings, null, new Map(), null, 1, 0, null);
    });
  }  /// Initialize the application
  init(): void {
    try {
      /// Initialize game state (canvas is already setup through DI)
      /// Initial basin computation logic should be here if needed
      
      /// Setup controllers with event bus
      this.setupControllers();
      
      /// Initialize UI
      this.initializeUI();
      
      /// Make save/load globally accessible
      globalThis.saveLoadManager = this.saveLoadManager;
      
      /// Initial render
      this.eventBus.emit('render.request');
      this.eventBus.emit('analysis.update');
      this.eventBus.emit('reservoir.controls.update');
      this.eventBus.emit('insights.update');

      console.log('Application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /// Setup controllers with event bus communication
  private setupControllers(): void {
    /// All controllers now use EventBus directly - no callback setup needed
    
    /// Setup event handlers only
    this.canvasController.setupEventHandlers();
    this.uiController.setupEventHandlers();
    this.keyboardController.setupEventHandlers();
    
    /// Setup UI settings
    this.uiController.setUISettings(this.uiSettings);
  }

  /// Initialize UI components
  private initializeUI(): void {
    /// Setup noise control UI
    this.noiseControlUI.setupMainNoiseControls();
    this.noiseControlUI.createOctaveControls();
    
    /// Legend is now auto-initialized in Renderer constructor
    /// this.renderingCoordinator.updateLegendSelection();
  }

  /// Handle game state changes
  private onGameStateChanged(): void {
    /// this.renderingCoordinator.onGameStateChanged(this.noiseControlUI);
    this.eventBus.emit('analysis.update');
    this.eventBus.emit('reservoir.controls.update');
  }

  /// Handle noise settings changes
  private onNoiseSettingsChanged(): void {
    /// this.renderingCoordinator.onNoiseSettingsChanged(this.noiseControlUI);
    this.eventBus.emit('analysis.update');
  }

  /// Update basin analysis displays
  private updateBasinAnalysisDisplays(): void {
    this.debugDisplay.updateBasinsDisplay();
    /// Remove calls to non-existent GameState methods
    /// If needed, add your own logic here for updating displays
  }
}

/// Factory function to create Application with all dependencies
function createApplication(): Application {
  /// Create core dependencies
  const eventBus = new EventBus();
  const gameState = new GameState(CONFIG.WORLD_W, CONFIG.WORLD_H);

  const { canvas, ctx } = setupCanvas();
  const renderer = new Renderer(canvas, ctx);
  const uiSettings = new UISettings();
  const renderSettings = { showLabels: true, showGrid: false };

  /// Create UI components
  const noiseControlUI = new NoiseControlUI(
    gameState,
    () => eventBus.emit('noise.live.update'),
    () => eventBus.emit('noise.final.update')
  );

  const debugDisplay = new BasinDebugDisplay(gameState);
  const saveLoadManager = new SaveLoadManager(gameState, () => eventBus.emit('gamestate.changed'));

  /// Create controllers
  const canvasController = new CanvasController(canvas, gameState, renderer, UI_CONSTANTS, eventBus);
  const uiController = new UIController(gameState, renderer, eventBus);
  const keyboardController = new KeyboardController(eventBus);

  return new Application(
    eventBus,
    gameState,
    renderer,
    uiSettings,
    renderSettings,
    noiseControlUI,
    debugDisplay,
    saveLoadManager,
    canvasController,
    uiController,
    keyboardController
  );
}

/// Initialize the application
function initializeApp(): void {
  console.log('🚀 Initializing Tilemap Water Pumping Application');

  try {
    const app = createApplication();
    globalThis.tilemapApp = app;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, starting application...');
        app.init();
      });
    } else {
      console.log('📄 DOM already loaded, starting application...');
      app.init();
    }
  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    
    /// Show user-friendly error
    const template = document.getElementById('error-message-template') as HTMLTemplateElement;
    if (template) {
      const errorDiv = template.content.querySelector('div')!.cloneNode(true) as HTMLElement;
      document.body.appendChild(errorDiv);
    } else {
      // Fallback
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #ff4444; color: white; padding: 20px; border-radius: 8px;
        font-family: Arial, sans-serif; z-index: 10000;
      `;
      errorDiv.textContent = 'Failed to start application. Check console for details.';
      document.body.appendChild(errorDiv);
    }
  }
}

/// Start the application
initializeApp();
