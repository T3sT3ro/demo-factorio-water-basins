# Refactoring Plan: Simplification and Restoration

**Date:** October 6, 2025\
**Target:** Restore functionality while preserving lessons learned

---

## Executive Summary

**Current State:** Non-functional AI-generated refactoring with good tooling choices (Vite+TypeScript+HTML templates) but broken architecture.

**Goal:** Preserve modern tooling benefits while fixing the broken architecture and completing the migration properly.

**User Preferences (Confirmed):**

- \u2705 **KEEP Vite** - Hot reload, automatic cache busting, fast dev server
- \u2705 **KEEP TypeScript** - Type safety and better IDE support
- \u2705 **KEEP HTML Templates** - Declarative UI over imperative DOM
- \u2705 **KEEP .vscode/launch.json** - Debugging configuration

**Strategy:** Use good commit (d6ed173) as reference for LOGIC, but keep current TOOLING setup.

**Recommendation Priority:**

1. **IMMEDIATE (Week 1):** Clean rewrite preserving tooling + logic
2. **SHORT-TERM (Week 2):** Complete TypeScript migration properly
3. **MEDIUM-TERM (Week 3):** Test thoroughly and optimize
4. **LONG-TERM (Week 4+):** Add tests and documentation

---

## Phase 0: Preparation (Day 1)

### **Task 0.1: Save Current Tooling Config**

**Priority:** \ud83d\udd34 **CRITICAL**

```bash
# Save current good configuration files
git show HEAD:.vscode/launch.json > .vscode/launch.json.new
git show HEAD:vite.config.ts > vite.config.ts.new
git show HEAD:index.html > index.html.new  # For templates
git show HEAD:deno.json > deno.json.new
```

### **Task 0.2: Create Clean Branch**

```bash
# Create branch for clean rewrite
git checkout -b refactor/clean-rewrite-with-vite

# Cherry-pick the tooling we want to keep
# (We'll do manual selective merge)
```

**Time Estimate:** 30 minutes

---

## Phase 1: Clean Rewrite with Modern Tooling (Week 1)

### **Task 1.1: Setup Vite + TypeScript Environment**

**Priority:** \ud83d\udd34 **CRITICAL**

**Goal:** Clean Vite + TypeScript setup with proper configuration

**Files to create/configure:**

1. **vite.config.ts** (Keep current, verify):
   ```typescript
   import { defineConfig } from "vite";

   export default defineConfig({
     root: ".",
     build: {
       outDir: "dist",
       rollupOptions: {
         input: "index.html",
       },
     },
     server: {
       port: 5173,
     },
   });
   ```

