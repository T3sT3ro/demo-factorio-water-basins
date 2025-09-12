// UI controller for buttons, forms, and control elements
import { INTERACTION_CONFIG, validateReservoirId } from "../config/InteractionConfig.js";
export class UIController {
  constructor(gameState, renderer, eventBus) {
    this.gameState = gameState;
    this.renderer = renderer;
    this.eventBus = eventBus;
    
    // Control state
    this.tickTimer = null;
    this.tickInterval = null;
  }

  setupEventHandlers() {
    this.setupTickControls();
    this.setupActionButtons();
    this.setupLabelControls();
    this.setupReservoirControls();
  }

  setupTickControls() {
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
        }, INTERACTION_CONFIG.TIMING.TICK_CONTINUOUS_INTERVAL_MS);
      }, INTERACTION_CONFIG.TIMING.TICK_HOLD_DELAY_MS);
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

  setupActionButtons() {
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

  setupLabelControls() {
    // Depth labels
    const showDepthLabelsEl = document.getElementById("showDepthLabels");
    if (showDepthLabelsEl) {
      showDepthLabelsEl.onchange = () => {
        this.uiSettings.toggleDepthLabels();
        this.eventBus.emit('labels.toggled');
        this.eventBus.emit('render.request');
      };
    }

    // Pump labels
    const showPumpLabelsEl = document.getElementById("showPumpLabels");
    if (showPumpLabelsEl) {
      showPumpLabelsEl.onchange = () => {
        this.uiSettings.togglePumpLabels();
        this.eventBus.emit('labels.toggled');
        this.eventBus.emit('render.request');
      };
    }

    // Basin labels
    const showBasinLabelsEl = document.getElementById("showBasinLabels");
    if (showBasinLabelsEl) {
      showBasinLabelsEl.onchange = () => {
        this.uiSettings.toggleBasinLabels();
        this.eventBus.emit('labels.toggled');
        this.eventBus.emit('render.request');
      };
    }
  }

  setupReservoirControls() {
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
  setUISettings(uiSettings) {
    this.uiSettings = uiSettings;
  }

  updateReservoirControls() {
    const input = document.getElementById("reservoirInput");
    if (input && input.value === "") {
      const selectedId = this.gameState.getSelectedReservoir();
      input.value = selectedId !== null ? selectedId : INTERACTION_CONFIG.GAME.DEFAULT_RESERVOIR_ID;
    }
  }

  getDesiredReservoirIdFromInput() {
    const input = document.getElementById("reservoirInput");
    if (input) {
      const value = input.value;
      if (value === "" || parseInt(value) < INTERACTION_CONFIG.GAME.MIN_RESERVOIR_ID) {
        input.value = INTERACTION_CONFIG.GAME.DEFAULT_RESERVOIR_ID.toString();
        return INTERACTION_CONFIG.GAME.DEFAULT_RESERVOIR_ID;
      }
      const id = parseInt(value);
      return validateReservoirId(id);
    }
    return INTERACTION_CONFIG.GAME.DEFAULT_RESERVOIR_ID;
  }

  clearReservoirSelection() {
    console.log("Clearing reservoir selection");
    this.gameState.setSelectedReservoir(null);
    this.eventBus.emit('pumps.changed');
    this.eventBus.emit('render.request');
  }

  // Cleanup
  cleanup() {
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
