// Noise control UI with octave controls

import type { NoiseSettings } from "../noise/NoiseSettings.ts";

export class NoiseControlUI {
  private noiseSettings: NoiseSettings;
  private onSettingsChange: () => void;

  constructor(noiseSettings: NoiseSettings, onSettingsChange: () => void) {
    this.noiseSettings = noiseSettings;
    this.onSettingsChange = onSettingsChange;
  }

  createOctaveControls(): void {
    const container = document.getElementById("octaveControls");
    const template = document.getElementById("template-octave-control") as
      | HTMLTemplateElement
      | null;
    if (!container || !template) return;

    container.innerHTML = "";

    for (let i = 0; i < this.noiseSettings.octaves; i++) {
      // Get or create settings for this octave
      // Octave frequencies are relative multipliers (1x, 2x, 4x...), not absolute
      if (!this.noiseSettings.octaveSettings[i]) {
        this.noiseSettings.octaveSettings[i] = {
          frequency: Math.pow(this.noiseSettings.lacunarity, i),
          amplitude: Math.pow(this.noiseSettings.persistence, i),
        };
      }
      const settings = this.noiseSettings.octaveSettings[i]!;

      const clone = template.content.cloneNode(true) as DocumentFragment;
      const octaveDiv = clone.querySelector(".octave-controls") as HTMLElement;
      const title = clone.querySelector(".octave-title") as HTMLElement;
      const scaleLabel = clone.querySelector(".octave-scale") as HTMLLabelElement;
      const ampLabel = clone.querySelector(".octave-amplitude") as HTMLLabelElement;

      if (octaveDiv && title && scaleLabel && ampLabel) {
        title.textContent = `Octave ${i + 1}`;

        // Set up scale control (relative frequency multiplier)
        const scaleInput = scaleLabel.querySelector("input") as HTMLInputElement;
        const scaleValue = scaleLabel.querySelector(".value-display") as HTMLElement;
        scaleInput.id = `octaveScale${i}`;
        scaleInput.value = settings.frequency.toFixed(2);
        scaleValue.id = `octaveScale${i}Value`;
        scaleValue.textContent = settings.frequency.toFixed(2);

        // Set up amplitude control
        const ampInput = ampLabel.querySelector("input") as HTMLInputElement;
        const ampValue = ampLabel.querySelector(".value-display") as HTMLElement;
        ampInput.id = `octaveAmp${i}`;
        ampInput.value = settings.amplitude.toFixed(2);
        ampValue.id = `octaveAmp${i}Value`;
        ampValue.textContent = settings.amplitude.toFixed(2);

        container.appendChild(clone);
      }

      // Add event listeners for real-time updates
      const scaleInput = document.getElementById(`octaveScale${i}`) as HTMLInputElement | null;
      const ampInput = document.getElementById(`octaveAmp${i}`) as HTMLInputElement | null;

      if (scaleInput) {
        scaleInput.addEventListener("input", (e) => {
          const target = e.target as HTMLInputElement;
          const valueEl = document.getElementById(`octaveScale${i}Value`);
          if (valueEl) valueEl.textContent = parseFloat(target.value).toFixed(2);
          const octaveSetting = this.noiseSettings.octaveSettings[i];
          if (octaveSetting) {
            octaveSetting.frequency = parseFloat(target.value);
          }
          this.noiseSettings.saveSettings();
          this.onSettingsChange();
        });
      }

      if (ampInput) {
        ampInput.addEventListener("input", (e) => {
          const target = e.target as HTMLInputElement;
          const valueEl = document.getElementById(`octaveAmp${i}Value`);
          if (valueEl) valueEl.textContent = target.value;
          const octaveSetting = this.noiseSettings.octaveSettings[i];
          if (octaveSetting) {
            octaveSetting.amplitude = parseFloat(target.value);
          }
          this.noiseSettings.saveSettings();
          this.onSettingsChange();
        });
      }
    }
  }