2. **tsconfig.json** (Create if missing):
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "moduleResolution": "bundler",
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "skipLibCheck": true,
       "allowSyntheticDefaultImports": true,
       "esModuleInterop": true
     },
     "include": ["**/*.ts"],
     "exclude": ["node_modules", "dist"]
   }
   ```

3. **deno.json** (Keep Vite tasks):
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

4. **Keep .vscode/launch.json** (Current config is good)

**Time Estimate:** 1 hour

---

### **Task 1.2: Port Core Files to TypeScript (Simple \u2192 Complex)**

**Priority:** \ud83d\udd34 **CRITICAL**

**Strategy:** Port one file at a time from good commit, using HTML templates where applicable.

**Order (by dependency):**

1. **modules/config.ts** (38 lines) - No dependencies
   ```typescript
   export interface WorldConfig {
     WORLD_W: number;
     WORLD_H: number;
     TILE_SIZE: number;
   }

   export const CONFIG: WorldConfig = {
     WORLD_W: 160,
     WORLD_H: 160,
     TILE_SIZE: 4,
   };
   ```
   Time: 30 min

2. **modules/constants.ts** (186 lines) - UI constants
   - Port directly with proper types
   - Time: 1 hour

3. **modules/noise/index.ts** - Split into modules
   - NoiseSettings.ts - interfaces
   - NoiseAlgorithms.ts - noise functions
   - DomainWarping.ts - warping logic
   - Time: 3-4 hours

4. **modules/basins.ts** (500 lines) - Basin algorithm
   - Keep algorithm IDENTICAL to good commit
   - Add proper types
   - No architectural changes
   - Time: 4-6 hours

5. **modules/pumps.ts** (230 lines) - Pump systems
   - PumpManager, ReservoirManager
   - Keep logic identical
   - Time: 2-3 hours

6. **modules/labels.ts** (250 lines) - Label positioning
   - Port BasinLabelManager
   - Time: 2-3 hours

7. **modules/rendering/** - Split logically
   - Renderer.ts - main renderer (keep layered canvas)
   - ColorManager.ts - color utilities
   - LayerRenderer.ts - base class (optional, keep simple)
   - Time: 6-8 hours

8. **modules/ui/** - With HTML templates
   - UISettings.ts - settings management
   - NoiseControlUI.ts - noise controls
   - BasinDebugDisplay.ts - basin display (use template)
   - ReservoirDebugDisplay.ts - pump display (use template)
   - Legend.ts - legend rendering (use template)
   - Time: 6-8 hours

9. **modules/domain/GameState.ts** (821 lines) - Core logic
   - Port complete GameState with all save/load
   - NO splitting, keep cohesive
   - Time: 8-10 hours

10. **modules/saves/SaveLoadManager.ts** (367 lines)
    - Port SaveLoadManager
    - Keep compression logic
    - Time: 3-4 hours

11. **app.ts** (should be ~500-600 lines when done right)
    - Main application controller
    - Direct method calls (NO EventBus)
    - Simple initialization
    - Time: 6-8 hours

**Total Time Estimate:** 40-55 hours (1 week full-time, 2-3 weeks part-time)

**Key Principles:**

1. \u2705 Keep logic IDENTICAL to good commit
2. \u2705 Add TypeScript types
3. \u2705 Use HTML templates for UI
4. \u274c NO EventBus
5. \u274c NO Coordinators
6. \u274c NO excessive abstraction

**Acceptance Criteria per File:**

- \u2705 TypeScript compiles without errors
- \u2705 Logic identical to good commit
- \u2705 Application works
- \u2705 Types are strict (no `any`)

---

### **Task 1.3: Create HTML Templates**

**Priority:** \ud83d\udfe1 **MEDIUM**

**Goal:** Create reusable HTML templates for all UI components

**Templates needed in index.html:**

1. **Basin Debug Display Template**
   ```html
   <template id=\"basin-template\">
     <details class=\"basin-details\" open>\n       <summary class=\"basin-summary\" data-basin-id=\"{{id}}\">{{text}}</summary>
     </details>
   </template>
   ```

2. **Reservoir/Pump Template**
   ```html
   <template id=\"reservoir-template\">
     <div class=\"pipe-system-container\">
       <div class=\"pipe-system-header\">
         <span><strong>Pipe System #{{reservoirId}}:</strong> {{volume}} units</span>
       </div>
       <div class=\"pump-item\">
         <span>{{colorPrefix}} P{{reservoirId}}.{{index}} ({{x}},{{y}}) {{mode}}</span>
       </div>
     </div>
   </template>
   ```

3. **Octave Control Template**
   ```html
   <template id=\"octave-control-template\">
     <div class=\"octave-controls\">
       <h5>Octave {{octaveNumber}}</h5>
       <label>Frequency: <input type=\"range\" min=\"0.001\" max=\"0.5\" step=\"0.001\">
         <span class=\"value-display\"></span>
       </label>
       <label>Amplitude: <input type=\"range\" min=\"0\" max=\"2\" step=\"0.01\">
         <span class=\"value-display\"></span>
       </label>
     </div>
   </template>
   ```

4. **Legend Item Template**
   ```html
   <template id=\"legend-item-template\">
     <div class=\"legend-item\">
       <div class=\"legend-color\"></div>
       <span></span>
     </div>
   </template>
   ```

5. **Download Link Template** (for save/load)
   ```html
   <template id=\"download-link-template\">
     <a></a>
   </template>
   ```

6. **Error Message Template**
   ```html
   <template id=\"error-message-template\">
     <div class=\"error-overlay\">
       Failed to start application. Check console for details.
     </div>
   </template>
   ```

**TypeScript usage:**

```typescript
// Type-safe template usage
class TemplateManager {
  static getTemplate(id: string): HTMLTemplateElement {
    const template = document.getElementById(id) as HTMLTemplateElement;
    if (!template) throw new Error(`Template ${id} not found`);
    return template;
  }

