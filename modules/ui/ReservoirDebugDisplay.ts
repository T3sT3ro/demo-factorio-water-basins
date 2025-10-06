import type {
  DebugCallbacks,
  GameStateLike,
  Pump,
  Reservoir,
} from "./debug-types.ts";

export class ReservoirDebugDisplay {
  gameState: GameStateLike;
  callbacks: DebugCallbacks;

  constructor(
    gameState: GameStateLike,
    callbacks: Partial<DebugCallbacks> = {},
  ) {
    this.gameState = gameState;

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

  createRemoveButton(text = "Remove", onClick = () => {}): HTMLButtonElement {
    const template = document.getElementById("remove-button-template") as HTMLTemplateElement;
    const button = template ? template.content.querySelector("button")!.cloneNode(true) as HTMLButtonElement : document.createElement("button");
    button.textContent = text;
    button.className = "remove-button";
    button.onclick = onClick;
    return button;
  }

  updateReservoirsDisplay(
    reservoirs: Map<string, Reservoir>,
    pumps: Pump[],
    selectedReservoirId: string | null,
  ) {
    const pumpsByReservoir = new Map<string, Pump[]>();
    pumps.forEach((pump, index) => {
      if (!pumpsByReservoir.has(pump.reservoirId)) {
        pumpsByReservoir.set(pump.reservoirId, []);
      }
      pumpsByReservoir.get(pump.reservoirId)!.push({ ...pump, index });
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

  updateTickCounter(tickCount: number) {
    const display = document.getElementById("tickCounterDisplay");
    if (display) {
      display.textContent = `Tick: ${tickCount}`;
    }
  }

  createInteractiveReservoirDisplay(
    _reservoirsText: string,
    reservoirs: Map<string, Reservoir>,
    pumps: Pump[],
    selectedReservoirId: string | null,
    pumpsByReservoir: Map<string, Pump[]> | null = null,
  ) {
    const reservoirsContainer = document.getElementById("reservoirsText");
    if (!reservoirsContainer) return;

    reservoirsContainer.innerHTML = "";

    if (!pumpsByReservoir) {
      pumpsByReservoir = new Map<string, Pump[]>();
      pumps.forEach((pump, index) => {
        if (!pumpsByReservoir!.has(pump.reservoirId)) {
          pumpsByReservoir!.set(pump.reservoirId, []);
        }
        pumpsByReservoir!.get(pump.reservoirId)!.push({ ...pump, index });
      });
    }

    const pumpsMap = pumpsByReservoir;

    const template = document.getElementById("reservoir-template") as HTMLTemplateElement;
    if (!template) {
      console.error("Reservoir template not found");
      return;
    }

    pumpsMap.forEach((pumpsInReservoir, reservoirId) => {
      const reservoir = reservoirs.get(reservoirId);

      const systemDiv = template.content.querySelector(".pipe-system-container")!.cloneNode(true) as HTMLElement;
      const systemHeader = systemDiv.querySelector(".pipe-system-header") as HTMLElement;
      const systemInfo = systemHeader.querySelector("span") as HTMLElement;
      systemInfo.innerHTML = `<strong>Pipe System #${reservoirId}:</strong> ${reservoir ? Math.floor(reservoir.volume) : 0} units`;

      const removeSystemButton = this.createRemoveButton("Remove System", () => {
        console.log(`Attempting to remove pipe system ${reservoirId}`);

        try {
          const pumpsToRemove = pumps.filter((pump) => pump.reservoirId === reservoirId);
          console.log(`Found ${pumpsToRemove.length} pumps to remove`);

          pumpsToRemove.forEach((pump) => {
            const pumpIndex = pumps.findIndex((p) => p.x === pump.x && p.y === pump.y);
            console.log(`Removing pump at index ${pumpIndex}`, pump);
            if (pumpIndex >= 0) {
              this.callbacks.removePump(pumpIndex);
            }
          });

          console.log(`Removing reservoir ${reservoirId}`);
          this.callbacks.removeReservoir(reservoirId);

          if (selectedReservoirId === reservoirId) {
            console.log(`Clearing selection for removed pipe system ${reservoirId}`);
            this.callbacks.clearSelection();
          }

          this.callbacks.updateControls();
          this.callbacks.updateDisplays();
          this.callbacks.draw();

          console.log(`Successfully removed pipe system ${reservoirId}`);
        } catch (error) {
          console.error(`Error removing pipe system ${reservoirId}:`, error);
        }
      });
      systemHeader.appendChild(removeSystemButton);

      for (const pump of pumpsInReservoir) {
        const pumpDiv = template.content.querySelector(".pump-item")!.cloneNode(true) as HTMLElement;
        const pumpText = pumpDiv.querySelector("span") as HTMLElement;
        const colorPrefix = pump.mode === "inlet" ? "🔴" : "🟢";
        pumpText.textContent = `${colorPrefix} P${pump.reservoirId}.${pump.index} (${pump.x},${pump.y}) ${pump.mode}`;

        const removePumpButton = this.createRemoveButton("Remove", () => {
          console.log(`Attempting to remove pump at index ${pump.index}, coordinates (${pump.x},${pump.y})`);

          try {
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
      }

      reservoirsContainer.appendChild(systemDiv);
    });
  }
}