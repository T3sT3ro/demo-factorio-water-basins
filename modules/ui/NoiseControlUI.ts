// Noise parameter controls and octave management

/**
 * Manages noise generation parameter controls and octave settings
 */
export class NoiseControlUI {
  private noiseSettings: any;
  private onLiveUpdate?: () => void;
  private onFinalUpdate?: () => void;

  constructor(noiseSettings: any, onLiveUpdate?: () => void, onFinalUpdate?: () => void) {
    this.noiseSettings = noiseSettings;
    this.onLiveUpdate = onLiveUpdate; // Called during slider movement (input events)
    this.onFinalUpdate = onFinalUpdate; // Called when user finishes (change events)
  }

  createOctaveControls() {
    const container = document.getElementById("octaveControls");
    if (!container) return;

    container.innerHTML = "";

    const template = document.getElementById("octave-control-template") as HTMLTemplateElement;
    if (!template) {
      console.error("Octave control template not found");
      return;
    }

    for (let i = 0; i < this.noiseSettings.octaves; i++) {
      const octaveDiv = template.content.querySelector(".octave-controls")!.cloneNode(true) as HTMLElement;

      const title = octaveDiv.querySelector("h5");
      if (!title) continue;
      title.textContent = `Octave ${i + 1}`;

      // Get or create settings for this octave
      if (!this.noiseSettings.octaveSettings[i]) {
        this.noiseSettings.octaveSettings[i] = {
          frequency: this.noiseSettings.baseFreq * Math.pow(this.noiseSettings.lacunarity, i),
          amplitude: Math.pow(this.noiseSettings.persistence, i),
        };
      }
      const settings = this.noiseSettings.octaveSettings[i];

      // Frequency control
      const freqInput = octaveDiv.querySelector('input[type="range"]:first-of-type') as HTMLInputElement;
      const freqValue = octaveDiv.querySelector('.value-display:first-of-type') as HTMLElement;
      if (!freqInput || !freqValue) continue;
      freqInput.id = `octaveFreq${i}`;
      freqValue.id = `octaveFreq${i}Value`;
      freqInput.value = settings.frequency.toFixed(3);
      freqValue.textContent = settings.frequency.toFixed(3);

      // Amplitude control
      const ampInput = octaveDiv.querySelector('input[type="range"]:last-of-type') as HTMLInputElement;
      const ampValue = octaveDiv.querySelector('.value-display:last-of-type') as HTMLElement;
      if (!ampInput || !ampValue) continue;
      ampInput.id = `octaveAmp${i}`;
      ampValue.id = `octaveAmp${i}Value`;
      ampInput.value = settings.amplitude.toFixed(2);
      ampValue.textContent = settings.amplitude.toFixed(2);

      container.appendChild(octaveDiv);

      // Add event listeners for real-time updates
      // Live updates during slider movement
      freqInput.addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target) freqValue.textContent = target.value;
        this.noiseSettings.octaveSettings[i].frequency = parseFloat(target.value);
        this.noiseSettings.saveSettings();
        this.onLiveUpdate?.(); // Live terrain update
      });

      ampInput.addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target) ampValue.textContent = target.value;
        this.noiseSettings.octaveSettings[i].amplitude = parseFloat(target.value);
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
        const target = e.target as HTMLInputElement;
        if (target) {
          const valueDisplay = document.getElementById("noiseFreqValue");
          if (valueDisplay) valueDisplay.textContent = target.value;
          this.noiseSettings.baseFreq = parseFloat(target.value);
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
        }
      });

      // Final update when user releases slider
      freqEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (octavesEl) {
      // Live updates during slider movement
      octavesEl.addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target) {
          const valueDisplay = document.getElementById("noiseOctavesValue");
          if (valueDisplay) valueDisplay.textContent = target.value;
          this.noiseSettings.octaves = parseInt(target.value);
          this.createOctaveControls(); // Recreate octave controls when count changes
          this.noiseSettings.saveSettings();
          this.onLiveUpdate?.(); // Live terrain update
        }
      });

      // Final update when user releases slider
      octavesEl.addEventListener("change", () => {
        this.onFinalUpdate?.(); // Basin recalculation
      });
    }

    if (persistenceEl) {
      // Live updates during slider movement
      persistenceEl.addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target) {
          const valueDisplay = document.getElementById("noisePersistenceValue");
          if (valueDisplay) valueDisplay.textContent = target.value;
          this.noiseSettings.persistence = parseFloat(target.value);
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
        }
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
