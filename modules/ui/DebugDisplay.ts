// Debug display for basins, reservoirs, and pumps with interactive management

import type { BasinManager } from "../basins.ts";

export interface DebugDisplayCallbacks {
  removePump: (index: number) => void;
  removeReservoir: (id: number) => void;
  updateControls: () => void;
  updateDisplays: () => void;
  updateDebugDisplays: () => void;
  clearSelection: () => void;
  draw: () => void;
}

interface BasinData {
  tiles: Set<string>;
  volume: number;
  level: number;
  height: number;
  outlets: string[];
}

interface BasinEntry {
  id: string;
  height: number;
  basin: BasinData;
  maxCapacity: number;
  children: BasinEntry[];
}

interface GameState {
  basinManager: BasinManager;
  reservoirs: Map<number, { id: number; waterStored: number; x: number; y: number }>;
  pumps: Array<{
    x: number;
    y: number;
    reservoirId: number;
    mode: "in" | "out";
    color: string;
  }>;
  selectedDepth: number | null;
  selectedBasinId: string | null;
}

export class DebugDisplay {
  private basinManager: BasinManager;
  private gameState: GameState;
  private callbacks: DebugDisplayCallbacks;
  private onBasinHighlightChange: ((basinId: string | null) => void) | null = null;

  constructor(
    basinManager: BasinManager,
    gameState: GameState,
    callbacks: DebugDisplayCallbacks,
  ) {
    this.basinManager = basinManager;
    this.gameState = gameState;
    this.callbacks = callbacks;
  }

  updateBasinsDisplay(): void {
    const debugBasinsDiv = document.getElementById("debugBasins");
    if (!debugBasinsDiv) return;

    const basins = this.basinManager.basins;

    if (basins.size === 0) {
      debugBasinsDiv.innerHTML = "<em>No basins detected</em>";
      return;
    }

    // Build a hierarchical structure of basins based on outlet relationships
    const basinEntries: BasinEntry[] = [];
    const basinMap = new Map<string, BasinEntry>();

    // First pass: create entries for all basins
    for (const [id, basin] of basins) {
      const entry: BasinEntry = {
        id,
        height: basin.height,
        basin,
        maxCapacity: basin.tiles.size * basin.height,
        children: [],
      };
      basinEntries.push(entry);
      basinMap.set(id, entry);
    }

    // Second pass: build parent-child relationships
    // A basin is a child of another if it's in the other's outlets
    const childToParents = new Map<string, string[]>();

    for (const entry of basinEntries) {
      for (const outletId of entry.basin.outlets) {
        if (!childToParents.has(outletId)) {
          childToParents.set(outletId, []);
        }
        childToParents.get(outletId)!.push(entry.id);
      }
    }

    // Find root basins (basins with no parents)
    const rootBasins = basinEntries.filter((entry) => !childToParents.has(entry.id));

    // Build hierarchy
    function buildHierarchy(entry: BasinEntry): void {
      const childIds = childToParents.get(entry.id) || [];
      for (const childId of childIds) {
        const childEntry = basinMap.get(childId);
        if (childEntry && !entry.children.includes(childEntry)) {
          entry.children.push(childEntry);
          buildHierarchy(childEntry);
        }
      }
    }

    for (const root of rootBasins) {
      buildHierarchy(root);
    }

    // Sort roots by height
    rootBasins.sort((a, b) => a.height - b.height);

    // Render hierarchical structure
    debugBasinsDiv.innerHTML = "";
    const template = document.getElementById("template-basin-item") as HTMLTemplateElement | null;

    const renderBasin = (entry: BasinEntry, indent: number): void => {
      if (!template) return;

      const clone = template.content.cloneNode(true) as DocumentFragment;
      const div = clone.querySelector(".basin-item") as HTMLElement;
      const idEl = clone.querySelector(".basin-id") as HTMLElement;
      const infoEl = clone.querySelector(".basin-info") as HTMLElement;
      const outletsEl = clone.querySelector(".basin-outlets") as HTMLElement;

      if (div && idEl && infoEl && outletsEl) {
        div.style.marginLeft = `${indent * 12}px`;
        div.style.fontSize = "12px";
        div.style.lineHeight = "1.5";

        const heightLabel = entry.basin.height === 0 ? "Surface" : `Height ${entry.basin.height}`;
        const waterPercent = entry.basin.volume > 0
          ? ((entry.basin.volume / entry.maxCapacity) * 100).toFixed(1)
          : "0.0";

        idEl.textContent = entry.id;
        infoEl.textContent =
          ` (${heightLabel}, ${entry.basin.tiles.size} tiles, ${waterPercent}% full)`;

        if (entry.basin.outlets.length > 0) {
          outletsEl.style.fontSize = "11px";
          outletsEl.style.color = "var(--gray-6)";
          outletsEl.textContent = ` → outlets: ${entry.basin.outlets.join(", ")}`;
        } else {
          outletsEl.textContent = "";
        }

        debugBasinsDiv!.appendChild(clone);
      }

      // Render children with increased indent
      for (const child of entry.children) {
        renderBasin(child, indent + 1);
      }
    };

    for (const root of rootBasins) {
      renderBasin(root, 0);
    }
  }