  setupMainNoiseControls(): void {
    // Enhanced noise control event listeners
    const scaleEl = document.getElementById("noiseScale") as HTMLInputElement | null;
    const octavesEl = document.getElementById("noiseOctaves") as HTMLInputElement | null;
    const persistenceEl = document.getElementById("noisePersistence") as HTMLInputElement | null;
    const lacunarityEl = document.getElementById("noiseLacunarity") as HTMLInputElement | null;
    const offsetEl = document.getElementById("noiseOffset") as HTMLInputElement | null;
    const gainEl = document.getElementById("noiseGain") as HTMLInputElement | null;
    const noiseTypeEl = document.getElementById("noiseType") as HTMLSelectElement | null;
    const warpEl = document.getElementById("noiseWarpStrength") as HTMLInputElement | null;
    const warpIterationsEl = document.getElementById(
      "noiseWarpIterations",
    ) as HTMLInputElement | null;

    if (scaleEl) {
      scaleEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noiseScaleValue");
        if (valueEl) valueEl.textContent = parseFloat(target.value).toFixed(2);
        this.noiseSettings.scale = parseFloat(target.value);
        // Note: octave frequencies are relative multipliers, not absolute
        // They don't need updating when base scale changes
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (octavesEl) {
      octavesEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noiseOctavesValue");
        if (valueEl) valueEl.textContent = target.value;
        this.noiseSettings.octaves = parseInt(target.value);
        this.createOctaveControls(); // Recreate octave controls when count changes
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (persistenceEl) {
      persistenceEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noisePersistenceValue");
        if (valueEl) valueEl.textContent = target.value;
        this.noiseSettings.persistence = parseFloat(target.value);
        // Update octave amplitudes
        for (let i = 0; i < this.noiseSettings.octaves; i++) {
          if (!this.noiseSettings.octaveSettings[i]) {
            this.noiseSettings.octaveSettings[i] = {
              frequency: 0,
              amplitude: 0,
            };
          }
          this.noiseSettings.octaveSettings[i]!.amplitude = Math.pow(
            this.noiseSettings.persistence,
            i,
          );
        }
        this.createOctaveControls();
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (offsetEl) {
      offsetEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noiseOffsetValue");
        if (valueEl) valueEl.textContent = target.value;
        this.noiseSettings.offset = parseFloat(target.value);
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (lacunarityEl) {
      lacunarityEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noiseLacunarityValue");
        if (valueEl) valueEl.textContent = parseFloat(target.value).toFixed(2);
        this.noiseSettings.lacunarity = parseFloat(target.value);
        // Update octave relative frequencies
        for (let i = 0; i < this.noiseSettings.octaves; i++) {
          if (!this.noiseSettings.octaveSettings[i]) {
            this.noiseSettings.octaveSettings[i] = {
              frequency: 0,
              amplitude: 0,
            };
          }
          this.noiseSettings.octaveSettings[i]!.frequency = Math.pow(
            this.noiseSettings.lacunarity,
            i,
          );
        }
        this.createOctaveControls();
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (gainEl) {
      gainEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noiseGainValue");
        if (valueEl) valueEl.textContent = parseFloat(target.value).toFixed(2);
        this.noiseSettings.gain = parseFloat(target.value);
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (noiseTypeEl) {
      noiseTypeEl.addEventListener("change", (e) => {
        const target = e.target as HTMLSelectElement;
        this.noiseSettings.noiseType = target.value as "perlin" | "simplex" | "ridged" | "billowy";
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (warpEl) {
      warpEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noiseWarpStrengthValue");
        if (valueEl) valueEl.textContent = parseFloat(target.value).toFixed(2);
        this.noiseSettings.warpStrength = parseFloat(target.value);
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }

    if (warpIterationsEl) {
      warpIterationsEl.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const valueEl = document.getElementById("noiseWarpIterationsValue");
        if (valueEl) valueEl.textContent = target.value;
        this.noiseSettings.warpIterations = parseInt(target.value);
        this.noiseSettings.saveSettings();
        this.onSettingsChange();
      });
    }
  }

  updateUI(): void {
    // Update main noise controls with current settings
    const scaleEl = document.getElementById("noiseScale") as HTMLInputElement | null;
    const scaleValueEl = document.getElementById("noiseScaleValue");
    const octavesEl = document.getElementById("noiseOctaves") as HTMLInputElement | null;
    const octavesValueEl = document.getElementById("noiseOctavesValue");
    const persistenceEl = document.getElementById("noisePersistence") as HTMLInputElement | null;
    const persistenceValueEl = document.getElementById("noisePersistenceValue");
    const lacunarityEl = document.getElementById("noiseLacunarity") as HTMLInputElement | null;
    const lacunarityValueEl = document.getElementById("noiseLacunarityValue");
    const offsetEl = document.getElementById("noiseOffset") as HTMLInputElement | null;
    const offsetValueEl = document.getElementById("noiseOffsetValue");
    const gainEl = document.getElementById("noiseGain") as HTMLInputElement | null;
    const gainValueEl = document.getElementById("noiseGainValue");
    const noiseTypeEl = document.getElementById("noiseType") as HTMLSelectElement | null;
    const warpEl = document.getElementById("noiseWarpStrength") as HTMLInputElement | null;
    const warpValueEl = document.getElementById("noiseWarpStrengthValue");
    const warpIterationsEl = document.getElementById(
      "noiseWarpIterations",
    ) as HTMLInputElement | null;
    const warpIterationsValueEl = document.getElementById("noiseWarpIterationsValue");

    if (scaleEl) {
      scaleEl.value = this.noiseSettings.scale.toString();
      if (scaleValueEl) scaleValueEl.textContent = this.noiseSettings.scale.toFixed(2);
    }
    if (octavesEl) {
      octavesEl.value = this.noiseSettings.octaves.toString();
      if (octavesValueEl) octavesValueEl.textContent = this.noiseSettings.octaves.toString();
    }
    if (persistenceEl) {
      persistenceEl.value = this.noiseSettings.persistence.toString();
      if (persistenceValueEl) {
        persistenceValueEl.textContent = this.noiseSettings.persistence.toFixed(2);
      }
    }
    if (lacunarityEl) {
      lacunarityEl.value = this.noiseSettings.lacunarity.toString();
      if (lacunarityValueEl) {
        lacunarityValueEl.textContent = this.noiseSettings.lacunarity.toFixed(2);
      }
    }
    if (offsetEl) {
      offsetEl.value = this.noiseSettings.offset.toString();
      if (offsetValueEl) offsetValueEl.textContent = this.noiseSettings.offset.toFixed(2);
    }
    if (gainEl) {
      gainEl.value = this.noiseSettings.gain.toString();
      if (gainValueEl) gainValueEl.textContent = this.noiseSettings.gain.toFixed(2);
    }
    if (noiseTypeEl) {
      noiseTypeEl.value = this.noiseSettings.noiseType;
    }
    if (warpEl) {
      warpEl.value = this.noiseSettings.warpStrength.toString();
      if (warpValueEl) warpValueEl.textContent = this.noiseSettings.warpStrength.toFixed(2);
    }
    if (warpIterationsEl) {
      warpIterationsEl.value = this.noiseSettings.warpIterations.toString();
      if (warpIterationsValueEl) {
        warpIterationsValueEl.textContent = this.noiseSettings.warpIterations.toString();
      }
    }

    // Update octave controls
    this.createOctaveControls();
  }
}
