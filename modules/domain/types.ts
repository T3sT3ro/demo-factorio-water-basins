// Core domain types for the water basin simulation

export interface WorldConfig {
  WORLD_W: number;
  WORLD_H: number;
  TILE_SIZE: number;
}

export interface Basin {
  tiles: Set<string>;
  volume: number;
  level: number;
  height: number;
  outlets: Set<string>;
}

export interface Pump {
  x: number;
  y: number;
  mode: "inlet" | "outlet";
  pipeSystemId: number;
}

export interface PipeSystem {
  id: number;
  volume: number;
  pumps: Pump[];
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface NoiseSettings {
  type: "perlin" | "simplex" | "ridged" | "billowy";
  baseFreq: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  gain: number;
  offset: number;
  warpStrength: number;
  warpIterations: number;
  seed: number;
}

export interface BrushState {
  x: number;
  y: number;
  size: number;
  selectedDepth: number;
}

export interface UISettings {
  showDepthLabels: boolean;
  showBasinLabels: boolean;
  showPumpLabels: boolean;
  showGrid: boolean;
}
