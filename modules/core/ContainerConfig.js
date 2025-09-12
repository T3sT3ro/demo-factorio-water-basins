/**
 * Dependency Injection Configuration
 * 
 * Configures the DI container with all application dependencies
 * Eliminates constructor injection chaos
 */
import { DIContainer } from './DIContainer.js';
import { EventBus } from './EventBus.js';

export class ContainerConfig {
  static async configure(moduleLoader) {
    const container = new DIContainer();

    // Load all required modules
    const modules = await moduleLoader.loadModules();

    // Core services
    container.bindInstance('EventBus', new EventBus());
    container.bindConstant('CONFIG', modules.config.CONFIG);
    container.bindConstant('UI_CONSTANTS', modules.constants.UI_CONSTANTS);

    // Canvas setup
    container.bind('CanvasSetup').to(() => modules.config.setupCanvas());
    
    // Extract canvas from CanvasSetup for controllers
    container.bind('Canvas').to(() => {
      const setup = modules.config.setupCanvas();
      return setup.canvas;
    });

    // Game state and managers
    container.bind('GameState').to(modules.game.GameState).asSingleton();
    container.bind('SaveLoadManager').to((gameState, eventBus) => {
      return new modules.saveload.SaveLoadManager(gameState, () => eventBus.emit('gamestate.changed'));
    }).withDependencies('GameState', 'EventBus').asSingleton();

    // Rendering system
    container.bind('Renderer').to(() => {
      const setup = modules.config.setupCanvas();
      return new modules.rendering.Renderer(setup.canvas, setup.ctx);
    }).asSingleton();

    // UI components
    container.bind('UISettings').to(modules.ui.UISettings).asSingleton();
    container.bind('NoiseControlUI').to((gameState, eventBus) => {
      return new modules.ui.NoiseControlUI(
        gameState.heightGenerator.noiseSettings,
        () => eventBus.emit('noise.live.update'), // Live updates during slider movement
        () => eventBus.emit('noise.final.update') // Final basin computation when user releases
      );
    }).withDependencies('GameState', 'EventBus').asSingleton();

    // DebugDisplay with proper callbacks
    container.bind('DebugDisplay').to((gameState, eventBus) => {
      const callbacks = {
        removePump: (index) => {
          gameState.getPumpManager().removePump(index);
          eventBus.emit('pumps.changed');
          eventBus.emit('render.request');
        },
        removeReservoir: (id) => {
          gameState.getReservoirManager().removeReservoir(id);
          eventBus.emit('reservoir.controls.update');
          eventBus.emit('render.request');
        },
        updateControls: () => eventBus.emit('reservoir.controls.update'),
        updateDisplays: () => eventBus.emit('render.request'),
        updateDebugDisplays: () => eventBus.emit('debug.update'),
        clearSelection: () => eventBus.emit('selection.cleared'),
        draw: () => eventBus.emit('render.request')
      };
      return new modules.ui.DebugDisplay(
        gameState.basinManager,
        gameState,
        callbacks
      );
    }).withDependencies('GameState', 'EventBus').asSingleton();

    // Controllers
    container.bind('CanvasController').to(modules.controllers.CanvasController)
      .withDependencies('Canvas', 'GameState', 'Renderer', 'UI_CONSTANTS', 'EventBus').asSingleton();
    container.bind('UIController').to(modules.controllers.UIController)
      .withDependencies('GameState', 'Renderer', 'EventBus').asSingleton();
    container.bind('KeyboardController').to(modules.controllers.KeyboardController)
      .withDependencies('EventBus').asSingleton();

    // Coordinators
    container.bind('RenderingCoordinator').to(modules.coordinators.RenderingCoordinator)
      .withDependencies('Renderer', 'GameState', 'UISettings', 'CONFIG', 'CanvasController').asSingleton();
    container.bind('InitializationCoordinator').to(modules.coordinators.InitializationCoordinator)
      .withDependencies('CONFIG', 'UI_CONSTANTS').asSingleton();

    // Main application
    container.bind('Application').to(modules.app.TilemapWaterPumpingApp)
      .withDependencies(
        'EventBus', 'GameState', 'Renderer', 'UISettings', 'NoiseControlUI', 
        'DebugDisplay', 'SaveLoadManager', 'CanvasController', 'UIController', 
        'KeyboardController', 'RenderingCoordinator', 
        'InitializationCoordinator'
      ).asSingleton();

    return container;
  }
}

/**
 * Module Loader - Handles dynamic module loading with cache busting
 */
export class ModuleLoader {
  constructor() {
    this.moduleVersion = globalThis.moduleVersion || Date.now();
  }

  async loadModules() {
    const modules = await Promise.all([
      import(`../config.js?v=${this.moduleVersion}`),
      import(`../game.js?v=${this.moduleVersion}`),
      import(`../rendering/Renderer.js?v=${this.moduleVersion}`),
      import(`../ui/UISettings.js?v=${this.moduleVersion}`),
      import(`../ui/NoiseControlUI.js?v=${this.moduleVersion}`),
      import(`../ui/DebugDisplay.js?v=${this.moduleVersion}`),
      import(`../constants.js?v=${this.moduleVersion}`),
      import(`../saveload.js?v=${this.moduleVersion}`),
      import(`../controllers/CanvasController.js?v=${this.moduleVersion}`),
      import(`../controllers/UIController.js?v=${this.moduleVersion}`),
      import(`../controllers/KeyboardController.js?v=${this.moduleVersion}`),
      import(`../coordinators/RenderingCoordinator.js?v=${this.moduleVersion}`),
      import(`../coordinators/InitializationCoordinator.js?v=${this.moduleVersion}`),
      import(`./Application.js?v=${this.moduleVersion}`),
    ]);

    const result = {
      config: modules[0],
      game: modules[1],
      rendering: modules[2],
      ui: {
        UISettings: modules[3].UISettings,
        NoiseControlUI: modules[4].NoiseControlUI,
        DebugDisplay: modules[5].DebugDisplay,
      },
      constants: modules[6],
      saveload: modules[7],
      controllers: {
        CanvasController: modules[8].CanvasController,
        UIController: modules[9].UIController,
        KeyboardController: modules[10].KeyboardController,
      },
      coordinators: {
        RenderingCoordinator: modules[11].RenderingCoordinator,
        InitializationCoordinator: modules[12].InitializationCoordinator,
      },
      app: {
        TilemapWaterPumpingApp: modules[14].Application,
      }
    };

    return result;
  }
}
