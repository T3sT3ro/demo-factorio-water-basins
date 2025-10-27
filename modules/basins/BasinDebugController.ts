// Debug wrapper for step-by-step basin computation visualization

import { computeBasinsGenerator } from "./BasinComputation.ts";
import type { BasinManager } from "./BasinManager.ts";
import type {
  BasinComputationYield,
  DebugState,
  DebugStepGranularity,
} from "./types.ts";

export class BasinDebugController {
  private basinManager: BasinManager;
  private generator: Generator<BasinComputationYield, void, DebugStepGranularity> | null = null;
  private currentDebugState: DebugState | null = null;

  constructor(basinManager: BasinManager) {
    this.basinManager = basinManager;
  }

  startDebugging(heights: number[][]): void {
    this.generator = computeBasinsGenerator(heights, this.basinManager);
    this.currentDebugState = {
      currentStage: "flood-fill",
      currentDepth: 1,
      processedTiles: new Set(),
      pendingTiles: new Set(),
      activeTile: null,
    };
  }

  isInDebugMode(): boolean {
    return this.generator !== null;
  }

  getDebugState(): DebugState | null {
    return this.currentDebugState;
  }

  step(granularity: DebugStepGranularity): { complete: boolean } {
    if (!this.generator) return { complete: true };

    const result = this.generator.next(granularity);

    if (result.done) {
      this.currentDebugState = {
        currentStage: "complete",
        currentDepth: 0,
        processedTiles: new Set(),
        pendingTiles: new Set(),
        activeTile: null,
      };
      this.generator = null;
      return { complete: true };
    }

    const yielded = result.value;
    this.currentDebugState = {
      currentStage: yielded.stage,
      currentDepth: yielded.depth ?? 0,
      processedTiles: yielded.processedTiles,
      pendingTiles: yielded.pendingTiles,
      activeTile: yielded.activeTile ?? null,
    };

    return { complete: false };
  }
}
