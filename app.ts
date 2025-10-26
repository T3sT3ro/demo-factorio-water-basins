// Main application controller - orchestrates all modules

import { CONFIG, setupCanvas } from "./modules/config.ts";
import { GameState } from "./modules/GameState.ts";
import { Renderer } from "./modules/rendering/renderer.ts";
import { ControlsUI, DebugDisplay, NoiseControlUI, UISettings } from "./modules/ui/index.ts";
import type { DebugDisplayCallbacks } from "./modules/ui/index.ts";
import { UI_CONSTANTS } from "./modules/constants.ts";
import { SaveLoadManager } from "./modules/SaveLoadManager.ts";
import { BrushTool } from "./modules/BrushTool.ts";
import { UpdateCoordinator } from "./modules/UpdateCoordinator.ts";
import { InputController } from "./modules/InputController.ts";
import type { InputCallbacks } from "./modules/InputController.ts";

interface TileInfo {
  x: number;
  y: number;
  depth: number;
  basinId: string | null;
  pumpInfo: { mode: "inlet" | "outlet"; reservoirId: number } | null;
}

class TilemapWaterPumpingApp {
  // Canvas
  private canvas!: HTMLCanvasElement;
  private renderer!: Renderer;

  // Core state
  private gameState!: GameState;

  // UI components
  private uiSettings!: UISettings;
  private noiseControlUI!: NoiseControlUI;
  private debugDisplay!: DebugDisplay;
  private saveLoadManager!: SaveLoadManager;
  private controlsUI!: ControlsUI;

  // Controllers
  private brushTool!: BrushTool;
  private updateCoordinator!: UpdateCoordinator;
  private inputController!: InputController;

  // UI state
  private selectedDepth: number;

  // Tick control state
  private tickTimer: ReturnType<typeof setTimeout> | null;
  private tickInterval: ReturnType<typeof setInterval> | null;

  constructor() {
    this.selectedDepth = 0;
    this.tickTimer = null;
    this.tickInterval = null;
  }

  init(): void {
    console.log("App.init() called");

    // Setup canvas and rendering
    const { canvas, ctx } = setupCanvas();
    console.log("Canvas setup:", canvas, ctx);
    this.canvas = canvas;
    this.renderer = new Renderer(canvas, ctx);

    // Initialize game state
    this.gameState = new GameState();

    // Initialize UI components
    this.uiSettings = new UISettings();
    this.noiseControlUI = new NoiseControlUI(
      this.gameState.getHeightGenerator().getNoiseSettings(),
      () => this.onNoiseSettingsChanged(),
    );

    const callbacks: DebugDisplayCallbacks = {
      removePump: (index) => {
        this.gameState.getPumpManager().removePump(index);
        this.renderer.onPumpsChanged();
      },
      removeReservoir: (id) => {
        this.gameState.getPumpManager().removePumpsByReservoir(id);
        this.gameState.getReservoirManager().removeReservoir(id);
        this.renderer.onPumpsChanged();
        this.renderer.onWaterChanged();
      },
      updateControls: () => this.updateReservoirControls(),
      updateDisplays: () => this.updateDebugDisplays(),
      updateDebugDisplays: () => this.updateDebugDisplays(),
      clearSelection: () => this.clearReservoirSelection(),
      draw: () => this.draw(),
    };

    this.debugDisplay = new DebugDisplay(
      this.gameState.getBasinManager(),
      // deno-lint-ignore no-explicit-any
      this.gameState as any,
      callbacks,
    );

    // Initialize save/load manager
    this.saveLoadManager = new SaveLoadManager(this.gameState, () => this.onGameStateChanged());

    // Make save load manager globally accessible for HTML onclick handlers
    // deno-lint-ignore no-explicit-any
    (globalThis as any).saveLoadManager = this.saveLoadManager;

    // Initialize controllers
    this.brushTool = new BrushTool(UI_CONSTANTS.BRUSH.MIN_SIZE);
    this.updateCoordinator = new UpdateCoordinator(
      this.renderer,
      () => this.draw(),
      () => this.updateDebugDisplays(),
    );

    // Setup input callbacks
    const inputCallbacks: InputCallbacks = {
      onPaint: (x, y) => this.handlePaint(x, y),
      onPaintStart: () => this.handlePaintStart(),
      onPaintEnd: () => this.handlePaintEnd(),
      onFloodFill: (x, y, fill) => this.handleFloodFill(x, y, fill),
      onAddPump: (x, y, mode) => this.handleAddPump(x, y, mode),
      onLinkPump: (x, y) => this.handleLinkPump(x, y),
      onPickDepth: (x, y) => this.handlePickDepth(x, y),
      onBrushSizeChange: (delta) => this.handleBrushSizeChange(delta),
      onDepthChange: (delta) => this.handleDepthChange(delta),
      onZoom: (screenX, screenY, factor) => this.handleZoom(screenX, screenY, factor),
      onHover: (x, y) => this.handleHover(x, y),
      onHoverEnd: () => this.handleHoverEnd(),
      onClearSelection: () => this.clearReservoirSelection(),
    };

    this.inputController = new InputController(this.canvas, this.renderer, inputCallbacks);

    // Setup callbacks
    this.debugDisplay.setBasinHighlightChangeCallback((basinId) => {
      this.gameState.getBasinManager().setHighlightedBasin(basinId);
      this.updateCoordinator.onBasinHighlightChange();
    });

    this.initialize();
  }

