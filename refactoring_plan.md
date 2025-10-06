# Refactoring Plan: Simplification and Restoration

**Date:** October 6, 2025  
**Target:** Restore functionality while preserving lessons learned

---

## Executive Summary

**Current State:** Non-functional AI-generated refactoring with 31% more code and 4x more files.

**Goal:** Return to working state while optionally incorporating modern tooling in a **minimal, incremental** way.

**Recommendation Priority:**

1. **IMMEDIATE (Day 1):** Revert to last good commit
2. **SHORT-TERM (Weeks 1-2):** Stabilize and add JSDoc
3. **MEDIUM-TERM (Month 1):** Optional: Incremental TypeScript migration
4. **LONG-TERM (Month 2+):** Optional: Modern tooling (Vite/Deno 2)

---

## Phase 0: Emergency Revert (Day 1)

### **Task 0.1: Full Revert to Working State**

**Priority:** 🔴 **CRITICAL**

```bash
# Save current state (just in case)
git branch backup/failed-refactor-2025-10-06

# Revert to last good commit
git reset --hard d6ed1736489150aeea3c2531f84db3b41b1de3c4

# Verify functionality
deno task dev
# Open http://localhost:8000
# Test terrain generation, basin computation, pumps, save/load
```

**Acceptance Criteria:**
- ✅ Application loads without errors
- ✅ Terrain generation works
- ✅ Basin computation works
- ✅ Pumps can be placed and tick
- ✅ Save/load functionality works
- ✅ Performance matches baseline (~16ms render cycle)

**Time Estimate:** 15 minutes

---

## Phase 1: Stabilization & Documentation (Weeks 1-2)

### **Task 1.1: Add JSDoc Type Annotations**

**Priority:** 🟡 **MEDIUM**

**Benefits:**
- ✅ Type safety via static analysis (VSCode intellisense)
- ✅ Better IDE autocomplete
- ✅ No build step required
- ✅ No runtime overhead
- ✅ Gradual adoption

**Approach:**
```javascript
// Before
export class GameState {
  constructor() {
    this.terrainData = [];
  }
  
  regenerateTerrain() {
    // ...
  }
}

// After
/**
 * @typedef {Object} TerrainData
 * @property {number[][]} heights
 * @property {number[][]} moisture
 */

/**
 * Main game state managing terrain, basins, pumps, and simulation.
 */
export class GameState {
  /**
   * @param {Object} config
   */
  constructor(config = {}) {
    /** @type {TerrainData} */
    this.terrainData = { heights: [], moisture: [] };
  }
  
  /**
   * Regenerates terrain using current noise settings.
   * @returns {void}
   */
  regenerateTerrain() {
    // ...
  }
}
```

**Files to Annotate (Priority Order):**

1. **modules/game.js** (821 lines) - Core game logic
   - GameState class
   - Basin, Pump, Reservoir interfaces
   - Save/load methods
   - Time: 4-6 hours

2. **modules/renderer.js** (667 lines) - Rendering
   - Renderer class
   - Layer methods
   - Camera interface
   - Time: 3-4 hours

3. **modules/basins.js** (500 lines) - Basin algorithm
   - BasinManager class
   - Flood fill method
   - Outlet detection
   - Time: 2-3 hours

4. **modules/pumps.js** (230 lines) - Pump systems
   - PumpManager, ReservoirManager
   - Tick simulation
   - Time: 1-2 hours

5. **modules/noise.js** (671 lines) - Noise generation
   - Noise functions
   - Settings interface
   - HeightGenerator
   - Time: 3-4 hours

6. **modules/ui.js** (668 lines) - UI controls
   - UISettings, NoiseControlUI, DebugDisplay
   - Time: 3-4 hours

7. **modules/labels.js** (250 lines) - Label positioning
   - BasinLabelManager
   - Time: 1-2 hours

8. **app.js** (739 lines) - Main app
   - TilemapWaterPumpingApp
   - Time: 3-4 hours

