// Debug display for basins, reservoirs, and pumps with interactive management

import type { BasinData, BasinManager } from "../basins/index.ts";
import { GameState } from "../GameState.ts";

export interface DebugDisplayCallbacks {
  removePump: (index: number) => void;
  removeReservoir: (id: number) => void;
  updateControls: () => void;
  updateDisplays: () => void;
  updateDebugDisplays: () => void;
  clearSelection: () => void;
  draw: () => void;
}

interface BasinEntry {
  id: string;
  height: number;
  basin: BasinData;
  maxCapacity: number;
  children: BasinEntry[];
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
    const debugBasinsDiv = document.getElementById("basinsText");
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
    // For tree display: shallow basins are "parents" that receive water from deeper "children"
    // So if basin A has outlet B, then B is the parent of A in the tree
    const childrenOfBasin = new Map<string, string[]>();

    for (const entry of basinEntries) {
      // For each outlet this basin has, that outlet basin should list this as a child
      for (const outletId of entry.basin.outlets) {
        if (!childrenOfBasin.has(outletId)) {
          childrenOfBasin.set(outletId, []);
        }
        childrenOfBasin.get(outletId)!.push(entry.id);
      }
    }

    // Debug: Print outlet relationships
    console.log("=== Basin Outlet Relationships ===");
    for (const [id, basin] of basins) {
      const feeders = childrenOfBasin.get(id) || [];
      console.log(
        `${id}: outlets=[${basin.outlets.join(", ") || "none"}], feeders=[${
          feeders.join(", ") || "none"
        }]`,
      );
    }
    console.log("==================================");

    // Find root basins (basins with no outlets - they don't overflow anywhere)
    const rootBasins = basinEntries.filter((entry) => entry.basin.outlets.length === 0);

