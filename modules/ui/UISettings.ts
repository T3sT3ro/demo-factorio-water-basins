// UI settings for label visibility with localStorage persistence

export class UISettings {
  showDepthLabels: boolean;
  showPumpLabels: boolean;
  showBasinLabels: boolean;

  constructor() {
    this.showDepthLabels = true;
    this.showPumpLabels = true;
    this.showBasinLabels = false;
    this.loadSettings();
  }

  loadSettings(): void {
    // Load label control settings
    const showDepthLabels = localStorage.getItem("showDepthLabels");
    const showPumpLabels = localStorage.getItem("showPumpLabels");
    const showBasinLabels = localStorage.getItem("showBasinLabels");

    this.showDepthLabels = showDepthLabels !== null ? showDepthLabels === "true" : true;
    this.showPumpLabels = showPumpLabels !== null ? showPumpLabels === "true" : true;
    this.showBasinLabels = showBasinLabels !== null ? showBasinLabels === "true" : false;

    this.updateUI();
  }

  saveSettings(): void {
    localStorage.setItem("showDepthLabels", this.showDepthLabels.toString());
    localStorage.setItem("showPumpLabels", this.showPumpLabels.toString());
    localStorage.setItem("showBasinLabels", this.showBasinLabels.toString());
  }

  updateUI(): void {
    const showDepthLabelsEl = document.getElementById("showDepthLabels") as HTMLInputElement | null;
    const showPumpLabelsEl = document.getElementById("showPumpLabels") as HTMLInputElement | null;
    const showBasinLabelsEl = document.getElementById("showBasinLabels") as HTMLInputElement | null;

    if (showDepthLabelsEl) showDepthLabelsEl.checked = this.showDepthLabels;
    if (showPumpLabelsEl) showPumpLabelsEl.checked = this.showPumpLabels;
    if (showBasinLabelsEl) showBasinLabelsEl.checked = this.showBasinLabels;
  }

  toggleDepthLabels(): void {
    this.showDepthLabels = !this.showDepthLabels;
    this.saveSettings();
  }

  togglePumpLabels(): void {
    this.showPumpLabels = !this.showPumpLabels;
    this.saveSettings();
  }

  toggleBasinLabels(): void {
    this.showBasinLabels = !this.showBasinLabels;
    this.saveSettings();
  }
}
