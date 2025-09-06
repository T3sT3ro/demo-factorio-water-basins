/**
 * DebugManager - Handles debug UI and functionality
 * 
 * Responsibilities:
 * - Manage debug UI elements
 * - Handle debug stepping (placeholder for future implementation)
 * - Coordinate debug state display
 */
export class DebugManager {
  constructor() {
    this.debugEnabled = false;
  }

  /**
   * Setup debug event handlers
   */
  setupDebugEventHandlers() {
    const enableDebugCheckbox = document.getElementById("enableFloodFillDebug");
    const stepButton = document.getElementById("stepFloodFill");
    const stepOverBasinButton = document.getElementById("stepOverBasin");

    if (enableDebugCheckbox) {
      // Debug stepping is not implemented - keep checkbox unchecked and buttons disabled
      enableDebugCheckbox.checked = false;
      
      // Disable all debug buttons since functionality is not implemented
      if (stepButton) stepButton.disabled = true;
      if (stepOverBasinButton) stepOverBasinButton.disabled = true;
      
      // Set debug UI to show not-implemented status
      this.updateDebugUI({});

      enableDebugCheckbox.addEventListener("change", (e) => {
        this.debugEnabled = e.target.checked;
        
        // Debug functionality is not implemented - just update UI
        this.updateDebugUI({});
        
        // Keep buttons disabled since debug stepping is not implemented
        if (stepButton) stepButton.disabled = true;
        if (stepOverBasinButton) stepOverBasinButton.disabled = true;
      });
    }
  }

  /**
   * Update debug UI display
   */
  updateDebugUI(_debugState) {
    const stageEl = document.getElementById("debugStage");
    
    // Only show stage, hardcoded to "not-implemented"
    if (stageEl) stageEl.textContent = 'not-implemented';
  }

  /**
   * Check if debug is enabled
   */
  isDebugEnabled() {
    return this.debugEnabled;
  }
}
