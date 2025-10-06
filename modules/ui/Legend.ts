// Legend UI component for depth selection

import { CONFIG } from "../config.ts";
import { CSS_CLASSES } from "../constants.ts";

interface LegendItem {
  depth: number;
  color: string;
  element: HTMLElement;
}


export class Legend {
  private selectedDepth: number = 0;
  private items: Map<number, LegendItem> = new Map();
  private container: HTMLElement | null = null;
  private onDepthSelected: ((depth: number) => void) | null = null;


  constructor(containerId: string, onDepthSelected: ((depth: number) => void) | null = null) {
    this.container = document.getElementById(containerId);
    this.onDepthSelected = onDepthSelected;
    
    if (!this.container) {
      console.warn(`Legend container with ID "${containerId}" not found`);
      return;
    }

    this.createItems();
  }


  getSelectedDepth(): number {
    return this.selectedDepth;
  }


  setSelectedDepth(depth: number): void {
    if (depth < 0 || depth > CONFIG.MAX_DEPTH) {
      console.warn(`Invalid depth: ${depth}. Must be between 0 and ${CONFIG.MAX_DEPTH}`);
      return;
    }

    // Remove previous selection styling
    const previousItem = this.items.get(this.selectedDepth);
    if (previousItem) {
      previousItem.element.classList.remove(CSS_CLASSES.LEGEND_ITEM_SELECTED);
    }

    // Update selected depth
    this.selectedDepth = depth;

    // Add selection styling to new item
    const currentItem = this.items.get(depth);
    if (currentItem) {
      currentItem.element.classList.add(CSS_CLASSES.LEGEND_ITEM_SELECTED);
    }
  }

  private getDepthColor(depth: number): string {
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

  private createItems(): void {
    if (!this.container) return;

    // Clear existing content
    this.container.innerHTML = "";
    this.items.clear();

    for (let depth = 0; depth <= CONFIG.MAX_DEPTH; depth++) {
      const item = this.createLegendItem(depth);
      this.items.set(depth, {
        depth,
        color: this.getDepthColor(depth),
        element: item
      });
      this.container.appendChild(item);
    }

    // Set initial selection
    this.setSelectedDepth(0);
  }

  private createLegendItem(depth: number): HTMLElement {
    const template = document.getElementById("legend-item-template") as HTMLTemplateElement;
    if (!template) {
      console.error("Legend item template not found");
      // Fallback to createElement
      const item = document.createElement("div");
      item.className = CSS_CLASSES.LEGEND_ITEM;
      item.id = `legend-item-${depth}`;
      item.style.cursor = "pointer";
      const colorBox = document.createElement("div");
      colorBox.className = CSS_CLASSES.LEGEND_COLOR;
      colorBox.style.backgroundColor = this.getDepthColor(depth);
      const label = document.createElement("span");
      label.textContent = `${depth}`;
      item.appendChild(colorBox);
      item.appendChild(label);
      return item;
    }

    const item = template.content.querySelector(".legend-item")!.cloneNode(true) as HTMLElement;
    item.id = `legend-item-${depth}`;
    item.style.cursor = "pointer";

    // Add click handler for depth selection
    item.addEventListener("click", () => {
      this.setSelectedDepth(depth);
      if (this.onDepthSelected) {
        this.onDepthSelected(depth);
      }
    });

    // Set color and label
    const colorBox = item.querySelector(".legend-color") as HTMLElement;
    const label = item.querySelector("span") as HTMLElement;
    if (colorBox) colorBox.style.backgroundColor = this.getDepthColor(depth);
    if (label) label.textContent = `${depth}`;

    return item;
  }

  refresh(): void {
    this.createItems();
  }

  setOnDepthSelected(callback: (depth: number) => void): void {
    this.onDepthSelected = callback;
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.items.clear();
    this.onDepthSelected = null;
  }
}