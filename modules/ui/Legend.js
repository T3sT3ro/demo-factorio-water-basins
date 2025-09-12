// Legend UI component for depth selection

import { CONFIG } from "../config.js";
import { CSS_CLASSES } from "../constants.js";

/**
 * @typedef {Object} LegendItem
 * @property {number} depth - The depth value
 * @property {string} color - CSS color string for this depth
 * @property {HTMLElement} element - The DOM element for this item
 */

/**
 * Legend component for displaying and selecting terrain depths
 */
export class Legend {
  /** @type {number} */
  #selectedDepth = 0;

  /** @type {Map<number, LegendItem>} */
  #items = new Map();

  /** @type {HTMLElement|null} */
  #container = null;

  /** @type {((depth: number) => void)|null} */
  #onDepthSelected = null;

  /**
   * Initialize the legend component
   * @param {string} containerId - ID of the container element
   * @param {((depth: number) => void)|null} [onDepthSelected] - Callback when depth is selected
   */
  constructor(containerId, onDepthSelected = null) {
    this.#container = document.getElementById(containerId);
    this.#onDepthSelected = onDepthSelected;
    
    if (!this.#container) {
      console.warn(`Legend container with ID "${containerId}" not found`);
      return;
    }

    this.#createItems();
  }

  /**
   * Get the currently selected depth
   * @returns {number} Selected depth value
   */
  getSelectedDepth() {
    return this.#selectedDepth;
  }

  /**
   * Set the selected depth and update UI
   * @param {number} depth - Depth to select
   */
  setSelectedDepth(depth) {
    if (depth < 0 || depth > CONFIG.MAX_DEPTH) {
      console.warn(`Invalid depth: ${depth}. Must be between 0 and ${CONFIG.MAX_DEPTH}`);
      return;
    }

    // Remove previous selection styling
    const previousItem = this.#items.get(this.#selectedDepth);
    if (previousItem) {
      previousItem.element.classList.remove(CSS_CLASSES.LEGEND_ITEM_SELECTED);
    }

    // Update selected depth
    this.#selectedDepth = depth;

    // Add selection styling to new item
    const currentItem = this.#items.get(depth);
    if (currentItem) {
      currentItem.element.classList.add(CSS_CLASSES.LEGEND_ITEM_SELECTED);
    }
  }

  /**
   * Get color for a specific depth
   * @param {number} depth - The depth value
   * @returns {string} CSS color string
   */
  #getDepthColor(depth) {
    // Import the color function - this should be moved to a color manager later
    // For now, we'll inline the logic
    if (depth === 0) {
      return "#8B4513"; // Brown for surface
    } else {
      // Gray gradient for depths > 0
      const ratio = depth / CONFIG.MAX_DEPTH;
      const lightGray = 200;
      const range = 120;
      const v = Math.floor(lightGray - ratio * range);
      return `rgb(${v},${v},${v})`;
    }
  }

  /**
   * Create legend items for all depths
   */
  #createItems() {
    if (!this.#container) return;

    // Clear existing content
    this.#container.innerHTML = "";
    this.#items.clear();

    for (let depth = 0; depth <= CONFIG.MAX_DEPTH; depth++) {
      const item = this.#createLegendItem(depth);
      this.#items.set(depth, {
        depth,
        color: this.#getDepthColor(depth),
        element: item
      });
      this.#container.appendChild(item);
    }

    // Set initial selection
    this.setSelectedDepth(0);
  }

  /**
   * Create a single legend item element
   * @param {number} depth - Depth value for this item
   * @returns {HTMLElement} The created legend item element
   */
  #createLegendItem(depth) {
    const item = document.createElement("div");
    item.className = CSS_CLASSES.LEGEND_ITEM;
    item.id = `legend-item-${depth}`;
    item.style.cursor = "pointer";
    
    // Add click handler for depth selection
    item.addEventListener("click", () => {
      this.setSelectedDepth(depth);
      if (this.#onDepthSelected) {
        this.#onDepthSelected(depth);
      }
    });

    // Create color box
    const colorBox = document.createElement("div");
    colorBox.className = CSS_CLASSES.LEGEND_COLOR;
    colorBox.style.backgroundColor = this.#getDepthColor(depth);

    // Create label
    const label = document.createElement("span");
    label.textContent = `${depth}`;

    // Append elements
    item.appendChild(label);
    item.appendChild(colorBox);

    return item;
  }

  /**
   * Refresh the legend (recreate all items)
   * Useful when configuration changes
   */
  refresh() {
    this.#createItems();
  }

  /**
   * Set the callback function for depth selection
   * @param {(depth: number) => void} callback - Callback function
   */
  setOnDepthSelected(callback) {
    this.#onDepthSelected = callback;
  }

  /**
   * Destroy the legend component
   */
  destroy() {
    if (this.#container) {
      this.#container.innerHTML = "";
    }
    this.#items.clear();
    this.#onDepthSelected = null;
  }
}