  private initialize(): void {
    // Setup UI controls
    this.setupEventHandlers();
    this.setupKeyboardEventHandlers();
    this.noiseControlUI.setupMainNoiseControls();
    this.noiseControlUI.createOctaveControls();

    // Initialize controls UI
    this.controlsUI = new ControlsUI(
      (depth: number) => {
        this.selectedDepth = depth;
        this.updateCoordinator.onDepthSelectionChange();
      },
      (size: number) => {
        this.brushTool.setSize(size);
        this.draw();
      },
    );
    this.controlsUI.selectDepth(this.selectedDepth);

    // Update reservoir controls
    this.updateReservoirControls();

    // Update insights display
    this.updateInsightsDisplay();

    // Update debug displays with initial state
    this.updateDebugDisplays();

    // Initial render
    this.draw();
  }

  private onNoiseSettingsChanged(): void {
    performance.mark("noise-settings-change-start");

    performance.mark("terrain-regeneration-start");
    this.gameState.regenerateWithCurrentSettings();
    performance.mark("terrain-regeneration-end");
    performance.measure(
      "Terrain Regeneration",
      "terrain-regeneration-start",
      "terrain-regeneration-end",
    );

    performance.mark("rendering-start");
    this.updateCoordinator.onTerrainChange();
    performance.mark("rendering-end");
    performance.measure("Rendering", "rendering-start", "rendering-end");

    performance.mark("noise-settings-change-end");
    performance.measure(
      "🔥 Noise Settings Change - Total Time",
      "noise-settings-change-start",
      "noise-settings-change-end",
    );

    const measures = performance.getEntriesByType("measure");
    const recentMeasures = measures.slice(-3);
    recentMeasures.forEach((measure) => {
      console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });
  }

  private onGameStateChanged(): void {
    this.updateCoordinator.onFullUpdate();
    this.updateReservoirControls();
    this.noiseControlUI.updateUI();
  }

  private setupKeyboardEventHandlers(): void {
    document.addEventListener("keydown", (e) => {
      if (e.key >= "0" && e.key <= "9") {
        const depth = parseInt(e.key);
        this.setSelectedDepth(depth);
        e.preventDefault();
      }
    });
  }

  private setSelectedDepth(depth: number): void {
    this.selectedDepth = Math.max(0, Math.min(9, depth));
    this.controlsUI.selectDepth(this.selectedDepth);
    console.log(`Selected depth: ${this.selectedDepth}`);
  }

  // Input event handlers
  private handlePaint(x: number, y: number): void {
    this.brushTool.updateOverlay(x, y, this.selectedDepth);
    this.draw();
  }

  private handlePaintStart(): void {
    this.brushTool.clearOverlay();
    this.renderer.clearBrushOverlay();
  }

  private handlePaintEnd(): void {
    const overlay = this.brushTool.getOverlay();
    if (overlay.size === 0) return;

    for (const [key, depth] of overlay) {
      const [x, y] = key.split(",").map(Number);
      if (x !== undefined && y !== undefined) {
        this.gameState.setDepthAtBatch(x, y, depth);
      }
    }

    this.brushTool.clearOverlay();
    this.renderer.clearBrushOverlay();
    this.gameState.revalidateMap();
    this.updateCoordinator.onTerrainChange();
  }

