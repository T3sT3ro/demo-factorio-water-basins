# Factorio Water Basins Prototype

A canvas-based water basin simulation inspired by Factorio, featuring hierarchical basin detection, pan/zoom controls, and real-time water flow dynamics.

## Features

- **Hierarchical Basin Detection**: Smart basin grouping that handles nested depth scenarios
- **Interactive Canvas**: Pan with middle mouse, zoom with scroll wheel
- **Real-time Water Flow**: Pumps and water level simulation
- **Smart Labels**: Basin labels with collision avoidance and proper anchoring
- **Performance Optimized**: Integrated rendering pipeline for smooth 60fps performance
- **Modular Architecture**: Clean separation of concerns across multiple ES6 modules

## Development

### Prerequisites

- [Deno](https://deno.land/) 2.4.5 or later

### Quick Start

```bash
# Start development server
deno task dev

# Start server with debugging enabled and launch browser
deno task preview

# Format code
deno task fmt

# Lint code
deno task lint

# Type check
deno task check
```

The development server runs on http://localhost:8000

### Debugging

#### Chrome DevTools Debugging

1. **Frontend debugging**: Use VS Code's "Launch Chrome against localhost" configuration
2. **Server debugging**: Use VS Code's "Debug Deno Server" configuration
3. **Full debugging**: Use the "Launch Chrome + Debug Deno" compound configuration

#### Manual Chrome DevTools

```bash
# Start server with inspect flag
deno task debug

# Open Chrome and go to chrome://inspect
# Click "Configure" and add localhost:9229
# Click "inspect" on the target
```

## TODO:

- [ ] performant downflow of water between basins
- [ ] reduce data duplication by keeping cursor stack per basin instead of per pump and split the logic into 2 stages:
   1. Accumulate all pump delta for basins in first half
   2. Apply accumulated delta to basins in second half according to basin tree cursors
- [ ] think how to make water spilling realistic (proximity based?)
