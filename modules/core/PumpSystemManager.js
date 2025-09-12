// PumpSystemManager: handles pumps and reservoirs, linking, tick logic
// @ts-check
import { PumpManager, ReservoirManager } from "../pumps.js";

export class PumpSystemManager {
  /** @type {PumpManager} */
  #pumpManager;
  /** @type {ReservoirManager} */
  #reservoirManager;

  constructor() {
    this.#reservoirManager = new ReservoirManager();
    this.#pumpManager = new PumpManager(this.#reservoirManager);
  }

  /** @param {number} x @param {number} y @param {string} mode @param {boolean} [linkToExisting=false] */
  addPump(x, y, mode, linkToExisting = false) {
    return this.#pumpManager.addPumpAt(x, y, mode, linkToExisting);
  }

  /** @param {number} x @param {number} y */
  linkPumpToReservoir(x, y) {
    return this.#pumpManager.linkPumpToReservoir(x, y);
  }

  clearPumps() {
    this.#pumpManager.clearAll();
  }

  tick() {
    this.#pumpManager.tick();
  }

  /** @param {string} id */
  setSelectedReservoir(id) {
    this.#reservoirManager.setSelectedReservoir(id);
  }

  getSelectedReservoir() {
    return this.#reservoirManager.getSelectedReservoir();
  }

  getAllPumps() { return this.#pumpManager.getAllPumps(); }
  getAllReservoirs() { return this.#reservoirManager.getAllReservoirs(); }
  getPumpsByReservoir() { return this.#pumpManager.getPumpsByReservoir(); }
  get pumpManager() { return this.#pumpManager; }
  get reservoirManager() { return this.#reservoirManager; }
}