  updateReservoirsDisplay(): void {
    const debugReservoirsDiv = document.getElementById("debugReservoirs");
    const reservoirTemplate = document.getElementById(
      "template-reservoir-item",
    ) as HTMLTemplateElement | null;
    const pumpTemplate = document.getElementById("template-pump-item") as
      | HTMLTemplateElement
      | null;

    if (!debugReservoirsDiv || !reservoirTemplate || !pumpTemplate) return;

    const reservoirs = this.gameState.reservoirs;
    const pumps = this.gameState.pumps;

    if (reservoirs.size === 0) {
      debugReservoirsDiv.innerHTML = "<em>No reservoirs</em>";
      return;
    }

    debugReservoirsDiv.innerHTML = "";

    // Group pumps by reservoir (pipe system)
    const pumpsByReservoir = new Map<number, typeof pumps>();
    for (const pump of pumps) {
      if (!pumpsByReservoir.has(pump.reservoirId)) {
        pumpsByReservoir.set(pump.reservoirId, []);
      }
      pumpsByReservoir.get(pump.reservoirId)!.push(pump);
    }

    for (const [id, reservoir] of reservoirs) {
      const clone = reservoirTemplate.content.cloneNode(true) as DocumentFragment;
      const div = clone.querySelector(".reservoir-item") as HTMLElement;
      const titleEl = clone.querySelector(".reservoir-title") as HTMLElement;
      const removeBtn = clone.querySelector(".remove-btn") as HTMLButtonElement;
      const pumpsContainer = clone.querySelector(".reservoir-pumps") as HTMLElement;

      if (div && titleEl && removeBtn && pumpsContainer) {
        div.style.marginBottom = "8px";
        div.style.fontSize = "12px";

        titleEl.textContent = `Pipe System ${id} at (${reservoir.x}, ${reservoir.y}) - ${
          reservoir.waterStored.toFixed(1)
        } water`;

        removeBtn.style.cssText =
          "margin-left: 8px; padding: 2px 6px; font-size: 11px; background: var(--red-6); color: white; border: none; border-radius: 3px; cursor: pointer;";
        removeBtn.addEventListener("click", () => {
          this.callbacks.removeReservoir(id);
          this.callbacks.updateControls();
          this.callbacks.updateDisplays();
          this.callbacks.updateDebugDisplays();
          this.callbacks.draw();
        });

        const systemPumps = pumpsByReservoir.get(id) || [];
        if (systemPumps.length > 0) {
          pumpsContainer.style.marginLeft = "12px";
          pumpsContainer.style.fontSize = "11px";

          const pumpsTitle = document.createElement("div");
          pumpsTitle.textContent = `${systemPumps.length} pump(s):`;
          pumpsContainer.appendChild(pumpsTitle);

          for (let i = 0; i < pumps.length; i++) {
            const pump = pumps[i]!;
            if (pump.reservoirId === id) {
              const pumpClone = pumpTemplate.content.cloneNode(true) as DocumentFragment;
              const pumpDiv = pumpClone.querySelector(".pump-item") as HTMLElement;
              const colorBox = pumpClone.querySelector(".pump-color-box") as HTMLElement;
              const pumpInfo = pumpClone.querySelector(".pump-info") as HTMLElement;
              const removePumpBtn = pumpClone.querySelector(".remove-btn") as HTMLButtonElement;

              if (pumpDiv && colorBox && pumpInfo && removePumpBtn) {
                pumpDiv.style.marginLeft = "24px";

                colorBox.style.cssText =
                  `display: inline-block; width: 12px; height: 12px; background: ${pump.color}; margin-right: 4px; border: 1px solid var(--gray-6);`;

                pumpInfo.textContent = `(${pump.x}, ${pump.y}) - ${pump.mode} `;

                removePumpBtn.style.cssText =
                  "margin-left: 8px; padding: 2px 6px; font-size: 11px; background: var(--red-6); color: white; border: none; border-radius: 3px; cursor: pointer;";
                removePumpBtn.addEventListener("click", () => {
                  this.callbacks.removePump(i);
                  this.callbacks.updateControls();
                  this.callbacks.updateDisplays();
                  this.callbacks.updateDebugDisplays();
                  this.callbacks.draw();
                });

                pumpsContainer.appendChild(pumpClone);
              }
            }
          }
        }

        debugReservoirsDiv.appendChild(clone);
      }
    }
  }