  static instantiate(templateId: string): DocumentFragment {
    return this.getTemplate(templateId).content.cloneNode(true) as DocumentFragment;
  }
}

// Usage
const fragment = TemplateManager.instantiate("basin-template");
const item = fragment.querySelector(".basin-details") as HTMLDetailsElement;
item.dataset.basinId = basin.id;
// ... populate and append
```

**Time Estimate:** 2-3 hours

**Acceptance Criteria:**

- \u2705 All UI components use templates
- \u2705 No `createElement()` for complex UI
- \u2705 Templates are reusable
- \u2705 Type-safe template access

---

---

## Phase 2: Testing & Verification (Week 2)

### **Task 2.1: Manual Testing Checklist**

**Priority:** \ud83d\udd34 **CRITICAL**

**Test all features match good commit:**

1. **Terrain Generation**
   - \u2610 Randomize button generates terrain
   - \u2610 Different noise types work (Perlin, Simplex, Ridged, Billowy)
   - \u2610 All noise parameters affect output
   - \u2610 Octave controls work
   - \u2610 Domain warping works

2. **Terrain Painting**
   - \u2610 LMB drag paints terrain
   - \u2610 0-9 keys select depth
   - \u2610 ALT + wheel changes depth
   - \u2610 ALT + RMB pipette works
   - \u2610 SHIFT + wheel changes brush size
   - \u2610 Brush preview shows correctly

3. **Basin Computation**
   - \u2610 Basins detected correctly
   - \u2610 Basin IDs match pattern (depth#letter)
   - \u2610 Outlets detected correctly
   - \u2610 Basin hierarchy correct
   - \u2610 Basin labels display correctly

4. **Pumps & Water**
   - \u2610 SHIFT + LMB adds outlet pump
   - \u2610 SHIFT + RMB adds inlet pump
   - \u2610 SHIFT + CTRL + LMB links to pipe system
   - \u2610 CTRL + LMB flood fill works
   - \u2610 CTRL + RMB flood empty works
   - \u2610 Tick button advances simulation
   - \u2610 Water transfers correctly
   - \u2610 Overflow cascade works

5. **UI & Debug**
   - \u2610 Legend shows correct colors
   - \u2610 Basin debug display works
   - \u2610 Reservoir debug display works
   - \u2610 Tile info updates on hover
   - \u2610 Basin info shows correctly
   - \u2610 HTML templates render correctly

6. **Save/Load**
   - \u2610 Save to browser storage works
   - \u2610 Load from browser storage works
   - \u2610 Export to JSON works
   - \u2610 Load from JSON works
   - \u2610 All encoding options work
   - \u2610 Compression works correctly

7. **Navigation**
   - \u2610 MMB drag pans
   - \u2610 Mouse wheel zooms
   - \u2610 Zoom level displays correctly
   - \u2610 Camera transforms correctly

8. **Performance**
   - \u2610 Render cycle < 20ms
   - \u2610 Basin computation < 50ms
   - \u2610 Terrain generation < 100ms
   - \u2610 No memory leaks
   - \u2610 HMR works instantly

**Time Estimate:** 4-6 hours

---

### **Task 2.2: Add Unit Tests (Optional but Recommended)**

**Priority:** \ud83d\udfe1 **MEDIUM**

**Use Vitest (comes with Vite):**

```bash
# Install vitest
deno install npm:vitest

