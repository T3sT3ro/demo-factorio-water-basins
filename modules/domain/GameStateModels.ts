// Game State Domain Models - TypeScript
// Core game state aggregates and value objects

import { TileMap2D } from './TerrainModels.ts';
import { Basin, BasinId } from './BasinModels.ts';
import { PipeSystem, ReservoirId } from './Pump.ts';

/**
 * Tick counter value object
 */
export class TickCounter {
  private readonly _value: number;

  /**
   * @param value - Tick count (non-negative)
   */
  constructor(value = 0) {
    if (value < 0) throw new Error('Tick counter cannot be negative');
    this._value = Math.floor(value);
  }

  get value(): number {
    return this._value;
  }

  /**
   * Increment tick counter
   */
  increment(): TickCounter {
    return new TickCounter(this._value + 1);
  }

  /**
   * Reset tick counter
   */
  reset(): TickCounter {
    return new TickCounter(0);
  }

  equals(other: TickCounter): boolean {
    return other instanceof TickCounter && this._value === other._value;
  }

  toString(): string {
    return `TickCounter(${this._value})`;
  }
}

/**
 * Game world dimensions
 */
export class WorldDimensions {
  private readonly _width: number;
  private readonly _height: number;

  constructor(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error('World dimensions must be positive');
    }
    this._width = width;
    this._height = height;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get totalTiles(): number {
    return this._width * this._height;
  }

  equals(other: WorldDimensions): boolean {
    return other instanceof WorldDimensions && 
           this._width === other._width && 
           this._height === other._height;
  }

  toString(): string {
    return `WorldDimensions(${this._width}x${this._height})`;
  }
}

/**
 * Game settings - immutable configuration
 */
export interface GameSettingsData {
  worldDimensions: WorldDimensions;
  maxDepth: number;
  tileSize: number;
  pumpRate: number;
}

export class GameSettings {
  private readonly _worldDimensions: WorldDimensions;
  private readonly _maxDepth: number;
  private readonly _tileSize: number;
  private readonly _pumpRate: number;

  constructor({ worldDimensions, maxDepth, tileSize, pumpRate }: GameSettingsData) {
    this._worldDimensions = worldDimensions;
    this._maxDepth = maxDepth;
    this._tileSize = tileSize;
    this._pumpRate = pumpRate;
  }

  get worldDimensions(): WorldDimensions {
    return this._worldDimensions;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }

  get tileSize(): number {
    return this._tileSize;
  }

  get pumpRate(): number {
    return this._pumpRate;
  }

  toString(): string {
    return `GameSettings(${this._worldDimensions}, depth:${this._maxDepth}, tile:${this._tileSize}px)`;
  }
}

/**
 * Game state snapshot - immutable representation of the entire game state
 */
export interface GameStateSnapshotData {
  settings: GameSettings;
  terrain: TileMap2D;
  basins: Map<BasinId, Basin>;
  pipeSystems: Map<ReservoirId, PipeSystem>;
  tickCounter: TickCounter;
  selectedReservoirId?: ReservoirId | null;
  highlightedBasinId?: BasinId | null;
}

export class GameStateSnapshot {
  private readonly _settings: GameSettings;
  private readonly _terrain: TileMap2D;
  private readonly _basins: Map<BasinId, Basin>;
  private readonly _pipeSystems: Map<ReservoirId, PipeSystem>;
  private readonly _tickCounter: TickCounter;
  private readonly _selectedReservoirId: ReservoirId | null;
  private readonly _highlightedBasinId: BasinId | null;

  constructor({ 
    settings, 
    terrain, 
    basins, 
    pipeSystems, 
    tickCounter, 
    selectedReservoirId = null, 
    highlightedBasinId = null 
  }: GameStateSnapshotData) {
    this._settings = settings;
    this._terrain = terrain;
    this._basins = new Map(basins);
    this._pipeSystems = new Map(pipeSystems);
    this._tickCounter = tickCounter;
    this._selectedReservoirId = selectedReservoirId;
    this._highlightedBasinId = highlightedBasinId;
  }

  get settings(): GameSettings {
    return this._settings;
  }

  get terrain(): TileMap2D {
    return this._terrain;
  }

  get basins(): Map<BasinId, Basin> {
    return new Map(this._basins);
  }

  get pipeSystems(): Map<ReservoirId, PipeSystem> {
    return new Map(this._pipeSystems);
  }

  get tickCounter(): TickCounter {
    return this._tickCounter;
  }

  get selectedReservoirId(): ReservoirId | null {
    return this._selectedReservoirId;
  }