  private handleFloodFill(x: number, y: number, fill: boolean): void {
    this.gameState.floodFill(x, y, fill);
    this.updateCoordinator.onWaterChange();
  }

  private handleAddPump(x: number, y: number, mode: "inlet" | "outlet"): void {
    const selectedId = this.gameState.getSelectedReservoir();
    this.gameState.addPump(x, y, mode, selectedId !== null);
    this.updateCoordinator.onPumpsChange();
    this.updateReservoirControls();
  }

  private handleLinkPump(x: number, y: number): void {
    this.gameState.linkPumpToReservoir(x, y);
    this.updateReservoirControls();
    this.draw();
  }

  private handlePickDepth(x: number, y: number): void {
    const heights = this.gameState.getHeights();
    if (heights[y] && heights[y]![x] !== undefined) {
      this.setSelectedDepth(heights[y]![x]!);
    }
  }

  private handleBrushSizeChange(delta: number): void {
    const newSize = Math.max(
      UI_CONSTANTS.BRUSH.MIN_SIZE,
      Math.min(UI_CONSTANTS.BRUSH.MAX_SIZE, this.brushTool.getSize() + delta),
    );
    this.brushTool.setSize(newSize);
    this.controlsUI.setBrushSize(newSize);
    console.log(`Brush size: ${newSize}`);
    this.draw();
  }

  private handleDepthChange(delta: number): void {
    this.setSelectedDepth(this.selectedDepth + delta);
  }

  private handleZoom(screenX: number, screenY: number, factor: number): void {
    this.renderer.zoomAt(screenX, screenY, factor);
    this.updateInsightsDisplay();
    this.draw();
  }

  private handleHover(x: number, y: number): void {
    this.brushTool.setCenter(x, y);
    const tileInfo = this.getTileInfo(x, y);
    this.updateInsightsDisplay(tileInfo);
    this.draw();
  }

  private handleHoverEnd(): void {
    this.brushTool.clearCenter();
    this.updateInsightsDisplay();
    this.draw();
  }

  private setupEventHandlers(): void {
    const tickBtn = document.getElementById("tickBtn");
    if (tickBtn) {
      tickBtn.onmousedown = () => {
        this.gameState.tick();
        this.updateCoordinator.onWaterChange();

        this.tickTimer = setTimeout(() => {
          this.tickInterval = setInterval(() => {
            this.gameState.tick();
            this.updateCoordinator.onWaterChange();
          }, 100);
        }, 500);
      };

      const stopTicking = () => {
        if (this.tickTimer) {
          clearTimeout(this.tickTimer);
          this.tickTimer = null;
        }
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
          this.tickInterval = null;
        }
      };

      tickBtn.onmouseup = stopTicking;
      tickBtn.onmouseleave = stopTicking;
    }

    const randomizeBtn = document.getElementById("randomizeBtn");
    if (randomizeBtn) {
      randomizeBtn.onclick = () => {
        this.gameState.randomizeHeights();
        this.updateCoordinator.onTerrainChange();
      };
    }

    const clearPumpsBtn = document.getElementById("clearPumps");
    if (clearPumpsBtn) {
      clearPumpsBtn.onclick = () => {
        this.gameState.clearPumps();
        this.updateCoordinator.onPumpsChange();
        this.updateReservoirControls();
      };
    }

    const clearWaterBtn = document.getElementById("clearWater");
    if (clearWaterBtn) {
      clearWaterBtn.onclick = () => {
        this.gameState.clearAllWater();
        this.updateCoordinator.onWaterChange();
      };
    }

    const showDepthLabelsEl = document.getElementById("showDepthLabels");
    if (showDepthLabelsEl) {
      showDepthLabelsEl.onchange = () => {
        this.uiSettings.toggleDepthLabels();
        this.updateCoordinator.onLabelsChange();
      };
    }

    const showPumpLabelsEl = document.getElementById("showPumpLabels");
    if (showPumpLabelsEl) {
      showPumpLabelsEl.onchange = () => {
        this.uiSettings.togglePumpLabels();
        this.updateCoordinator.onLabelsChange();
      };
    }

    const showBasinLabelsEl = document.getElementById("showBasinLabels");
    if (showBasinLabelsEl) {
      showBasinLabelsEl.onchange = () => {
        this.uiSettings.toggleBasinLabels();
        this.updateCoordinator.onLabelsChange();
      };
    }