# Add to deno.json
{
  "tasks": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

**Key tests:**

1. **Basin Algorithm** (basins.test.ts)
   ```typescript
   import { describe, expect, it } from "vitest";
   import { BasinManager } from "./basins";

   describe("BasinManager", () => {
     it("detects single basin", () => {
       const heights = [
         [1, 1, 1],
         [1, 2, 1],
         [1, 1, 1],
       ];
       const manager = new BasinManager();
       manager.computeBasins(heights);
       expect(manager.basins.size).toBe(1);
     });
   });
   ```

2. **Noise Generation** (noise.test.ts)
   ```typescript
   it("is deterministic with seed", () => {
     const val1 = noise2D(10, 20, 42);
     const val2 = noise2D(10, 20, 42);
     expect(val1).toBe(val2);
   });
   ```

3. **Pump Simulation** (pumps.test.ts)
   ```typescript
   it("transfers water correctly", () => {
     // Test pump tick logic
   });
   ```

**Time Estimate:** 8-12 hours

---

## Phase 3: Documentation & Polish (Week 3)

### **Task 3.1: Update Documentation**

**Priority:** \ud83d\udfe2 **LOW**

**Files to Update:**

1. **README.md** - Add:
   - Quick start with Vite
   - Development workflow
   - Architecture overview
   - Module responsibilities
   - Performance characteristics

2. **ARCHITECTURE.md** (new) - Document:
   - Basin algorithm details
   - Rendering pipeline (layered canvas)
   - Water simulation tick logic
   - Save/load compression
   - HTML template system

3. **CONTRIBUTING.md** (new) - Guidelines:
   - TypeScript style guide
   - How to add features
   - Testing requirements
   - Template usage patterns

**Time Estimate:** 4-6 hours

---

### **Task 3.2: Performance Optimization (If Needed)**

**Priority:** \ud83d\udfe2 **LOW**

**Only if performance regressed:**

1. **Profile with Performance API**
   ```typescript
   performance.mark("basin-start");
   computeBasins(heights);
   performance.mark("basin-end");
   performance.measure("basin-computation", "basin-start", "basin-end");
   ```

2. **Check for common issues:**
   - Unnecessary re-renders
   - Memory leaks in event listeners
   - Inefficient template cloning
   - Missing dirty tracking

3. **Optimize hot paths:**
   - Basin flood fill
   - Rendering loops
   - Noise generation

**Target:**

- Render cycle: < 16ms (60 fps)
- Basin computation: < 50ms
- Terrain generation: < 100ms

**Time Estimate:** 4-8 hours (if needed)

---

## Phase 4: Production Ready (Week 4+)

### **Task 4.1: Build Optimization**

**Priority:** \ud83d\udfe1 **MEDIUM**

**Optimize Vite build:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: "es2020",
    minify: "terser",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": ["tinyqueue"],
        },
      },
    },
  },
});
```

**Verify:**

- \u2705 Bundle size reasonable (< 500KB)
- \u2705 Load time fast (< 2s)
- \u2705 Source maps work for debugging

**Time Estimate:** 2-3 hours

---

### **Task 4.2: Deployment Setup**

**Priority:** \ud83d\udfe2 **LOW**

**GitHub Pages deployment:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
      - run: deno task build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Time Estimate:** 1-2 hours

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

  renderTerrainLayer() {/* ... */}
  renderWaterLayer() {/* ... */}
  renderPumpLayer() {/* ... */}
  composite() {/* ... */}
}
```

**Bad:**