  get highlightedBasinId(): BasinId | null {
    return this._highlightedBasinId;
  }

  /**
   * Get basin by ID
   */
  getBasin(basinId: BasinId): Basin | undefined {
    return this._basins.get(basinId);
  }

  /**
   * Get pipe system by reservoir ID
   */
  getPipeSystem(reservoirId: ReservoirId): PipeSystem | undefined {
    return this._pipeSystems.get(reservoirId);
  }

  /**
   * Get all basins as array
   */
  getAllBasins(): Basin[] {
    return Array.from(this._basins.values());
  }

  /**
   * Get all pipe systems as array
   */
  getAllPipeSystems(): PipeSystem[] {
    return Array.from(this._pipeSystems.values());
  }

  /**
   * Update terrain
   */
  withTerrain(newTerrain: TileMap2D): GameStateSnapshot {
    return new GameStateSnapshot({
      settings: this._settings,
      terrain: newTerrain,
      basins: this._basins,
      pipeSystems: this._pipeSystems,
      tickCounter: this._tickCounter,
      selectedReservoirId: this._selectedReservoirId,
      highlightedBasinId: this._highlightedBasinId
    });
  }

  /**
   * Update basins
   */
  withBasins(newBasins: Map<BasinId, Basin>): GameStateSnapshot {
    return new GameStateSnapshot({
      settings: this._settings,
      terrain: this._terrain,
      basins: newBasins,
      pipeSystems: this._pipeSystems,
      tickCounter: this._tickCounter,
      selectedReservoirId: this._selectedReservoirId,
      highlightedBasinId: this._highlightedBasinId
    });
  }

  /**
   * Update pipe systems
   */
  withPipeSystems(newPipeSystems: Map<ReservoirId, PipeSystem>): GameStateSnapshot {
    return new GameStateSnapshot({
      settings: this._settings,
      terrain: this._terrain,
      basins: this._basins,
      pipeSystems: newPipeSystems,
      tickCounter: this._tickCounter,
      selectedReservoirId: this._selectedReservoirId,
      highlightedBasinId: this._highlightedBasinId
    });
  }

  /**
   * Increment tick counter
   */
  incrementTick(): GameStateSnapshot {
    return new GameStateSnapshot({
      settings: this._settings,
      terrain: this._terrain,
      basins: this._basins,
      pipeSystems: this._pipeSystems,
      tickCounter: this._tickCounter.increment(),
      selectedReservoirId: this._selectedReservoirId,
      highlightedBasinId: this._highlightedBasinId
    });
  }

  /**
   * Set selected reservoir
   */
  withSelectedReservoir(reservoirId: ReservoirId | null): GameStateSnapshot {
    return new GameStateSnapshot({
      settings: this._settings,
      terrain: this._terrain,
      basins: this._basins,
      pipeSystems: this._pipeSystems,
      tickCounter: this._tickCounter,
      selectedReservoirId: reservoirId,
      highlightedBasinId: this._highlightedBasinId
    });
  }

  /**
   * Set highlighted basin
   */
  withHighlightedBasin(basinId: BasinId | null): GameStateSnapshot {
    return new GameStateSnapshot({
      settings: this._settings,
      terrain: this._terrain,
      basins: this._basins,
      pipeSystems: this._pipeSystems,
      tickCounter: this._tickCounter,
      selectedReservoirId: this._selectedReservoirId,
      highlightedBasinId: basinId
    });
  }

  toString(): string {
    return `GameStateSnapshot(tick:${this._tickCounter.value}, basins:${this._basins.size}, pipes:${this._pipeSystems.size})`;
  }
}

/**
 * Factory for creating default game state
 */
export class GameStateFactory {
  /**
   * Create default game settings
   */
  static createDefaultSettings(overrides: Partial<GameSettingsData> = {}): GameSettings {
    const defaults: GameSettingsData = {
      worldDimensions: new WorldDimensions(100, 100),
      maxDepth: 9,
      tileSize: 6,
      pumpRate: 1
    };

    return new GameSettings({ ...defaults, ...overrides });
  }

  /**
   * Create empty game state snapshot
   */
  static createEmptySnapshot(settings: GameSettings, terrain: TileMap2D): GameStateSnapshot {
    return new GameStateSnapshot({
      settings,
      terrain,
      basins: new Map(),
      pipeSystems: new Map(),
      tickCounter: new TickCounter(0),
      selectedReservoirId: null,
      highlightedBasinId: null
    });
  }
}
