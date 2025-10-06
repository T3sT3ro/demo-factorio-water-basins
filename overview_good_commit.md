# Project Overview — Last Good Commit (d6ed173)
**Commit:** `d6ed1736489150aeea3c2531f84db3b41b1de3c4`  
**Branch:** `origin/master`  
**Title:** Extract renderer constants  
**Date:** Before AI-generated refactors

---

## Executive Summary

This is a **well-organized, functional JavaScript application** using ES6 modules with Deno for server-side tooling. The project implements a Factorio-inspired water basin simulation with hierarchical basin detection, real-time water flow, pump systems, and interactive terrain editing.

**Key Characteristics:**
- **Language:** Pure JavaScript (ES6 modules)
- **Runtime:** Deno (server) + Browser (client)
- **Architecture:** Modular but pragmatic, event-driven where needed
- **Code Style:** Straightforward, imperative, easy to follow
- **Performance:** Optimized with layered canvas rendering
- **File Count:** 10 module files + 1 main app + HTML/CSS

---

## Project Structure

```
/
├── server.js          # Deno HTTP server with static file serving
├── deno.json          # Deno configuration and tasks
├── index.html         # Main HTML (271 lines, includes modal dialogs)
├── app.js             # Main application controller (739 lines)
├── styles.css         # Application styles (891 lines, uses Open Props)
├── modules/
│   ├── config.js      # Configuration constants and canvas setup
│   ├── game.js        # GameState class - main game logic (821 lines)
│   ├── renderer.js    # Renderer and LegendRenderer classes (667 lines)
│   ├── basins.js      # BasinManager class for basin computation (500 lines)
│   ├── pumps.js       # PumpManager and ReservoirManager (230 lines)
│   ├── noise.js       # Noise generation for terrain (671 lines)
│   ├── labels.js      # BasinLabelManager for label positioning (250 lines)
│   ├── ui.js          # UI controls and settings (668 lines)
│   ├── constants.js   # UI constants and styling configuration (186 lines)
│   └── saveload.js    # SaveLoadManager for import/export (367 lines)
```

---

## Core Files Analysis

### **1. server.js** (25 lines)
**Purpose:** Minimal Deno HTTP server for development

**Functionality:**
- Uses `@std/http` for file serving
- Supports `--debug` flag for Chrome DevTools debugging
- Serves static files from project root
- Port 8000 by default

**Key Symbols:**
- `serveDir()` - imported from `@std/http/file-server`

---

### **2. deno.json** (24 lines)
**Purpose:** Deno configuration and task runner

**Tasks:**
- `dev` - Start development server
- `debug` - Start server with inspect flag
- `serve` - Production server
- `fmt` - Format code
- `lint` - Lint code
- `check` - Type check JavaScript files

**Dependencies:**
- `@std/http@^1.0.0` from JSR

**Code Style:**
- Uses tabs: false
- Line width: 100
- Indent: 2 spaces
- Semi-colons: true

---

### **3. index.html** (271 lines)
**Purpose:** Application UI structure and layout

**Structure:**
- **Head:** Cache busting via timestamp, Open Props CSS
- **Body:**
  - Canvas container with `<canvas id="canvas">`
  - Control panels:
    - `#topControls` - Actions and noise controls
    - `#bottomControls` - Legend, labels, insights
    - `#debugContainer` - Basins and pumps debug views
  - Modals:
    - `#loadModal` - Load from browser storage or JSON
    - `#exportModal` - Export/save with encoding options

**Key Elements:**
- **Buttons:** Tick, Randomize, Clear Pumps, Clear Water, Load, Export, Help
- **Noise Controls:** Type, frequency, octaves, persistence, lacunarity, gain, offset, warp strength/iterations
- **Label Toggles:** Show depth, pump IDs, basin IDs
- **Insights:** Zoom, brush size, tile info, basin info
- **Debug:** Basins list (with highlighting), Pumps list (with pipe system grouping)

**Cache Busting:**
- CSS: timestamp-based `?v=${cacheBuster}`
- JS modules: version-based `window.moduleVersion = "1.0.2"`

---

### **4. app.js** (739 lines)
**Purpose:** Main application controller - orchestrates all modules

**Class: `TilemapWaterPumpingApp`**

**Constructor Parameters:**
- `setupCanvas`, `CONFIG`, `GameState`, `Renderer`, `LegendRenderer`
- `UISettings`, `NoiseControlUI`, `DebugDisplay`
- `UI_CONSTANTS`, `SaveLoadManager`

**State:**
- `brushSize` - Current brush radius (1-16)
- `selectedDepth` - Current depth to paint (0-9)
- `brushOverlay` - Map of pending brush changes
- `isDrawing` - Whether user is currently painting
- `brushCenter` - Current tile under cursor
- `tickTimer` / `tickInterval` - For hold-to-tick functionality

