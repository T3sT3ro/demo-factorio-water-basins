// Noise settings with localStorage persistence

export interface OctaveSettings {
  frequency: number;
  amplitude: number;
}

export type NoiseType = "perlin" | "simplex" | "ridged" | "billowy";

export class NoiseSettings {
  baseFreq: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  offset: number;
  gain: number;
  noiseType: NoiseType;
  warpStrength: number;
  warpIterations: number;
  octaveSettings: OctaveSettings[];

  constructor() {
    this.baseFreq = 0.02;
    this.octaves = 3;
    this.persistence = 0.5;
    this.lacunarity = 2.0;
    this.offset = 0.3;
    this.gain = 1.0;
    this.noiseType = "perlin";
    this.warpStrength = 0.0;
    this.warpIterations = 1;
    this.octaveSettings = [];
    this.loadSettings();
  }

  loadSettings(): void {
    const freq = localStorage.getItem("noiseFreq");
    const octaves = localStorage.getItem("noiseOctaves");
    const persistence = localStorage.getItem("noisePersistence");
    const lacunarity = localStorage.getItem("noiseLacunarity");
    const offset = localStorage.getItem("noiseOffset");
    const gain = localStorage.getItem("noiseGain");
    const noiseType = localStorage.getItem("noiseType");
    const warpStrength = localStorage.getItem("noiseWarpStrength");
    const warpIterations = localStorage.getItem("noiseWarpIterations");

    this.baseFreq = freq ? parseFloat(freq) : 0.02;
    this.octaves = octaves ? parseInt(octaves) : 3;
    this.persistence = persistence ? parseFloat(persistence) : 0.5;
    this.lacunarity = lacunarity ? parseFloat(lacunarity) : 2.0;
    this.offset = offset ? parseFloat(offset) : 0.3;
    this.gain = gain ? parseFloat(gain) : 1.0;
    this.noiseType = (noiseType as NoiseType) || "perlin";
    this.warpStrength = warpStrength ? parseFloat(warpStrength) : 0.0;
    this.warpIterations = warpIterations ? parseInt(warpIterations) : 1;

    this.updateUI();

    // Load octave-specific settings
    this.octaveSettings = [];
    for (let i = 0; i < this.octaves; i++) {
      const savedFreq = localStorage.getItem(`octaveFreq${i}`);
      const savedAmp = localStorage.getItem(`octaveAmp${i}`);

      this.octaveSettings[i] = {
        frequency: savedFreq ? parseFloat(savedFreq) : this.baseFreq * Math.pow(this.lacunarity, i),
        amplitude: savedAmp ? parseFloat(savedAmp) : Math.pow(this.persistence, i),
      };
    }
  }

  saveSettings(): void {
    localStorage.setItem("noiseFreq", this.baseFreq.toString());
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
        localStorage.setItem(`octaveFreq${i}`, octaveSetting.frequency.toString());
        localStorage.setItem(`octaveAmp${i}`, octaveSetting.amplitude.toString());
      }
    }
  }

  updateUI(): void {
    const freqEl = document.getElementById("noiseFreq") as HTMLInputElement | null;
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

    if (freqEl) freqEl.value = this.baseFreq.toString();
    if (octavesEl) octavesEl.value = this.octaves.toString();
    if (persistenceEl) persistenceEl.value = this.persistence.toString();
    if (lacunarityEl) lacunarityEl.value = this.lacunarity.toString();
    if (offsetEl) offsetEl.value = this.offset.toString();
    if (gainEl) gainEl.value = this.gain.toString();
    if (noiseTypeEl) noiseTypeEl.value = this.noiseType;
    if (warpEl) warpEl.value = this.warpStrength.toString();
    if (warpIterationsEl) warpIterationsEl.value = this.warpIterations.toString();

    // Update value displays
    const freqValueEl = document.getElementById("noiseFreqValue");
    const octavesValueEl = document.getElementById("noiseOctavesValue");
    const persistenceValueEl = document.getElementById("noisePersistenceValue");
    const lacunarityValueEl = document.getElementById("noiseLacunarityValue");
    const offsetValueEl = document.getElementById("noiseOffsetValue");
    const gainValueEl = document.getElementById("noiseGainValue");
    const warpValueEl = document.getElementById("noiseWarpStrengthValue");
    const warpIterationsValueEl = document.getElementById("noiseWarpIterationsValue");

    if (freqValueEl) freqValueEl.textContent = this.baseFreq.toString();
    if (octavesValueEl) octavesValueEl.textContent = this.octaves.toString();
    if (persistenceValueEl) persistenceValueEl.textContent = this.persistence.toString();
    if (lacunarityValueEl) lacunarityValueEl.textContent = this.lacunarity.toFixed(2);
    if (offsetValueEl) offsetValueEl.textContent = this.offset.toString();
    if (gainValueEl) gainValueEl.textContent = this.gain.toFixed(2);
    if (warpValueEl) warpValueEl.textContent = this.warpStrength.toFixed(2);
    if (warpIterationsValueEl) warpIterationsValueEl.textContent = this.warpIterations.toString();
  }
}
