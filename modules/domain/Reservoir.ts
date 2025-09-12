import { Pump, PumpMode } from "./Pump.ts";
import { Position } from "./TerrainModels.ts";

/**
 * Reservoir entity - water storage connected to pumps and factory for pumps
 */

export class Reservoir {
  public readonly id: number;
  public waterVolume: number;
  public pumps: { [id: number]: Pump; };
  private _nextPumpId: number = 1;

  /**
   * @param id - Reservoir identifier
   * @param waterVolume - Current water volume
   */
  constructor(
    id: number,
    waterVolume = 0,
    pumps: { [id: number]: Pump; } = {}
  ) {
    if (id < 0) throw new Error("Reservoir ID cannot be negative");
    this.id = id;
    this.waterVolume = Math.max(0, Math.min(waterVolume));
    this.pumps = pumps;
  }

  addWater(amount: number) {
    this.waterVolume = Math.min(this.waterVolume + amount);
  }

  /**
   * Remove water from reservoir
   * @returns actual removed volume
   */
  removeWater(amount: number): number {
    const removed = Math.min(this.waterVolume, amount);
    this.waterVolume -= removed;
    return removed;
  }

  isEmpty() {
    return this.waterVolume <= 0;
  }

  addPump(position: Position, mode: PumpMode = "inlet"): Pump {
    const pump = new Pump(this._nextPumpId++, position, this, mode);
    this.pumps[pump.id] = pump;
    return pump;
  }

  removePumpById(id: number): boolean {
    const pump = this.pumps[id];
    if (pump) {
      delete this.pumps[id];
      return true;
    }
    return false;
  }
}
