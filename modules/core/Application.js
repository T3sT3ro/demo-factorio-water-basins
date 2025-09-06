/**
 * Main Application Class - Clean Architecture Implementation
 * 
 * Uses Dependency Injection Container and Event Bus for loose coupling
 * Replaces the monolithic TilemapWaterPumpingApp constructor chaos
 */
export class Application {
  constructor(eventBus, gameState, renderer, uiSettings, noiseControlUI, 
              debugDisplay, saveLoadManager, canvasController, uiController, 
              keyboardController, renderingCoordinator, callbackManager, 
              initializationCoordinator, debugManager) {
    
    // Core services
    this.eventBus = eventBus;
    this.gameState = gameState;
    this.renderer = renderer;
    
    // UI components
    this.uiSettings = uiSettings;
    this.noiseControlUI = noiseControlUI;
    this.debugDisplay = debugDisplay;
    
    // Managers
    this.saveLoadManager = saveLoadManager;
    
    // Controllers
    this.canvasController = canvasController;
    this.uiController = uiController;
    this.keyboardController = keyboardController;
    
    // Coordinators
    this.renderingCoordinator = renderingCoordinator;
    this.callbackManager = callbackManager;
    this.initializationCoordinator = initializationCoordinator;
    this.debugManager = debugManager;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event-driven communication
   */
  setupEventListeners() {
    // Terrain changes
    this.eventBus.on('terrain.changed', () => {
      this.renderer.onTerrainChanged();
      this.renderingCoordinator.draw(this.canvasController);
      this.eventBus.emit('analysis.update');
    });

    // Water changes
    this.eventBus.on('water.changed', () => {
      this.renderer.onWaterChanged();
      this.renderingCoordinator.draw(this.canvasController);
    });

    // Pump changes
    this.eventBus.on('pumps.changed', () => {
      this.renderer.onPumpsChanged();
      this.renderingCoordinator.draw(this.canvasController);
    });

    // Labels toggle
    this.eventBus.on('labels.toggled', () => {
      this.renderer.onLabelsToggled();
      this.renderingCoordinator.draw(this.canvasController);
    });

    // Basin analysis update
    this.eventBus.on('analysis.update', () => {
      this.updateBasinAnalysisDisplays();
    });

    // Reservoir controls update
    this.eventBus.on('reservoir.controls.update', () => {
      this.uiController.updateReservoirControls();
    });

    // Insights update
    this.eventBus.on('insights.update', (data) => {
      this.renderingCoordinator.updateInsightsDisplay(this.canvasController, data?.tileInfo);
    });

    // Rendering requests
    this.eventBus.on('render.request', () => {
      this.renderingCoordinator.draw(this.canvasController);
    });

    // Depth selection
    this.eventBus.on('depth.selected', (data) => {
      const actualDepth = this.renderingCoordinator.setSelectedDepth(data.depth);
      this.canvasController.setSelectedDepth(actualDepth);
    });

    // Game state changes
    this.eventBus.on('gamestate.changed', () => {
      this.onGameStateChanged();
    });

    // Noise settings changes
    this.eventBus.on('noise.settings.changed', () => {
      this.onNoiseSettingsChanged();
    });
  }

  /**
   * Initialize the application
   */
  init() {
    try {
      // Initialize canvas and rendering
      this.initializationCoordinator.initializeCanvas();
      
      // Initialize game state
      this.gameState.performInitialBasinComputation();
      
      // Setup controllers with event bus
      this.setupControllers();
      
      // Initialize UI
      this.initializeUI();
      
      // Setup debug functionality
      this.debugManager.setupDebugEventHandlers();
      
      // Make save/load globally accessible
      globalThis.saveLoadManager = this.saveLoadManager;
      
      // Initial render
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

  /**
   * Setup controllers with event bus communication
   */
  setupControllers() {
    // Setup event handlers
    this.canvasController.setupEventHandlers();
    this.uiController.setupEventHandlers();
    this.keyboardController.setupEventHandlers();
    
    // Setup UI settings
    this.uiController.setUISettings(this.uiSettings);
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    // Setup noise control UI
    this.noiseControlUI.setupMainNoiseControls();
    this.noiseControlUI.createOctaveControls();
    
    // Create legend
    this.renderer.LegendRenderer?.createLegend();
    this.renderingCoordinator.updateLegendSelection();
  }

  /**
   * Handle game state changes
   */
  onGameStateChanged() {
    this.renderingCoordinator.onGameStateChanged(this.noiseControlUI);
    this.eventBus.emit('analysis.update');
    this.eventBus.emit('reservoir.controls.update');
  }

  /**
   * Handle noise settings changes
   */
  onNoiseSettingsChanged() {
    this.renderingCoordinator.onNoiseSettingsChanged(this.noiseControlUI);
    this.eventBus.emit('analysis.update');
  }

  /**
   * Update basin analysis displays
   */
  updateBasinAnalysisDisplays() {
    this.debugDisplay.updateBasinsDisplay();
    this.debugDisplay.updateReservoirsDisplay(
      this.gameState.getReservoirs(),
      this.gameState.getPumps(),
      this.gameState.getSelectedReservoir(),
    );
    this.debugDisplay.updateTickCounter(this.gameState.getTickCounter());
  }
}