9. **modules/saveload.js** (367 lines) - Persistence
   - SaveLoadManager
   - Time: 2-3 hours

10. **modules/config.js, constants.js** (~224 lines) - Config
    - Time: 1 hour

**Total Time Estimate:** 24-35 hours (1-2 weeks part-time)

**Tooling:**
```bash
# Enable type checking in VSCode
# Create jsconfig.json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "target": "ES2020",
    "module": "ES2020"
  },
  "exclude": ["node_modules"]
}
```

**Acceptance Criteria:**
- ✅ All public methods have JSDoc annotations
- ✅ All class properties have `@type` annotations
- ✅ Complex types have `@typedef` definitions
- ✅ VSCode shows type hints
- ✅ No type errors in VSCode
- ✅ Application still works (no functional changes)

---

### **Task 1.2: Add Missing Unit Tests**

**Priority:** 🟡 **MEDIUM**

**Current State:** No tests exist.

**Target:** Core algorithms only (not UI).

**Test Framework:**
```bash
# Use Deno's built-in test runner
deno test
```

**Tests to Write:**

1. **modules/basins.test.js** - Basin algorithm
   ```javascript
   import { BasinManager } from './basins.js';
   
   Deno.test("Basin detection: single basin", () => {
     const heights = [
       [1, 1, 1],
       [1, 2, 1],
       [1, 1, 1]
     ];
     const manager = new BasinManager();
     manager.computeBasins(heights);
     assertEquals(manager.basins.size, 1);
   });
   
   Deno.test("Basin detection: two separate basins", () => {
     // ...
   });
   
   Deno.test("Outlet detection: basin with outlet", () => {
     // ...
   });
   ```

2. **modules/noise.test.js** - Noise generation
   ```javascript
   import { noise2D, simplex2D } from './noise.js';
   
   Deno.test("Perlin noise: deterministic with seed", () => {
     const val1 = noise2D(10, 20, 42);
     const val2 = noise2D(10, 20, 42);
     assertEquals(val1, val2);
   });
   
   Deno.test("Simplex noise: range [-1, 1]", () => {
     for (let i = 0; i < 100; i++) {
       const val = simplex2D(i, i, Date.now());
       assert(val >= -1 && val <= 1);
     }
   });
   ```

3. **modules/pumps.test.js** - Pump simulation
   ```javascript
   import { PumpManager } from './pumps.js';
   
   Deno.test("Pump tick: transfers water correctly", () => {
     // ...
   });
   ```

**Time Estimate:** 8-12 hours

**Acceptance Criteria:**
- ✅ Basin algorithm tests pass
- ✅ Noise generation tests pass
- ✅ Pump simulation tests pass
- ✅ CI could be set up (optional)

---

### **Task 1.3: Improve Documentation**

**Priority:** 🟢 **LOW**

**Files to Update:**

1. **README.md** - Add:
   - Architecture diagram
   - Module overview
   - Development workflow
   - Performance characteristics
   - Testing instructions

2. **ARCHITECTURE.md** (new) - Document:
   - Module responsibilities
   - Data flow
   - Rendering pipeline
   - Basin algorithm details
   - Save/load format

3. **CONTRIBUTING.md** (new) - Guidelines:
   - Code style
   - How to add features
   - Testing requirements

**Time Estimate:** 4-6 hours

---

## Phase 2: Optional TypeScript Migration (Month 1)

**⚠️ DECISION POINT:** Only proceed if JSDoc proves insufficient.

### **Task 2.1: Evaluate JSDoc Results**

**Questions to Answer:**
1. Does JSDoc provide sufficient type safety?
2. Are there frequent type-related bugs?
3. Is the team comfortable with JSDoc?
4. Is TypeScript complexity justified?

**If NO to TypeScript:**
- ✅ Stop here, JSDoc is enough
- ✅ No build step
- ✅ Fast development
- ✅ Simple deployment

**If YES to TypeScript:**
- ⚠️ Proceed with incremental migration
- ⚠️ Keep it minimal
- ⚠️ No architectural changes

