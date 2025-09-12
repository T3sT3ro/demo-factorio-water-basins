// Basin and reservoir debug information display

import { CONFIG } from "../config.js";
import { UI_CONSTANTS } from "../constants.js";

/**
 * Manages debug information display for basins and reservoirs with interactive controls
 */
export class DebugDisplay {
  constructor(_basinManager, gameState, callbacks = {}) {
    // Don't store basinManager directly since it can be replaced during imports
    // Instead, always get it from gameState to ensure we have the current reference
    this.gameState = gameState;
    this.onBasinHighlightChange = null;
    
    // Throttling for basin highlight changes to prevent excessive re-renders
    this.highlightThrottleMs = UI_CONSTANTS.BASIN_DISPLAY.THROTTLE_MS;
    this.lastHighlightTime = 0;
    this.pendingHighlight = null;
    this.highlightRaf = null;

    // Store callback functions
    this.callbacks = {
      removePump: callbacks.removePump || (() => console.error("removePump callback not set")),
      removeReservoir: callbacks.removeReservoir ||
        (() => console.error("removeReservoir callback not set")),
      updateControls: callbacks.updateControls ||
        (() => console.error("updateControls callback not set")),
      updateDisplays: callbacks.updateDisplays ||
        (() => console.error("updateDisplays callback not set")),
      updateDebugDisplays: callbacks.updateDebugDisplays ||
        (() => console.error("updateDebugDisplays callback not set")),
      clearSelection: callbacks.clearSelection ||
        (() => console.error("clearSelection callback not set")),
      draw: callbacks.draw || (() => console.error("draw callback not set")),
    };
  }

  // Create a styled remove button
  createRemoveButton(text = "Remove", onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.className = "remove-button";
    button.onclick = onClick;
    return button;
  }

  // Throttled basin highlight change to prevent excessive re-renders
  throttledHighlightChange(basinId) {
    this.pendingHighlight = basinId;
    
    if (this.highlightRaf) {
      return; // Already scheduled
    }
    
    const now = performance.now();
    const timeSinceLastHighlight = now - this.lastHighlightTime;
    
    if (timeSinceLastHighlight >= this.highlightThrottleMs) {
      // Execute immediately
      this.executeHighlightChange();
    } else {
      // Schedule for later
      this.highlightRaf = requestAnimationFrame(() => {
        this.highlightRaf = null;
        this.executeHighlightChange();
      });
    }
  }
  
  executeHighlightChange() {
    const basinManager = this.gameState.getBasinManager();
    basinManager.setHighlightedBasin(this.pendingHighlight);
    this.updateBasinHighlights();
    this.onBasinHighlightChange?.(this.pendingHighlight);
    this.lastHighlightTime = performance.now();
  }

