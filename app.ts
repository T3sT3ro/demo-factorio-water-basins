// Main application controller - orchestrates all modules

import { CONFIG, setupCanvas } from "./modules/config.ts";
import { GameState } from "./modules/GameState.ts";
import { Renderer } from "./modules/renderer.ts";
import { DebugDisplay, NoiseControlUI, UISettings } from "./modules/ui/index.ts";
import type { DebugDisplayCallbacks } from "./modules/ui/index.ts";
import { UI_CONSTANTS } from "./modules/constants.ts";
import { SaveLoadManager } from "./modules/SaveLoadManager.ts";
import { LegendUI } from "./modules/ui/LegendUI.ts";

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
  private legendUI!: LegendUI;

  // Brush state
  private brushSize: number;
  private selectedDepth: number;
  private brushOverlay: Map<string, number>;
  private isDrawing: boolean;
  private brushCenter: { x: number; y: number } | null;

  // Tick control state
  private tickTimer: ReturnType<typeof setTimeout> | null;
  private tickInterval: ReturnType<typeof setInterval> | null;

  constructor() {
    this.brushSize = UI_CONSTANTS.BRUSH.MIN_SIZE;
    this.selectedDepth = 0;
    this.brushOverlay = new Map();
    this.isDrawing = false;
    this.brushCenter = null;
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

    // Setup callbacks
    this.debugDisplay.setBasinHighlightChangeCallback((_basinId) => {
      this.renderer.onBasinHighlightChanged();
      this.draw();
    });

    this.initialize();
  }

  private initialize(): void {
    // Setup UI controls
    this.setupEventHandlers();
    this.setupCanvasEventHandlers();
    this.setupKeyboardEventHandlers();
    this.noiseControlUI.setupMainNoiseControls();
    this.noiseControlUI.createOctaveControls();

    // Initialize legend UI
    this.legendUI = new LegendUI((depth) => {
      this.selectedDepth = depth;
      this.renderer.markLayerDirty("all");
      this.draw();
    });
    this.legendUI.selectDepth(this.selectedDepth);

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
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged();
    this.renderer.onLabelsToggled();
    performance.mark("terrain-regeneration-end");
    performance.measure(
      "Terrain Regeneration",
      "terrain-regeneration-start",
      "terrain-regeneration-end",
    );

    performance.mark("rendering-start");
    this.draw();
    performance.mark("rendering-end");
    performance.measure("Rendering", "rendering-start", "rendering-end");

    performance.mark("debug-display-update-start");
    this.updateDebugDisplays();
    performance.mark("debug-display-update-end");
    performance.measure(
      "Debug Display Update",
      "debug-display-update-start",
      "debug-display-update-end",
    );

    performance.mark("noise-settings-change-end");
    performance.measure(
      "🔥 Noise Settings Change - Total Time",
      "noise-settings-change-start",
      "noise-settings-change-end",
    );

    const measures = performance.getEntriesByType("measure");
    const recentMeasures = measures.slice(-4);
    recentMeasures.forEach((measure) => {
      console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });
  }

  private onGameStateChanged(): void {
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged();
    this.renderer.onPumpsChanged();
    this.renderer.onLabelsToggled();
    this.draw();
    this.updateDebugDisplays();
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
    this.legendUI.selectDepth(this.selectedDepth);
    console.log(`Selected depth: ${this.selectedDepth}`);
  }

  private getBrushTiles(centerX: number, centerY: number): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];
    const radius = Math.floor(this.brushSize / 2);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            tiles.push({ x, y });
          }
        }
      }
    }

    return tiles;
  }

  private updateBrushOverlay(centerX: number, centerY: number): void {
    if (!this.isDrawing) return;

    const tiles = this.getBrushTiles(centerX, centerY);

    for (const tile of tiles) {
      const key = `${tile.x},${tile.y}`;
      this.brushOverlay.set(key, this.selectedDepth);
    }
  }

  private commitBrushChanges(): void {
    if (this.brushOverlay.size === 0) return;

    for (const [key, depth] of this.brushOverlay) {
      const parts = key.split(",").map((n) => parseInt(n));
      const x = parts[0];
      const y = parts[1];
      if (x !== undefined && y !== undefined) {
        this.gameState.setDepthAtBatch(x, y, depth);
      }
    }

    this.brushOverlay.clear();
    this.renderer.clearBrushOverlay();

    this.gameState.revalidateMap();
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged();
    this.renderer.onLabelsToggled();
    this.updateDebugDisplays();
  }

  private setupEventHandlers(): void {
    const tickBtn = document.getElementById("tickBtn");
    if (tickBtn) {
      tickBtn.onmousedown = () => {
        this.gameState.tick();
        this.renderer.onWaterChanged();
        this.draw();
        this.updateDebugDisplays();

        this.tickTimer = setTimeout(() => {
          this.tickInterval = setInterval(() => {
            this.gameState.tick();
            this.renderer.onWaterChanged();
            this.draw();
            this.updateDebugDisplays();
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
        this.renderer.onTerrainChanged();
        this.renderer.onWaterChanged();
        this.renderer.onLabelsToggled();
        this.draw();
        this.updateDebugDisplays();
      };
    }

    const clearPumpsBtn = document.getElementById("clearPumps");
    if (clearPumpsBtn) {
      clearPumpsBtn.onclick = () => {
        this.gameState.clearPumps();
        this.renderer.onPumpsChanged();
        this.updateReservoirControls();
        this.draw();
        this.updateDebugDisplays();
      };
    }

    const clearWaterBtn = document.getElementById("clearWater");
    if (clearWaterBtn) {
      clearWaterBtn.onclick = () => {
        this.gameState.clearAllWater();
        this.renderer.onWaterChanged();
        this.draw();
        this.updateDebugDisplays();
      };
    }

    const showDepthLabelsEl = document.getElementById("showDepthLabels");
    if (showDepthLabelsEl) {
      showDepthLabelsEl.onchange = () => {
        this.uiSettings.toggleDepthLabels();
        this.renderer.onLabelsToggled();
        this.draw();
      };
    }

    const showPumpLabelsEl = document.getElementById("showPumpLabels");
    if (showPumpLabelsEl) {
      showPumpLabelsEl.onchange = () => {
        this.uiSettings.togglePumpLabels();
        this.renderer.onLabelsToggled();
        this.draw();
      };
    }

    const showBasinLabelsEl = document.getElementById("showBasinLabels");
    if (showBasinLabelsEl) {
      showBasinLabelsEl.onchange = () => {
        this.uiSettings.toggleBasinLabels();
        this.renderer.onLabelsToggled();
        this.draw();
      };
    }

    const reservoirInputEl = document.getElementById("reservoirInput");
    if (reservoirInputEl) {
      reservoirInputEl.oninput = () => {
        const desiredId = this.getDesiredReservoirIdFromInput();
        this.gameState.setSelectedReservoir(desiredId);
        this.renderer.onPumpsChanged();
        this.draw();
      };
    }
  }

  private setupCanvasEventHandlers(): void {
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;

    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (e.button === 1) {
        isPanning = true;
        lastPanX = screenX;
        lastPanY = screenY;
        this.canvas.style.cursor = "grabbing";
        e.preventDefault();
        return;
      }

      const worldPos = this.renderer.screenToWorld(screenX, screenY);
      const mx = Math.floor(worldPos.x / CONFIG.TILE_SIZE);
      const my = Math.floor(worldPos.y / CONFIG.TILE_SIZE);

      if (mx < 0 || my < 0 || mx >= CONFIG.WORLD_W || my >= CONFIG.WORLD_H) return;

      if (e.button === 2) {
        e.preventDefault();
      }

      if (e.altKey && e.button === 2) {
        const heights = this.gameState.getHeights();
        const pickedDepth = heights[my]![mx]!;
        this.setSelectedDepth(pickedDepth);
        return;
      }

      if (e.ctrlKey) {
        if (e.shiftKey) {
          if (e.button === 0) {
            if (this.gameState.linkPumpToReservoir(mx, my)) {
              console.log(
                `Pipe System ${this.gameState.getSelectedReservoir()} selected for linking future pumps`,
              );
            } else {
              console.log("No pump found at this location to link to");
            }
            this.updateReservoirControls();
            this.draw();
          }
          return;
        }

        if (e.button === 0) {
          this.gameState.floodFill(mx, my, true);
          this.renderer.onWaterChanged();
        } else if (e.button === 2) {
          this.gameState.floodFill(mx, my, false);
          this.renderer.onWaterChanged();
        }
        this.draw();
        this.updateDebugDisplays();
        return;
      }

      if (e.shiftKey) {
        if (e.button === 0) {
          const selectedId = this.gameState.getSelectedReservoir();
          this.gameState.addPump(mx, my, "outlet", selectedId !== null);
          this.renderer.onPumpsChanged();
          this.updateReservoirControls();
          this.draw();
          this.updateDebugDisplays();
        } else if (e.button === 2) {
          const selectedId = this.gameState.getSelectedReservoir();
          this.gameState.addPump(mx, my, "inlet", selectedId !== null);
          this.renderer.onPumpsChanged();
          this.updateReservoirControls();
          this.draw();
          this.updateDebugDisplays();
        }
        return;
      }

      if (e.button === 0) {
        this.isDrawing = true;
        this.brushOverlay.clear();
        this.renderer.clearBrushOverlay();
        this.updateBrushOverlay(mx, my);
        this.gameState.setSelectedReservoir(null);
        this.renderer.onPumpsChanged();
        this.updateReservoirControls();
        this.draw();
      }
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (isPanning) {
        const deltaX = screenX - lastPanX;
        const deltaY = screenY - lastPanY;

        this.renderer.pan(-deltaX, -deltaY);

        lastPanX = screenX;
        lastPanY = screenY;

        this.draw();
      } else {
        const worldPos = this.renderer.screenToWorld(screenX, screenY);
        const tileX = Math.floor(worldPos.x / CONFIG.TILE_SIZE);
        const tileY = Math.floor(worldPos.y / CONFIG.TILE_SIZE);

        this.brushCenter = { x: tileX, y: tileY };

        if (this.isDrawing) {
          this.updateBrushOverlay(tileX, tileY);
        }

        const tileInfo = this.getTileInfo(tileX, tileY);
        this.updateInsightsDisplay(tileInfo);
        this.draw();
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 1 && isPanning) {
        isPanning = false;
        this.canvas.style.cursor = "default";
      } else if (e.button === 0 && this.isDrawing) {
        this.isDrawing = false;
        this.commitBrushChanges();
        this.draw();
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      if (isPanning) {
        isPanning = false;
        this.canvas.style.cursor = "default";
      }
      if (this.isDrawing) {
        this.isDrawing = false;
        this.commitBrushChanges();
        this.draw();
      }
      this.brushCenter = null;
      this.updateInsightsDisplay();
      this.draw();
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (e.shiftKey) {
        const delta = e.deltaY > 0 ? -1 : 1;
        this.brushSize = Math.max(
          UI_CONSTANTS.BRUSH.MIN_SIZE,
          Math.min(UI_CONSTANTS.BRUSH.MAX_SIZE, this.brushSize + delta),
        );
        console.log(`Brush size: ${this.brushSize}`);
        this.updateInsightsDisplay();
        this.draw();
      } else if (e.altKey) {
        const delta = e.deltaY > 0 ? -1 : 1;
        this.setSelectedDepth(this.selectedDepth + delta);
      } else {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.renderer.zoomAt(screenX, screenY, zoomFactor);
        this.updateInsightsDisplay();
        this.draw();
      }
    });

    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  private updateInsightsDisplay(tileInfo: TileInfo | null = null): void {
    const zoomValue = document.getElementById("zoomValue");
    if (zoomValue) {
      zoomValue.textContent = `${this.renderer.getZoomPercentage()}%`;
    }

    const brushValue = document.getElementById("brushValue");
    if (brushValue) {
      brushValue.textContent = this.brushSize.toString();
    }

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
    this.renderer.renderOptimized(
      // deno-lint-ignore no-explicit-any
      this.gameState as any,
      this.uiSettings,
      this.gameState.getSelectedReservoir(),
      this.brushOverlay,
      this.brushCenter,
      this.brushSize,
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