**Key Methods:**

**Initialization:**
- `init()` - Setup canvas, game state, UI components
- `initialize()` - Setup event handlers, create legend, initial render

**Event Handling:**
- `setupEventHandlers()` - UI button handlers (tick, randomize, clear, load, export)
- `setupCanvasEventHandlers()` - Mouse events (paint, pan, zoom, pipette)
- `setupKeyboardEventHandlers()` - 0-9 for depth selection

**Brush System:**
- `setSelectedDepth(depth)` - Set selected depth and update legend
- `getBrushTiles(x, y)` - Calculate circular brush area
- `updateBrushOverlay(x, y)` - Add tiles to pending changes
- `commitBrushChanges()` - Apply all changes and recompute basins

**Game State:**
- `onNoiseSettingsChanged()` - Regenerate terrain, measure performance
- `onGameStateChanged()` - Called after load/import
- `getTileInfo(x, y)` - Get depth, basin ID, pump info at position

**UI Updates:**
- `updateInsightsDisplay(tileInfo)` - Update zoom, brush, tile, basin info
- `updateReservoirControls()` - Sync reservoir input field
- `updateDebugDisplays()` - Update basins and pumps displays
- `draw()` - Render using optimized layered approach

**Input Handling:**
- **Painting:** LMB drag to paint, SHIFT+wheel for brush size, ALT+wheel for depth
- **Pumps:** SHIFT+LMB/RMB to add outlet/inlet, SHIFT+CTRL+LMB to link
- **Water:** CTRL+LMB/RMB for flood fill/empty
- **Camera:** MMB drag to pan, wheel to zoom
- **Pipette:** ALT+RMB to pick depth

**Dependencies:**
- Imports all modules dynamically with cache busting
- Uses `Promise.all()` to wait for module loading
- Error handling for module loading failures

---

### **5. modules/config.js** (38 lines)
**Purpose:** Core configuration constants and canvas setup

**Exports:**

**`CONFIG` object:**
```javascript
{
  CHUNK_SIZE: 16,        // Tiles per chunk
  CHUNKS_X: 10,          // World width in chunks
  CHUNKS_Y: 10,          // World height in chunks
  TILE_SIZE: 6,          // Pixels per tile
  MAX_DEPTH: 9,          // Maximum water depth
  VOLUME_UNIT: 1,        // Volume per tile per level
  PUMP_RATE: 1,          // Volume pumped per tick
  WORLD_W: 160,          // Computed: CHUNKS_X * CHUNK_SIZE
  WORLD_H: 160           // Computed: CHUNKS_Y * CHUNK_SIZE
}
```

**`setupCanvas()` function:**
- Finds `<canvas id="canvas">`
- Sets dimensions: `WORLD_W * TILE_SIZE` × `WORLD_H * TILE_SIZE`
- Returns `{ canvas, ctx }` for 2D rendering

**Relationships:**
- Used by all modules for world dimensions
- Computed properties for derived values
- Single source of truth for game constants

---

### **6. modules/game.js** (821 lines)
**Purpose:** Main game state and logic coordination

**Class: `GameState`**

**Manages:**
- Terrain heights (2D array)
- Basin computation and tracking
- Pump and reservoir systems
- Water simulation (tick system)
- Save/load functionality

**Constructor:**
- Creates `HeightGenerator`, `BasinManager`, `ReservoirManager`, `PumpManager`
- Initializes tick counter
- Generates initial terrain with seed 0
- Computes initial basins

**Terrain Methods:**
- `randomizeHeights()` - Generate new random terrain
- `regenerateWithCurrentSettings()` - Regenerate with current noise settings
- `setDepthAt(x, y, depth)` - Set single tile (recomputes immediately)
- `setDepthAtBatch(x, y, depth)` - Set single tile (no recompute)
- `revalidateMap()` - Recompute basins after batch operations
- `increaseDepthAt(x, y)` / `decreaseDepthAt(x, y)` - Adjust depth
- `setToMinNeighborHeight(x, y)` - Set to minimum neighbor height

**Pump Methods:**
- `addPump(x, y, mode, linkToExisting)` - Add pump at position
- `linkPumpToReservoir(x, y)` - Select reservoir at position
- `clearPumps()` - Remove all pumps and reservoirs

**Water Methods:**
- `floodFill(x, y, fillWithWater)` - Fill/empty basin
- `clearAllWater()` - Remove all water
- `tick()` - Advance simulation (pumps transfer water)

**Reservoir Methods:**
- `setSelectedReservoir(id)` - Set active reservoir for new pumps
- `getSelectedReservoir()` - Get active reservoir

