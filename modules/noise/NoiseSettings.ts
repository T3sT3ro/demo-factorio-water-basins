/// Noise Settings Management - Handles persistence, loading, and UI synchronization of noise parameters
import { type NoiseTypeName } from './NoiseAlgorithms.ts';

/// Per-octave settings for custom frequency and amplitude control
export interface OctaveSetting {
  frequency: number;
  amplitude: number;
}

/// Complete noise configuration
export interface NoiseConfiguration {
  /// Base frequency for noise generation
  baseFreq: number;
  /// Number of octaves to generate
  octaves: number;
  /// Amplitude reduction between octaves
  persistence: number;
  /// Frequency increase between octaves
  lacunarity: number;
  /// Height offset to apply to generated values
  offset: number;
  /// Overall gain/amplification
  gain: number;
  /// Type of noise algorithm to use
  noiseType: NoiseTypeName;
  /// Strength of domain warping effect
  warpStrength: number;
  /// Number of recursive warping iterations
  warpIterations: number;
  /// Custom per-octave settings (optional)
  octaveSettings?: OctaveSetting[];
}

/// Default noise configuration
const DEFAULT_CONFIG: NoiseConfiguration = {
  baseFreq: 0.02,
  octaves: 3,
  persistence: 0.5,
  lacunarity: 2.0,
  offset: 0.3,
  gain: 1.0,
  noiseType: 'perlin',
  warpStrength: 0.0,
  warpIterations: 1
};

/// Storage keys for localStorage persistence
const STORAGE_KEYS = {
  baseFreq: 'noiseFreq',
  octaves: 'noiseOctaves',
  persistence: 'noisePersistence',
  lacunarity: 'noiseLacunarity',
  offset: 'noiseOffset',
  gain: 'noiseGain',
  noiseType: 'noiseType',
  warpStrength: 'noiseWarpStrength',
  warpIterations: 'noiseWarpIterations'
} as const;

/// UI element IDs for synchronization
const UI_ELEMENT_IDS = {
  baseFreq: 'noiseFreq',
  octaves: 'noiseOctaves',
  persistence: 'noisePersistence',
  lacunarity: 'noiseLacunarity',
  offset: 'noiseOffset',
  gain: 'noiseGain',
  noiseType: 'noiseType',
  warpStrength: 'noiseWarpStrength',
  warpIterations: 'noiseWarpIterations'
} as const;

/// UI value display element IDs
const UI_VALUE_DISPLAY_IDS = {
  baseFreq: 'noiseFreqValue',
  octaves: 'noiseOctavesValue',
  persistence: 'noisePersistenceValue',
  lacunarity: 'noiseLacunarityValue',
  offset: 'noiseOffsetValue',
  gain: 'noiseGainValue',
  warpStrength: 'noiseWarpStrengthValue',
  warpIterations: 'noiseWarpIterationsValue'
} as const;

