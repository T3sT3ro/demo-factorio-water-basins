// UI Controller for save/load operations - separated from data logic
export class SaveLoadUIController {
  constructor(saveService, importExportService) {
    this.saveService = saveService;
    this.importExportService = importExportService;
    this.onStateChanged = null;
  }

  setStateChangeCallback(callback) {
    this.onStateChanged = callback;
  }

  setupEventHandlers() {
    // Load button
    const loadBtn = document.getElementById("loadBtn");
    if (loadBtn) {
      loadBtn.onclick = () => this.showLoadModal();
    }

    // Export button
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.onclick = () => this.showExportModal();
    }

    // Help button
    const helpBtn = document.getElementById("helpBtn");
    if (helpBtn) {
      helpBtn.onclick = () => this.showHelpModal();
    }

    // Load modal handlers
    const loadFromTextBtn = document.getElementById("loadFromTextBtn");
    if (loadFromTextBtn) {
      loadFromTextBtn.onclick = () => this.loadFromText();
    }

    const jsonFileInput = document.getElementById("jsonFileInput");
    if (jsonFileInput) {
      jsonFileInput.onchange = (event) => this.loadFromFile(event);
    }

    // Export modal handlers
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

    // Encoding selection handlers
    const heightEncodingSelect = document.getElementById("heightEncoding");
    if (heightEncodingSelect) {
      heightEncodingSelect.addEventListener("change", () => this.updateExportData());
    }