---

### **Task 2.2: Setup TypeScript (Minimal)**

**Priority:** 🟡 **MEDIUM** (if proceeding)

**Goal:** TypeScript compilation only, no other changes.

**Steps:**

1. **Create tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ES2020",
       "moduleResolution": "bundler",
       "strict": true,
       "noEmit": true,
       "skipLibCheck": true,
       "allowJs": true,
       "checkJs": true
     },
     "include": ["**/*.ts", "**/*.js"],
     "exclude": ["node_modules"]
   }
   ```

2. **Update deno.json:**
   ```json
   {
     "tasks": {
       "dev": "deno run --allow-net --allow-read server.js",
       "typecheck": "deno check app.ts"
     },
     "compilerOptions": {
       "lib": ["dom", "dom.iterable", "esnext"],
       "types": ["@types/dom"]
     }
   }
   ```

3. **No build step yet** - Use Deno's native TypeScript support

**Time Estimate:** 2 hours

---

### **Task 2.3: Incremental File Conversion**

**Priority:** 🟡 **MEDIUM** (if proceeding)

**Strategy:** One file at a time, test after each.

**Conversion Order:**

1. **modules/config.ts** (38 lines) - Simplest
   - Convert interfaces
   - Time: 30 minutes

2. **modules/constants.ts** (186 lines) - Simple
   - Convert constants
   - Time: 1 hour

3. **modules/basins.ts** (500 lines) - Core algorithm
   - Port BasinManager
   - Time: 4-6 hours

4. **modules/pumps.ts** (230 lines) - Core logic
   - Port PumpManager, ReservoirManager
   - Time: 2-3 hours

5. **modules/noise.ts** (671 lines) - Complex
   - Port noise functions
   - Time: 4-6 hours

6. **modules/labels.ts** (250 lines) - Moderate
   - Port BasinLabelManager
   - Time: 2-3 hours

7. **modules/renderer.ts** (667 lines) - Complex
   - Port Renderer
   - Time: 4-6 hours

8. **modules/ui.ts** (668 lines) - UI logic
   - Port UI classes
   - Time: 4-6 hours

9. **modules/game.ts** (821 lines) - Core, complex
   - Port GameState
   - Port save/load
   - Time: 6-8 hours

10. **modules/saveload.ts** (367 lines)
    - Port SaveLoadManager
    - Time: 3-4 hours

11. **app.ts** (739 lines) - Main app
    - Port TilemapWaterPumpingApp
    - Time: 4-6 hours

**Conversion Guidelines:**

1. **Keep structure identical:**
   ```javascript
   // Before (JS)
   export class BasinManager {
     constructor() {
       this.basins = new Map();
     }
   }
   
   // After (TS)
   export class BasinManager {
     private basins: Map<string, Basin>;
     
     constructor() {
       this.basins = new Map();
     }
   }
   ```

2. **No architectural changes**
3. **No new abstractions**
4. **Test after each file**

**Total Time Estimate:** 35-50 hours (1-2 months part-time)

**Acceptance Criteria per File:**
- ✅ TypeScript compiles without errors
- ✅ Application still works
- ✅ Tests pass (if added)
- ✅ No functional changes

---

## Phase 3: Optional Modern Tooling (Month 2+)

**⚠️ DECISION POINT:** Only if team wants bundling/optimization.

### **Task 3.1: Evaluate Need for Bundling**

**Questions:**
1. Is application load time a problem?
2. Do users complain about performance?
3. Is development speed satisfactory?
4. Is deployment complexity acceptable?

**If NO to bundling:**
- ✅ Stop here, native ES modules are fine
- ✅ Deno server works great
- ✅ No build complexity

**If YES to bundling:**
- ⚠️ Add Vite (minimal config)
- ⚠️ Keep build simple

---

### **Task 3.2: Add Vite (Minimal Config)**

**Priority:** 🟢 **LOW** (if proceeding)

**Goal:** Bundling only, no other changes.

**Steps:**

1. **Install Vite:**
   ```bash
   deno install --allow-scripts npm:vite@^5.0.0
   ```

2. **Create minimal vite.config.ts:**
   ```typescript
   import { defineConfig } from 'vite';
   
   export default defineConfig({
     root: '.',
     build: {
       outDir: 'dist',
       rollupOptions: {
         input: 'index.html'
       }
     },
     server: {
       port: 8000
     }
   });
   ```

3. **Update deno.json:**
   ```json
   {
     "tasks": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "typecheck": "deno check app.ts"
     }
   }
   ```

4. **Update index.html imports:**
   ```html
   <!-- Before -->
   <script type="module" src="./app.js"></script>
   
   <!-- After -->
   <script type="module" src="./app.ts"></script>
   ```

**Time Estimate:** 3-4 hours

**Acceptance Criteria:**
- ✅ `deno task dev` starts dev server
- ✅ `deno task build` creates production bundle
- ✅ Application works in both modes
- ✅ Build is fast (<10s)

---

## Anti-Patterns to Avoid

### **❌ DO NOT Add EventBus**

**Why Not:**
- Single-threaded application
- Direct method calls are simpler
- Callbacks work fine
- EventBus adds debugging complexity

**Instead:**
- Use direct method calls
- Use callbacks for UI → App communication
- Keep data flow explicit

---

### **❌ DO NOT Add Coordinators**

**Why Not:**
- Coordinators don't coordinate anything
- Just add indirection
- Original flat structure is clearer

**Instead:**
- Keep initialization in App constructor
- Keep rendering in Renderer class
- Keep logic in GameState

---

### **❌ DO NOT Split Modules Excessively**

**Why Not:**
- renderer.js (667 lines) was perfect
- basins.js (500 lines) was perfect
- Cohesion > arbitrary file count

**Instead:**
- Keep related logic together
- Split only if >1000 lines AND multiple responsibilities
- Prefer inline documentation

---

### **❌ DO NOT Use Manual Dependency Injection**

**Why Not:**
- No DI container = painful wiring
- Constructor params explode
- No benefit over imports

**Instead:**
- Use ES6 imports
- Create objects where needed
- Pass only essential data

---

### **❌ DO NOT Add "Domain" Layer**

**Why Not:**
- Data structures are simple
- Logic and data belong together
- Separation adds navigation overhead

**Instead:**
- Keep models with their logic
- Use JSDoc for interfaces
- Keep it simple

---

## Simplification Principles

### **1. Favor Cohesion Over Separation**

**Good:**
```javascript
// modules/renderer.js
export class Renderer {
  renderOptimized() {
    this.renderTerrainLayer();
    this.renderWaterLayer();
    this.renderPumpLayer();
    this.composite();
  }
  