/// Enhanced noise settings management with persistence and UI synchronization
export class NoiseSettings {
  private config: NoiseConfiguration;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadSettings();
  }

  /// Get current noise configuration
  getConfig(): Readonly<NoiseConfiguration> {
    return { ...this.config };
  }

  /// Update noise configuration
  updateConfig(updates: Partial<NoiseConfiguration>): void {
    this.config = { ...this.config, ...updates };
    this.saveSettings();
    this.updateUI();
  }

  /// Reset to default configuration
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveSettings();
    this.updateUI();
  }

  /// Load settings from localStorage
  private loadSettings(): void {
    // Load basic settings
    this.config.baseFreq = this.loadNumber(STORAGE_KEYS.baseFreq, DEFAULT_CONFIG.baseFreq);
    this.config.octaves = this.loadInteger(STORAGE_KEYS.octaves, DEFAULT_CONFIG.octaves);
    this.config.persistence = this.loadNumber(STORAGE_KEYS.persistence, DEFAULT_CONFIG.persistence);
    this.config.lacunarity = this.loadNumber(STORAGE_KEYS.lacunarity, DEFAULT_CONFIG.lacunarity);
    this.config.offset = this.loadNumber(STORAGE_KEYS.offset, DEFAULT_CONFIG.offset);
    this.config.gain = this.loadNumber(STORAGE_KEYS.gain, DEFAULT_CONFIG.gain);
    this.config.warpStrength = this.loadNumber(STORAGE_KEYS.warpStrength, DEFAULT_CONFIG.warpStrength);
    this.config.warpIterations = this.loadInteger(STORAGE_KEYS.warpIterations, DEFAULT_CONFIG.warpIterations);
    
    // Load noise type with validation
    const savedNoiseType = localStorage.getItem(STORAGE_KEYS.noiseType);
    if (savedNoiseType && this.isValidNoiseType(savedNoiseType)) {
      this.config.noiseType = savedNoiseType;
    } else {
      this.config.noiseType = DEFAULT_CONFIG.noiseType;
    }

    // Load octave-specific settings
    this.loadOctaveSettings();
    
    // Update UI to reflect loaded settings
    this.updateUI();
  }

  /// Load a number from localStorage with fallback
  private loadNumber(key: string, defaultValue: number): number {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = parseFloat(saved);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /// Load an integer from localStorage with fallback
  private loadInteger(key: string, defaultValue: number): number {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /// Validate noise type
  private isValidNoiseType(type: string): type is NoiseTypeName {
    return type === 'perlin' || type === 'simplex' || type === 'ridged' || type === 'billowy';
  }

  /// Load octave-specific settings
  private loadOctaveSettings(): void {
    this.config.octaveSettings = [];
    for (let i = 0; i < this.config.octaves; i++) {
      const savedFreq = localStorage.getItem(`octaveFreq${i}`);
      const savedAmp = localStorage.getItem(`octaveAmp${i}`);

      const frequency = savedFreq ? parseFloat(savedFreq) : 
        this.config.baseFreq * Math.pow(this.config.lacunarity, i);
      const amplitude = savedAmp ? parseFloat(savedAmp) : 
        Math.pow(this.config.persistence, i);

      this.config.octaveSettings[i] = { frequency, amplitude };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    localStorage.setItem(STORAGE_KEYS.baseFreq, this.config.baseFreq.toString());
    localStorage.setItem(STORAGE_KEYS.octaves, this.config.octaves.toString());
    localStorage.setItem(STORAGE_KEYS.persistence, this.config.persistence.toString());
    localStorage.setItem(STORAGE_KEYS.lacunarity, this.config.lacunarity.toString());
    localStorage.setItem(STORAGE_KEYS.offset, this.config.offset.toString());
    localStorage.setItem(STORAGE_KEYS.gain, this.config.gain.toString());
    localStorage.setItem(STORAGE_KEYS.noiseType, this.config.noiseType);
    localStorage.setItem(STORAGE_KEYS.warpStrength, this.config.warpStrength.toString());
    localStorage.setItem(STORAGE_KEYS.warpIterations, this.config.warpIterations.toString());

    // Save octave-specific settings
    if (this.config.octaveSettings) {
      for (let i = 0; i < this.config.octaveSettings.length; i++) {
        const octave = this.config.octaveSettings[i];
        if (octave) {
          localStorage.setItem(`octaveFreq${i}`, octave.frequency.toString());
          localStorage.setItem(`octaveAmp${i}`, octave.amplitude.toString());
        }
      }
    }
  }

  /// Update UI elements to reflect current settings
  private updateUI(): void {
    this.updateInputElements();
    this.updateValueDisplays();
  }

  /// Update input elements
  private updateInputElements(): void {
    this.setElementValue(UI_ELEMENT_IDS.baseFreq, this.config.baseFreq);
    this.setElementValue(UI_ELEMENT_IDS.octaves, this.config.octaves);
    this.setElementValue(UI_ELEMENT_IDS.persistence, this.config.persistence);
    this.setElementValue(UI_ELEMENT_IDS.lacunarity, this.config.lacunarity);
    this.setElementValue(UI_ELEMENT_IDS.offset, this.config.offset);
    this.setElementValue(UI_ELEMENT_IDS.gain, this.config.gain);
    this.setElementValue(UI_ELEMENT_IDS.noiseType, this.config.noiseType);
    this.setElementValue(UI_ELEMENT_IDS.warpStrength, this.config.warpStrength);
    this.setElementValue(UI_ELEMENT_IDS.warpIterations, this.config.warpIterations);
  }

  /// Update value display elements
  private updateValueDisplays(): void {
    this.setElementText(UI_VALUE_DISPLAY_IDS.baseFreq, this.config.baseFreq.toString());
    this.setElementText(UI_VALUE_DISPLAY_IDS.octaves, this.config.octaves.toString());
    this.setElementText(UI_VALUE_DISPLAY_IDS.persistence, this.config.persistence.toString());
    this.setElementText(UI_VALUE_DISPLAY_IDS.lacunarity, this.config.lacunarity.toFixed(2));
    this.setElementText(UI_VALUE_DISPLAY_IDS.offset, this.config.offset.toString());
    this.setElementText(UI_VALUE_DISPLAY_IDS.gain, this.config.gain.toFixed(2));
    this.setElementText(UI_VALUE_DISPLAY_IDS.warpStrength, this.config.warpStrength.toFixed(2));
    this.setElementText(UI_VALUE_DISPLAY_IDS.warpIterations, this.config.warpIterations.toString());
  }

  /// Set element value safely
  private setElementValue(id: string, value: string | number): void {
    const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (element) {
      element.value = value.toString();
    }
  }

  /// Set element text content safely
  private setElementText(id: string, text: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  // Convenience getters for commonly used values
  get baseFreq(): number { return this.config.baseFreq; }
  get octaves(): number { return this.config.octaves; }
  get persistence(): number { return this.config.persistence; }
  get lacunarity(): number { return this.config.lacunarity; }
  get offset(): number { return this.config.offset; }
  get gain(): number { return this.config.gain; }
  get noiseType(): NoiseTypeName { return this.config.noiseType; }
  get warpStrength(): number { return this.config.warpStrength; }
  get warpIterations(): number { return this.config.warpIterations; }
  get octaveSettings(): OctaveSetting[] | undefined { return this.config.octaveSettings; }
}
