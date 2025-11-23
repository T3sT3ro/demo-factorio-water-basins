// Debug display for basins, reservoirs, and pumps with interactive management

import type { BasinManager } from "../basins/index.ts";
import { GameState } from "../GameState.ts";
import { UI_CONSTANTS } from "../constants.ts";

export interface DebugDisplayCallbacks {
  removePump: (index: number) => void;
  removeReservoir: (id: number) => void;
  updateControls: () => void;
  updateDisplays: () => void;
  updateDebugDisplays: () => void;
  clearSelection: () => void;
  draw: () => void;
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

    // Convert BasinData to BasinTreeDebugInfo format for unified rendering
    const basinTree = this.convertBasinsToTreeDebugInfo(basins);

    // Use the same rendering logic as debug mode, but without active node highlighting
    this.renderBasinTree(basinTree, null, debugBasinsDiv, basins);
  }

  /**
   * Convert BasinManager's BasinData to BasinTreeDebugInfo format.
   * Computes descendant tile counts by traversing the basin hierarchy.
   */
  private convertBasinsToTreeDebugInfo(
    basins: Map<string, import("../basins/types.ts").BasinData>,
  ): import("../basins/types.ts").BasinTreeDebugInfo[] {
    const basinTree: import("../basins/types.ts").BasinTreeDebugInfo[] = [];
    const basinMap = new Map<string, import("../basins/types.ts").BasinTreeDebugInfo>();

    // First pass: create tree nodes with own tiles
    for (const [id, basin] of basins) {
      const node: import("../basins/types.ts").BasinTreeDebugInfo = {
        nodeId: id,
        depth: basin.height,
        ownTiles: basin.tiles.size,
        descendantTiles: 0, // Will be computed in second pass
        parentId: basin.outlets[0] ?? null, // Parent is the outlet (shallower basin)
        childrenIds: [], // Will be populated in second pass
      };
      basinTree.push(node);
      basinMap.set(id, node);
    }

    // Second pass: build parent-child relationships
    for (const node of basinTree) {
      if (node.parentId) {
        const parent = basinMap.get(node.parentId);
        if (parent) {
          parent.childrenIds.push(node.nodeId);
        }
      }
    }

    // Third pass: compute descendant tiles (bottom-up)
    const computeDescendantTiles = (nodeId: string): number => {
      const node = basinMap.get(nodeId);
      if (!node) return 0;

      let totalDescendants = 0;
      for (const childId of node.childrenIds) {
        const child = basinMap.get(childId);
        if (child) {
          // First ensure child's descendantTiles is computed
          if (child.childrenIds.length > 0 && child.descendantTiles === 0) {
            child.descendantTiles = computeDescendantTiles(childId);
          }
          // Add child's own tiles plus their descendants
          totalDescendants += child.ownTiles + child.descendantTiles;
        }
      }
      node.descendantTiles = totalDescendants;
      return totalDescendants;
    };

    // Compute from roots (basins with no outlets)
    for (const node of basinTree) {
      if (!node.parentId) {
        computeDescendantTiles(node.nodeId);
      }
    }

    return basinTree;
  }

  updateDebugBasinTreeDisplay(
    basinTree: import("../basins/types.ts").BasinTreeDebugInfo[],
    currentNodeId: string | null,
  ): void {
    const debugBasinsDiv = document.getElementById("basinsText");
    if (!debugBasinsDiv) return;

    if (basinTree.length === 0) {
      debugBasinsDiv.innerHTML = "<em>Building basin tree...</em>";
      return;
    }

    // Use unified rendering logic with basin data for water info
    this.renderBasinTree(basinTree, currentNodeId, debugBasinsDiv, this.basinManager.basins);
  }

  /**
   * Unified basin tree rendering logic used by both debug and final displays.
   */
  private renderBasinTree(
    basinTree: import("../basins/types.ts").BasinTreeDebugInfo[],
    currentNodeId: string | null,
    container: HTMLElement,
    basins?: Map<string, import("../basins/types.ts").BasinData>,
  ): void {
    // Check if ROOT node exists (debug mode includes it, normal mode doesn't)
    const rootNode = basinTree.find((node) => node.nodeId === "0#ROOT");

    // If ROOT exists, only render it (it will recursively render its children)
    // Otherwise, render all nodes without a parent (top-level basins)
    const roots = rootNode ? [rootNode] : basinTree.filter((node) => node.parentId === null);

    const template = document.getElementById("template-basin-item") as HTMLTemplateElement | null;

    if (!template) {
      container.innerHTML = "<em>Basin template not found</em>";
      return;
    }

    const renderNode = (
      node: import("../basins/types.ts").BasinTreeDebugInfo,
    ): HTMLElement | null => {
      const clone = template.content.cloneNode(true) as DocumentFragment;
      const li = clone.querySelector(".basin-item") as HTMLLIElement;
      const summary = clone.querySelector(".basin-summary") as HTMLElement;
      const idEl = clone.querySelector(".basin-id") as HTMLElement;
      const infoEl = clone.querySelector(".basin-info") as HTMLElement;
      const childrenList = clone.querySelector(".basin-children") as HTMLUListElement;
      const details = clone.querySelector("details") as HTMLDetailsElement;

      if (!li || !summary || !idEl || !infoEl || !childrenList || !details) return null;

      // Mark as active node if it's the current one (debug mode only)
      const isActive = currentNodeId && node.nodeId === currentNodeId;
      if (isActive) {
        li.classList.add("active-node");
        details.open = true; // Auto-expand active node
      }

      // Set node data (skip root node display)
      if (node.depth === 0) {
        idEl.textContent = "ROOT";
        idEl.title = "Virtual root node - contains all top-level basins";
        infoEl.textContent = " (virtual root)";
      } else {
        idEl.textContent = node.nodeId;
        idEl.title = `Basin ID: depth ${node.depth}, surface area ${node.ownTiles + node.descendantTiles} tiles`;
        const totalTiles = node.ownTiles + node.descendantTiles;

        // Get water volume info if basins map is provided
        let waterInfo = "";
        let waterTooltip = "";
        if (basins) {
          const basin = basins.get(node.nodeId);
          if (basin) {
            waterInfo =
              ` <span style="color: ${UI_CONSTANTS.RENDERING.COLORS.UI.WATER_INFO};" title="Current water volume / Maximum capacity">${basin.volume}/${basin.capacity}</span>`;
            waterTooltip = ` Water: ${basin.volume}/${basin.capacity} cubic units.`;
          }
        }

        infoEl.innerHTML =
          ` <span title="Total surface area (own tiles + descendant tiles)">tiles: ${totalTiles} = ${node.ownTiles} + ↓${node.descendantTiles}</span>${waterInfo}`;
        if (waterTooltip) {
          summary.title = `Basin ${node.nodeId}: ${node.ownTiles} own tiles, ${node.descendantTiles} descendant tiles.${waterTooltip}`;
        } else {
          summary.title = `Basin ${node.nodeId}: ${node.ownTiles} own tiles, ${node.descendantTiles} descendant tiles`;
        }
      }

      // Store node ID for interaction
      li.dataset.basinId = node.nodeId;

      // Hover handlers for temporary highlighting (only in non-debug mode)
      if (!currentNodeId) {
        summary.addEventListener("mouseenter", () => {
          if (this.onBasinHighlightChange) {
            this.onBasinHighlightChange(node.nodeId);
          }
          this.callbacks.draw();
        });

        summary.addEventListener("mouseleave", () => {
          if (this.onBasinHighlightChange) {
            this.onBasinHighlightChange(null);
          }
          this.callbacks.draw();
        });
      }

      // Find and render children
      const children = basinTree.filter((n) => n.parentId === node.nodeId);

      if (children.length > 0) {
        children.forEach((child) => {
          const childElement = renderNode(child);
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

    // Render tree
    container.innerHTML = "";
    const rootList = document.createElement("ul");
    rootList.className = "basin-tree";

    for (const root of roots) {
      const rootElement = renderNode(root);
      if (rootElement) {
        rootList.appendChild(rootElement);
      }
    }

    container.appendChild(rootList);
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

    const reservoirs = this.gameState.reservoirManager.getAllReservoirs();
    const pumps = this.gameState.pumpManager.getAllPumps();

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
      const table = clone.querySelector(".reservoir-table") as HTMLTableElement;
      const titleEl = clone.querySelector(".reservoir-title") as HTMLElement;
      const debugInfoEl = clone.querySelector(".reservoir-debug-info") as HTMLElement;
      const removeBtn = clone.querySelector(".remove-btn") as HTMLButtonElement;
      const pumpsContainer = clone.querySelector(".reservoir-pumps") as HTMLElement;

      if (table && titleEl && debugInfoEl && removeBtn && pumpsContainer) {
        const systemPumps = pumpsByReservoir.get(id) || [];
        const pumpCount = systemPumps.length;
        
        titleEl.textContent = `Pipe System ${id}`;
        titleEl.title =
          `Pipe system: isolated water storage. Pumps transfer water between basins and this reservoir.`;

        debugInfoEl.textContent = `${reservoir.volume.toFixed(1)} water · ${pumpCount} pump${pumpCount !== 1 ? "s" : ""}`;
        debugInfoEl.title = `Current volume: ${reservoir.volume.toFixed(1)} cubic units, ${pumpCount} connected pump${pumpCount !== 1 ? "s" : ""}`;

        removeBtn.addEventListener("click", () => {
          this.callbacks.removeReservoir(id);
          this.callbacks.updateControls();
          this.callbacks.updateDisplays();
          this.callbacks.updateDebugDisplays();
          this.callbacks.draw();
        });

        if (systemPumps.length > 0) {
          systemPumps.forEach((pumpWithIndex, pumpIndex) => {
            const pumpClone = pumpTemplate.content.cloneNode(true) as DocumentFragment;
            const pumpItem = pumpClone.querySelector(".pump-item") as HTMLTableRowElement;
            const activeIndicator = pumpClone.querySelector(
              ".pump-active-indicator",
            ) as HTMLElement;
            const pumpBadge = pumpClone.querySelector(".pump-badge") as HTMLElement;
            const pumpId = pumpClone.querySelector(".pump-id") as HTMLElement;
            const pumpArrow = pumpClone.querySelector(".pump-arrow") as HTMLElement;
            const tileCoords = pumpClone.querySelector(".pump-tile-coords") as HTMLElement;
            const basinStackContainer = pumpClone.querySelector(
              ".pump-basin-stack",
            ) as HTMLElement;
            const removePumpBtn = pumpClone.querySelector(".remove-btn") as HTMLButtonElement;

            if (
              pumpItem && activeIndicator && pumpBadge && pumpId && pumpArrow && tileCoords &&
              basinStackContainer && removePumpBtn
            ) {
              // Get basin info for active state
              const basin = this.basinManager.getBasinAt(pumpWithIndex.x, pumpWithIndex.y);
              const isActive = basin !== null && basin.volume > 0;

              // Set active indicator
              activeIndicator.textContent = isActive ? "●" : "○";
              activeIndicator.dataset.active = String(isActive);
              activeIndicator.title = isActive
                ? "Pump is active (basin has water)"
                : "Pump is inactive (basin is empty)";

              // Set badge
              pumpBadge.classList.add(
                pumpWithIndex.mode === "inlet" ? "inlet-badge" : "outlet-badge",
              );
              pumpBadge.title = pumpWithIndex.mode === "inlet"
                ? "Inlet pump: transfers water from basin into pipe system"
                : "Outlet pump: transfers water from pipe system into basin";

              // Set pump ID and arrow
              pumpId.textContent = `P${id}.${pumpIndex + 1}`;
              pumpArrow.textContent = pumpWithIndex.mode === "inlet" ? "→" : "←";

              // Set tile coordinates
              tileCoords.textContent = `(${pumpWithIndex.x}, ${pumpWithIndex.y})`;
              tileCoords.title = "Pump tile coordinates";

              // Render basin stack
              basinStackContainer.innerHTML = "";
              if (pumpWithIndex.basinStack && pumpWithIndex.basinStack.length > 0) {
                basinStackContainer.title = "Basin stack: deepest → shallowest. Active basin highlighted.";
                
                pumpWithIndex.basinStack.forEach((basinId, index) => {
                  // Add arrow separator (except before first item)
                  if (index > 0) {
                    const arrow = document.createElement("span");
                    arrow.className = "basin-stack-arrow";
                    arrow.textContent = "→";
                    basinStackContainer.appendChild(arrow);
                  }

                  // Create basin item
                  const basinItem = document.createElement("span");
                  basinItem.className = "basin-stack-item";
                  basinItem.textContent = basinId;
                  basinItem.dataset.basinId = basinId;

                  // Mark active basin
                  if (basinId === pumpWithIndex.activeBasinId) {
                    basinItem.classList.add("active");
                    basinItem.title = `Active basin: ${basinId} (currently being pumped)`;
                  } else {
                    basinItem.title = `Basin: ${basinId}`;
                  }

                  // Add hover and click interactions
                  basinItem.addEventListener("mouseenter", () => {
                    document.querySelectorAll(".basin-item").forEach((el) => {
                      el.classList.remove("basin-highlighted");
                    });
                    const targetBasin = document.querySelector(
                      `.basin-item[data-basin-id="${basinId}"]`,
                    );
                    if (targetBasin) {
                      targetBasin.classList.add("basin-highlighted");
                    }
                  });

                  basinItem.addEventListener("mouseleave", () => {
                    document.querySelectorAll(".basin-item").forEach((el) => {
                      el.classList.remove("basin-highlighted");
                    });
                  });

                  basinItem.addEventListener("click", () => {
                    const targetBasin = document.querySelector(
                      `.basin-item[data-basin-id="${basinId}"]`,
                    );
                    if (targetBasin) {
                      targetBasin.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                  });

                  basinStackContainer.appendChild(basinItem);
                });
              } else {
                basinStackContainer.textContent = "—";
                basinStackContainer.title = "No basin stack";
              }

              removePumpBtn.addEventListener("click", () => {
                this.callbacks.removePump(pumpWithIndex.index);
                this.callbacks.updateControls();
                this.callbacks.updateDisplays();
                this.callbacks.updateDebugDisplays();
                this.callbacks.draw();
              });

              pumpsContainer.appendChild(pumpClone);
            }
          });
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

      const waterPercent = basin.volume > 0
        ? ((basin.volume / basin.capacity) * 100).toFixed(1)
        : "0.0";

      const heightLabel = basin.height === 0 ? "Surface" : `Height ${basin.height}`;
      const waterInfo =
        `<span style="color: ${UI_CONSTANTS.RENDERING.COLORS.UI.WATER_INFO};">${basin.volume}/${basin.capacity}</span>`;

      div.innerHTML =
        `<strong>${id}</strong> (${heightLabel}, ${basin.tiles.size} tiles, ${waterPercent}% full) ${waterInfo}`;

      // Hover for temporary highlighting
      div.addEventListener("mouseenter", () => {
        if (this.onBasinHighlightChange) {
          this.onBasinHighlightChange(id);
        }
        this.callbacks.draw();
      });

      div.addEventListener("mouseleave", () => {
        if (this.onBasinHighlightChange) {
          this.onBasinHighlightChange(null);
        }
        this.callbacks.draw();
      });

      debugBasinsDiv.appendChild(div);
    }
  }

  setBasinHighlightChangeCallback(callback: (basinId: string | null) => void): void {
    this.onBasinHighlightChange = callback;
  }
}
