import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";
import type {
  BasinEntry,
  BasinInfo,
  BasinManagerLike,
  DebugCallbacks,
  GameStateLike,
} from "./debug-types.ts";

export class BasinDebugDisplay {
  gameState: GameStateLike;
  onBasinHighlightChange: ((id: string | null) => void) | null = null;
  highlightThrottleMs: number = 0;
  lastHighlightTime: number = 0;
  pendingHighlight: string | null = null;
  highlightRaf: number | null = null;
  callbacks: DebugCallbacks;

  constructor(
    gameState: GameStateLike,
    callbacks: Partial<DebugCallbacks> = {},
  ) {
    this.gameState = gameState;
    this.highlightThrottleMs = UI_CONSTANTS.BASIN_DISPLAY.THROTTLE_MS;

    this.callbacks = {
      removePump: callbacks.removePump || (() => console.error("removePump callback not set")),
      removeReservoir: callbacks.removeReservoir || (() => console.error("removeReservoir callback not set")),
      updateControls: callbacks.updateControls || (() => console.error("updateControls callback not set")),
      updateDisplays: callbacks.updateDisplays || (() => console.error("updateDisplays callback not set")),
      updateDebugDisplays: callbacks.updateDebugDisplays || (() => console.error("updateDebugDisplays callback not set")),
      clearSelection: callbacks.clearSelection || (() => console.error("clearSelection callback not set")),
      draw: callbacks.draw || (() => console.error("draw callback not set")),
    };
  }

  throttledHighlightChange(basinId: string | null) {
    this.pendingHighlight = basinId;

    if (this.highlightRaf) return;

    const now = performance.now();
    const timeSinceLastHighlight = now - this.lastHighlightTime;

    if (timeSinceLastHighlight >= this.highlightThrottleMs) {
      this.executeHighlightChange();
    } else {
      this.highlightRaf = requestAnimationFrame(() => {
        this.highlightRaf = null;
        this.executeHighlightChange();
      });
    }
  }

  executeHighlightChange() {
    const basinManager = this.gameState?.getBasinManager();
    if (!basinManager) return;
    basinManager.setHighlightedBasin(this.pendingHighlight);
    this.updateBasinHighlights();
    this.onBasinHighlightChange?.(this.pendingHighlight);
    this.lastHighlightTime = performance.now();
  }

  updateBasinsDisplay() {
    performance.mark("updateBasinsDisplay-start");

    const heights = this.gameState.getHeights();
    if (!heights) {
      console.warn("No heights available for basin display");
      return;
    }

    const basinManager = this.gameState.getBasinManager();
    const debugInfo = basinManager.getBasinAnalysis(heights);
    if (!debugInfo) {
      console.warn("No debug info available for basin display");
      return;
    }

    const basinHierarchy: BasinEntry[] = [];
    const visited = new Set<string>();

    const childToParents = new Map<string, string[]>();
    basinManager.basins.forEach((basin, id) => {
      if (basin.outlets && basin.outlets.length > 0) {
        basin.outlets.forEach((outletId) => {
          if (!childToParents.has(outletId)) {
            childToParents.set(outletId, []);
          }
          childToParents.get(outletId)!.push(id);
        });
      }
    });

    const buildBasinEntry = (id: string, depth = 0): BasinEntry | null => {
      if (visited.has(id)) return null;
      visited.add(id);

      const basin = basinManager.basins.get(id);
      if (!basin) return null;

      const maxCapacity = basin.tileCount * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
      const entry: BasinEntry = {
        id,
        depth,
        basin,
        maxCapacity,
        children: [],
      };

      const children = childToParents.get(id) || [];
      children.sort();
      for (const childId of children) {
        const childEntry = buildBasinEntry(childId, depth + 1);
        if (childEntry) {
          entry.children.push(childEntry);
        }
      }

      return entry;
    };

    const allOutletIds = new Set<string>();
    basinManager.basins.forEach((basin) => {
      if (basin.outlets) {
        basin.outlets.forEach((outletId) => allOutletIds.add(outletId));
      }
    });

    debugInfo.basinArray.forEach(([id]: [string, BasinInfo]) => {
      if (!allOutletIds.has(id) && !visited.has(id)) {
        const rootEntry = buildBasinEntry(id);
        if (rootEntry) {
          basinHierarchy.push(rootEntry);
        }
      }
    });

    debugInfo.basinArray.forEach(([id]: [string, BasinInfo]) => {
      if (!visited.has(id)) {
        const isolatedEntry = buildBasinEntry(id);
        if (isolatedEntry) {
          basinHierarchy.push(isolatedEntry);
        }
      }
    });

    if (basinHierarchy.length === 0 && debugInfo.basinArray.length > 0) {
      debugInfo.basinArray.forEach(([id]: [string, BasinInfo]) => {
        const basin = basinManager.basins.get(id);
        if (basin) {
          const maxCapacity = basin.tileCount * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
          basinHierarchy.push({
            id,
            depth: 0,
            basin,
            maxCapacity,
            children: [],
          });
        }
      });
    }

    this.createInteractiveBasinDisplay(basinHierarchy);

    const titleEl = document.getElementById("basinsTitle");
    if (titleEl) {
      titleEl.textContent = `Basins (${debugInfo.basinCount}, deg≤${debugInfo.maxDegree}, d≤${debugInfo.maxDepth})`;
    }

    performance.mark("updateBasinsDisplay-end");
    performance.measure("updateBasinsDisplay", "updateBasinsDisplay-start", "updateBasinsDisplay-end");
  }

