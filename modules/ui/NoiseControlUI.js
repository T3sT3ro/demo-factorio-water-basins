// Noise parameter controls and octave management

/**
 * Manages noise generation parameter controls and octave settings
 */
export class NoiseControlUI {
  constructor(noiseSettings, onLiveUpdate, onFinalUpdate) {
    this.noiseSettings = noiseSettings;
    this.onLiveUpdate = onLiveUpdate; // Called during slider movement (input events)
    this.onFinalUpdate = onFinalUpdate; // Called when user finishes (change events)
  }

  createOctaveControls() {
    const container = document.getElementById("octaveControls");
    if (!container) return;

    container.innerHTML = "";

    for (let i = 0; i < this.noiseSettings.octaves; i++) {
      const octaveDiv = document.createElement("div");
      octaveDiv.className = "octave-controls";

      const title = document.createElement("h5");
      title.textContent = `Octave ${i + 1}`;
      octaveDiv.appendChild(title);

      // Get or create settings for this octave
      if (!this.noiseSettings.octaveSettings[i]) {
        this.noiseSettings.octaveSettings[i] = {
          frequency: this.noiseSettings.baseFreq * Math.pow(this.noiseSettings.lacunarity, i),
          amplitude: Math.pow(this.noiseSettings.persistence, i),
        };
      }
      const settings = this.noiseSettings.octaveSettings[i];

      // Frequency control
      const freqLabel = document.createElement("label");
      freqLabel.innerHTML =
        `Frequency: <input id="octaveFreq${i}" type="range" min="0.001" max="0.5" step="0.001" value="${
          settings.frequency.toFixed(3)
        }"><span class="value-display" id="octaveFreq${i}Value">${
          settings.frequency.toFixed(3)
        }</span>`;
      octaveDiv.appendChild(freqLabel);

      // Amplitude control
      const ampLabel = document.createElement("label");
      ampLabel.innerHTML =
        `Amplitude: <input id="octaveAmp${i}" type="range" min="0" max="2" step="0.01" value="${
          settings.amplitude.toFixed(2)
        }"><span class="value-display" id="octaveAmp${i}Value">${
          settings.amplitude.toFixed(2)
        }</span>`;
      octaveDiv.appendChild(ampLabel);

      container.appendChild(octaveDiv);

      // Add event listeners for real-time updates
      const freqInput = document.getElementById(`octaveFreq${i}`);
      const ampInput = document.getElementById(`octaveAmp${i}`);
      
      // Live updates during slider movement
      freqInput.addEventListener("input", (e) => {
        document.getElementById(`octaveFreq${i}Value`).textContent = e.target.value;
        this.noiseSettings.octaveSettings[i].frequency = parseFloat(e.target.value);
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      ampInput.addEventListener("input", (e) => {
        document.getElementById(`octaveAmp${i}Value`).textContent = e.target.value;
        this.noiseSettings.octaveSettings[i].amplitude = parseFloat(e.target.value);
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final updates when user releases slider
      freqInput.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });

      ampInput.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }
  }

  setupMainNoiseControls() {
    // Enhanced noise control event listeners
    const freqEl = document.getElementById("noiseFreq");
    const octavesEl = document.getElementById("noiseOctaves");
    const persistenceEl = document.getElementById("noisePersistence");
    const lacunarityEl = document.getElementById("noiseLacunarity");
    const offsetEl = document.getElementById("noiseOffset");
    const gainEl = document.getElementById("noiseGain");
    const noiseTypeEl = document.getElementById("noiseType");
    const warpEl = document.getElementById("noiseWarpStrength");
    const warpIterationsEl = document.getElementById("noiseWarpIterations");

    if (freqEl) {
      // Live updates during slider movement
      freqEl.addEventListener("input", (e) => {
        document.getElementById("noiseFreqValue").textContent = e.target.value;
        this.noiseSettings.baseFreq = parseFloat(e.target.value);
        // Update existing octave settings with new base frequency
        for (let i = 0; i < this.noiseSettings.octaves; i++) {
          if (!this.noiseSettings.octaveSettings[i]) {
            this.noiseSettings.octaveSettings[i] = {};
          }
          this.noiseSettings.octaveSettings[i].frequency = this.noiseSettings.baseFreq *
            Math.pow(this.noiseSettings.lacunarity, i);
        }
        this.createOctaveControls(); // Recreate octave controls with new base frequency
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      freqEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (octavesEl) {
      // Live updates during slider movement
      octavesEl.addEventListener("input", (e) => {
        document.getElementById("noiseOctavesValue").textContent = e.target.value;
        this.noiseSettings.octaves = parseInt(e.target.value);
        this.createOctaveControls(); // Recreate octave controls when count changes
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      octavesEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (persistenceEl) {
      // Live updates during slider movement
      persistenceEl.addEventListener("input", (e) => {
        document.getElementById("noisePersistenceValue").textContent = e.target.value;
        this.noiseSettings.persistence = parseFloat(e.target.value);
        // Update existing octave settings with new persistence
        for (let i = 0; i < this.noiseSettings.octaves; i++) {
          if (!this.noiseSettings.octaveSettings[i]) {
            this.noiseSettings.octaveSettings[i] = {};
          }
          this.noiseSettings.octaveSettings[i].amplitude = Math.pow(
            this.noiseSettings.persistence,
            i,
          );
        }
        this.createOctaveControls(); // Recreate octave controls with new persistence
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      persistenceEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (offsetEl) {
      // Live updates during slider movement
      offsetEl.addEventListener("input", (e) => {
        document.getElementById("noiseOffsetValue").textContent = e.target.value;
        this.noiseSettings.offset = parseFloat(e.target.value);
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      offsetEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (lacunarityEl) {
      // Live updates during slider movement
      lacunarityEl.addEventListener("input", (e) => {
        document.getElementById("noiseLacunarityValue").textContent = parseFloat(e.target.value)
          .toFixed(2);
        this.noiseSettings.lacunarity = parseFloat(e.target.value);
        // Update existing octave settings with new lacunarity
        for (let i = 0; i < this.noiseSettings.octaves; i++) {
          if (!this.noiseSettings.octaveSettings[i]) {
            this.noiseSettings.octaveSettings[i] = {};
          }
          this.noiseSettings.octaveSettings[i].frequency = this.noiseSettings.baseFreq *
            Math.pow(this.noiseSettings.lacunarity, i);
        }
        this.createOctaveControls(); // Recreate octave controls with new lacunarity
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      lacunarityEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (gainEl) {
      // Live updates during slider movement
      gainEl.addEventListener("input", (e) => {
        document.getElementById("noiseGainValue").textContent = parseFloat(e.target.value).toFixed(
          2,
        );
        this.noiseSettings.gain = parseFloat(e.target.value);
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      gainEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (noiseTypeEl) {
      noiseTypeEl.addEventListener("change", (e) => {
        this.noiseSettings.noiseType = e.target.value;
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
        this.onFinalUpdate?.(); // Basin recalculation (immediate for dropdown)
      });
    }

    if (warpEl) {
      // Live updates during slider movement
      warpEl.addEventListener("input", (e) => {
        document.getElementById("noiseWarpStrengthValue").textContent = parseFloat(e.target.value)
          .toFixed(2);
        this.noiseSettings.warpStrength = parseFloat(e.target.value);
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      warpEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (warpIterationsEl) {
      // Live updates during slider movement
      warpIterationsEl.addEventListener("input", (e) => {
        document.getElementById("noiseWarpIterationsValue").textContent = e.target.value;
        this.noiseSettings.warpIterations = parseInt(e.target.value);
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      // Final update when user releases slider
      warpIterationsEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }
  }

  updateUI() {
    // Update main noise controls with current settings
    const freqEl = document.getElementById("noiseFreq");
    const freqValueEl = document.getElementById("noiseFreqValue");
    const octavesEl = document.getElementById("noiseOctaves");
    const octavesValueEl = document.getElementById("noiseOctavesValue");
    const persistenceEl = document.getElementById("noisePersistence");
    const persistenceValueEl = document.getElementById("noisePersistenceValue");
    const lacunarityEl = document.getElementById("noiseLacunarity");
    const lacunarityValueEl = document.getElementById("noiseLacunarityValue");
    const offsetEl = document.getElementById("noiseOffset");
    const offsetValueEl = document.getElementById("noiseOffsetValue");
    const gainEl = document.getElementById("noiseGain");
    const gainValueEl = document.getElementById("noiseGainValue");
    const noiseTypeEl = document.getElementById("noiseType");
    const warpEl = document.getElementById("noiseWarpStrength");
    const warpValueEl = document.getElementById("noiseWarpStrengthValue");
    const warpIterationsEl = document.getElementById("noiseWarpIterations");
    const warpIterationsValueEl = document.getElementById("noiseWarpIterationsValue");

    if (freqEl) {
      freqEl.value = this.noiseSettings.baseFreq;
      if (freqValueEl) freqValueEl.textContent = this.noiseSettings.baseFreq.toFixed(3);
    }
    if (octavesEl) {
      octavesEl.value = this.noiseSettings.octaves;
      if (octavesValueEl) octavesValueEl.textContent = this.noiseSettings.octaves;
    }
    if (persistenceEl) {
      persistenceEl.value = this.noiseSettings.persistence;
      if (persistenceValueEl) {
        persistenceValueEl.textContent = this.noiseSettings.persistence.toFixed(2);
      }
    }
    if (lacunarityEl) {
      lacunarityEl.value = this.noiseSettings.lacunarity;
      if (lacunarityValueEl) {
        lacunarityValueEl.textContent = this.noiseSettings.lacunarity.toFixed(2);
      }
    }
    if (offsetEl) {
      offsetEl.value = this.noiseSettings.offset;
      if (offsetValueEl) offsetValueEl.textContent = this.noiseSettings.offset.toFixed(2);
    }
    if (gainEl) {
      gainEl.value = this.noiseSettings.gain;
      if (gainValueEl) gainValueEl.textContent = this.noiseSettings.gain.toFixed(2);
    }
    if (noiseTypeEl) {
      noiseTypeEl.value = this.noiseSettings.noiseType;
    }
    if (warpEl) {
      warpEl.value = this.noiseSettings.warpStrength;
      if (warpValueEl) warpValueEl.textContent = this.noiseSettings.warpStrength.toFixed(2);
    }
    if (warpIterationsEl) {
      warpIterationsEl.value = this.noiseSettings.warpIterations;
      if (warpIterationsValueEl) {
        warpIterationsValueEl.textContent = this.noiseSettings.warpIterations;
      }
    }

    // Update octave controls
    this.createOctaveControls();
  }
}
