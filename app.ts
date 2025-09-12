/// Main application entry point - TypeScript with Vite

import { EventBus } from './modules/core/EventBus.js';
import { Renderer } from './modules/rendering/Renderer.js';
import { UISettings } from './modules/ui/UISettings.js';
import { NoiseControlUI } from './modules/ui/NoiseControlUI.js';
import { DebugDisplay } from './modules/ui/DebugDisplay.js';
import { SaveLoadManager } from './modules/saves/saveload.js';
import { CanvasController } from './modules/controllers/CanvasController.js';
import { UIController } from './modules/controllers/UIController.js';
import { KeyboardController } from './modules/controllers/KeyboardController.js';
import { RenderingCoordinator } from './modules/coordinators/RenderingCoordinator.js';
import { InitializationCoordinator } from './modules/coordinators/InitializationCoordinator.js';
import { CONFIG, setupCanvas } from './modules/config.js';
import { UI_CONSTANTS } from './modules/constants.js';

/// Simple game state interface
interface GameState {
  getHeightData(): number[];
  getBasinData(): unknown[];
  getPumpData(): unknown[];
  getReservoirData(): unknown[];
  getWaterData(): unknown[];
  getWorldSize(): { width: number; height: number };
  getTickCounter(): number;
  setHeightData(data: number[]): void;
  setBasinData(data: unknown[]): void;
  setPumpData(data: unknown[]): void;
  setReservoirData(data: unknown[]): void;
  setWaterData(data: unknown[]): void;
  setTickCounter(counter: number): void;
  tick(): void;
  setSelectedReservoir(id: string | null): void;
}

/// Extend globalThis for development
declare global {
  interface Window {
    tilemapApp?: Application;
    saveLoadManager?: SaveLoadManager;
  }
  var tilemapApp: Application | undefined;
  var saveLoadManager: SaveLoadManager;
}

/// Main Application Class - Clean Architecture Implementation
class Application {
  private eventBus: EventBus;
  private gameState: GameState;
  private renderer: Renderer;
  private uiSettings: UISettings;
  private noiseControlUI: NoiseControlUI;
  private debugDisplay: DebugDisplay;
  private saveLoadManager: SaveLoadManager;
  private canvasController: CanvasController;
  private uiController: UIController;
  private keyboardController: KeyboardController;
  private renderingCoordinator: RenderingCoordinator;
  private initializationCoordinator: InitializationCoordinator;

  constructor() {
    /// Directly instantiate dependencies
    this.eventBus = new EventBus();
    
    /// Create a simple game state object for now
    this.gameState = {
      /// Placeholder methods that the save/load system expects
      getHeightData: () => [],
      getBasinData: () => [],
      getPumpData: () => [],
      getReservoirData: () => [],
      getWaterData: () => [],
      getWorldSize: () => ({ width: 100, height: 100 }),
      getTickCounter: () => 0,
      setHeightData: () => {},
      setBasinData: () => {},
      setPumpData: () => {},
      setReservoirData: () => {},
      setWaterData: () => {},
      setTickCounter: () => {},
      tick: () => {},
      setSelectedReservoir: () => {}
    };

    const { canvas, ctx } = setupCanvas();
    this.renderer = new Renderer(canvas, ctx);
    this.uiSettings = new UISettings();
    
    /// Pass null for noiseSettings, or replace with a default if needed
    this.noiseControlUI = new NoiseControlUI(
      null,
      () => this.eventBus.emit('noise.live.update'),
      () => this.eventBus.emit('noise.final.update')
    );
    
    this.debugDisplay = new DebugDisplay(null, this.gameState);
    this.saveLoadManager = new SaveLoadManager(this.gameState, () => this.eventBus.emit('gamestate.changed'));
    this.canvasController = new CanvasController(canvas, this.gameState, this.renderer, UI_CONSTANTS, this.eventBus);
    this.uiController = new UIController(this.gameState, this.renderer, this.eventBus);
    this.keyboardController = new KeyboardController(this.eventBus);
    
    this.renderingCoordinator = new RenderingCoordinator(
      this.renderer,
      this.gameState,
      this.uiSettings,
      CONFIG,
      this.canvasController
    );
    
    this.initializationCoordinator = new InitializationCoordinator(
      setupCanvas,
      CONFIG,
      null, /// GameState no longer needed
      Renderer,
      UISettings,
      NoiseControlUI,
      DebugDisplay,
      SaveLoadManager,
      CanvasController,
      UIController,
      KeyboardController,
      UI_CONSTANTS
    );
    
    this.setupEventListeners();
  }

  /// Setup event-driven communication
  private setupEventListeners(): void {
    /// Terrain changes
    this.eventBus.on('terrain.changed', () => {
      this.renderer.onTerrainChanged();
      this.renderingCoordinator.draw();
      this.eventBus.emit('analysis.update');
    });

    /// Water changes
    this.eventBus.on('water.changed', () => {
      this.renderer.onWaterChanged();
      this.renderingCoordinator.draw();
    });

    /// Pump changes
    this.eventBus.on('pumps.changed', () => {
      this.renderer.onPumpsChanged();
      this.renderingCoordinator.draw();
    });

    /// Labels toggle
    this.eventBus.on('labels.toggled', () => {
      this.renderer.onLabelsToggled();
      this.renderingCoordinator.draw();
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
    this.eventBus.on('insights.update', (data: { tileInfo?: unknown } = {}) => {
      this.renderingCoordinator.updateInsightsDisplay(data?.tileInfo as null | undefined);
    });

    /// Rendering requests
    this.eventBus.on('render.request', () => {
      this.renderingCoordinator.draw();
    });

    /// Depth selection
    this.eventBus.on('depth.selected', (data: { depth: number }) => {
      const actualDepth = this.renderingCoordinator.setSelectedDepth(data.depth);
      this.canvasController.setSelectedDepth(actualDepth);
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
      this.renderingCoordinator.onLiveNoiseUpdate();
    });

    this.eventBus.on('noise.final.update', () => {
      this.renderingCoordinator.onFinalNoiseUpdate();
    });
  }

  /// Initialize the application
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
    this.renderingCoordinator.updateLegendSelection();
  }

  /// Handle game state changes
  private onGameStateChanged(): void {
    this.renderingCoordinator.onGameStateChanged(this.noiseControlUI);
    this.eventBus.emit('analysis.update');
    this.eventBus.emit('reservoir.controls.update');
  }

  /// Handle noise settings changes
  private onNoiseSettingsChanged(): void {
    this.renderingCoordinator.onNoiseSettingsChanged(this.noiseControlUI);
    this.eventBus.emit('analysis.update');
  }

  /// Update basin analysis displays
  private updateBasinAnalysisDisplays(): void {
    this.debugDisplay.updateBasinsDisplay();
    /// Remove calls to non-existent GameState methods
    /// If needed, add your own logic here for updating displays
  }
}

/// Initialize the application
function initializeApp(): void {
  console.log('🚀 Initializing Tilemap Water Pumping Application');
  
  try {
    const app = new Application();
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

/// Start the application
initializeApp();