**Basin Methods:**
- `setHighlightedBasin(basinId)` - Highlight basin for visualization
- `getHighlightedBasin()` - Get highlighted basin

**Getters:**
- `getHeights()`, `getBasins()`, `getPumps()`, `getReservoirs()`
- `getPumpsByReservoir()`, `getTickCounter()`
- `getBasinManager()`, `getReservoirManager()`, `getPumpManager()`, `getHeightGenerator()`

**Save/Load:**
- `exportToJSON(options)` - Export with configurable encoding
- `importFromJSON(jsonString)` - Import and reconstruct state
- Compression utilities:
  - `compressHeights(encodingType)` - Multiple encoding strategies
  - `compressBasins(encodingType)` - Optimized basin storage
  - `decompressHeights(compressed)` / `decompressBasins(compressed)` - Reconstruction
- Encoding methods:
  - **Heights:** 2D array, RLE, Base64 packed
  - **Basins:** String rows, RLE basin IDs
- `calculateEncodingSizes()` - Compare encoding strategies
- `getBestEncodingOptions()` - Auto-select optimal encoding

**Performance:**
- Extensive performance marking and measurement
- Logs timing for terrain generation, basin computation
- Measures height generation vs basin computation separately

---

### **7. modules/basins.js** (500 lines)
**Purpose:** Basin detection and management using flood fill

**Class: `BasinManager`**

**Core Algorithm:**
1. **Flood Fill Phase:** Find connected regions of same depth
   - 8-directional connectivity (cardinal + diagonal)
   - Diagonal crossing check: blocks if both adjacent tiles are land
   - Groups tiles by depth level
2. **Outlet Detection:** Find connections to lower-depth basins
   - Check all 8 directions for lower depths
   - Build outlet relationships
3. **ID Assignment:** Generate hierarchical basin IDs
   - Format: `{depth}#{letter_sequence}` (e.g., "3#A", "3#B", "2#AA")
   - Letter sequence: A-Z, then AA, AB, etc.

**Data Structures:**
- `basins` - Map<basinId, Basin>
  - `tiles` - Set of "x,y" strings
  - `volume` - Current water volume
  - `level` - Current water level (0-9)
  - `height` - Terrain depth (1-9)
  - `outlets` - Array of outlet basin IDs
- `basinIdOf` - 2D array mapping tiles to basin IDs
- `highlightedBasin` - Currently highlighted basin for UI

**Key Methods:**

**Computation:**
- `computeBasins(heights)` - Main basin computation with performance profiling
  - Detailed timing: data clearing, flood fill, outlet detection, ID assignment
  - Logs flood fill count and basin count

**Queries:**
- `getBasinAt(x, y)` - Get basin object at position
- `getBasinIdAt(x, y)` - Get basin ID at position

**Water Management:**
- `floodFill(startX, startY, fillWithWater)` - Fill/empty basin
- `updateWaterLevels()` - Update levels and handle overflow
- `handleWaterOverflow()` - Cascade overflow to outlet basins
- `clearAllWater()` - Reset all volumes

**Highlighting:**
- `setHighlightedBasin(basinId)` - Set highlighted basin
- `getHighlightedBasin()` - Get highlighted basin

**Debug:**
- `getDebugInfo(heights)` - Generate connection graph and statistics
  - Returns: basin count, max depth, max degree, basin array, connections
  - Checks diagonal blocking for connection validity

**Helper:**
- `generateLetterSequence(index)` - A, B, ..., Z, AA, AB, ...
  - Base-26 encoding for basin naming

**Performance Characteristics:**
- Processes 160×160 grid (~25k tiles) in ~10-30ms
- Flood fill is the most expensive operation
- Efficient Set-based tile storage
- Optimized outlet detection with early exit

---

### **8. modules/pumps.js** (230 lines)
**Purpose:** Pump and reservoir (pipe system) management

**Class: `ReservoirManager`**

**Purpose:** Manages water storage reservoirs (pipe systems)

**State:**
- `reservoirs` - Map<id, Reservoir>
  - `volume` - Current water volume
- `selectedReservoirId` - Active reservoir for linking pumps

**Methods:**
- `createReservoir(id?)` - Create or ensure reservoir exists
  - Auto-generates next available ID if not provided
- `getReservoir(id)` - Get reservoir by ID
- `setSelectedReservoir(id)` / `getSelectedReservoir()` - Selection management
- `clearAll()` - Remove all reservoirs
- `clearAllWater()` - Reset all volumes
- `exists(id)` - Check existence
- `getAllReservoirs()` - Get all reservoirs
- `removeReservoir(id)` - Delete reservoir

