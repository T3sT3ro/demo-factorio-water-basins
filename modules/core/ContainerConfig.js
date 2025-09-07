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
    container.bind('SaveLoadManager').to(modules.saveload.SaveLoadManager)
      .withDependencies('GameState', 'EventBus').asSingleton();

    // Rendering system
    container.bind('Renderer').to(() => {
      const setup = modules.config.setupCanvas();
      return new modules.renderer.Renderer(setup.canvas, setup.ctx);
    }).asSingleton();
    container.bindConstant('LegendRenderer', modules.renderer.LegendRenderer);

    // UI components
    container.bind('UISettings').to(modules.ui.UISettings).asSingleton();
    container.bind('NoiseControlUI').to(modules.ui.NoiseControlUI)
      .withDependencies('GameState', 'EventBus').asSingleton();
    container.bind('DebugDisplay').to(() => {
      const gameState = container.resolve('GameState');
      const callbacks = {}; // Empty callbacks for now, will be set by Application
      return new modules.ui.DebugDisplay(
        gameState.getBasinManager(),
        gameState,
        callbacks
      );
    }).asSingleton();

    // Controllers
    container.bind('CanvasController').to(modules.controllers.CanvasController)
      .withDependencies('Canvas', 'GameState', 'Renderer', 'UI_CONSTANTS').asSingleton();
    container.bind('UIController').to(modules.controllers.UIController)
      .withDependencies('EventBus', 'GameState', 'Renderer').asSingleton();
    container.bind('KeyboardController').to(modules.controllers.KeyboardController)
      .withDependencies('EventBus').asSingleton();

    // Coordinators
    container.bind('RenderingCoordinator').to(modules.coordinators.RenderingCoordinator)
      .withDependencies('Renderer', 'GameState', 'UISettings', 'LegendRenderer', 'CONFIG', 'CanvasController').asSingleton();
    container.bind('CallbackManager').to(modules.coordinators.CallbackManager)
      .withDependencies('RenderingCoordinator', 'DebugDisplay', 'UISettings').asSingleton();
    container.bind('InitializationCoordinator').to(modules.coordinators.InitializationCoordinator)
      .withDependencies('CONFIG', 'UI_CONSTANTS').asSingleton();
    container.bind('DebugManager').to(modules.coordinators.DebugManager).asSingleton();

    // Main application
    container.bind('Application').to(modules.app.TilemapWaterPumpingApp)
      .withDependencies(
        'EventBus', 'GameState', 'Renderer', 'UISettings', 'NoiseControlUI', 
        'DebugDisplay', 'SaveLoadManager', 'CanvasController', 'UIController', 
        'KeyboardController', 'RenderingCoordinator', 'CallbackManager', 
        'InitializationCoordinator', 'DebugManager'
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
      import(`../renderer.js?v=${this.moduleVersion}`),
      import(`../ui.js?v=${this.moduleVersion}`),
      import(`../constants.js?v=${this.moduleVersion}`),
      import(`../saveload.js?v=${this.moduleVersion}`),
      import(`../controllers/CanvasController.js?v=${this.moduleVersion}`),
      import(`../controllers/UIController.js?v=${this.moduleVersion}`),
      import(`../controllers/KeyboardController.js?v=${this.moduleVersion}`),
      import(`../coordinators/RenderingCoordinator.js?v=${this.moduleVersion}`),
      import(`../coordinators/CallbackManager.js?v=${this.moduleVersion}`),
      import(`../coordinators/InitializationCoordinator.js?v=${this.moduleVersion}`),
      import(`../coordinators/DebugManager.js?v=${this.moduleVersion}`),
      import(`./Application.js?v=${this.moduleVersion}`),
    ]);

    const result = {
      config: modules[0],
      game: modules[1],
      renderer: modules[2],
      ui: modules[3],
      constants: modules[4],
      saveload: modules[5],
      controllers: {
        CanvasController: modules[6].CanvasController,
        UIController: modules[7].UIController,
        KeyboardController: modules[8].KeyboardController,
      },
      coordinators: {
        RenderingCoordinator: modules[9].RenderingCoordinator,
        CallbackManager: modules[10].CallbackManager,
        InitializationCoordinator: modules[11].InitializationCoordinator,
        DebugManager: modules[12].DebugManager,
      },
      app: {
        TilemapWaterPumpingApp: modules[13].Application,
      }
    };

    return result;
  }
}