  renderTerrainLayer() { /* ... */ }
  renderWaterLayer() { /* ... */ }
  renderPumpLayer() { /* ... */ }
  composite() { /* ... */ }
}
```

**Bad:**
```typescript
// 8 files
Renderer.ts
RenderManager.ts
LayerRenderer.ts
TerrainLayerRenderer.ts
WaterLayerRenderer.ts
PumpLayerRenderer.ts
RenderUIManager.ts
ColorManager.ts
```

---

### **2. Favor Directness Over Indirection**

**Good:**
```javascript
onNoiseChange() {
  this.gameState.regenerateTerrain();
  this.renderer.onTerrainChanged();
  this.draw();
}
```

**Bad:**
```typescript
onNoiseChange() {
  this.eventBus.emit('noise.changed');
  // ... somewhere else
  eventBus.on('noise.changed', () => {
    this.coordinator.handleNoiseChange();
    // ... another file
  });
}
```

---

### **3. Favor Simplicity Over "Best Practices"**

**Good:**
```javascript
const game = new GameState();
const renderer = new Renderer(canvas, ctx);
```

**Bad:**
```typescript
const game = container.resolve<GameState>(GameState);
const renderer = container.resolve<Renderer>(Renderer);
```

---

### **4. Favor Working Over Perfect**

**Priority:**
1. ✅ Does it work?
2. ✅ Is it fast?
3. ✅ Can I debug it?
4. ⚠️ Is it "clean"?

---

## Migration Timeline (Conservative)

### **Week 1: Emergency + Planning**
- Day 1: Revert to d6ed173
- Days 2-5: Add JSDoc to core modules

### **Weeks 2-3: JSDoc + Tests**
- Complete JSDoc annotations
- Add tests for core algorithms
- Update documentation

### **Week 4: Evaluation**
- Assess JSDoc sufficiency
- Decide on TypeScript migration
- If NO: Stop here ✅
- If YES: Plan migration

### **Months 2-3: Optional TypeScript**
- Convert 1-2 files per week
- Test thoroughly after each
- No architectural changes

### **Month 4: Optional Tooling**
- Evaluate bundling need
- Add Vite if necessary
- Keep config minimal

---

## Success Metrics

### **Phase 1 Success (JSDoc):**
- ✅ Application works (same as d6ed173)
- ✅ All public APIs have JSDoc types
- ✅ VSCode shows type hints
- ✅ No type errors
- ✅ Tests pass
- ✅ Development speed maintained

### **Phase 2 Success (TypeScript, Optional):**
- ✅ All files converted
- ✅ TypeScript compiles without errors
- ✅ Application works identically
- ✅ Tests pass
- ✅ Type errors caught at compile time
- ✅ No performance regression

### **Phase 3 Success (Vite, Optional):**
- ✅ Build time <10s
- ✅ Bundle size reasonable (<500KB)
- ✅ Load time improved
- ✅ Development workflow not slower
- ✅ Deployment simple

---

## Decision Tree

```
START: Current non-functional state
    ↓
