import type { Renderer } from "./rendering/renderer.ts";

/**
 * Coordinates common update patterns across renderer and displays
 */
export class UpdateCoordinator {
  constructor(
    private renderer: Renderer,
    private draw: () => void,
    private updateDebugDisplays: () => void,
  ) {}

  onTerrainChange(): void {
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged();
    this.renderer.onLabelsToggled();
    this.draw();
    this.updateDebugDisplays();
  }

  onWaterChange(): void {
    this.renderer.onWaterChanged();
    this.draw();
    this.updateDebugDisplays();
  }

  onPumpsChange(): void {
    this.renderer.onPumpsChanged();
    this.draw();
    this.updateDebugDisplays();
  }

  onLabelsChange(): void {
    this.renderer.onLabelsToggled();
    this.draw();
  }

  onBasinHighlightChange(): void {
    this.renderer.onBasinHighlightChanged();
    this.draw();
  }

  onDepthSelectionChange(): void {
    this.renderer.onDepthSelectionChanged();
    this.draw();
  }

  onViewChange(): void {
    this.draw();
  }

  onFullUpdate(): void {
    this.renderer.onTerrainChanged();
    this.renderer.onWaterChanged();
    this.renderer.onPumpsChanged();
    this.renderer.onLabelsToggled();
    this.draw();
    this.updateDebugDisplays();
  }
}
