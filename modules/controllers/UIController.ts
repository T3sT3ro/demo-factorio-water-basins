// UI controller for buttons, forms, and control elements
import { INTERACTION_CONFIG, validateReservoirId } from "../config/InteractionConfig.ts";

interface GameStateLike {
  tick(): void;
  randomizeHeights(): void;
  clearPumps(): void;
  clearAllWater(): void;
  setSelectedReservoir(id: string | null): void;
  getSelectedReservoir(): string | null;
}

type RendererLike = Record<string, unknown>;

interface EventBusLike {
  emit(eventName: string, data?: unknown): void;
}

interface UISettingsLike {
  toggleDepthLabels(): void;
  togglePumpLabels(): void;
  toggleBasinLabels(): void;
}

interface InteractionConfigExtended {
  TIMING: {
    TICK_CONTINUOUS_INTERVAL_MS: number;
    TICK_HOLD_DELAY_MS: number;
  };
  GAME: {
    DEFAULT_RESERVOIR_ID: number;
    MIN_RESERVOIR_ID: number;
  };
}

export class UIController {
  private gameState: GameStateLike;
  private renderer: RendererLike;
  private eventBus: EventBusLike;
  private uiSettings?: UISettingsLike;
  private tickTimer: number | null;
  private tickInterval: number | null;

  constructor(gameState: GameStateLike, renderer: RendererLike, eventBus: EventBusLike) {
    this.gameState = gameState;
    this.renderer = renderer;
    this.eventBus = eventBus;

    // Control state
    this.tickTimer = null;
    this.tickInterval = null;
  }

  setupEventHandlers(): void {
    this.setupTickControls();
    this.setupActionButtons();
    this.setupLabelControls();
    this.setupReservoirControls();
  }

  setupTickControls(): void {
    const tickBtn = document.getElementById("tickBtn");
    if (!tickBtn) return;

    tickBtn.onmousedown = () => {
      this.gameState.tick();
      this.eventBus.emit('water.changed');
      this.eventBus.emit('render.request');
      this.eventBus.emit('analysis.update');

      // Start timer for continuous ticking after a delay
      this.tickTimer = setTimeout(() => {
        this.tickInterval = setInterval(() => {
          this.gameState.tick();
          this.eventBus.emit('water.changed');
          this.eventBus.emit('render.request');
          this.eventBus.emit('analysis.update');
        }, (INTERACTION_CONFIG as unknown as InteractionConfigExtended).TIMING.TICK_CONTINUOUS_INTERVAL_MS);
      }, (INTERACTION_CONFIG as unknown as InteractionConfigExtended).TIMING.TICK_HOLD_DELAY_MS);
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

  setupActionButtons(): void {
    // Randomize button
    const randomizeBtn = document.getElementById("randomizeBtn");
    if (randomizeBtn) {
      randomizeBtn.onclick = () => {
        this.gameState.randomizeHeights();
        this.eventBus.emit('terrain.changed');
        this.eventBus.emit('water.changed');
        this.eventBus.emit('labels.toggled');
        this.eventBus.emit('render.request');
        this.eventBus.emit('analysis.update');
      };
    }

    // Clear pumps button
    const clearPumpsBtn = document.getElementById("clearPumps");
    if (clearPumpsBtn) {
      clearPumpsBtn.onclick = () => {
        this.gameState.clearPumps();
        this.eventBus.emit('pumps.changed');
        this.eventBus.emit('reservoir.controls.update');
        this.eventBus.emit('render.request');
        this.eventBus.emit('analysis.update');
      };
    }

    // Clear water button
    const clearWaterBtn = document.getElementById("clearWater");
    if (clearWaterBtn) {
      clearWaterBtn.onclick = () => {
        this.gameState.clearAllWater();
        this.eventBus.emit('water.changed');
        this.eventBus.emit('render.request');
        this.eventBus.emit('analysis.update');
      };
    }

    // Load button - handled by SaveLoadManager
    // Export button - handled by SaveLoadManager
  }

  setupLabelControls(): void {
    // Depth labels
    const showDepthLabelsEl = document.getElementById("showDepthLabels");
    if (showDepthLabelsEl) {
      showDepthLabelsEl.onchange = () => {
        this.uiSettings?.toggleDepthLabels();
        this.eventBus.emit('labels.toggled');
        this.eventBus.emit('render.request');
      };
    }

    // Pump labels
    const showPumpLabelsEl = document.getElementById("showPumpLabels");
    if (showPumpLabelsEl) {
      showPumpLabelsEl.onchange = () => {
        this.uiSettings?.togglePumpLabels();
        this.eventBus.emit('labels.toggled');
        this.eventBus.emit('render.request');
      };
    }

    // Basin labels
    const showBasinLabelsEl = document.getElementById("showBasinLabels");
    if (showBasinLabelsEl) {
      showBasinLabelsEl.onchange = () => {
        this.uiSettings?.toggleBasinLabels();
        this.eventBus.emit('labels.toggled');
        this.eventBus.emit('render.request');
      };
    }
  }

  setupReservoirControls(): void {
    // Pipe system number input control
    const reservoirInputEl = document.getElementById("reservoirInput");
    if (reservoirInputEl) {
      reservoirInputEl.oninput = () => {
        const desiredId = this.getDesiredReservoirIdFromInput();
        this.gameState.setSelectedReservoir(desiredId);
        this.eventBus.emit('pumps.changed');
        this.eventBus.emit('render.request');
      };
    }
  }

  // UI state management methods
  setUISettings(uiSettings: UISettingsLike): void {
    this.uiSettings = uiSettings;
  }

  updateReservoirControls(): void {
    const input = document.getElementById("reservoirInput") as HTMLInputElement;
    if (input && input.value === "") {
      const selectedId = this.gameState.getSelectedReservoir();
      input.value = selectedId !== null ? selectedId : (INTERACTION_CONFIG as unknown as InteractionConfigExtended).GAME.DEFAULT_RESERVOIR_ID.toString();
    }
  }

  getDesiredReservoirIdFromInput(): string {
    const input = document.getElementById("reservoirInput") as HTMLInputElement;
    if (input) {
      const value = input.value;
      if (value === "" || parseInt(value) < (INTERACTION_CONFIG as unknown as InteractionConfigExtended).GAME.MIN_RESERVOIR_ID) {
        input.value = (INTERACTION_CONFIG as unknown as InteractionConfigExtended).GAME.DEFAULT_RESERVOIR_ID.toString();
        return (INTERACTION_CONFIG as unknown as InteractionConfigExtended).GAME.DEFAULT_RESERVOIR_ID.toString();
      }
      const id = parseInt(value);
      return validateReservoirId(id).toString();
    }
    return (INTERACTION_CONFIG as unknown as InteractionConfigExtended).GAME.DEFAULT_RESERVOIR_ID.toString();
  }

  clearReservoirSelection(): void {
    console.log("Clearing reservoir selection");
    this.gameState.setSelectedReservoir(null);
    this.eventBus.emit('pumps.changed');
    this.eventBus.emit('render.request');
  }

  // Cleanup
  cleanup(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
