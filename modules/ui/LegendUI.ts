import { CONFIG } from "../config.ts";
import { UI_CONSTANTS } from "../constants.ts";
import { getHeightColor } from "../rendering/ColorUtils.ts";

/**
 * Manages the controls UI - depth selection and brush size
 */
export class ControlsUI {
  private selectedDepth = 0;
  private brushSize = UI_CONSTANTS.BRUSH.MIN_SIZE;
  private onDepthSelect: ((depth: number) => void) | undefined;
  private onBrushSizeChange: ((size: number) => void) | undefined;

  constructor(
    onDepthSelect?: (depth: number) => void,
    onBrushSizeChange?: (size: number) => void,
  ) {
    this.onDepthSelect = onDepthSelect;
    this.onBrushSizeChange = onBrushSizeChange;
    this.initialize();
  }

  private initialize(): void {
    this.initializeDepthButtons();
    this.initializeBrushSlider();
  }

  private initializeDepthButtons(): void {
    const container = document.getElementById("depthButtons");
    const template = document.getElementById("template-depth-button") as HTMLTemplateElement;
    if (!container || !template) return;

    // Create depth buttons from template
    const fragment = document.createDocumentFragment();
    for (let depth = 0; depth <= CONFIG.MAX_DEPTH; depth++) {
      const clone = template.content.cloneNode(true) as DocumentFragment;
      const button = clone.querySelector(".legend-item") as HTMLButtonElement;

      button.dataset.depth = depth.toString();
      button.style.setProperty("--legend-color", getHeightColor(depth));
      button.setAttribute("aria-label", `Select depth ${depth}`);

      const label = button.querySelector(".legend-label");
      if (label) label.textContent = depth.toString();

      fragment.appendChild(clone);
    }

    container.appendChild(fragment);

    // Add click handler
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

  private initializeBrushSlider(): void {
    const slider = document.getElementById("brushSizeSlider") as HTMLInputElement;
    const valueDisplay = document.getElementById("brushSizeValue");
    if (!slider || !valueDisplay) return;

    // Set range from constants
    slider.min = UI_CONSTANTS.BRUSH.MIN_SIZE.toString();
    slider.max = UI_CONSTANTS.BRUSH.MAX_SIZE.toString();
    slider.value = this.brushSize.toString();
    valueDisplay.textContent = this.brushSize.toString();

    // Add input handler
    slider.addEventListener("input", () => {
      const size = parseInt(slider.value);
      this.brushSize = size;
      valueDisplay.textContent = size.toString();
      this.onBrushSizeChange?.(size);
    });
  }

  selectDepth(depth: number): void {
    this.selectedDepth = depth;

    const container = document.getElementById("depthButtons");
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

  setBrushSize(size: number): void {
    this.brushSize = size;
    const slider = document.getElementById("brushSizeSlider") as HTMLInputElement;
    const valueDisplay = document.getElementById("brushSizeValue");
    if (slider) slider.value = size.toString();
    if (valueDisplay) valueDisplay.textContent = size.toString();
  }

  getBrushSize(): number {
    return this.brushSize;
  }
}
