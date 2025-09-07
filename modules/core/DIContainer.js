/**
 * Simple Dependency Injection Container
 * 
 * Manages dependency registration and resolution to eliminate constructor injection chaos
 */
export class DIContainer {
  constructor() {
    this.bindings = new Map();
    this.instances = new Map();
    this.singletons = new Set();
  }

  /**
   * Bind a dependency with its constructor or factory function
   */
  bind(name) {
    const binding = {
      to: (constructor) => {
        this.bindings.set(name, { constructor, dependencies: [] });
        
        const bindingChain = {
          withDependencies: (...deps) => {
            this.bindings.get(name).dependencies = deps;
            return bindingChain;
          },
          asSingleton: () => {
            this.singletons.add(name);
            return this;
          }
        };
        
        return bindingChain;
      }
    };
    return binding;
  }

  /**
   * Bind a constant value
   */
  bindConstant(name, value) {
    this.bindings.set(name, { constructor: () => value, dependencies: [] });
    this.singletons.add(name);
    return this;
  }

  /**
   * Bind an existing instance
   */
  bindInstance(name, instance) {
    this.instances.set(name, instance);
    this.singletons.add(name);
    return this;
  }

  /**
   * Resolve a dependency by name
   */
  resolve(name) {
    // Check for existing singleton instance
    if (this.singletons.has(name) && this.instances.has(name)) {
      return this.instances.get(name);
    }

    const binding = this.bindings.get(name);
    if (!binding) {
      throw new Error(`No binding found for: ${name}`);
    }

    if (typeof binding.constructor !== 'function') {
      throw new Error(`Binding for '${name}' does not have a valid constructor function. Got: ${typeof binding.constructor}`);
    }

    // Resolve dependencies recursively
    const resolvedDependencies = binding.dependencies.map(dep => this.resolve(dep));

    // Create instance - handle both constructors and factory functions
    let instance;
    try {
      // Try as constructor first
      instance = new binding.constructor(...resolvedDependencies);
    } catch (error) {
      // If it fails, try as factory function
      if (error.message.includes('is not a constructor')) {
        instance = binding.constructor(...resolvedDependencies);
      } else {
        throw error;
      }
    }

    // Store singleton instances
    if (this.singletons.has(name)) {
      this.instances.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if a binding exists
   */
  has(name) {
    return this.bindings.has(name) || this.instances.has(name);
  }

  /**
   * Get all registered binding names
   */
  getBindingNames() {
    return Array.from(this.bindings.keys());
  }

  /**
   * Clear all bindings and instances
   */
  clear() {
    this.bindings.clear();
    this.instances.clear();
    this.singletons.clear();
  }
}