```typescript
// 8 files
Renderer.ts;
RenderManager.ts;
LayerRenderer.ts;
TerrainLayerRenderer.ts;
WaterLayerRenderer.ts;
PumpLayerRenderer.ts;
RenderUIManager.ts;
ColorManager.ts;
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

## Implementation Timeline

### **Week 1: Core Migration (40-55 hours)**

- Day 1: Setup (config files, environment)
- Days 2-3: Port core modules (config, constants, noise)
- Days 4-5: Port basin algorithm and pumps
- Days 6-7: Port rendering and UI with templates

### **Week 2: Complete Migration + Testing (30-40 hours)**

- Days 1-2: Port GameState and SaveLoad
- Days 3-4: Port main app.ts
- Day 5: Manual testing (full checklist)
- Days 6-7: Bug fixes and polish

### **Week 3: Documentation + Polish (15-25 hours)**

- Days 1-2: Write documentation
- Days 3-4: Performance profiling (if needed)
- Day 5-7: Unit tests (optional)

### **Week 4: Production Ready (10-15 hours)**

- Days 1-2: Build optimization
- Days 3-4: Deployment setup
- Day 5-7: Final testing and release

**Total Time:** 95-135 hours (3-4 weeks full-time, 6-8 weeks part-time)

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

## Practical Implementation Guide

### **Starting Point: Mixed Approach**

Instead of full revert or salvage, use this hybrid strategy:

1. **Keep from current state:**
   - \u2705 vite.config.ts
   - \u2705 .vscode/launch.json
   - \u2705 deno.json (Vite tasks)
   - \u2705 index.html (templates section)
   - \u2705 styles/all.css
   - \u2705 tsconfig.json (if good)

2. **Take logic from good commit (d6ed173):**
   - \u2705 All algorithm implementations
   - \u2705 GameState structure
   - \u2705 Renderer architecture (layered canvas)
   - \u2705 Direct method calls
   - \u2705 Simple initialization

3. **Delete from current state:**
   - \u274c modules/coordinators/
   - \u274c modules/core/EventBus.ts
   - \u274c Excessive abstractions
   - \u274c Incomplete ports

### **File-by-File Strategy**

For each module, follow this pattern:

```bash
# 1. Open good commit file for reference
git show d6ed173:./modules/basins.js > /tmp/basins.js.reference

# 2. Create new TypeScript file
# 3. Copy logic from reference
# 4. Add TypeScript types
# 5. Use HTML templates where applicable
# 6. Test immediately
```

### **Example: Porting basins.js \u2192 basins.ts**

````typescript
// Step 1: Keep the exact same algorithm
// Step 2: Add proper types
// Step 3: No architectural changes

interface Basin {
  tiles: Set<string>;
  volume: number;
  level: number;
  height: number;
  outlets: Set<string>;
}

export class BasinManager {
  private basins: Map<string, Basin> = new Map();
  private basinIdOf: number[][] = [];
  
  // EXACT SAME logic as good commit
  computeBasins(heights: number[][]): void {
    // ... copy from good commit line by line
    // ... add types, no other changes
  }
  
  // EXACT SAME flood fill
  private floodFill(x: number, y: number, depth: number, 
                    heights: number[][], visited: boolean[][]): Set<string> {
    // ... exact copy
  }
}

---

## Recommended Path Forward

### **START HERE: Clean Rewrite (Recommended)**

```bash
# Day 1: Preparation
git checkout -b refactor/clean-vite-typescript

# Keep tooling config from current
cp vite.config.ts vite.config.ts.keep
cp .vscode/launch.json .vscode/launch.json.keep
cp deno.json deno.json.keep

# Reset to good commit for logic
git reset --hard d6ed173

# Restore tooling
mv vite.config.ts.keep vite.config.ts
mv .vscode/launch.json.keep .vscode/launch.json
mv deno.json.keep deno.json

# Update index.html to use templates from current branch
git show prototypes/basins:index.html > index.html.new
# Merge templates section manually

# Start migration
deno task dev
# Begin porting files one by one
````

### **Daily Workflow**

```bash
# Each day:
# 1. Pick next file from priority list
# 2. Reference good commit: git show d6ed173:./modules/FILE.js
# 3. Port to TypeScript with types
# 4. Use templates for UI
# 5. Test immediately: deno task dev
# 6. Commit: git commit -m "feat: port MODULE to TypeScript"
```

### **Week 1 Goals**

- \u2705 Environment setup complete
- \u2705 Core modules ported (config, constants, noise, basins, pumps)
- \u2705 Basic functionality working

### **Week 2 Goals**

- \u2705 Rendering with templates working
- \u2705 UI components ported
- \u2705 GameState and SaveLoad complete
- \u2705 Full application working