[Q1] Revert to d6ed173?
    → YES (RECOMMENDED) ✅
    ↓
[Q2] Add type safety?
    → JSDoc (RECOMMENDED) ✅
    → TypeScript (Optional) ⚠️
    ↓
[Q3] Is JSDoc sufficient?
    → YES: Stop here ✅
    → NO: Proceed to TypeScript ⚠️
    ↓
[Q4] Migrate to TypeScript?
    → YES: Incremental, 1 file at a time ⚠️
    → NO: Stop here ✅
    ↓
[Q5] Need bundling?
    → NO: Stop here ✅
    → YES: Add Vite (minimal) ⚠️
    ↓
END: Working application with modern tooling
```

---

## Specific Refactoring Tasks (If Salvaging Current State)

**⚠️ NOT RECOMMENDED** - But if you must:

### **Task A: Remove EventBus**

1. Find all `eventBus.emit()` calls
2. Replace with direct method calls
3. Remove EventBus entirely
4. Time: 4-8 hours

### **Task B: Remove Coordinators**

1. Move initialization logic to App constructor
2. Move rendering logic to Renderer
3. Delete coordinator files
4. Time: 2-4 hours

### **Task C: Merge Rendering Files**

1. Merge 8 rendering files back into Renderer.ts
2. Preserve layered canvas pattern
3. Time: 4-6 hours

### **Task D: Complete TypeScript Migration**

1. Finish incomplete ports (basins, noise, pumps, labels)
2. Port remaining .js files
3. Time: 20-30 hours

### **Task E: Port Save/Load Logic**

1. Port 300+ lines of compression from game.js
2. Update GameState.ts
3. Time: 4-6 hours

### **Task F: Fix app.ts**

1. Reduce constructor params (11 → 5)
2. Uncomment broken code
3. Fix import paths
4. Time: 3-5 hours

### **Task G: Test Everything**

1. Verify terrain generation
2. Verify basin computation
3. Verify pump simulation
4. Verify save/load
5. Time: 4-8 hours

**Total Time to Salvage:** 40-70 hours

**Comparison:**
- Revert + JSDoc: 24-35 hours ✅
- Salvage current: 40-70 hours ❌

**Verdict:** Salvaging not worth the effort.

---

## Recommended Path Forward

### **Phase 0: Immediate (Today)**
```bash
git reset --hard d6ed1736489150aeea3c2531f84db3b41b1de3c4
```

### **Phase 1: This Month**
- Add JSDoc type annotations
- Add core algorithm tests
- Improve documentation

### **Phase 2: Evaluate**
- Is JSDoc sufficient? 
  - **YES:** ✅ Stop here
  - **NO:** Plan TypeScript migration

### **Phase 3: Only If Needed**
- Incremental TypeScript (1 file/week)
- Test thoroughly
- No architectural changes

### **Phase 4: Only If Needed**
- Add Vite for bundling
- Keep config minimal
- Preserve simplicity

---

## Final Recommendations

### **Absolute Priorities:**

1. **✅ REVERT NOW** - Get back to working state
2. **✅ ADD JSDOC** - Type safety without complexity
3. **✅ ADD TESTS** - Prevent future breakage
4. **⚠️ MAYBE TYPESCRIPT** - Only if JSDoc insufficient
5. **⚠️ MAYBE VITE** - Only if bundling needed

### **Never Do:**

1. ❌ EventBus for single-threaded app
2. ❌ Coordinators without clear orchestration
3. ❌ Excessive file splitting
4. ❌ Manual DI without container
5. ❌ Architectural changes without tests

### **Always Remember:**

> **Working > Perfect**  
> **Simple > Complex**  
> **Direct > Indirect**  
> **Cohesive > Separated**  
> **Tested > Clever**

---

## Appendix: JSDoc Example (Full File)

```javascript
/**
 * @typedef {Object} Basin
 * @property {Set<string>} tiles - Set of tile coordinates "x,y"
 * @property {number} volume - Current water volume
 * @property {number} level - Water level height
 * @property {number} height - Basin floor height
 * @property {Set<string>} outlets - Outlet tile coordinates
 */

