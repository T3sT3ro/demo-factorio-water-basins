// Label settings management

/**
 * Manages UI label visibility settings with localStorage persistence
 */
export class UISettings {
  constructor() {
    this.loadSettings();
  }

  loadSettings() {
    // Load label control settings
    const showDepthLabels = localStorage.getItem("showDepthLabels");
    const showPumpLabels = localStorage.getItem("showPumpLabels");
    const showBasinLabels = localStorage.getItem("showBasinLabels");

    this.showDepthLabels = showDepthLabels !== null ? showDepthLabels === "true" : true;
    this.showPumpLabels = showPumpLabels !== null ? showPumpLabels === "true" : true;
    this.showBasinLabels = showBasinLabels !== null ? showBasinLabels === "true" : false;

    this.updateUI();
  }

  saveSettings() {
    localStorage.setItem("showDepthLabels", this.showDepthLabels.toString());
    localStorage.setItem("showPumpLabels", this.showPumpLabels.toString());
    localStorage.setItem("showBasinLabels", this.showBasinLabels.toString());
  }

  updateUI() {
    const showDepthLabelsEl = document.getElementById("showDepthLabels");
    const showPumpLabelsEl = document.getElementById("showPumpLabels");
    const showBasinLabelsEl = document.getElementById("showBasinLabels");

    if (showDepthLabelsEl) showDepthLabelsEl.checked = this.showDepthLabels;
    if (showPumpLabelsEl) showPumpLabelsEl.checked = this.showPumpLabels;
    if (showBasinLabelsEl) showBasinLabelsEl.checked = this.showBasinLabels;
  }

  toggleDepthLabels() {
    this.showDepthLabels = !this.showDepthLabels;
    this.saveSettings();
  }

  togglePumpLabels() {
    this.showPumpLabels = !this.showPumpLabels;
    this.saveSettings();
  }

  toggleBasinLabels() {
    this.showBasinLabels = !this.showBasinLabels;
    this.saveSettings();
  }
}
