/**
 * UI Manager for render-related UI components
 * Separates UI concerns from core rendering logic
 */

import { Legend } from "../ui/Legend.js";
import { BasinLabelManager } from "../labels.js";

/**
 * Manages UI components related to rendering
 * This replaces the mixed UI concerns that were in the old renderer.js
 */
export class RenderUIManager {
  constructor() {
    // Legend component for depth selection
    this.legend = new Legend("legendItems");
    
    // Basin label management
    this.basinLabelManager = new BasinLabelManager();
  }

  /**
   * Get legend component
   * @returns {Legend} Legend instance
   */
  getLegend() {
    return this.legend;
  }

  /**
   * Get basin label manager
   * @returns {BasinLabelManager} Basin label manager instance
   */
  getBasinLabelManager() {
    return this.basinLabelManager;
  }

  /**
   * Initialize UI components (Legend initializes automatically in constructor)
   */
  initialize() {
    // Legend auto-initializes in constructor
    // Additional initialization can be added here if needed
  }
}
