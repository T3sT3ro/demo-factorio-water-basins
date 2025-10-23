import { CONFIG } from "../config.ts";
import { getHeightColor } from "../rendering/ColorUtils.ts";

/**
 * Manages the legend UI - a static HTML element with click handling
 */
export class LegendUI {
  private selectedDepth = 0;
  private onDepthSelect: ((depth: number) => void) | undefined;

  constructor(onDepthSelect?: (depth: number) => void) {
    this.onDepthSelect = onDepthSelect;
    this.initialize();
  }

  private initialize(): void {
    const container = document.getElementById("legendItems");
    if (!container) return;

    // Generate static legend items
    container.innerHTML = Array.from({ length: CONFIG.MAX_DEPTH + 1 }, (_, depth) => `
      <button 
        class="legend-item" 
        data-depth="${depth}"
        style="--legend-color: ${getHeightColor(depth)}"
        aria-label="Select depth ${depth}"
      >
        <span class="legend-label">${depth}</span>
        <div class="legend-color-box"></div>
      </button>
    `).join("");

    // Add click handlers
    container.addEventListener("click", (e) => {
      const button = (e.target as HTMLElement).closest(".legend-item") as HTMLElement;
      if (button) {
        const depth = parseInt(button.dataset.depth || "0");
        this.selectDepth(depth);
        this.onDepthSelect?.(depth);
      }
    });

    // Select initial depth
    this.selectDepth(this.selectedDepth);
  }

  selectDepth(depth: number): void {
    this.selectedDepth = depth;

    const container = document.getElementById("legendItems");
    if (!container) return;

    // Update selection state
    container.querySelectorAll(".legend-item").forEach((item) => {
      const itemDepth = parseInt((item as HTMLElement).dataset.depth || "0");
      item.classList.toggle("legend-item-selected", itemDepth === depth);
    });
  }

  getSelectedDepth(): number {
    return this.selectedDepth;
  }
}