/**
 * @typedef {Object} Config
 * @property {number} WORLD_W - World width in tiles
 * @property {number} WORLD_H - World height in tiles
 */

/**
 * Manages basin detection and hierarchy using flood fill algorithm.
 * 
 * Basins are connected regions of tiles at the same height, detected
 * via 8-directional flood fill. Each basin tracks its tiles, water
 * volume, outlets to lower basins, and hierarchical ID.
 */
export class BasinManager {
  /**
   * @param {Config} config - World configuration
   */
  constructor(config) {
    /** @type {Map<string, Basin>} */
    this.basins = new Map();
    
    /** @type {number[][]} */
    this.basinIdOf = [];
    
    /** @type {number} */
    this.nextBasinId = 1;
    
    this.config = config;
  }

  /**
   * Computes all basins for the given height map.
   * 
   * Algorithm:
   * 1. Flood fill to find connected regions
   * 2. Detect outlets to lower basins
   * 3. Assign hierarchical IDs based on depth
   * 
   * @param {number[][]} heights - 2D height map
   * @returns {void}
   */
  computeBasins(heights) {
    // Clear existing data
    this.basins.clear();
    
    // ... implementation
  }

  /**
   * Performs 8-directional flood fill from a starting point.
   * 
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number[][]} heights - Height map
   * @param {boolean[][]} visited - Visited tiles tracker
   * @returns {Set<string>} Set of tile coordinates in basin
   * @private
   */
  floodFill(startX, startY, heights, visited) {
    // ... implementation
  }

  /**
   * Generates hierarchical basin ID (e.g., "A", "A.1", "A.1.a").
   * 
   * @param {number} depth - Basin depth level
   * @param {number} index - Basin index at this level
   * @returns {string} Hierarchical ID
   * @private
   */
  generateBasinId(depth, index) {
    // ... implementation
  }
}
```

---

*Refactoring plan completed October 6, 2025*  
*Recommendation: REVERT IMMEDIATELY, then proceed with minimal, incremental improvements*
