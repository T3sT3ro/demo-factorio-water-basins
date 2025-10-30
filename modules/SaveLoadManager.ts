// Save/Load UI management

import type { GameState } from "./GameState.ts";
import { BasinSerializer, HeightSerializer } from "./serialization/index.ts";

interface SaveMeta {
  key: string;
  name: string;
  timestamp: string;
}

export class SaveLoadManager {
  private gameState: GameState;
  private onStateChanged: () => void;

  constructor(gameState: GameState, onStateChanged: () => void) {
    this.gameState = gameState;
    this.onStateChanged = onStateChanged;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    const loadBtn = document.getElementById("loadBtn");
    if (loadBtn) {
      loadBtn.onclick = () => this.showLoadModal();
    }

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.onclick = () => this.showExportModal();
    }

    const helpBtn = document.getElementById("helpBtn");
    if (helpBtn) {
      helpBtn.onclick = () => this.showHelpModal();
    }

    const loadFromTextBtn = document.getElementById("loadFromTextBtn");
    if (loadFromTextBtn) {
      loadFromTextBtn.onclick = () => this.loadFromText();
    }

    const jsonFileInput = document.getElementById("jsonFileInput");
    if (jsonFileInput) {
      jsonFileInput.onchange = (event) => this.loadFromFile(event as Event);
    }

    const saveToBrowserBtn = document.getElementById("saveToBrowserBtn");
    if (saveToBrowserBtn) {
      saveToBrowserBtn.onclick = () => this.saveToBrowser();
    }

    const copyJsonBtn = document.getElementById("copyJsonBtn");
    if (copyJsonBtn) {
      copyJsonBtn.onclick = () => this.copyJsonToClipboard();
    }

    const downloadJsonBtn = document.getElementById("downloadJsonBtn");
    if (downloadJsonBtn) {
      downloadJsonBtn.onclick = () => this.downloadJson();
    }

    const heightEncodingSelect = document.getElementById("heightEncoding");
    if (heightEncodingSelect) {
      heightEncodingSelect.addEventListener("change", () => this.updateExportData());
    }

