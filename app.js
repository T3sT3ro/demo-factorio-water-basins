// Main application controller - orchestrates all modules

// Cache busting for module imports
const moduleVersion = globalThis.moduleVersion || Date.now();

// Import DI container system
const containerConfigModule = import(`./modules/core/ContainerConfig.js?v=${moduleVersion}`);

// Wait for ContainerConfig to load, then initialize the app using the ModuleLoader
Promise.all([containerConfigModule])
  .then(async ([containerConfig]) => {
    // Use the built-in ModuleLoader instead of manual module loading
    const { ContainerConfig, ModuleLoader } = containerConfig;
    const moduleLoader = new ModuleLoader();
    
    // Configure DI container with proper module loader
    const container = await ContainerConfig.configure(moduleLoader);
    const app = container.resolve('Application');    // Store app globally and initialize when DOM is ready
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