  updateTickCounter(ticks: number): void {
    const tickCounterDiv = document.getElementById("tickCounter");
    if (tickCounterDiv) {
      tickCounterDiv.textContent = `Ticks: ${ticks}`;
    }
  }

  createInteractiveReservoirDisplay(): void {
    this.updateReservoirsDisplay();
  }

  createInteractiveBasinDisplay(): void {
    const debugBasinsDiv = document.getElementById("debugBasins");
    if (!debugBasinsDiv) return;

    const basins = this.basinManager.basins;

    if (basins.size === 0) {
      debugBasinsDiv.innerHTML = "<em>No basins detected</em>";
      return;
    }

    debugBasinsDiv.innerHTML = "";

    // Sort basins by height, then by ID
    const sortedBasins = Array.from(basins.entries()).sort((a, b) => {
      if (a[1].height !== b[1].height) return a[1].height - b[1].height;
      return a[0].localeCompare(b[0]);
    });

    for (const [id, basin] of sortedBasins) {
      const div = document.createElement("div");
      div.className = "basin-line";
      div.dataset.basinId = id;
      div.style.cssText =
        "padding: 4px 8px; margin: 2px 0; cursor: pointer; border-radius: 4px; font-size: 12px;";

      const maxCapacity = basin.tiles.size * basin.height;
      const waterPercent = basin.volume > 0
        ? ((basin.volume / maxCapacity) * 100).toFixed(1)
        : "0.0";

      const heightLabel = basin.height === 0 ? "Surface" : `Height ${basin.height}`;

      div.innerHTML =
        `<strong>${id}</strong> (${heightLabel}, ${basin.tiles.size} tiles, ${waterPercent}% full)`;

      // Click for permanent selection
      div.addEventListener("click", () => {
        if (this.gameState.selectedBasinId === id) {
          this.gameState.selectedBasinId = null;
          this.callbacks.clearSelection();
        } else {
          this.gameState.selectedBasinId = id;
          this.updateBasinHighlights();
        }
        this.callbacks.draw();
      });

      // Hover for temporary highlighting
      div.addEventListener("mouseenter", () => {
        if (this.gameState.selectedBasinId !== id) {
          if (this.onBasinHighlightChange) {
            this.onBasinHighlightChange(id);
          }
          this.callbacks.draw();
        }
      });

      div.addEventListener("mouseleave", () => {
        if (this.gameState.selectedBasinId !== id) {
          if (this.onBasinHighlightChange) {
            this.onBasinHighlightChange(null);
          }
          this.callbacks.draw();
        }
      });

      debugBasinsDiv.appendChild(div);
    }

    this.updateBasinHighlights();
  }

  updateBasinHighlights(): void {
    const basinLines = document.querySelectorAll(".basin-line");
    basinLines.forEach((line) => {
      const basinId = (line as HTMLElement).dataset.basinId;
      if (basinId === this.gameState.selectedBasinId) {
        (line as HTMLElement).style.background = "var(--blue-3)";
      } else {
        (line as HTMLElement).style.background = "";
      }
    });
  }

  setBasinHighlightChangeCallback(callback: (basinId: string | null) => void): void {
    this.onBasinHighlightChange = callback;
  }
}