---

**Class: `PumpManager`**

**Purpose:** Manages pumps and water transfer

**State:**
- `pumps` - Array of Pump objects
  - `x`, `y` - Position
  - `mode` - "inlet" or "outlet"
  - `reservoirId` - Connected reservoir
- References to `ReservoirManager` and `BasinManager`

**Methods:**

**Pump Management:**
- `addPumpAt(x, y, mode, linkToReservoir)` - Add pump
  - Links to selected reservoir if `linkToReservoir` is true
  - Otherwise creates new reservoir with selected ID
  - Falls back to reservoir 1 if no selection
- `linkPumpToReservoir(x, y)` - Select reservoir at pump position
  - Finds exact match or nearby pump (1-tile radius)
- `clearAll()` - Remove all pumps and reservoirs
- `removePump(index)` - Remove by array index
- `removePumpAt(x, y)` - Remove by position

**Simulation:**
- `tick()` - Execute one simulation step
  - Inlet pumps: transfer water from basin to reservoir
  - Outlet pumps: transfer water from reservoir to basin
  - Respects `CONFIG.PUMP_RATE` limit
  - Updates basin water levels after all transfers

**Queries:**
- `getAllPumps()` - Get pump array
- `getPumpsByReservoir()` - Group pumps by reservoir ID
  - Returns Map<reservoirId, Pump[]> with indices

**Design Notes:**
- Pumps can share reservoirs (pipe system concept)
- Water transfer is rate-limited
- Basin manager handles overflow cascade
- Input field is source of truth for selected reservoir

---

### **9. modules/noise.js** (671 lines)
**Purpose:** Advanced procedural terrain generation

**Noise Functions:**

