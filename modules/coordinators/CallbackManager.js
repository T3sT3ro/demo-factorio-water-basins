/**
 * CallbackManager - Manages callback setup between controllers and coordinators
 * 
 * Responsibilities:
 * - Create and configure callback objects for controllers
 * - Coordinate communication between different modules
 * - Provide centralized callback management
 */
export class CallbackManager {
  constructor(renderingCoordinator, debugDisplay, uiSettings) {
    this.renderingCoordinator = renderingCoordinator;
    this.debugDisplay = debugDisplay;
    this.uiSettings = uiSettings;
    this.canvasController = null; // Will be set during setup
  }

  /**
   * Set canvas controller reference for callbacks
   */
  setCanvasController(canvasController) {
    this.canvasController = canvasController;
  }

  /**
   * Create common callback object used by all controllers
   */
  createCommonCallbacks(renderer, updateBasinAnalysis, updateReservoirControls, onGameStateChanged) {
    return {
      onTerrainChanged: () => renderer.onTerrainChanged(),
      onWaterChanged: () => renderer.onWaterChanged(),
      onPumpsChanged: () => renderer.onPumpsChanged(),
      onLabelsToggled: () => renderer.onLabelsToggled(),
      updateBasinAnalysis: updateBasinAnalysis,
      updateReservoirControls: updateReservoirControls,
      draw: () => this.renderingCoordinator.draw(this.canvasController),
      setSelectedDepth: (depth) => {
        const actualDepth = this.renderingCoordinator.setSelectedDepth(depth);
        return actualDepth;
      },
      updateInsights: (tileInfo) => 
        this.renderingCoordinator.updateInsightsDisplay(this.canvasController, tileInfo),
      onGameStateChanged: onGameStateChanged
    };
  }

  /**
   * Setup all controller callbacks
   */
  setupControllerCallbacks(
    canvasController, 
    uiController, 
    keyboardController, 
    renderer,
    updateBasinAnalysis,
    updateReservoirControls,
    onGameStateChanged
  ) {
    // Store canvas controller reference for callbacks
    this.setCanvasController(canvasController);

    const commonCallbacks = this.createCommonCallbacks(
      renderer, 
      updateBasinAnalysis, 
      updateReservoirControls,
      onGameStateChanged
    );

    // Setup canvas controller callbacks
    canvasController.setCallbacks(commonCallbacks);
    canvasController.setSelectedDepth(this.renderingCoordinator.getSelectedDepth());

    // Setup UI controller callbacks
    uiController.setCallbacks(commonCallbacks);
    uiController.setUISettings(this.uiSettings);

    // Setup keyboard controller callbacks
    keyboardController.setCallbacks(commonCallbacks);
  }

  /**
   * Create debug display callbacks
   */
  createDebugCallbacks(gameState, renderer, updateReservoirControls, updateBasinAnalysis, clearReservoirSelection) {
    return {
      removePump: (index) => {
        gameState.getPumpManager().removePump(index);
        renderer.onPumpsChanged();
      },
      removeReservoir: (id) => {
        gameState.getReservoirManager().removeReservoir(id);
        renderer.onPumpsChanged();
        renderer.onWaterChanged(); // Reservoirs can contain water
      },
      updateControls: updateReservoirControls,
      updateDisplays: updateBasinAnalysis,
      clearSelection: clearReservoirSelection,
      draw: () => this.renderingCoordinator.draw(this.canvasController),
    };
  }

  /**
   * Setup debug display callbacks
   */
  setupDebugCallbacks(gameState, renderer, updateReservoirControls, updateBasinAnalysis, clearReservoirSelection) {
    const debugCallbacks = this.createDebugCallbacks(
      gameState, 
      renderer, 
      updateReservoirControls, 
      updateBasinAnalysis, 
      clearReservoirSelection
    );

    // Setup basin highlight callback
    this.debugDisplay.setBasinHighlightChangeCallback((_basinId) => {
      renderer.onBasinHighlightChanged();
      this.renderingCoordinator.draw();
    });

    return debugCallbacks;
  }
}
