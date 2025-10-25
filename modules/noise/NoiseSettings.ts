// Noise settings with localStorage persistence

export interface OctaveSettings {
  frequency: number;
  amplitude: number;
}

export type NoiseType = "perlin" | "simplex" | "ridged" | "billowy";

export class NoiseSettings {
  scale: number; // Normalized: 0.0-1.0, where 1.0 = one feature across world (10 chunks)
  octaves: number;
  persistence: number;
  lacunarity: number;
  offset: number;
  gain: number;
  noiseType: NoiseType;
  warpStrength: number; // Normalized: 0.0-1.0, where 1.0 ≈ 2 chunks distortion
  warpIterations: number;
  octaveSettings: OctaveSettings[];

  constructor() {
    // Intuitive normalized defaults:
    // - scale: 0.3 = features ~3 chunks wide (moderate detail)
    // - warpStrength: 0.0 = no distortion
    // - persistence/gain/offset: standard FBM values
    this.scale = 0.3;
    this.octaves = 3;
    this.persistence = 0.5;
    this.lacunarity = 2.0;
    this.offset = 0.3;
    this.gain = 1.0;
    this.noiseType = "perlin";
    this.warpStrength = 0.0;
    this.warpIterations = 0;
    this.octaveSettings = [];
    this.loadSettings();
  }

  /** Convert normalized scale (0-1) to frequency for noise generation */
  get baseFreq(): number {
    // scale 0.0 → freq 0.0 (infinite period)
    // scale 1.0 → freq 0.1 (one feature across 10 chunks = 160 tiles)
    return this.scale * 0.1;
  }

  /** Convert normalized warp strength to tile units */
  get warpStrengthTiles(): number {
    // 1.0 = ~32 tiles ≈ 2 chunks
    return this.warpStrength * 32;
  }

  loadSettings(): void {
    const scale = localStorage.getItem("noiseScale");
    const octaves = localStorage.getItem("noiseOctaves");
    const persistence = localStorage.getItem("noisePersistence");
    const lacunarity = localStorage.getItem("noiseLacunarity");
    const offset = localStorage.getItem("noiseOffset");
    const gain = localStorage.getItem("noiseGain");
    const noiseType = localStorage.getItem("noiseType");
    const warpStrength = localStorage.getItem("noiseWarpStrength");
    const warpIterations = localStorage.getItem("noiseWarpIterations");

    this.scale = scale ? parseFloat(scale) : 0.3;
    this.octaves = octaves ? parseInt(octaves) : 3;
    this.persistence = persistence ? parseFloat(persistence) : 0.5;
    this.lacunarity = lacunarity ? parseFloat(lacunarity) : 2.0;
    this.offset = offset ? parseFloat(offset) : 0.3;
    this.gain = gain ? parseFloat(gain) : 1.0;
    this.noiseType = (noiseType as NoiseType) || "perlin";
    this.warpStrength = warpStrength ? parseFloat(warpStrength) : 0.0;
    this.warpIterations = warpIterations ? parseInt(warpIterations) : 0;

    this.updateUI();

    // Load octave-specific settings
    this.octaveSettings = [];
    for (let i = 0; i < this.octaves; i++) {
      const savedScale = localStorage.getItem(`octaveScale${i}`);
      const savedAmp = localStorage.getItem(`octaveAmp${i}`);

      this.octaveSettings[i] = {
        frequency: savedScale ? parseFloat(savedScale) : Math.pow(this.lacunarity, i),
        amplitude: savedAmp ? parseFloat(savedAmp) : Math.pow(this.persistence, i),
      };
    }
  }

  saveSettings(): void {
    localStorage.setItem("noiseScale", this.scale.toString());
    localStorage.setItem("noiseOctaves", this.octaves.toString());
    localStorage.setItem("noisePersistence", this.persistence.toString());
    localStorage.setItem("noiseLacunarity", this.lacunarity.toString());
    localStorage.setItem("noiseOffset", this.offset.toString());
    localStorage.setItem("noiseGain", this.gain.toString());
    localStorage.setItem("noiseType", this.noiseType);
    localStorage.setItem("noiseWarpStrength", this.warpStrength.toString());
    localStorage.setItem("noiseWarpIterations", this.warpIterations.toString());

    // Save octave-specific settings
    for (let i = 0; i < this.octaves; i++) {
      const octaveSetting = this.octaveSettings[i];
      if (octaveSetting) {
        localStorage.setItem(`octaveScale${i}`, octaveSetting.frequency.toString());
        localStorage.setItem(`octaveAmp${i}`, octaveSetting.amplitude.toString());
      }
    }
  }

  updateUI(): void {
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

    if (scaleEl) scaleEl.value = this.scale.toString();
    if (octavesEl) octavesEl.value = this.octaves.toString();
    if (persistenceEl) persistenceEl.value = this.persistence.toString();
    if (lacunarityEl) lacunarityEl.value = this.lacunarity.toString();
    if (offsetEl) offsetEl.value = this.offset.toString();
    if (gainEl) gainEl.value = this.gain.toString();
    if (noiseTypeEl) noiseTypeEl.value = this.noiseType;
    if (warpEl) warpEl.value = this.warpStrength.toString();
    if (warpIterationsEl) warpIterationsEl.value = this.warpIterations.toString();

    // Update value displays
    const scaleValueEl = document.getElementById("noiseScaleValue");
    const octavesValueEl = document.getElementById("noiseOctavesValue");
    const persistenceValueEl = document.getElementById("noisePersistenceValue");
    const lacunarityValueEl = document.getElementById("noiseLacunarityValue");
    const offsetValueEl = document.getElementById("noiseOffsetValue");
    const gainValueEl = document.getElementById("noiseGainValue");
    const warpValueEl = document.getElementById("noiseWarpStrengthValue");
    const warpIterationsValueEl = document.getElementById("noiseWarpIterationsValue");

    if (scaleValueEl) scaleValueEl.textContent = this.scale.toFixed(2);
    if (octavesValueEl) octavesValueEl.textContent = this.octaves.toString();
    if (persistenceValueEl) persistenceValueEl.textContent = this.persistence.toFixed(2);
    if (lacunarityValueEl) lacunarityValueEl.textContent = this.lacunarity.toFixed(2);
    if (offsetValueEl) offsetValueEl.textContent = this.offset.toFixed(2);
    if (gainValueEl) gainValueEl.textContent = this.gain.toFixed(2);
    if (warpValueEl) warpValueEl.textContent = this.warpStrength.toFixed(2);
    if (warpIterationsValueEl) warpIterationsValueEl.textContent = this.warpIterations.toString();
  }
}