**`noise2D(x, y)`** - Classic Perlin noise
- Uses 256-entry permutation table (Perlin's improved noise)
- Fade function: `t³(t(t×6 - 15) + 10)`
- Linear interpolation and gradient calculation

**`simplex2D(x, y)`** - Simplex noise (better quality)
- Skewing for simplex grid
- 3-corner contribution
- Returns range ~[-1, 1]

**`ridgedNoise2D(x, y)`** - For terrain ridges
- Formula: `1 - abs(noise2D(x, y))`

**`billowyNoise2D(x, y)`** - For clouds/billows
- Formula: `abs(noise2D(x, y))`

**`warpedNoise2D(...)`** - Recursive domain warping
- Inspired by Book of Shaders
- Formula: `fbm(p + fbm(p + fbm(p)))`
- Configurable iterations and strength
- Creates complex, organic patterns

---

**Class: `NoiseSettings`**

**Purpose:** Persistent noise configuration

**Settings:**
- `baseFreq` - Base frequency (0.02 default)
- `octaves` - Number of octaves (3 default)
- `persistence` - Amplitude decay per octave (0.5 default)
- `lacunarity` - Frequency increase per octave (2.0 default)
- `offset` - Height offset (0.3 default)
- `gain` - Amplitude multiplier (1.0 default)
- `noiseType` - "perlin", "simplex", "ridged", or "billowy"
- `warpStrength` - Domain warp strength (0.0 default)
- `warpIterations` - Recursive warp iterations (1 default)
- `octaveSettings` - Per-octave frequency/amplitude overrides

**Methods:**
- `loadSettings()` - Load from localStorage
- `saveSettings()` - Save to localStorage
- `updateUI()` - Sync UI controls with settings

**Storage:**
- Persists settings across sessions
- Stores per-octave custom settings

---

**Class: `HeightGenerator`**

**Purpose:** Generate terrain height maps

**Constructor:**
- Takes world dimensions and max depth
- Creates `NoiseSettings` instance

**Method: `generate(seedOffset)`**
- Creates 2D height array
- Selects noise function based on `noiseType`
- **Warping modes:**
  - If `warpStrength > 0` and `warpIterations > 1`: recursive warping
  - Otherwise: standard octaves with optional simple warp
- **Octave generation:**
  - Uses custom octave settings if available
  - Otherwise calculates from persistence/lacunarity
  - Accumulates amplitude-weighted noise
  - Normalizes by total amplitude
- **Finalization:**
  - Applies offset: `(value + offset) * 0.5 + 0.5`
  - Clamps to [0, 1]
  - Scales to [0, MAX_DEPTH]
- **Performance:**
  - Logs noise type, pixel counts, timing
  - Separate timing for selection vs calculation

**Output:**
- 2D array of integers [0, 9] representing terrain depth

---

### **10. modules/labels.js** (250 lines)
**Purpose:** Deterministic basin label positioning with collision avoidance

**Class: `BasinLabelManager`**

**Purpose:** Generate and draw basin labels with connecting lines

**State:**
- `basinLabels` - Map<basinId, LabelData>
  - `anchorX`, `anchorY` - Position on basin
  - `labelX`, `labelY` - Label text position
  - `text` - Basin ID string
  - `lineLength` - Distance from anchor
- `lastBasinHash` - Cache key to avoid recalculation

**Algorithm:**

1. **Hash Check:** Only regenerate if basins or pumps changed
2. **Anchor Selection:** Find representative tile (closest to centroid)
3. **Initial Placement:** Start labels at anchor points
4. **Force-Directed Repulsion:** (20 iterations)
   - Repel from other basin labels (minDistance: 25px)
   - Repel from other label line endpoints (minDistance: 20px)
   - Repel from pump labels (minDistance: 30px)
   - Keep within canvas bounds (margin: 15px)
5. **Line Length Adjustment:** Maintain distance (30-60px) from anchor

**Methods:**

**`generateBasinLabels(basins, heights, pumps)`**
- Creates label positions with collision avoidance
- Uses pump positions as obstacles
- Deterministic hashing prevents unnecessary recalculation

**`draw(ctx, basins, heights, pumps, zoom)`**
- Draws connecting lines (gray, dashed if needed)
- Draws anchor dots (semi-transparent gray)
- Draws label text (semi-transparent, no outline)
- Text color adapts to background depth
- Simplified font scaling for extreme zoom

**Helpers:**
- `createBasinHash(basins, pumps)` - Generate cache key
- `hashString(str)` - Simple hash function for determinism

**Design:**
- Avoids overlap without complex physics
- Fast convergence (20 iterations)
- Maintains visual clarity
- Minimal performance impact

---

### **11. modules/ui.js** (668 lines)
**Purpose:** UI controls, settings persistence, and debug displays

**Class: `UISettings`**

**Purpose:** Manage label visibility settings

**Settings:**
- `showDepthLabels` - Show depth numbers on tiles
- `showPumpLabels` - Show pump IDs
- `showBasinLabels` - Show basin IDs with lines

**Methods:**
- `loadSettings()` - Load from localStorage (defaults: true, true, false)
- `saveSettings()` - Save to localStorage
- `updateUI()` - Sync checkboxes
- `toggleDepthLabels()` / `togglePumpLabels()` / `toggleBasinLabels()` - Toggle and save

---

**Class: `NoiseControlUI`**

**Purpose:** Setup and manage noise control UI

**Constructor:**
- Takes `noiseSettings` and `onSettingsChange` callback

**Methods:**

**`setupMainNoiseControls()`**
- Sets up event listeners for:
  - Noise type selection
  - Base frequency, octaves, persistence, lacunarity
  - Offset, gain
  - Warp strength and iterations
- Updates octave settings when base parameters change
- Calls `createOctaveControls()` when octave count changes

**`createOctaveControls()`**
- Generates per-octave controls dynamically
- Each octave has:
  - Frequency slider
  - Amplitude slider
- Saves per-octave settings on change
- Triggers `onSettingsChange()` callback

**`updateUI()`**
- Syncs all controls with current noise settings
- Called after loading saved game

---

**Class: `DebugDisplay`**

**Purpose:** Interactive debug displays for basins and reservoirs

**Constructor:**
- Takes `basinManager`, `gameState`, and callbacks object
  - Callbacks: `removePump`, `removeReservoir`, `updateControls`, `updateDisplays`, `updateDebugDisplays`, `clearSelection`, `draw`

**Methods:**

**`updateBasinsDisplay()`**
- Builds hierarchical basin data structure based on outlets
- Creates reverse mapping: child → parents
- Renders tree with indentation
- Shows: basin ID, tile count, volume, max capacity, water level
- Interactive: click to highlight, hover to preview

**`updateReservoirsDisplay(reservoirs, pumps, selectedReservoirId)`**
- Groups pumps by reservoir (pipe system)
- Shows reservoir volume and pumps
- Each pump shows: mode, position, reservoir ID
- Provides remove buttons for pumps and systems

**`updateTickCounter(tickCount)`**
- Updates tick counter display

**Helpers:**
- `createRemoveButton(text, onClick)` - Styled button generator
- `createInteractiveBasinDisplay(hierarchy)` - Render basin tree
- `createInteractiveReservoirDisplay(...)` - Render pump systems
- `updateBasinHighlights()` - Sync highlighting CSS classes
- `setBasinHighlightChangeCallback(callback)` - Register highlight callback

**Interactive Features:**
- Click basin to toggle highlight
- Hover basin to preview highlight
- Remove individual pumps
- Remove entire pipe systems (removes all linked pumps)
- Hierarchical basin tree visualization

---

### **12. modules/renderer.js** (667 lines)
**Purpose:** Optimized layered canvas rendering

**Class: `Renderer`**

**Purpose:** Manage multi-layer rendering with dirty tracking

**Architecture:**
- **5 off-screen canvases:**
  1. **Terrain** - Static depth tiles
  2. **Infrastructure** - Chunk boundaries, pump connections
  3. **Water** - Dynamic water overlay
  4. **Interactive** - Pumps, labels (changes frequently)
  5. **Highlight** - Basin highlighting

**Constructor:**
- Creates camera object (x, y, zoom, minZoom, maxZoom)
- Initializes off-screen canvases
- Sets all layers as dirty
- Creates `BasinLabelManager`

**Camera System:**
- `applyCameraTransform()` - Apply zoom and pan to context
- `resetTransform()` - Reset to identity matrix
- `screenToWorld(x, y)` - Convert screen to world coordinates
- `pan(deltaX, deltaY)` - Move camera
- `zoomAt(x, y, factor)` - Zoom at point
- All camera changes mark all layers dirty

**Dirty Tracking:**
- `markLayerDirty(layer)` - Flag layer for redraw
- Public methods for external changes:
  - `onTerrainChanged()`, `onWaterChanged()`, `onPumpsChanged()`
  - `onLabelsToggled()`, `onBasinHighlightChanged()`
- Layers only redraw if dirty

**Layer Rendering:**

**`renderTerrainLayer(heights)`**
- Draws all tiles with `getHeightColor(depth)`
- Color scheme: brown for surface, gray gradient for water

**`renderInfrastructureLayer(pumpsByReservoir, showChunkBoundaries)`**
- Chunk grid (red, semi-transparent)
- Pump connection lines (red, dashed)
- Line width scales with zoom

**`renderWaterLayer(basins)`**
- Semi-transparent blue overlay
- Alpha increases with water level
- Only draws if `level > height`

**`renderInteractiveLayer(pumps, selectedReservoirId, heights, basins, labelSettings)`**
- Pumps: colored circles (red=inlet, green=outlet)
- Selected reservoir pumps highlighted with yellow ring
- Labels: depth, basin, pump (conditional rendering)
- Basin labels use `BasinLabelManager`

**`renderHighlightLayer(basinManager, highlightedBasin)`**
- Yellow fill with orange outline for highlighted basin
- Only renders if basin is selected

**Main Render Method:**

**`renderOptimized(gameState, uiSettings, ...)`**
- Renders dirty layers to off-screen canvases
- Composites all layers to main canvas
- Applies camera transform for final UI overlays
- Draws brush preview and overlay

**Utilities:**
- `getScaledFontSize(baseSize)` - Scale fonts for readability
- `getScaledLineWidth(baseWidth)` - Scale lines for visibility
- `clear()` / `clearLayer(ctx)` - Clear canvases
- `drawBrushOverlay(overlayMap, selectedDepth)` - Preview pending changes
- `drawBrushPreview(x, y, size)` - Show brush cursor

**Performance:**
- Only redraws changed layers
- Camera movements require all layer redraws
- Terrain and infrastructure rarely change
- Water and interactive change frequently
- Compositing is very fast

---

**Class: `LegendRenderer`**

**Purpose:** Static legend display for depth colors

**State:**
- `selectedDepth` - Current selected depth

**Methods:**
- `createLegend()` - Generate legend HTML
  - Creates colored boxes for depths 0-9
  - Uses `getHeightColor(depth)` for colors
- `updateSelectedDepth(depth)` - Highlight selected depth
  - Adds/removes CSS class for styling

**Helper:**
- `getHeightColor(depth)` - Get color for depth
  - 0: Brown (surface)
  - 1-9: Gray gradient (lighter = shallower)

---

### **13. modules/constants.js** (186 lines)
**Purpose:** Centralized UI constants and configuration

**Export: `UI_CONSTANTS`**

**Categories:**

**`LEGEND_SELECTION`** - Legend styling
- Border color, width, radius, padding
- CSS class name

**`BRUSH`** - Brush tool settings
- Min/max size (1-16)
- Preview dash pattern, color
- Overlay fill, line width

**`PERFORMANCE`** - Performance logging
- Log enabled flag
- Indent levels for console output

**`RENDERING`** - All rendering configuration

**`RENDERING.CAMERA`**
- Min/max/initial zoom
- Initial position

**`RENDERING.COLORS`**
- **Terrain:** Surface brown, depth gray gradient
- **Water:** RGB base color, alpha range
- **Infrastructure:** Chunk boundaries, pump connections
- **Pumps:** Inlet/outlet colors, highlight, label colors
- **Basin Highlight:** Fill and stroke colors
- **Labels:** Text/stroke colors for light/dark backgrounds

**`RENDERING.SCALING`**
- **Font:** Base size, min/max, scale thresholds
- **Line Width:** Base width, min width, scale threshold, multipliers
- **Pump:** Radius multiplier, highlight radius, label offset

**`RENDERING.PATTERNS`**
- **Pump Connections:** Dash patterns for different zoom levels

**`CONTROLS`** - Control mappings for help display
- Painting, pumps, terrain, navigation
- Key combinations and descriptions

**`BUTTONS`** - Button styling
- Remove button colors, padding, fonts

---

**Export: `CSS_CLASSES`**
- Standardized class names for DOM manipulation
- Legend, control items, control boxes

**Benefits:**
- Single source of truth for all magic numbers
- Easy to adjust rendering behavior
- No hardcoded values scattered across code
- Consistent styling and behavior

---

### **14. modules/saveload.js** (367 lines)
**Purpose:** Save/load UI and game state persistence

**Class: `SaveLoadManager`**

**Purpose:** Manage save/load modals and operations

**Constructor:**
- Takes `gameState` and `onStateChanged` callback
- Calls `setupEventHandlers()`

**Event Handlers:**
- Load button → `showLoadModal()`
- Export button → `showExportModal()`
- Help button → `showHelpModal()`
- Load from text, file, browser storage
- Save to browser, copy JSON, download JSON
- Encoding selection changes

**Modal Management:**

**`showLoadModal()`**
- Populates saved maps list
- Shows load options:
  - Load from browser storage
  - Upload JSON file
  - Paste JSON text

**`showExportModal()`**
- Sets optimal encoding defaults
- Updates export data
- Shows export options:
  - Save to browser storage
  - Copy JSON to clipboard
  - Download JSON file

**Load Operations:**

**`loadFromBrowser(saveKey)`**
- Retrieves save from localStorage
- Imports game state
- Calls `onStateChanged()` callback

**`loadFromFile(event)`**
- Reads uploaded file
- Parses and imports JSON
- Error handling and user feedback

**`loadFromText()`**
- Reads JSON from textarea
- Imports game state

**Save Operations:**

**`saveToBrowser()`**
- Prompts for save name
- Exports game state as JSON
- Stores in localStorage with timestamp

**Export Operations:**

**`copyJsonToClipboard()`**
- Copies JSON to clipboard
- Fallback for older browsers

**`downloadJson()`**
- Creates blob from JSON
- Triggers download with dated filename

**Encoding Management:**

**`setupOptimalDefaults()`**
- Calculates best encoding options
- Sets dropdown defaults

**`updateExportData()`**
- Gets selected encodings
- Exports game state with options
- Updates size information
- Displays JSON in textarea

**`updateSizeInfo(heightEncoding, basinEncoding)`**
- Calculates compressed sizes
- Shows human-readable sizes (B, KB, MB)
- Updates display elements

**UI Helpers:**

**`populateSavedMapsList()`**
- Lists all saved maps from localStorage
- Shows name, timestamp, load/delete buttons

**`getSavedMaps()`**
- Scans localStorage for map saves
- Sorts by timestamp (newest first)

**`deleteFromBrowser(saveKey)`**
- Confirms deletion
- Removes from localStorage
- Refreshes list

**Utilities:**
- `formatBytes(bytes)` - Human-readable size
- `escapeHtml(text)` - Prevent XSS in generated HTML

**Global Access:**
- Registered as `globalThis.saveLoadManager`
- Allows modal HTML onclick handlers

---

## Module Relationships and Dependencies

### **Dependency Graph:**

```
app.js (Main Controller)
├── config.js (CONFIG, setupCanvas)
├── game.js (GameState)
│   ├── noise.js (HeightGenerator, NoiseSettings)
│   ├── basins.js (BasinManager)
│   └── pumps.js (PumpManager, ReservoirManager)
├── renderer.js (Renderer, LegendRenderer)
│   ├── labels.js (BasinLabelManager)
│   └── constants.js (UI_CONSTANTS, CSS_CLASSES)
├── ui.js (UISettings, NoiseControlUI, DebugDisplay)
└── saveload.js (SaveLoadManager)
```

### **Communication Patterns:**

**Callbacks:**
- `onSettingsChange()` - NoiseControlUI → app.js
- `onStateChanged()` - SaveLoadManager → app.js
- Various callbacks - app.js → DebugDisplay

**Direct Method Calls:**
- app.js calls all module public methods
- Modules don't call each other directly
- Clear hierarchical structure

**Shared State:**
- GameState holds all game data
- Renderer reads from GameState
- UI components update GameState through app.js

**Performance Tracking:**
- Extensive performance marks and measures
- Logged to console with indentation
- Helps identify bottlenecks

---

## Key Design Patterns

### **1. Modular ES6 Architecture**
- Each module has clear responsibility
- Exports only necessary symbols
- No circular dependencies
- Clean import/export syntax

### **2. Layered Rendering**
- 5 separate off-screen canvases
- Dirty tracking per layer
- Composite final image
- Minimal redraw when possible

### **3. Flood Fill Algorithm**
- Basin detection with 8-directional connectivity
- Diagonal crossing check for land barriers
- O(n) performance for n tiles
- Efficient Set-based storage

### **4. Force-Directed Label Placement**
- Iterative repulsion algorithm
- Avoids overlaps with other labels and pumps
- Maintains readable line lengths
- Converges quickly (20 iterations)

### **5. Event-Driven UI**
- Mouse and keyboard event handlers
- Immediate visual feedback
- Brush preview and overlay
- Interactive debug displays

### **6. Persistence Layer**
- LocalStorage for settings and saves
- Multiple compression strategies
- Versioned save format
- Import/export with error handling

### **7. Performance Optimization**
- Batch operations (brush painting)
- Dirty tracking (rendering)
- Performance marking (profiling)
- Minimal recomputation

---

## Performance Characteristics

**Typical Timings (160×160 grid, 3 octaves):**

```
Noise Settings Change - Total Time: ~50-100ms
  └─ Terrain Regeneration: ~30-60ms
     └─ Height Generation: ~20-40ms
     └─ Basin Computation: ~10-30ms
        └─ Basin Data Clearing: <1ms
        └─ Basin Flood Fill: ~5-20ms
        └─ Basin Outlet Detection: ~2-5ms
        └─ Basin ID Assignment: ~2-5ms
  └─ Rendering: ~5-15ms
  └─ Debug Display Update: ~1-5ms
```

**Rendering:**
- Initial terrain render: ~10-20ms
- Layered render with no changes: <1ms (compositing only)
- Full redraw: ~15-30ms
- Camera movement: ~15-30ms (all layers dirty)

**Basin Computation:**
- ~500 flood fills typical
- ~50-200 basins generated
- Efficient Set operations
- Dominated by flood fill time

---

## Strengths

### **1. Architecture**
- ✅ Clear separation of concerns
- ✅ Modular and maintainable
- ✅ No over-engineering
- ✅ Easy to understand

### **2. Performance**
- ✅ Optimized rendering with dirty tracking
- ✅ Efficient basin algorithm
- ✅ Batch operations where possible
- ✅ Performance profiling built-in

### **3. User Experience**
- ✅ Responsive controls
- ✅ Visual feedback (brush preview, highlighting)
- ✅ Comprehensive debug displays
- ✅ Save/load functionality

### **4. Code Quality**
- ✅ Consistent naming conventions
- ✅ Well-commented code
- ✅ Error handling
- ✅ No obvious bugs

### **5. Features**
- ✅ Interactive terrain editing
- ✅ Hierarchical basin detection
- ✅ Water simulation
- ✅ Pump systems with reservoirs
- ✅ Multiple compression strategies
- ✅ Persistent settings

---

## Potential Improvements

### **1. Type Safety**
- No static typing (pure JavaScript)
- Could benefit from JSDoc annotations
- Consider TypeScript for larger refactors

### **2. Testing**
- No unit tests
- Manual testing required
- Could add test suite for basin algorithm

### **3. Error Handling**
- Some error handling present
- Could be more comprehensive
- Better user feedback for errors

### **4. Code Organization**
- Some large files (game.js: 821 lines)
- Could split into smaller modules
- Some duplication in UI code

### **5. Documentation**
- Code is reasonably self-documenting
- Could add more inline comments
- API documentation would be helpful

---

## Critical Dependencies

**Runtime:**
- Deno 2.4.5+ (server)
- Modern browser with ES6 modules
- Canvas 2D API
- LocalStorage API

**External:**
- Open Props CSS (CDN)
- No other external dependencies

**Build:**
- None (pure ES6 modules)
- No build step required
- No bundler needed

---

## Conclusion

This is a **well-designed, functional application** with:
- ✅ Clear architecture
- ✅ Good performance
- ✅ Rich features
- ✅ Maintainable code
- ✅ No unnecessary complexity

**The code is production-ready and demonstrates solid engineering practices without over-engineering.**

**Total Lines:** ~5,500 lines (JavaScript + HTML + CSS)

**Key Achievement:** Achieves complex functionality (basin detection, water simulation, interactive editing) with simple, understandable code.

---

*This document serves as a complete reference for understanding and recreating the project at commit d6ed173.*
