I'll analyze the current codebase and create a comprehensive refactoring plan while preserving functionality and appearance. Let me start by examining the current structure and identifying areas for improvement. Now let me analyze the architecture and create a comprehensive refactoring plan: Based on my analysis of the codebase, I'll create a comprehensive refactoring plan. Let me first examine the current architecture more deeply: # **Comprehensive Refactoring Plan for Factorio Water Basins**

Based on my analysis of the current codebase, I'll propose a systematic refactoring approach that improves code quality while preserving functionality. Here's my detailed plan:

## **Current Architecture Analysis**

**Strengths:**
- ✅ Modular structure with clear separation of concerns
- ✅ Dependency injection pattern in main app controller
- ✅ Canvas-based layered rendering system
- ✅ Dynamic module loading with cache busting

**Issues Identified:**
- 🔴 **Monolithic app.js** (791 lines) - violates Single Responsibility Principle
- 🔴 **Mixed concerns** - event handling, game logic, rendering coordination in one class
- 🔴 **Hardcoded dependencies** - 10+ constructor parameters
- 🔴 **Inconsistent naming** - `DebugDisplay` vs actual basin analysis functionality
- 🔴 **Dead/unused code** - debug infrastructure remnants
- 🔴 **Magic numbers** and hardcoded values throughout the codebase

---

## **Phase 1: Foundation & Architecture (Moderate Difficulty)**

### **1.1: Create Application Core Structure**
**Difficulty:** Moderate | **Impact:** High

Create a clean application lifecycle management system:

```
src/
├── core/
│   ├── Application.js          # Main app orchestrator (SOLID)
│   ├── ModuleLoader.js         # Dynamic module loading
│   ├── EventBus.js            # Centralized event system
│   └── AppLifecycle.js        # Initialization & cleanup
├── ui/
│   ├── controllers/           # UI event controllers
│   ├── components/           # Reusable UI components
│   └── managers/            # UI state management
└── game/
    ├── simulation/          # Game logic
    ├── rendering/          # Rendering system
    └── data/              # Data management
```

### **1.2: Extract Event Handling System**
**Difficulty:** Easy | **Impact:** High

Remove 400+ lines of event handling from app.js into specialized controllers:
- `CanvasController.js` - mouse/keyboard canvas interactions
- `UIController.js` - button clicks, form controls
- `KeyboardController.js` - keyboard shortcuts

---

## **Phase 2: Module Decomposition (Easy to Moderate)**

### **2.1: Break Down TilemapWaterPumpingApp Class**
**Difficulty:** Moderate | **Impact:** High

Split the monolithic class into focused components:

```javascript
// Before: 791-line monolithic class
class TilemapWaterPumpingApp { /* everything */ }

// After: Focused, cohesive classes
class Application {
  constructor(moduleLoader, eventBus, lifecycle) { /* orchestration only */ }
}

class RenderingCoordinator {
  constructor(renderer, gameState) { /* rendering logic */ }
}

class InteractionManager {
  constructor(eventBus, gameState) { /* user interactions */ }
}
```

### **2.2: Create Proper Configuration Management**
**Difficulty:** Easy | **Impact:** Medium

Extract hardcoded values into configuration:

```javascript
// Extract from scattered locations:
const INTERACTION_CONFIG = {
  BRUSH: { MIN_SIZE: 1, MAX_SIZE: 10, DEFAULT_SIZE: 3 },
  ZOOM: { MIN: 0.25, MAX: 4.0, FACTOR: 0.1 },
  PERFORMANCE: { TICK_INTERVAL: 100, THROTTLE_MS: 16 }
};
```

## **CURRENT STATUS: Phase 3 COMPLETED ✅**

### **✅ Phase 3.1: Implement Dependency Injection Container - COMPLETED**
**Difficulty:** Advanced | **Impact:** High

✅ **IMPLEMENTED**: Proper DI container system created:

```javascript
// ✅ COMPLETED: Clean dependency resolution
const container = new DIContainer();
const moduleLoader = new ModuleLoader();
const container = await ContainerConfig.configure(moduleLoader);
const app = container.resolve('Application');

// ✅ REPLACED: 14+ constructor parameters chaos eliminated
```

**Files Created:**
- `modules/core/DIContainer.js` - Simple but powerful DI container
- `modules/core/ContainerConfig.js` - Dependency configuration
- `modules/core/ModuleLoader.js` - Dynamic module loading

### **✅ Phase 3.2: Event-Driven Architecture - COMPLETED**
**Difficulty:** Advanced | **Impact:** High

✅ **IMPLEMENTED**: Event-driven communication system:

```javascript
// ✅ COMPLETED: Loose coupling via events
eventBus.emit('terrain.changed', { terrain: newTerrain });
eventBus.emit('analysis.update', { basins: updatedBasins });
eventBus.emit('render.request');

// ✅ REPLACED: Direct method coupling eliminated
```

**Files Created:**
- `modules/core/EventBus.js` - Centralized event system
- `modules/core/Application.js` - Clean architecture main app

**Events Implemented:**
- `terrain.changed`, `water.changed`, `pumps.changed`
- `labels.toggled`, `analysis.update`, `reservoir.controls.update`
- `insights.update`, `render.request`, `depth.selected`
- `gamestate.changed`, `noise.settings.changed`

---

## **Phase 4: Code Quality & Performance (NEXT - Easy to Moderate)**

### **4.1: Remove Dead Code**
**Difficulty:** Easy | **Impact:** Medium

Systematic removal of:
- Flood-fill debug infrastructure (identified in previous analysis)
- Unused imports and constants
- Commented-out code blocks
- Redundant methods

### **4.2: Extract Constants and Magic Numbers**
**Difficulty:** Easy | **Impact:** Medium

```javascript
// Before: Magic numbers scattered
if (distance <= radius) { /* ... */ }
setTimeout(() => { /* ... */ }, 500);

// After: Named constants
if (distance <= BRUSH_CONFIG.CIRCULAR_RADIUS) { /* ... */ }
setTimeout(() => { /* ... */ }, INTERACTION_CONFIG.HOLD_DELAY_MS);
```

### **✅ Phase 4.3: Improve Method Naming & Clarity - COMPLETED**
**Difficulty:** Easy | **Impact:** Medium

✅ **COMPLETED**: Renamed misleading names:
- `DebugDisplay` → `BasinAnalysisPanel` ✅
- `updateDebugDisplays` → `updateBasinAnalysis` ✅ 
- Mouse button magic numbers → `INTERACTION_CONFIG.MOUSE.BUTTONS.*` ✅
- Coordinate magic numbers → `INTERACTION_CONFIG.COORDINATES.*` ✅

**Files Updated:**
- `modules/ui.js` - Renamed DebugDisplay class
- `modules/config/InteractionConfig.js` - Added mouse button and coordinate constants
- `modules/controllers/CanvasController.js` - Replaced magic numbers with constants
- All coordinators and app.js - Updated references

---

## **✅ PHASE 4 COMPLETED - Code Quality & Performance**

---

## **Implementation Strategy**

### **Incremental Approach:**
1. **Start small** - Extract one controller at a time
2. **Verify functionality** - Test after each extraction
3. **Preserve interfaces** - Maintain public API compatibility
4. **Document changes** - Clear migration notes