  updateBasinsDisplay() {
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

    // Build hierarchical basin data structure based on outlet relationships
    const basinHierarchy = [];
    const visited = new Set();

    // First, build a reverse mapping: child -> parents (which basins flow into this one)
    const childToParents = new Map();
    basinManager.basins.forEach((basin, id) => {
      if (basin.outlets && basin.outlets.length > 0) {
        basin.outlets.forEach((outletId) => {
          if (!childToParents.has(outletId)) {
            childToParents.set(outletId, []);
          }
          childToParents.get(outletId).push(id);
        });
      }
    });

    const buildBasinEntry = (id, depth = 0) => {
      if (visited.has(id)) return null;
      visited.add(id);

      const basin = basinManager.basins.get(id);
      if (!basin) return null;

      const maxCapacity = basin.tileCount * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
      const entry = {
        id,
        depth,
        basin,
        maxCapacity,
        children: [],
      };

      // Find child basins (basins that flow into this basin)
      const children = childToParents.get(id) || [];
      children.sort().forEach((childId) => {
        const childEntry = buildBasinEntry(childId, depth + 1);
        if (childEntry) {
          entry.children.push(childEntry);
        }
      });

      return entry;
    };

    // Start with root basins (those that don't flow into any other basin - they have outlets but are not outlets themselves)
    const allOutletIds = new Set();
    basinManager.basins.forEach((basin) => {
      if (basin.outlets) {
        basin.outlets.forEach((outletId) => allOutletIds.add(outletId));
      }
    });

    // Find basins that are not outlets for any other basin (root basins)
    debugInfo.basinArray.forEach(([id]) => {
      if (!allOutletIds.has(id) && !visited.has(id)) {
        const rootEntry = buildBasinEntry(id);
        if (rootEntry) {
          basinHierarchy.push(rootEntry);
        }
      }
    });

    // Handle any remaining basins (disconnected components or isolated basins)
    debugInfo.basinArray.forEach(([id]) => {
      if (!visited.has(id)) {
        const isolatedEntry = buildBasinEntry(id);
        if (isolatedEntry) {
          basinHierarchy.push(isolatedEntry);
        }
      }
    });

    // If no basins were processed yet, fall back to a simpler flat display
    if (basinHierarchy.length === 0 && debugInfo.basinArray.length > 0) {
      debugInfo.basinArray.forEach(([id]) => {
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

    // Create interactive basin display
    this.createInteractiveBasinDisplay(basinHierarchy);

    // Update basin title with statistics
    const titleEl = document.getElementById("basinsTitle");
    if (titleEl) {
      titleEl.textContent =
        `Basins (${debugInfo.basinCount}, deg≤${debugInfo.maxDegree}, d≤${debugInfo.maxDepth})`;
    }
  }

  updateReservoirsDisplay(reservoirs, pumps, selectedReservoirId) {
    // Group pumps by reservoir (pipe system)
    const pumpsByReservoir = new Map();
    pumps.forEach((pump, index) => {
      if (!pumpsByReservoir.has(pump.reservoirId)) {
        pumpsByReservoir.set(pump.reservoirId, []);
      }
      pumpsByReservoir.get(pump.reservoirId).push({ ...pump, index });
    });

    const reservoirsTextEl = document.getElementById("reservoirsText");
    if (reservoirsTextEl) {
      this.createInteractiveReservoirDisplay(
        "",
        reservoirs,
        pumps,
        selectedReservoirId,
        pumpsByReservoir,
      );
    }
  }

  // Update tick counter display
  updateTickCounter(tickCount) {
    const display = document.getElementById("tickCounterDisplay");
    if (display) {
      display.textContent = `Tick: ${tickCount}`;
    }
  }

  createInteractiveReservoirDisplay(
    _reservoirsText,
    reservoirs,
    pumps,
    selectedReservoirId,
    pumpsByReservoir = null,
  ) {
    const reservoirsContainer = document.getElementById("reservoirsText");
    if (!reservoirsContainer) return;

    reservoirsContainer.innerHTML = "";

    // Group pumps by reservoir (pipe system) if not provided
    if (!pumpsByReservoir) {
      pumpsByReservoir = new Map();
      pumps.forEach((pump, index) => {
        if (!pumpsByReservoir.has(pump.reservoirId)) {
          pumpsByReservoir.set(pump.reservoirId, []);
        }
        pumpsByReservoir.get(pump.reservoirId).push({ ...pump, index });
      });
    }

    // Create interactive display for each pipe system
    pumpsByReservoir.forEach((pumpsInReservoir, reservoirId) => {
      const reservoir = reservoirs.get(reservoirId);

      const systemDiv = document.createElement("div");
      systemDiv.className = "pipe-system-container";

      const systemHeader = document.createElement("div");
      systemHeader.className = "pipe-system-header";

      const systemInfo = document.createElement("span");
      systemInfo.innerHTML = `<strong>Pipe System #${reservoirId}:</strong> ${
        reservoir ? Math.floor(reservoir.volume) : 0
      } units`;
      systemHeader.appendChild(systemInfo);

      // Add pipe system removal button
      const removeSystemButton = this.createRemoveButton("Remove System", () => {
        console.log(`Attempting to remove pipe system ${reservoirId}`);

        try {
          // Remove all pumps linked to this pipe system first
          const pumpsToRemove = pumps.filter((pump) => pump.reservoirId === reservoirId);
          console.log(`Found ${pumpsToRemove.length} pumps to remove`);

          pumpsToRemove.forEach((pump) => {
            const pumpIndex = pumps.findIndex((p) => p.x === pump.x && p.y === pump.y);
            console.log(`Removing pump at index ${pumpIndex}`, pump);
            if (pumpIndex >= 0) {
              this.callbacks.removePump(pumpIndex);
            }
          });

          // Remove the reservoir (pipe system)
          console.log(`Removing reservoir ${reservoirId}`);
          this.callbacks.removeReservoir(reservoirId);

          // Clear selection if this was the selected system
          if (selectedReservoirId === reservoirId) {
            console.log(`Clearing selection for removed pipe system ${reservoirId}`);
            this.callbacks.clearSelection();
          }

          // Update UI
          this.callbacks.updateControls();
          this.callbacks.updateDisplays();
          this.callbacks.draw();

          console.log(`Successfully removed pipe system ${reservoirId}`);
        } catch (error) {
          console.error(`Error removing pipe system ${reservoirId}:`, error);
        }
      });
      systemHeader.appendChild(removeSystemButton);

      systemDiv.appendChild(systemHeader);

      // Add pumps for this pipe system
      pumpsInReservoir.forEach((pump) => {
        const pumpDiv = document.createElement("div");
        pumpDiv.className = "pump-item";

        const colorPrefix = pump.mode === "inlet" ? "🔴" : "🟢";
        const pumpText = document.createElement("span");
        pumpText.textContent =
          `${colorPrefix} P${pump.reservoirId}.${pump.index} (${pump.x},${pump.y}) ${pump.mode}`;
        pumpDiv.appendChild(pumpText);

        const removePumpButton = this.createRemoveButton("Remove", () => {
          console.log(
            `Attempting to remove pump at index ${pump.index}, coordinates (${pump.x},${pump.y})`,
          );

          try {
            // Try removing by index (if available)
            const pumpIndex = pumps.findIndex((p) => p.x === pump.x && p.y === pump.y);
            console.log(`Found pump at index ${pumpIndex}`);

            if (pumpIndex >= 0) {
              this.callbacks.removePump(pumpIndex);
              this.callbacks.updateControls();
              this.callbacks.updateDebugDisplays();
              this.callbacks.draw();

              console.log(`Successfully removed pump at (${pump.x},${pump.y})`);
            } else {
              console.warn(`Pump not found at (${pump.x},${pump.y})`);
            }
          } catch (error) {
            console.error(`Error removing pump at (${pump.x},${pump.y}):`, error);
          }
        });
        pumpDiv.appendChild(removePumpButton);

        systemDiv.appendChild(pumpDiv);
      });

      reservoirsContainer.appendChild(systemDiv);
    });
  }

  createInteractiveBasinDisplay(basinHierarchy) {
    const basinsContainer = document.getElementById("basinsText");
    if (!basinsContainer) return;

    basinsContainer.innerHTML = "";

    const createBasinEntry = (entry) => {
      if (entry.children.length > 0) {
        // Nodes with children use details element
        const details = document.createElement("details");
        details.className = "basin-details";
        details.open = true; // Keep expanded by default

        const summary = document.createElement("summary");
        summary.className = "basin-summary";
        summary.dataset.basinId = entry.id;

        // Create basin info text
        const basinText =
          `${entry.id}: ${entry.basin.tileCount} tiles, vol=${entry.basin.volume}/${entry.maxCapacity}, water_lvl=${entry.basin.level}`;
        summary.textContent = basinText;

        // Only hover highlighting, no click functionality
        summary.addEventListener("mouseenter", () => {
          const basinManager = this.gameState.getBasinManager();
          const currentHighlight = basinManager.getHighlightedBasin();
          if (currentHighlight !== entry.id) {
            this.throttledHighlightChange(entry.id);
          }
        });

        summary.addEventListener("mouseleave", () => {
          this.throttledHighlightChange(null);
        });

        details.appendChild(summary);

        // Add children as nested elements
        entry.children.forEach((childEntry) => {
          details.appendChild(createBasinEntry(childEntry));
        });

        return details;
      } else {
        // Leaf nodes use simple list items
        const listItem = document.createElement("li");
        listItem.className = "basin-item";
        listItem.dataset.basinId = entry.id;

        // Create basin info text
        const basinText =
          `${entry.id}: ${entry.basin.tileCount} tiles, vol=${entry.basin.volume}/${entry.maxCapacity}, water_lvl=${entry.basin.level}`;
        listItem.textContent = basinText;

        // Only hover highlighting, no click functionality
        listItem.addEventListener("mouseenter", () => {
          const basinManager = this.gameState.getBasinManager();
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

    // Create and append all root entries
    basinHierarchy.forEach((entry) => {
      basinsContainer.appendChild(createBasinEntry(entry));
    });
  }

  updateBasinHighlights() {
    const basinManager = this.gameState.getBasinManager();
    const highlighted = basinManager.getHighlightedBasin();
    document.querySelectorAll(".basin-summary, .basin-item").forEach((element) => {
      element.classList.remove("highlighted");
      if (element.dataset.basinId === highlighted) {
        element.classList.add("highlighted");
      }
    });
  }

  setBasinHighlightChangeCallback(callback) {
    this.onBasinHighlightChange = callback;
  }
}