  createInteractiveBasinDisplay(basinHierarchy: BasinEntry[]) {
    const basinsContainer = document.getElementById("basinsText");
    if (!basinsContainer) return;

    basinsContainer.innerHTML = "";

    const template = document.getElementById("basin-template") as HTMLTemplateElement;
    if (!template) {
      console.error("Basin template not found");
      return;
    }

    const createBasinEntry = (entry: BasinEntry): HTMLElement => {
      if (entry.children.length > 0) {
        const details = template.content.querySelector(".basin-details")!.cloneNode(true) as HTMLElement;
        const summary = details.querySelector(".basin-summary") as HTMLElement;
        summary.dataset.basinId = entry.id;
        const basinText = `${entry.id}: ${entry.basin.tileCount} tiles, vol=${entry.basin.volume}/${entry.maxCapacity}, water_lvl=${entry.basin.level}`;
        summary.textContent = basinText;

        summary.addEventListener("mouseenter", () => {
          const basinManager = this.gameState?.getBasinManager();
          if (!basinManager) return;
          const currentHighlight = basinManager.getHighlightedBasin();
          if (currentHighlight !== entry.id) {
            this.throttledHighlightChange(entry.id);
          }
        });

        summary.addEventListener("mouseleave", () => {
          this.throttledHighlightChange(null);
        });

        for (const childEntry of entry.children) {
          details.appendChild(createBasinEntry(childEntry));
        }

        return details;
      } else {
        const listItem = template.content.querySelector(".basin-item")!.cloneNode(true) as HTMLElement;
        listItem.dataset.basinId = entry.id;
        const basinText = `${entry.id}: ${entry.basin.tileCount} tiles, vol=${entry.basin.volume}/${entry.maxCapacity}, water_lvl=${entry.basin.level}`;
        listItem.textContent = basinText;

        listItem.addEventListener("mouseenter", () => {
          const basinManager = this.gameState?.getBasinManager();
          if (!basinManager) return;
          const currentHighlight = basinManager.getHighlightedBasin();
          if (currentHighlight !== entry.id) {
            this.throttledHighlightChange(entry.id);
          }
        });

        listItem.addEventListener("mouseleave", () => {
          this.throttledHighlightChange(null);
        });

        return listItem;
      }
    };

    basinHierarchy.forEach((entry) => {
      basinsContainer.appendChild(createBasinEntry(entry));
    });
  }

  updateBasinHighlights() {
    const basinManager = this.gameState?.getBasinManager();
    if (!basinManager) return;
    const highlighted = basinManager.getHighlightedBasin();
    document.querySelectorAll(".basin-summary, .basin-item").forEach((element) => {
      const el = element as HTMLElement;
      el.classList.remove("highlighted");
      if (el.dataset.basinId === highlighted) {
        el.classList.add("highlighted");
      }
    });
  }

  setBasinHighlightChangeCallback(callback: (id: string | null) => void) {
    this.onBasinHighlightChange = callback;
  }
}