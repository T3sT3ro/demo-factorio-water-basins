export interface BasinInfo {
  id: string;
  tileCount: number;
  volume: number;
  level: number;
  outlets?: string[];
}

export interface BasinAnalysis {
  basinArray: [string, BasinInfo][];
  basinCount: number;
  maxDegree: number;
  maxDepth: number;
}

export interface BasinManagerLike {
  basins: Map<string, BasinInfo>;
  getBasinAnalysis: (heights: number[][]) => BasinAnalysis;
  setHighlightedBasin: (id: string | null) => void;
  getHighlightedBasin: () => string | null;
}

export interface GameStateLike {
  getBasinManager: () => BasinManagerLike;
  getHeights: () => number[][];
}

export interface DebugCallbacks {
  removePump: (index: number) => void;
  removeReservoir: (id: string) => void;
  updateControls: () => void;
  updateDisplays: () => void;
  updateDebugDisplays: () => void;
  clearSelection: () => void;
  draw: () => void;
}

export interface BasinEntry {
  id: string;
  depth: number;
  basin: BasinInfo;
  maxCapacity: number;
  children: BasinEntry[];
}

export interface Pump {
  reservoirId: string;
  x: number;
  y: number;
  mode: string;
  index: number;
}

export interface Reservoir {
  volume: number;
}