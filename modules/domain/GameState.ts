// Game State - Central state management
// Holds all game state and provides methods to modify it

import { TileMap2D, TerrainTile, Position as _Position } from './TerrainModels.ts';
import { Basin, PumpID } from './BasinModels.ts';
import { Reservoir } from './Reservoir.ts';
import { Pump } from './Pump.ts';
import { BasinInfo, BasinAnalysis } from '../ui/debug-types.ts';

export interface GameStateData {
  terrain: TileMap2D;
  basins: Map<string, Basin>;
  reservoirs: Map<string, Reservoir>;
  selectedReservoirId: string | null;
  tickCounter: number;
}

export class GameState {
  private data: GameStateData;

  constructor(width: number, height: number) {
    this.data = {
      terrain: new TileMap2D(width, height),
      basins: new Map(),
      reservoirs: new Map(),
      selectedReservoirId: null,
      tickCounter: 0
    };
  }

  // Terrain access
  getTerrain(): TileMap2D {
    return this.data.terrain;
  }

  getTileAt(x: number, y: number): TerrainTile | null {
    if (!this.data.terrain.isValidPosition(x, y)) return null;
    return this.data.terrain.getTile(x, y);
  }

  setTileAt(x: number, y: number, tile: TerrainTile): void {
    this.data.terrain.setTile(x, y, tile);
  }

  setDepthAt(x: number, y: number, depth: number): void {
    const tile = this.data.terrain.getTile(x, y);
    tile.depth = depth;
  }

  setDepthAtBatch(x: number, y: number, depth: number): void {
    this.setDepthAt(x, y, depth);
  }

  // Basin access
  getBasins(): Map<string, Basin> {
    return new Map(this.data.basins);
  }

  getBasin(id: string): Basin | undefined {
    return this.data.basins.get(id);
  }

  setBasin(basin: Basin): void {
    this.data.basins.set(basin.id.value, basin);
  }

  removeBasin(id: string): void {
    this.data.basins.delete(id);
  }

  getBasinAt(_x: number, _y: number): Basin | null {
    // This would need basin spatial indexing - for now return null
    return null;
  }

  // Reservoir access
  getReservoirs(): Map<string, Reservoir> {
    return new Map(this.data.reservoirs);
  }

  getReservoir(id: string): Reservoir | undefined {
    return this.data.reservoirs.get(id);
  }

  addReservoir(reservoir: Reservoir): void {
    this.data.reservoirs.set(reservoir.id.toString(), reservoir);
  }

  removeReservoir(id: string): boolean {
    return this.data.reservoirs.delete(id);
  }

  // Pump access
  getPumps(): Pump[] {
    return Array.from(this.data.reservoirs.values())
      .flatMap(reservoir => reservoir.getAllPumps());
  }

  getPump(id: PumpID): Pump | undefined {
    for (const reservoir of this.data.reservoirs.values()) {
      const pump = reservoir.getPump(id);
      if (pump) return pump;
    }
    return undefined;
  }

  // Selection
  getSelectedReservoir(): string | null {
    return this.data.selectedReservoirId;
  }

  setSelectedReservoir(id: string | null): void {
    this.data.selectedReservoirId = id;
  }

  // World info
  getWorldSize(): { width: number; height: number } {
    return {
      width: this.data.terrain.width,
      height: this.data.terrain.height
    };
  }

  // Stub methods for controller compatibility
  getHeights(): number[][] {
    const heights: number[][] = [];
    for (let y = 0; y < this.data.terrain.height; y++) {
      heights[y] = [];
      for (let x = 0; x < this.data.terrain.width; x++) {
        const tile = this.data.terrain.getTile(x, y);
        heights[y]![x] = tile.depth;
      }
    }
    return heights;
  }

  linkPumpToReservoir(_x: number, _y: number): boolean {
    // Stub - basin system handles this
    return true;
  }

  floodFill(_x: number, _y: number, _fill: boolean): void {
    // Stub - basin system handles this
  }

  addPump(_x: number, _y: number, _mode: string, _connected: boolean): void {
    // Stub - not implemented in simplified architecture
  }

  revalidateMap(): void {
    // Stub - basin system handles this
  }

  tick(): void {
    this.incrementTick();
  }

  randomizeHeights(): void {
    // Stub - not implemented
  }

  clearPumps(): void {
    // Stub - not implemented
  }

  clearAllWater(): void {
    // Stub - not implemented
  }

  // Tick management
  getTickCounter(): number {
    return this.data.tickCounter;
  }

  incrementTick(): void {
    this.data.tickCounter++;
  }

  // Basin analysis (stub for now)
  getBasinManager(): {
    basins: Map<string, BasinInfo>;
    getBasinAnalysis: (heights: number[][]) => BasinAnalysis;
    setHighlightedBasin: (id: string | null) => void;
    getHighlightedBasin: () => string | null;
  } {
    return {
      basins: new Map(Array.from(this.data.basins.entries()).map(([id, basin]) => [
        id,
        {
          id,
          tileCount: basin.size,
          volume: basin.waterVolume.amount,
          level: 0, // Stub
          outlets: basin.outlets.map(o => o.targetBasinId.value)
        }
      ])),
      getBasinAnalysis: (_heights) => ({
        basinArray: Array.from(this.data.basins.entries()).map(([id, basin]) => [
          id,
          {
            id,
            tileCount: basin.size,
            volume: basin.waterVolume.amount,
            level: 0,
            outlets: basin.outlets.map(o => o.targetBasinId.value)
          }
        ]),
        basinCount: this.data.basins.size,
        maxDegree: 0,
        maxDepth: 0
      }),
      setHighlightedBasin: (_id) => {
        // Stub
      },
      getHighlightedBasin: () => null
    };
  }
}