    const reservoirInputEl = document.getElementById("reservoirInput");
    if (reservoirInputEl) {
      reservoirInputEl.oninput = () => {
        const desiredId = this.getDesiredReservoirIdFromInput();
        this.gameState.setSelectedReservoir(desiredId);
        this.updateCoordinator.onPumpsChange();
      };
    }
  }

  private updateInsightsDisplay(tileInfo: TileInfo | null = null): void {
    const tileInfoEl = document.getElementById("tileInfo");
    if (tileInfoEl) {
      if (tileInfo) {
        const { x, y, depth } = tileInfo;
        if (depth === 0) {
          tileInfoEl.textContent = `(${x},${y}) Land`;
        } else {
          tileInfoEl.textContent = `(${x},${y}) D${depth}`;
        }
      } else {
        tileInfoEl.textContent = "--";
      }
    }

    const basinInfoEl = document.getElementById("basinInfo");
    if (basinInfoEl) {
      if (tileInfo && tileInfo.basinId) {
        const basinManager = this.gameState.getBasinManager();
        const basin = basinManager.basins.get(tileInfo.basinId);
        if (basin) {
          const maxCapacity = basin.tiles.size * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
          const currentVolume = Math.floor(basin.volume);
          basinInfoEl.textContent = `${tileInfo.basinId} ${currentVolume}/${maxCapacity}`;
        } else {
          basinInfoEl.textContent = tileInfo.basinId;
        }
      } else if (tileInfo && tileInfo.pumpInfo) {
        const { mode, reservoirId } = tileInfo.pumpInfo;
        basinInfoEl.textContent = `${mode} PS${reservoirId || "?"}`;
      } else {
        basinInfoEl.textContent = "--";
      }
    }
  }

  private getTileInfo(x: number, y: number): TileInfo | null {
    if (x < 0 || y < 0 || x >= CONFIG.WORLD_W || y >= CONFIG.WORLD_H) {
      return null;
    }

    const heights = this.gameState.getHeights();
    const basinManager = this.gameState.getBasinManager();
    const pumps = this.gameState.getPumps();

    const depth = heights[y]![x]!;
    const basinId = basinManager.getBasinIdAt(x, y);

    const pump = pumps.find((p) => p.x === x && p.y === y);
    const pumpInfo = pump ? { mode: pump.mode, reservoirId: pump.reservoirId } : null;

    return {
      x,
      y,
      depth,
      basinId,
      pumpInfo,
    };
  }

  private updateReservoirControls(): void {
    const input = document.getElementById("reservoirInput") as HTMLInputElement | null;
    if (input && input.value === "") {
      const selectedId = this.gameState.getSelectedReservoir();
      input.value = selectedId !== null ? selectedId.toString() : "1";
    }
  }

  private getDesiredReservoirIdFromInput(): number {
    const input = document.getElementById("reservoirInput") as HTMLInputElement | null;
    if (input) {
      const value = input.value;
      if (value === "" || parseInt(value) < 1) {
        input.value = "1";
        return 1;
      }
      const id = parseInt(value);
      return id > 0 ? id : 1;
    }
    return 1;
  }

  private clearReservoirSelection(): void {
    console.log("Clearing reservoir selection");
    this.gameState.setSelectedReservoir(null);
    this.renderer.onPumpsChanged();
    this.draw();
  }

  private updateDebugDisplays(): void {
    this.debugDisplay.updateBasinsDisplay();
    this.debugDisplay.updateReservoirsDisplay();
    this.debugDisplay.updateTickCounter(this.gameState.getTickCounter());
  }

  private draw(): void {
    this.renderer.render(
      // deno-lint-ignore no-explicit-any
      this.gameState as any,
      this.uiSettings,
      this.gameState.getSelectedReservoir(),
      this.brushTool.getOverlay(),
      this.brushTool.getCenter(),
      this.brushTool.getSize(),
      this.selectedDepth,
    );
  }
}

// Initialize the application when DOM is loaded
function initApp() {
  console.log("Initializing TilemapWaterPumpingApp...");
  const app = new TilemapWaterPumpingApp();
  app.init();
  // deno-lint-ignore no-explicit-any
  (globalThis as any).tilemapApp = app;
  console.log("TilemapWaterPumpingApp initialized successfully");
}

// Handle both cases: DOM already loaded or still loading
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM already loaded, init immediately
  initApp();
}
