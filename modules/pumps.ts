// Pump and reservoir management system

import { CONFIG } from "./config.ts";
import type { BasinManager } from "./basins/index.ts";

export interface Reservoir {
  volume: number;
}

export interface Pump {
  x: number;
  y: number;
  mode: "inlet" | "outlet";
  reservoirId: number;
  lowestBasinId: string | null; // Basin at the pump's tile (deepest accessible basin)
  activeBasinId: string | null; // Basin currently being pumped from/to (top of stack)
  basinStack: string[]; // Stack of basin IDs from lowest to highest (for navigation)
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

    // Find the lowest basin at this tile (deepest basin the pump can reach)
    const lowestBasinId = this.findLowestBasinAt(x, y);

    // Build the basin stack from lowest to highest (following outlets)
    const basinStack = this.buildBasinStack(lowestBasinId);

    // Set initial active basin based on pump mode:
    // - Inlet: Start from shallowest basin (end of stack) where water surface is
    // - Outlet: Start from deepest basin (start of stack) to fill bottom-up
    let activeBasinId: string | null;
    if (mode === "inlet") {
      // For inlet, start from the topmost basin with water (end of stack)
      activeBasinId = basinStack.length > 0 ? basinStack[basinStack.length - 1]! : lowestBasinId;
    } else {
      // For outlet, start from the deepest basin (start of stack)
      activeBasinId = lowestBasinId;
    }

    this.pumps.push({ x, y, mode, reservoirId, lowestBasinId, activeBasinId, basinStack });
    return reservoirId;
  }

  /**
   * Find the lowest (deepest) basin at a given tile.
   * This represents the deepest point the pump can reach.
   */
  private findLowestBasinAt(x: number, y: number): string | null {
    // The basin at the pump's tile is the lowest accessible basin
    return this.basinManager.getBasinIdAt(x, y);
  }

  /**
   * Build a stack of basin IDs from lowest (deepest) to highest (shallowest).
   * The stack follows the outlet chain from the starting basin upwards.
   */
  private buildBasinStack(startBasinId: string | null): string[] {
    if (!startBasinId) return [];

    const stack: string[] = [];
    let currentId: string | null = startBasinId;

    while (currentId) {
      stack.push(currentId);
      const basin = this.basinManager.getBasin(currentId);
      if (!basin || basin.outlets.length === 0) break;
      currentId = basin.outlets[0] ?? null; // Follow first outlet (parent basin)
    }

    return stack;
  }

  /**
   * Find the active basin at a given tile based on current water levels.
   * The active basin is the basin containing the current water surface level.
   * It must be at or above the pump level (lowest basin) and at or below depth 1.
   */
  private findActiveBasinAt(_x: number, _y: number, lowestBasinId: string | null): string | null {
    if (!lowestBasinId) return null;

    const lowestBasin = this.basinManager.getBasin(lowestBasinId);
    if (!lowestBasin) return null;

    // Start from the lowest basin and traverse up through ancestors
    // to find the basin that currently contains water at this location
    let currentBasinId: string | null = lowestBasinId;

    while (currentBasinId) {
      const basin = this.basinManager.getBasin(currentBasinId);
      if (!basin) break;

      // Check if this basin has water (level > 0)
      if (basin.level > 0) {
        return currentBasinId;
      }

      // Move to parent basin (shallower outlet)
      // For now, assume first outlet is the parent (we'll refine this)
      currentBasinId = basin.outlets[0] ?? null;

      // Stop at depth 1 (can't pump above ground level)
      if (basin.outlets.length > 0) {
        const parentBasin = this.basinManager.getBasin(basin.outlets[0]!);
        if (parentBasin && parentBasin.height <= 1) {
          break;
        }
      }
    }

    // If no basin with water found, default to lowest basin
    return lowestBasinId;
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
      const reservoir = this.reservoirManager.getReservoir(pump.reservoirId);
      if (!reservoir) continue;

      // Ensure activeBasinId is set (defaults to lowestBasinId)
      if (!pump.activeBasinId) {
        pump.activeBasinId = pump.lowestBasinId;
      }

      // Get the currently active basin
      const activeBasin = pump.activeBasinId
        ? this.basinManager.getBasin(pump.activeBasinId)
        : null;

      if (!activeBasin || pump.basinStack.length === 0) continue;

      // Find current position in stack
      const stackIndex = pump.activeBasinId ? pump.basinStack.indexOf(pump.activeBasinId) : -1;
      if (stackIndex === -1) continue;

      if (pump.mode === "inlet") {
        // Pump water from basin to reservoir (extract from shallowest basin with water)
        const take = Math.min(CONFIG.PUMP_RATE, activeBasin.volume);
        activeBasin.volume -= take;
        reservoir.volume += take;

        // If basin is drained, move down the stack to deeper basin with water
        if (activeBasin.volume <= 0 && stackIndex > 0) {
          // Search down the stack (towards deeper basins) for water
          for (let i = stackIndex - 1; i >= 0; i--) {
            const basinId = pump.basinStack[i];
            const basin = this.basinManager.getBasin(basinId!);
            if (basin && basin.volume > 0) {
              pump.activeBasinId = basinId!;
              break;
            }
          }
        }
      } else {
        // Pump water from reservoir to basin (fill from deepest basin upward)
        const give = Math.min(CONFIG.PUMP_RATE, Math.max(0, reservoir.volume));
        const spaceAvailable = activeBasin.capacity - activeBasin.volume;
        const actualGive = Math.min(give, spaceAvailable);

        reservoir.volume -= actualGive;
        activeBasin.volume += actualGive;

        // If basin reaches capacity, move up the stack to parent basin
        if (activeBasin.volume >= activeBasin.capacity && stackIndex < pump.basinStack.length - 1) {
          pump.activeBasinId = pump.basinStack[stackIndex + 1]!;
          
          // Add any remaining water to parent
          const remaining = give - actualGive;
          if (remaining > 0) {
            const parentBasin = this.basinManager.getBasin(pump.activeBasinId);
            if (parentBasin) {
              const parentSpace = parentBasin.capacity - parentBasin.volume;
              const parentGive = Math.min(remaining, parentSpace);
              parentBasin.volume += parentGive;
              reservoir.volume += remaining - parentGive; // Return unused water
            }
          }
        }
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