    const basinEncodingSelect = document.getElementById("basinEncoding");
    if (basinEncodingSelect) {
      basinEncodingSelect.addEventListener("change", () => this.updateExportData());
    }
  }

  async showLoadModal() {
    const modal = document.getElementById("loadModal");
    if (modal) {
      await this.populateSavedMapsList();
      modal.showModal();
    }
  }

  showExportModal() {
    const modal = document.getElementById("exportModal");
    if (modal) {
      this.setupOptimalDefaults();
      this.updateExportData();
      modal.showModal();
    }
  }

  showHelpModal() {
    const modal = document.getElementById("helpModal");
    if (modal) {
      modal.showModal();
    }
  }

  async populateSavedMapsList() {
    const container = document.getElementById("savedMaps");
    if (!container) return;

    try {
      const saves = await this.saveService.list();

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
            <button onclick="globalThis.saveLoadUI.loadFromBrowser('${this.escapeHtml(save.id)}')">Load</button>
            <button class="delete-btn" onclick="globalThis.saveLoadUI.deleteFromBrowser('${this.escapeHtml(save.id)}')">Delete</button>
          </div>
        </div>
      `).join("");
    } catch (error) {
      container.innerHTML = `<p class="error">Failed to load saved maps: ${error.message}</p>`;
    }
  }

  updateExportData() {
    const heightSelect = document.getElementById("heightEncoding");
    const basinSelect = document.getElementById("basinEncoding");

    if (!heightSelect || !basinSelect) return;

    const options = {
      heightEncoding: heightSelect.value,
      basinEncoding: basinSelect.value
    };

    // Update size information
    this.updateSizeInfo(options);

    // Update the JSON output
    const output = document.getElementById("exportJsonOutput");
    if (output && this.gameState) {
      try {
        const jsonData = this.importExportService.export(this.gameState, options);
        output.value = jsonData;
      } catch (error) {
        output.value = `Error generating export data: ${error.message}`;
        console.error("Export error:", error);
      }
    }
  }

  setupOptimalDefaults() {
    if (!this.gameState) return;

    try {
      const bestOptions = this.importExportService.getBestEncodingOptions(this.gameState);

      const heightSelect = document.getElementById("heightEncoding");
      const basinSelect = document.getElementById("basinEncoding");

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

  updateSizeInfo(options) {
    if (!this.gameState) return;

    const heightSizeInfo = document.getElementById("heightSizeInfo");
    const basinSizeInfo = document.getElementById("basinSizeInfo");
    const totalSizeInfo = document.getElementById("totalSizeInfo");

    try {
      const stats = this.importExportService.calculateCompressionStats(this.gameState, options);
      const totalJson = this.importExportService.export(this.gameState, options);

      if (heightSizeInfo) {
        heightSizeInfo.textContent = this.formatBytes(stats.heights.compressedSize);
      }
      if (basinSizeInfo) {
        basinSizeInfo.textContent = this.formatBytes(stats.basins.compressedSize);
      }
      if (totalSizeInfo) {
        totalSizeInfo.textContent = this.formatBytes(totalJson.length);
      }
    } catch (error) {
      console.error("Error calculating sizes:", error);
      if (heightSizeInfo) heightSizeInfo.textContent = "error";
      if (basinSizeInfo) basinSizeInfo.textContent = "error";
      if (totalSizeInfo) totalSizeInfo.textContent = "error";
    }
  }

  async loadFromText() {
    const textInput = document.getElementById("jsonTextInput");
    if (!textInput || !textInput.value.trim()) {
      alert("Please paste JSON data first.");
      return;
    }

    try {
      this.importExportService.import(textInput.value, this.gameState);
      if (this.onStateChanged) this.onStateChanged();
      document.getElementById("loadModal").close();
      textInput.value = "";
      alert("Map loaded successfully!");
    } catch (error) {
      alert(`Failed to load map: ${error.message}`);
    }
  }

  loadFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.importExportService.import(e.target.result, this.gameState);
        if (this.onStateChanged) this.onStateChanged();
        document.getElementById("loadModal").close();
        event.target.value = "";
        alert("Map loaded successfully!");
      } catch (error) {
        alert(`Failed to load map: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  async saveToBrowser() {
    const nameInput = document.getElementById("saveNameInput");
    if (!nameInput || !nameInput.value.trim()) {
      alert("Please enter a save name.");
      return;
    }

    const saveName = nameInput.value.trim();

    try {
      const jsonData = this.importExportService.export(this.gameState);
      const saveData = new (await import('./SaveData.js')).SaveData(saveName, jsonData);
      
      await this.saveService.save(saveData);
      nameInput.value = "";
      alert(`Map saved as "${saveName}"!`);

      // Refresh the saved maps list if the load modal is open
      if (document.getElementById("loadModal").open) {
        await this.populateSavedMapsList();
      }
    } catch (error) {
      alert(`Failed to save map: ${error.message}`);
      console.error("Save error:", error);
    }
  }

  async loadFromBrowser(saveId) {
    try {
      const saveData = await this.saveService.load(saveId);
      this.importExportService.import(saveData.data, this.gameState);
      if (this.onStateChanged) this.onStateChanged();
      document.getElementById("loadModal").close();
      alert(`Map "${saveData.name}" loaded successfully!`);
    } catch (error) {
      alert(`Failed to load map: ${error.message}`);
      console.error("Load error:", error);
    }
  }

  async deleteFromBrowser(saveId) {
    if (!confirm("Are you sure you want to delete this save?")) {
      return;
    }

    try {
      await this.saveService.delete(saveId);
      await this.populateSavedMapsList();
      alert("Save deleted successfully!");
    } catch (error) {
      alert(`Failed to delete save: ${error.message}`);
      console.error("Delete error:", error);
    }
  }

  copyJsonToClipboard() {
    const output = document.getElementById("exportJsonOutput");
    if (!output) return;

    output.select();
    output.setSelectionRange(0, 99999); // For mobile devices

    try {
      document.execCommand("copy");
      alert("JSON data copied to clipboard!");
    } catch {
      // Fallback for modern browsers
      navigator.clipboard.writeText(output.value).then(() => {
        alert("JSON data copied to clipboard!");
      }).catch(() => {
        alert("Failed to copy to clipboard. Please copy manually.");
      });
    }
  }

  downloadJson() {
    const output = document.getElementById("exportJsonOutput");
    if (!output || !output.value) return;

    const blob = new Blob([output.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const template = document.getElementById("download-link-template");
    const a = template ? template.content.querySelector("a").cloneNode(true) : document.createElement("a");
    a.href = url;
    a.download = `water-basins-map-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Setter for game state (to be used by Application)
  setGameState(gameState) {
    this.gameState = gameState;
  }
}