    const basinEncodingSelect = document.getElementById("basinEncoding");
    if (basinEncodingSelect) {
      basinEncodingSelect.addEventListener("change", () => this.updateExportData());
    }
  }

  private showLoadModal(): void {
    const modal = document.getElementById("loadModal") as HTMLDialogElement | null;
    if (modal) {
      this.populateSavedMapsList();
      modal.showModal();
    }
  }

  private showExportModal(): void {
    const modal = document.getElementById("exportModal") as HTMLDialogElement | null;
    if (modal) {
      this.setupOptimalDefaults();
      this.updateExportData();
      modal.showModal();
    }
  }

  private showHelpModal(): void {
    const modal = document.getElementById("helpModal") as HTMLDialogElement | null;
    if (modal) {
      modal.showModal();
    }
  }

  private populateSavedMapsList(): void {
    const container = document.getElementById("savedMaps");
    if (!container) return;

    const saves = this.getSavedMaps();

    if (saves.length === 0) {
      container.innerHTML = '<p class="no-saves">No saved maps found</p>';
      return;
    }

    container.innerHTML = saves.map((save) => `
      <div class="saved-map-item">
        <div class="saved-map-info">
          <div class="saved-map-name">${this.escapeHtml(save.name)}</div>
          <div class="saved-map-date">${new Date(save.timestamp).toLocaleString()}</div>
        </div>
        <div class="saved-map-actions">
          <button onclick="window.saveLoadManager.loadFromBrowser('${
      this.escapeHtml(save.key)
    }')">Load</button>
          <button class="delete-btn" onclick="window.saveLoadManager.deleteFromBrowser('${
      this.escapeHtml(save.key)
    }')">Delete</button>
        </div>
      </div>
    `).join("");
  }

  private setupOptimalDefaults(): void {
    try {
      const bestOptions = this.gameState.getBestEncodingOptions();

      const heightSelect = document.getElementById("heightEncoding") as HTMLSelectElement | null;
      const basinSelect = document.getElementById("basinEncoding") as HTMLSelectElement | null;

      if (heightSelect && bestOptions.heightEncoding) {
        heightSelect.value = bestOptions.heightEncoding;
      }

      if (basinSelect && bestOptions.basinEncoding) {
        basinSelect.value = bestOptions.basinEncoding;
      }
    } catch (error) {
      console.warn("Could not determine optimal encoding defaults:", error);
    }
  }

  private updateExportData(): void {
    const heightSelect = document.getElementById("heightEncoding") as HTMLSelectElement | null;
    const basinSelect = document.getElementById("basinEncoding") as HTMLSelectElement | null;

    if (!heightSelect || !basinSelect) return;

    const heightEncoding = heightSelect.value;
    const basinEncoding = basinSelect.value;

    this.updateSizeInfo(heightEncoding, basinEncoding);

    const options = {
      heightEncoding: heightEncoding,
      basinEncoding: basinEncoding,
    };

    const output = document.getElementById("exportJsonOutput") as HTMLTextAreaElement | null;
    if (output) {
      try {
        const jsonData = this.gameState.exportToJSON(options);
        output.value = jsonData;
      } catch (error) {
        output.value = `Error generating export data: ${(error as Error).message}`;
        console.error("Export error:", error);
      }
    }
  }

  private updateSizeInfo(heightEncoding: string, basinEncoding: string): void {
    const heightSizeInfo = document.getElementById("heightSizeInfo");
    const basinSizeInfo = document.getElementById("basinSizeInfo");
    const totalSizeInfo = document.getElementById("totalSizeInfo");

    try {
      const heightCompressed = HeightSerializer.compress(this.gameState.heights, heightEncoding);
      const basinCompressed = BasinSerializer.compress(
        this.gameState.basinManager,
        basinEncoding,
      );

      const heightSize = JSON.stringify(heightCompressed).length;
      const basinSize = JSON.stringify(basinCompressed).length;

      const options = {
        heightEncoding: heightEncoding,
        basinEncoding: basinEncoding,
      };
      const totalSize = this.gameState.exportToJSON(options).length;

      if (heightSizeInfo) {
        heightSizeInfo.textContent = this.formatBytes(heightSize);
      }
      if (basinSizeInfo) {
        basinSizeInfo.textContent = this.formatBytes(basinSize);
      }
      if (totalSizeInfo) {
        totalSizeInfo.textContent = this.formatBytes(totalSize);
      }
    } catch (error) {
      console.error("Error calculating sizes:", error);
      if (heightSizeInfo) heightSizeInfo.textContent = "error";
      if (basinSizeInfo) basinSizeInfo.textContent = "error";
      if (totalSizeInfo) totalSizeInfo.textContent = "error";
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  private loadFromText(): void {
    const textInput = document.getElementById("jsonTextInput") as HTMLTextAreaElement | null;
    if (!textInput || !textInput.value.trim()) {
      alert("Please paste JSON data first.");
      return;
    }

    try {
      this.gameState.importFromJSON(textInput.value);
      this.onStateChanged();
      const loadModal = document.getElementById("loadModal") as HTMLDialogElement | null;
      if (loadModal) loadModal.close();
      textInput.value = "";
      alert("Map loaded successfully!");
    } catch (error) {
      alert(`Failed to load map: ${(error as Error).message}`);
    }
  }

  private loadFromFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        this.gameState.importFromJSON(result);
        this.onStateChanged();
        const loadModal = document.getElementById("loadModal") as HTMLDialogElement | null;
        if (loadModal) loadModal.close();
        input.value = "";
        alert("Map loaded successfully!");
      } catch (error) {
        alert(`Failed to load map: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
  }

  private saveToBrowser(): void {
    const nameInput = document.getElementById("saveNameInput") as HTMLInputElement | null;
    if (!nameInput || !nameInput.value.trim()) {
      alert("Please enter a save name.");
      return;
    }

    const saveName = nameInput.value.trim();
    const saveKey = `mapSave_${Date.now()}_${saveName}`;

    try {
      const jsonData = this.gameState.exportToJSON();
      const saveData = {
        name: saveName,
        timestamp: new Date().toISOString(),
        data: jsonData,
      };

      localStorage.setItem(saveKey, JSON.stringify(saveData));
      nameInput.value = "";
      alert(`Map saved as "${saveName}"!`);

      const loadModal = document.getElementById("loadModal") as HTMLDialogElement | null;
      if (loadModal?.open) {
        this.populateSavedMapsList();
      }
    } catch (error) {
      alert(`Failed to save map: ${(error as Error).message}`);
      console.error("Save error:", error);
    }
  }

  loadFromBrowser(saveKey: string): void {
    try {
      const saveData = localStorage.getItem(saveKey);
      if (!saveData) {
        alert("Save not found.");
        return;
      }

      const parsed = JSON.parse(saveData) as { name: string; data: string };
      this.gameState.importFromJSON(parsed.data);
      this.onStateChanged();
      const loadModal = document.getElementById("loadModal") as HTMLDialogElement | null;
      if (loadModal) loadModal.close();
      alert(`Map "${parsed.name}" loaded successfully!`);
    } catch (error) {
      alert(`Failed to load map: ${(error as Error).message}`);
      console.error("Load error:", error);
    }
  }

  deleteFromBrowser(saveKey: string): void {
    if (!confirm("Are you sure you want to delete this save?")) {
      return;
    }

    try {
      localStorage.removeItem(saveKey);
      this.populateSavedMapsList();
      alert("Save deleted successfully!");
    } catch (error) {
      alert(`Failed to delete save: ${(error as Error).message}`);
      console.error("Delete error:", error);
    }
  }

  private copyJsonToClipboard(): void {
    const output = document.getElementById("exportJsonOutput") as HTMLTextAreaElement | null;
    if (!output) return;

    output.select();
    output.setSelectionRange(0, 99999);

    try {
      document.execCommand("copy");
      alert("JSON data copied to clipboard!");
    } catch {
      navigator.clipboard.writeText(output.value).then(() => {
        alert("JSON data copied to clipboard!");
      }).catch(() => {
        alert("Failed to copy to clipboard. Please copy manually.");
      });
    }
  }

  private downloadJson(): void {
    const output = document.getElementById("exportJsonOutput") as HTMLTextAreaElement | null;
    if (!output || !output.value) return;

    const blob = new Blob([output.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `water-basins-map-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getSavedMaps(): SaveMeta[] {
    const saves: SaveMeta[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("mapSave_")) {
        try {
          const saveData = localStorage.getItem(key);
          if (saveData) {
            const parsed = JSON.parse(saveData) as { name: string; timestamp: string };
            saves.push({
              key: key,
              name: parsed.name,
              timestamp: parsed.timestamp,
            });
          }
        } catch (error) {
          console.warn(`Invalid save data for key ${key}:`, error);
        }
      }
    }

    saves.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return saves;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make SaveLoadManager accessible from global scope for onclick handlers
declare global {
  interface Window {
    saveLoadManager: SaveLoadManager;
  }
}
