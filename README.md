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

# Start server with debugging enabled  
deno task debug

# Format code
deno task fmt

# Lint code
deno task lint

# Type check
deno task check
```

The development server runs on http://localhost:8000

### Available Tasks

| Task    | Command           | Description                                 |
| ------- | ----------------- | ------------------------------------------- |
| `dev`   | `deno task dev`   | Start development server                    |
| `debug` | `deno task debug` | Start server with Chrome DevTools debugging |
| `serve` | `deno task serve` | Production server                           |
| `fmt`   | `deno task fmt`   | Format code with Deno formatter             |
| `lint`  | `deno task lint`  | Lint code with Deno linter                  |
| `check` | `deno task check` | Type check JavaScript files                 |

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

- [ ] optimize brush tools to render tile only once when it's added to the set; do not clear on every frame
- [ ] Implement an O(n^2) basin flood filling algorithm
- [ ] Use `<template>` for UI components instead of innerHTML
- [ ] Add debug visualization for basin calculation algorithm. Use generators to return up-to-date state

Got it 👍 — here’s the revised version of the **GitHub Copilot CLI–optimized prompt**, reflecting that **a single Markdown document should be progressively built** as each file is analyzed (not one per file).
It’s formatted for direct use with:

```bash
gh copilot explain --task "..."
```
