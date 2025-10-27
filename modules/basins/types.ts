// Basin-related type definitions

export interface BasinData {
  tiles: Set<string>;
  volume: number;
  level: number;
  height: number;
  outlets: string[];
}

export interface TempBasinData {
  tiles: Set<string>;
  height: number;
  outlets: Set<TempBasinData>;
}

export interface BasinDebugInfo {
  basinCount: number;
  maxDepth: number;
  maxDegree: number;
  basinArray: [string, BasinData][];
  connections: Map<string, Set<string>>;
}

export interface DebugState {
  currentStage: "flood-fill" | "outlets" | "assignment" | "complete";
  currentDepth: number;
  processedTiles: Set<string>; // Purple - already processed and added to basin
  pendingTiles: Set<string>; // Pastel pink - in queue to be processed
  activeTile: { x: number; y: number } | null; // Green - currently being processed
}

export type DebugStepGranularity = "one" | "stage" | "finish";

export type BasinComputationYield = {
  stage: "flood-fill" | "outlets" | "assignment" | "complete";
  depth?: number;
  activeTile?: { x: number; y: number };
  processedTiles: Set<string>;
  pendingTiles: Set<string>;
};
