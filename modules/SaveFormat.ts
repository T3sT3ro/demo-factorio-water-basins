// Save file format types - used for serialization/deserialization

import type { NoiseSettings } from "./noise/NoiseSettings.ts";

/**
 * Runtime reservoir representation in save data
 * (different from runtime Pump interface)
 */
export interface ReservoirSaveData {
  id: number;
  volume: number;
}

export interface PumpSaveData {
  x: number;
  y: number;
  mode: "inlet" | "outlet";
  reservoirId: number;
}

export interface CompressedHeights {
  format: "2d_array" | "rle" | "base64_packed";
  width: number;
  height: number;
  data: string;
}

export interface CompressedBasinIdMap {
  format: "string_rows" | "rle_basin_ids";
  data: string;
}

export interface BasinTreeNode {
  height: number;
  volume: number;
  level: number;
  tileCount: number;
  children: string[];
}

export interface CompressedBasins {
  format: "optimized_v2" | "optimized_v1";
  width: number;
  height: number;
  basinIdMap: CompressedBasinIdMap;
  basinData: Record<string, BasinTreeNode>;
  basinTree?: Record<string, { height: number; outlets: string[] }>;
  basinMetadata?: Record<string, { volume: number; level: number }>;
}

export interface SaveData {
  version: string;
  timestamp: string;
  encodingOptions: {
    heightEncoding: string;
    basinEncoding: string;
  };
  currentSeed: number;
  heights: CompressedHeights;
  tickCounter: number;
  noiseSettings: NoiseSettings;
  basins: CompressedBasins;
  pumps: PumpSaveData[];
  reservoirs: ReservoirSaveData[];
}
