// PumpSystemManager: handles pumps and reservoirs, linking, tick logic
import { PumpManager, ReservoirManager } from "../pumps.ts";
import { BasinManager } from "../basins.ts";

export class PumpSystemManager {
  #pumpManager: PumpManager;
  #reservoirManager: ReservoirManager;
  #basinManager: BasinManager;

  constructor() {
    this.#reservoirManager = new ReservoirManager();
    this.#basinManager = new BasinManager();
    this.#pumpManager = new PumpManager(this.#reservoirManager, this.#basinManager);
  }

  addPump(x: number, y: number, mode: string, linkToExisting = false): unknown {
    return this.#pumpManager.addPumpAt(x, y, mode, linkToExisting);
  }

  linkPumpToReservoir(x: number, y: number): unknown {
    return this.#pumpManager.linkPumpToReservoir(x, y);
  }

  clearPumps(): void {
    this.#pumpManager.clearAll();
  }

  tick(): void {
    this.#pumpManager.tick();
  }

  setSelectedReservoir(id: number | null): void {
    this.#reservoirManager.setSelectedReservoir(id);
  }

  getSelectedReservoir(): number | null {
    return this.#reservoirManager.getSelectedReservoir();
  }

  getAllPumps(): unknown {
    return this.#pumpManager.getAllPumps();
  }

  getAllReservoirs(): unknown {
    return this.#reservoirManager.getAllReservoirs();
  }

  getPumpsByReservoir(): unknown {
    return this.#pumpManager.getPumpsByReservoir();
  }

  get pumpManager(): PumpManager {
    return this.#pumpManager;
  }

  get reservoirManager(): ReservoirManager {
    return this.#reservoirManager;
  }

  get basinManager(): BasinManager {
    return this.#basinManager;
  }
}
