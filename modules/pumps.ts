// Pump and reservoir management system

import { CONFIG } from "./config.ts";
import type { BasinManager } from "./basins.ts";

export interface Reservoir {
  volume: number;
}

export interface Pump {
  x: number;
  y: number;
  mode: "inlet" | "outlet";
  reservoirId: number;
}

export class ReservoirManager {
  reservoirs: Map<number, Reservoir>;
  selectedReservoirId: number | null;

  constructor() {
    this.reservoirs = new Map();
    this.selectedReservoirId = null;
  }

  createReservoir(id: number | null = null): number {
    // If no ID provided, find the next available ID starting from 1
    let newId = id;
    if (newId === null || newId <= 0) {
      newId = 1;
      while (this.reservoirs.has(newId)) {
        newId++;
      }
    }

    // Only create if it doesn't already exist
    if (!this.reservoirs.has(newId)) {
      this.reservoirs.set(newId, { volume: 0 });
    }
    return newId;
  }

  getReservoir(id: number): Reservoir | undefined {
    return this.reservoirs.get(id);
  }

  setSelectedReservoir(id: number | null): void {
    this.selectedReservoirId = id;
  }

  getSelectedReservoir(): number | null {
    return this.selectedReservoirId;
  }

  clearAll(): void {
    this.reservoirs.clear();
    this.selectedReservoirId = null;
  }

  clearAllWater(): void {
    this.reservoirs.forEach((reservoir) => {
      reservoir.volume = 0;
    });
  }

  exists(id: number): boolean {
    return this.reservoirs.has(id);
  }

  getAllReservoirs(): Map<number, Reservoir> {
    return this.reservoirs;
  }

  removeReservoir(id: number): boolean {
    if (this.reservoirs.has(id)) {
      this.reservoirs.delete(id);
      return true;
    }
    return false;
  }
}

export class PumpManager {
  pumps: Pump[];
  private reservoirManager: ReservoirManager;
  private basinManager: BasinManager;

  constructor(reservoirManager: ReservoirManager, basinManager: BasinManager) {
    this.pumps = [];
    this.reservoirManager = reservoirManager;
    this.basinManager = basinManager;
  }

  addPumpAt(
    x: number,
    y: number,
    mode: "inlet" | "outlet",
    linkToReservoir: boolean = false,
  ): number | null {
    const basinId = this.basinManager.getBasinIdAt(x, y);
    if (!basinId) return null;

    let reservoirId: number;
    const selectedId = this.reservoirManager.getSelectedReservoir();

    if (linkToReservoir && selectedId && this.reservoirManager.exists(selectedId)) {
      // Link to existing selected reservoir
      reservoirId = selectedId;
    } else if (selectedId && selectedId > 0) {
      // Use the selected ID from input field as source of truth
      reservoirId = this.reservoirManager.createReservoir(selectedId);
    } else {
      // This should never happen as input field should always have a valid value >= 1
      // But as a fallback, create reservoir with ID 1
      reservoirId = this.reservoirManager.createReservoir(1);
    }

    this.pumps.push({ x, y, mode, reservoirId });
    return reservoirId;
  }

  linkPumpToReservoir(x: number, y: number): boolean {
    // Find existing pump at this location to get its reservoir
    const existingPump = this.pumps.find((p) => p.x === x && p.y === y);
    if (existingPump) {
      this.reservoirManager.setSelectedReservoir(existingPump.reservoirId);
      console.log(`Selected reservoir ${existingPump.reservoirId} for linking`);
      return true;
    }

    // If no pump at exact location, find the nearest pump within a small radius
    const nearbyPumps = this.pumps.filter((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1);
    if (nearbyPumps.length > 0) {
      const nearbyPump = nearbyPumps[0]!;
      this.reservoirManager.setSelectedReservoir(nearbyPump.reservoirId);
      console.log(`Selected reservoir ${nearbyPump.reservoirId} for linking (from nearby pump)`);
      return true;
    }

    return false;
  }

  clearAll(): void {
    this.pumps = [];
    this.reservoirManager.clearAll();
  }

  tick(): void {
    for (const pump of this.pumps) {
      const basin = this.basinManager.getBasinAt(pump.x, pump.y);
      const reservoir = this.reservoirManager.getReservoir(pump.reservoirId);

      if (!basin || !reservoir) continue;

      if (pump.mode === "inlet") {
        // Pump water from basin to reservoir
        const take = Math.min(CONFIG.PUMP_RATE, basin.volume);
        basin.volume -= take;
        reservoir.volume += take;
      } else {
        // Pump water from reservoir to basin
        const give = Math.min(CONFIG.PUMP_RATE, Math.max(0, reservoir.volume));
        reservoir.volume -= give;
        basin.volume += give;
      }
    }

    // Update basin water levels after all pumping operations
    this.basinManager.updateWaterLevels();
  }

  getAllPumps(): Pump[] {
    return this.pumps;
  }

  removePump(index: number): boolean {
    if (index >= 0 && index < this.pumps.length) {
      this.pumps.splice(index, 1);
      return true;
    }
    return false;
  }

  removePumpAt(x: number, y: number): boolean {
    for (let i = 0; i < this.pumps.length; i++) {
      const pump = this.pumps[i];
      if (pump && pump.x === x && pump.y === y) {
        this.pumps.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  removePumpsByReservoir(reservoirId: number): number {
    const initialLength = this.pumps.length;
    this.pumps = this.pumps.filter((pump) => pump.reservoirId !== reservoirId);
    return initialLength - this.pumps.length;
  }

  // Get pumps grouped by reservoir for debugging
  getPumpsByReservoir(): Map<number, Array<Pump & { index: number }>> {
    const pumpsByReservoir = new Map<number, Array<Pump & { index: number }>>();
    this.pumps.forEach((pump, index) => {
      if (!pumpsByReservoir.has(pump.reservoirId)) {
        pumpsByReservoir.set(pump.reservoirId, []);
      }
      pumpsByReservoir.get(pump.reservoirId)!.push({ ...pump, index });
    });
    return pumpsByReservoir;
  }
}