    // Build hierarchy
    function buildHierarchy(entry: BasinEntry): void {
      const childIds = childrenOfBasin.get(entry.id) || [];
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

    // Debug: Print basin tree structure
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║              Basin Tree Structure                          ║");
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log(`║ Total basins: ${basins.size.toString().padEnd(44)}║`);
    console.log(`║ Root basins:  ${rootBasins.length.toString().padEnd(44)}║`);
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    function printTree(
      entry: BasinEntry,
      indent: number = 0,
      isLast: boolean = true,
      prefix: string = "",
    ): void {
      const connector = isLast ? "└─" : "├─";
      const childPrefix = prefix + (isLast ? "  " : "│ ");

      const heightLabel = entry.basin.height === 0 ? "Surface" : `H${entry.basin.height}`;
      const waterPercent = entry.basin.volume > 0
        ? ((entry.basin.volume / entry.maxCapacity) * 100).toFixed(1)
        : "0.0";
      const outletStr = entry.basin.outlets.length > 0
        ? ` → [${entry.basin.outlets.join(", ")}]`
        : "";

      console.log(
        `${prefix}${connector} ${entry.id} (${heightLabel}, ${entry.basin.tiles.size} tiles, ${waterPercent}% full)${outletStr}`,
      );

      for (let i = 0; i < entry.children.length; i++) {
        const child = entry.children[i]!;
        const childIsLast = i === entry.children.length - 1;
        printTree(child, indent + 1, childIsLast, childPrefix);
      }
    }

    if (rootBasins.length === 0) {
      console.log("  (no basins)\n");
    } else {
      for (let i = 0; i < rootBasins.length; i++) {
        const root = rootBasins[i]!;
        const isLast = i === rootBasins.length - 1;
        printTree(root, 0, isLast, "");
      }
    }
    console.log("");

    // Render hierarchical structure as nested list
    debugBasinsDiv.innerHTML = "";
    const rootList = document.createElement("ul");
    rootList.className = "basin-tree";
    const template = document.getElementById("template-basin-item") as HTMLTemplateElement | null;

    const renderBasin = (entry: BasinEntry): HTMLElement | null => {
      if (!template) return null;

      const clone = template.content.cloneNode(true) as DocumentFragment;
      const li = clone.querySelector(".basin-item") as HTMLLIElement;
      const summary = clone.querySelector(".basin-summary") as HTMLElement;
      const idEl = clone.querySelector(".basin-id") as HTMLElement;
      const infoEl = clone.querySelector(".basin-info") as HTMLElement;
      const childrenList = clone.querySelector(".basin-children") as HTMLUListElement;
      const details = clone.querySelector("details") as HTMLDetailsElement;

      if (!li || !summary || !idEl || !infoEl || !childrenList || !details) return null;

      // Set basin data
      const heightLabel = entry.basin.height === 0 ? "Surface" : `H${entry.basin.height}`;
      const waterPercent = entry.basin.volume > 0
        ? ((entry.basin.volume / entry.maxCapacity) * 100).toFixed(1)
        : "0.0";

      idEl.textContent = entry.id;
      infoEl.textContent =
        ` (${heightLabel}, ${entry.basin.tiles.size} tiles, ${waterPercent}% full)`;

      // Store basin ID for interaction
      li.dataset.basinId = entry.id;

      // Add click handler to summary for selection
      summary.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState.selectedBasinId === entry.id) {
          this.gameState.selectedBasinId = null;
          this.callbacks.clearSelection();
        } else {
          this.gameState.selectedBasinId = entry.id;
          this.updateBasinHighlights();
        }
        this.callbacks.draw();
      });

      // Hover handlers
      summary.addEventListener("mouseenter", () => {
        if (this.gameState.selectedBasinId !== entry.id) {
          if (this.onBasinHighlightChange) {
            this.onBasinHighlightChange(entry.id);
          }
          this.callbacks.draw();
        }
      });

      summary.addEventListener("mouseleave", () => {
        if (this.gameState.selectedBasinId !== entry.id) {
          if (this.onBasinHighlightChange) {
            this.onBasinHighlightChange(null);
          }
          this.callbacks.draw();
        }
      });

      // Render children recursively
      if (entry.children.length > 0) {
        entry.children.forEach((child) => {
          const childElement = renderBasin(child);
          if (childElement) {
            childrenList.appendChild(childElement);
          }
        });
      } else {
        // Mark as leaf node (no children) for CSS styling
        details.classList.add("leaf-node");
        childrenList.style.display = "none";
      }

      return li;
    };

    for (const root of rootBasins) {
      const rootElement = renderBasin(root);
      if (rootElement) {
        rootList.appendChild(rootElement);
      }
    }

    debugBasinsDiv.appendChild(rootList);
    this.updateBasinHighlights();
  }

  updateReservoirsDisplay(): void {
    const debugReservoirsDiv = document.getElementById("reservoirsText");
    const reservoirTemplate = document.getElementById(
      "template-reservoir-item",
    ) as HTMLTemplateElement | null;
    const pumpTemplate = document.getElementById("template-pump-item") as
      | HTMLTemplateElement
      | null;

    if (!debugReservoirsDiv || !reservoirTemplate || !pumpTemplate) return;

    const reservoirs = this.gameState.getReservoirs();
    const pumps = this.gameState.getPumps();

    if (reservoirs.size === 0) {
      debugReservoirsDiv.innerHTML = "<em>No reservoirs</em>";
      return;
    }

    debugReservoirsDiv.innerHTML = "";

    // Group pumps by reservoir (pipe system)
    const pumpsByReservoir = new Map<number, Array<typeof pumps[number] & { index: number }>>();
    pumps.forEach((pump, index) => {
      if (!pumpsByReservoir.has(pump.reservoirId)) {
        pumpsByReservoir.set(pump.reservoirId, []);
      }
      pumpsByReservoir.get(pump.reservoirId)!.push({ ...pump, index });
    });

    for (const [id, reservoir] of reservoirs) {
      const clone = reservoirTemplate.content.cloneNode(true) as DocumentFragment;
      const titleEl = clone.querySelector(".reservoir-title") as HTMLElement;
      const removeBtn = clone.querySelector(".remove-btn") as HTMLButtonElement;
      const pumpsContainer = clone.querySelector(".reservoir-pumps") as HTMLElement;

      if (titleEl && removeBtn && pumpsContainer) {
        const systemPumps = pumpsByReservoir.get(id) || [];
        const pumpCount = systemPumps.length;
        titleEl.textContent = `Pipe System ${id} - ${
          reservoir.volume.toFixed(1)
        } water (${pumpCount} pump${pumpCount !== 1 ? "s" : ""})`;

        removeBtn.addEventListener("click", () => {
          this.callbacks.removeReservoir(id);
          this.callbacks.updateControls();
          this.callbacks.updateDisplays();
          this.callbacks.updateDebugDisplays();
          this.callbacks.draw();
        });

        if (systemPumps.length > 0) {
          const table = document.createElement("table");
          table.className = "pumps-table";
          const tbody = document.createElement("tbody");

          systemPumps.forEach((pumpWithIndex, pumpIndex) => {
            const pumpClone = pumpTemplate.content.cloneNode(true) as DocumentFragment;
            const pumpLabel = pumpClone.querySelector(".pump-label") as HTMLElement;
            const pumpCoords = pumpClone.querySelector(".pump-coords") as HTMLElement;
            const pumpTypeBadge = pumpClone.querySelector(".pump-type-badge") as HTMLElement;
            const removePumpBtn = pumpClone.querySelector(".remove-btn") as HTMLButtonElement;

            if (pumpLabel && pumpCoords && pumpTypeBadge && removePumpBtn) {
              pumpLabel.textContent = `P${id}.${pumpIndex + 1}`;
              pumpCoords.textContent = `(${pumpWithIndex.x}, ${pumpWithIndex.y})`;

              // Set badge style and text based on mode
              pumpTypeBadge.textContent = pumpWithIndex.mode;
              pumpTypeBadge.classList.add(
                pumpWithIndex.mode === "inlet" ? "inlet-badge" : "outlet-badge",
              );

              removePumpBtn.addEventListener("click", () => {
                this.callbacks.removePump(pumpWithIndex.index);
                this.callbacks.updateControls();
                this.callbacks.updateDisplays();
                this.callbacks.updateDebugDisplays();
                this.callbacks.draw();
              });

              tbody.appendChild(pumpClone);
            }
          });

          table.appendChild(tbody);
          pumpsContainer.appendChild(table);
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
    const debugBasinsDiv = document.getElementById("basinsText");
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
    const basinItems = document.querySelectorAll(".basin-item");
    basinItems.forEach((item) => {
      const basinId = (item as HTMLElement).dataset.basinId;
      const summary = item.querySelector(".basin-summary") as HTMLElement;
      if (summary && basinId === this.gameState.selectedBasinId) {
        summary.style.background = "var(--blue-3)";
      } else if (summary) {
        summary.style.background = "";
      }
    });
  }

  setBasinHighlightChangeCallback(callback: (basinId: string | null) => void): void {
    this.onBasinHighlightChange = callback;
  }
}
