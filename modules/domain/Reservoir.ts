import { Position } from "./TerrainModels.ts";
import { Pump, PumpMode } from "./Pump.ts";
import { PumpID } from "./BasinModels.ts";

/**
 * Reservoir entity - water storage connected to pumps
 */
export class Reservoir {
  public readonly id: number;
  public waterVolume: number;
  public pumps: Map<PumpID, Pump>;
  private _nextPumpId: number = 1;

  constructor(
    id: number,
    waterVolume = 0,
    pumps: Map<PumpID, Pump> = new Map()
  ) {
    if (id < 0) throw new Error("Reservoir ID cannot be negative");
    this.id = id;
    this.waterVolume = Math.max(0, waterVolume);
    this.pumps = new Map(pumps);
  }

  addWater(amount: number): void {
    this.waterVolume = Math.max(0, this.waterVolume + amount);
  }

  removeWater(amount: number): number {
    const removed = Math.min(this.waterVolume, amount);
    this.waterVolume -= removed;
    return removed;
  }

  isEmpty(): boolean {
    return this.waterVolume <= 0;
  }

  addPump(position: Position, mode: PumpMode = "inlet"): Pump {
    const pumpId = `P${this.id}.${this._nextPumpId++}` as PumpID;
    const pump = new Pump(pumpId, position, this.id, mode);
    this.pumps.set(pumpId, pump);
    return pump;
  }

  removePumpById(id: PumpID): boolean {
    return this.pumps.delete(id);
  }

  getPump(id: PumpID): Pump | undefined {
    return this.pumps.get(id);
  }

  getAllPumps(): Pump[] {
    return Array.from(this.pumps.values());
  }
}
