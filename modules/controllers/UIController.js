// UI controller for buttons, forms, and control elements
import { INTERACTION_CONFIG, validateReservoirId } from "../config/InteractionConfig.js";
export class UIController {
  constructor(gameState, renderer) {
    this.gameState = gameState;
    this.renderer = renderer;
    
    // Control state
    this.tickTimer = null;
    this.tickInterval = null;
    
    // Callbacks for communication with main app
    this.callbacks = {};
  }

  setCallbacks(callbacks) {
    this.callbacks = {
      onTerrainChanged: callbacks.onTerrainChanged || (() => {}),
      onWaterChanged: callbacks.onWaterChanged || (() => {}),
      onPumpsChanged: callbacks.onPumpsChanged || (() => {}),
      onLabelsToggled: callbacks.onLabelsToggled || (() => {}),
      updateBasinAnalysis: callbacks.updateBasinAnalysis || (() => {}),
      updateReservoirControls: callbacks.updateReservoirControls || (() => {}),
      draw: callbacks.draw || (() => {}),
      onGameStateChanged: callbacks.onGameStateChanged || (() => {})
    };
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
      this.callbacks.onWaterChanged();
      this.callbacks.draw();
      this.callbacks.updateBasinAnalysis();

      // Start timer for continuous ticking after a delay
      this.tickTimer = setTimeout(() => {
        this.tickInterval = setInterval(() => {
          this.gameState.tick();
          this.callbacks.onWaterChanged();
          this.callbacks.draw();
          this.callbacks.updateBasinAnalysis();
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
        this.callbacks.onTerrainChanged();
        this.callbacks.onWaterChanged();
        this.callbacks.onLabelsToggled();
        this.callbacks.draw();
        this.callbacks.updateBasinAnalysis();
      };
    }

    // Clear pumps button
    const clearPumpsBtn = document.getElementById("clearPumps");
    if (clearPumpsBtn) {
      clearPumpsBtn.onclick = () => {
        this.gameState.clearPumps();
        this.callbacks.onPumpsChanged();
        this.callbacks.updateReservoirControls();
        this.callbacks.draw();
        this.callbacks.updateBasinAnalysis();
      };
    }

    // Clear water button
    const clearWaterBtn = document.getElementById("clearWater");
    if (clearWaterBtn) {
      clearWaterBtn.onclick = () => {
        this.gameState.clearAllWater();
        this.callbacks.onWaterChanged();
        this.callbacks.draw();
        this.callbacks.updateBasinAnalysis();
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
        this.callbacks.onLabelsToggled();
        this.callbacks.draw();
      };
    }

    // Pump labels
    const showPumpLabelsEl = document.getElementById("showPumpLabels");
    if (showPumpLabelsEl) {
      showPumpLabelsEl.onchange = () => {
        this.uiSettings.togglePumpLabels();
        this.callbacks.onLabelsToggled();
        this.callbacks.draw();
      };
    }

    // Basin labels
    const showBasinLabelsEl = document.getElementById("showBasinLabels");
    if (showBasinLabelsEl) {
      showBasinLabelsEl.onchange = () => {
        this.uiSettings.toggleBasinLabels();
        this.callbacks.onLabelsToggled();
        this.callbacks.draw();
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
        this.callbacks.onPumpsChanged();
        this.callbacks.draw();
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
    this.callbacks.onPumpsChanged();
    this.callbacks.draw();
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