### **Week 3 Goals**

- \u2705 All manual tests pass
- \u2705 Documentation updated
- \u2705 Performance validated

### **Week 4 Goals**

- \u2705 Production build optimized
- \u2705 Deployment configured
- \u2705 Ready for use

---

## Final Recommendations

### **Absolute Priorities:**

1. **\u2705 USE VITE** - Hot reload, cache busting, modern dev experience
2. **\u2705 USE TYPESCRIPT** - Type safety and IDE support
3. **\u2705 USE HTML TEMPLATES** - Declarative UI over imperative
4. **\u2705 PORT LOGIC EXACTLY** - From good commit (d6ed173)
5. **\u274c REMOVE EVENTBUS** - Direct method calls only
6. **\u274c REMOVE COORDINATORS** - Unnecessary abstraction
7. **\u274c KEEP SIMPLE** - No excessive splitting

### **Architecture Rules:**

1. **3 Layers Maximum:**
   - App \u2192 GameState \u2192 Managers
   - NO additional coordination layers

2. **Direct Communication:**
   - Method calls > Events
   - Callbacks for UI \u2192 App only
   - No EventBus indirection

3. **File Size Guidelines:**
   - < 300 lines: Keep together
   - 300-700 lines: Consider splitting if multiple responsibilities
   - 700 lines: Only split if clear boundaries exist

4. **Module Responsibilities:**
   - Each module does ONE thing
   - Related logic stays together
   - No "utils" dumping ground

### **Always Remember:**

> **Working + Modern Tooling = Best of Both Worlds**\
> **Simple Architecture > Enterprise Patterns**\
> **Vite + TypeScript + Templates > Plain JS**\
> **Direct Calls > EventBus**\
> **Cohesive Modules > Scattered Logic**\
> **Test After Each Change**

---

## Appendix A: Template Usage Patterns

```typescript
// Good example of template usage
class BasinDebugDisplay {
  private template: HTMLTemplateElement;
  private container: HTMLElement;

  constructor(containerId: string) {
    this.template = document.getElementById("basin-template") as HTMLTemplateElement;
    this.container = document.getElementById(containerId) as HTMLElement;
  }

  update(basins: Map<string, Basin>): void {
    this.container.innerHTML = "";

    basins.forEach((basin, id) => {
      const fragment = this.template.content.cloneNode(true) as DocumentFragment;
      const details = fragment.querySelector(".basin-details") as HTMLDetailsElement;
      const summary = fragment.querySelector(".basin-summary") as HTMLElement;

      summary.dataset.basinId = id;
      summary.textContent = `Basin ${id}: ${basin.tiles.size} tiles, ${basin.volume} water`;

      this.container.appendChild(fragment);
    });
  }
}

// Usage in app.ts
const basinDebug = new BasinDebugDisplay("basinsText");
basinDebug.update(gameState.basins);
```

## Appendix B: Performance Targets

Based on good commit benchmarks:

| Operation          | Target  | Good Commit | Acceptable |
| ------------------ | ------- | ----------- | ---------- |
| Render cycle       | < 16ms  | ~10-16ms    | < 20ms     |
| Basin computation  | < 50ms  | ~10-30ms    | < 100ms    |
| Terrain generation | < 100ms | ~50-80ms    | < 200ms    |
| Save serialization | < 50ms  | ~20-40ms    | < 100ms    |
| HMR update         | < 50ms  | N/A         | < 100ms    |

## Appendix C: Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/FEATURE_NAME

# Regular commits
git add FILE
git commit -m "feat: description"  # or fix:, refactor:, docs:

# Test before push
deno task dev
# Manual testing

# Push and verify
git push origin feature/FEATURE_NAME

# Merge when complete
git checkout prototypes/basins
git merge --no-ff feature/FEATURE_NAME
```

---

_Refactoring plan completed October 6, 2025_\
_Strategy: Clean rewrite preserving Vite + TypeScript + Templates, using good commit logic_\
_Estimated time: 3-4 weeks full-time, 6-8 weeks part-time_
