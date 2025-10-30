// Game state management and main game logic

import { CONFIG } from "./config.ts";
import { HeightGenerator } from "./noise/NoiseGenerator.ts";
import { BasinManager } from "./basins/index.ts";
import { PumpManager, ReservoirManager } from "./pumps.ts";
import { BasinSerializer, HeightSerializer } from "./serialization/index.ts";
import type { SaveData } from "./SaveFormat.ts";

export class GameState {
  heightGenerator: HeightGenerator;
  basinManager: BasinManager;
  reservoirManager: ReservoirManager;
  pumpManager: PumpManager;
  tickCounter: number;
  currentSeed: number;
  heights: number[][];
  private onSeedChange?: (seed: number) => void;

  constructor(initialSeed?: number) {
    this.heightGenerator = new HeightGenerator(CONFIG.WORLD_W, CONFIG.WORLD_H, CONFIG.MAX_DEPTH);
    this.basinManager = new BasinManager();
    this.reservoirManager = new ReservoirManager();
    this.pumpManager = new PumpManager(this.reservoirManager, this.basinManager);

    this.tickCounter = 0;
    this.currentSeed = initialSeed ?? 0;

    // Initialize terrain
    this.heights = this.heightGenerator.generate(this.currentSeed);
    this.basinManager.computeBasins(this.heights);
  }

  setOnSeedChange(callback: (seed: number) => void): void {
    this.onSeedChange = callback;
  }

  // Terrain operations
  randomizeHeights(): void {
    this.currentSeed = Math.random() * 1000;
    console.log("Randomized heights with seed:", this.currentSeed);
    this.onSeedChange?.(this.currentSeed);
    this.heights = this.heightGenerator.generate(this.currentSeed);
    this.recomputeAll();
  }

  regenerateWithCurrentSettings(): void {
    performance.mark("height-generation-start");
    this.heights = this.heightGenerator.generate(this.currentSeed);
    performance.mark("height-generation-end");
    performance.measure("Height Generation", "height-generation-start", "height-generation-end");

    performance.mark("basin-computation-start");
    this.recomputeAll();
    performance.mark("basin-computation-end");
    performance.measure("Basin Computation", "basin-computation-start", "basin-computation-end");

    const measures = performance.getEntriesByType("measure");
    const recentMeasures = measures.slice(-2);
    recentMeasures.forEach((measure) => {
      console.log(`  └─ ${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });
  }

  setDepthAtBatch(x: number, y: number, depth: number): void {
    if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
      this.heights[y]![x] = Math.max(0, Math.min(CONFIG.MAX_DEPTH, depth));
    }
  }

  // Water operations
  clearAllWater(): void {
    this.basinManager.clearAllWater();
    this.reservoirManager.clearAllWater();
  }

  // Simulation tick
  tick(): void {
    this.tickCounter++;
    this.pumpManager.tick();
  }

  // Utility methods
  recomputeAll(): void {
    performance.mark("basin-manager-compute-start");
    this.basinManager.computeBasins(this.heights);
    performance.mark("basin-manager-compute-end");
    performance.measure(
      "Basin Manager - Compute Basins",
      "basin-manager-compute-start",
      "basin-manager-compute-end",
    );

    const measures = performance.getEntriesByType("measure");
    const lastMeasure = measures[measures.length - 1];
    if (lastMeasure) {
      console.log(`    └─ ${lastMeasure.name}: ${lastMeasure.duration.toFixed(2)}ms`);
    }
  }

  // Save/Load functionality
  exportToJSON(options: { heightEncoding?: string; basinEncoding?: string } = {}): string {
    const heightEncoding = options.heightEncoding || "2d_array";
    const basinEncoding = options.basinEncoding || "string_rows";

    const data: SaveData = {
      version: "1.1.0",
      timestamp: new Date().toISOString(),
      encodingOptions: {
        heightEncoding: heightEncoding,
        basinEncoding: basinEncoding,
      },
      currentSeed: this.currentSeed,
      heights: HeightSerializer.compress(this.heights, heightEncoding),
      tickCounter: this.tickCounter,
      noiseSettings: this.heightGenerator.getNoiseSettings(),
      basins: BasinSerializer.compress(this.basinManager, basinEncoding),
      pumps: this.pumpManager.getAllPumps().map((pump) => ({
        x: pump.x,
        y: pump.y,
        mode: pump.mode,
        reservoirId: pump.reservoirId,
      })),
      reservoirs: Array.from(this.reservoirManager.getAllReservoirs().entries()).map((
        [id, reservoir],
      ) => ({
        id: id,
        volume: reservoir.volume,
      })),
    };
    return JSON.stringify(data, null, 2);
  }

  importFromJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString) as SaveData;

      if (!data.version) {
        throw new Error("Invalid save data: missing version information");
      }

      if (data.currentSeed !== undefined) {
        this.currentSeed = data.currentSeed;
      }

      if (data.heights) {
        this.heights = HeightSerializer.decompress(data.heights);
      } else {
        throw new Error("Invalid save data: missing terrain heights");
      }

      if (data.tickCounter !== undefined) {
        this.tickCounter = data.tickCounter;
      }

      if (data.noiseSettings) {
        const settings = this.heightGenerator.getNoiseSettings();
        Object.assign(settings, data.noiseSettings);
        settings.updateUI();
      }

      this.basinManager = new BasinManager();
      this.reservoirManager = new ReservoirManager();
      this.pumpManager = new PumpManager(this.reservoirManager, this.basinManager);

      this.basinManager.computeBasins(this.heights);

      if (data.basins) {
        if (data.basins.format === "optimized_v2" || data.basins.format === "optimized_v1") {
          BasinSerializer.reconstructBasins(this.basinManager, data.basins);
        } else {
          BasinSerializer.importLegacy(this.basinManager, data.basins);
        }
      }

      if (data.reservoirs) {
        data.reservoirs.forEach((reservoirData) => {
          this.reservoirManager.createReservoir(reservoirData.id);
          const reservoir = this.reservoirManager.getReservoir(reservoirData.id);
          if (reservoir) {
            reservoir.volume = reservoirData.volume || 0;
          }
        });
      }

      if (data.pumps) {
        data.pumps.forEach((pumpData) => {
          if (pumpData.reservoirId) {
            this.reservoirManager.createReservoir(pumpData.reservoirId);
            this.reservoirManager.setSelectedReservoir(pumpData.reservoirId);
          }

          this.pumpManager.addPumpAt(
            pumpData.x,
            pumpData.y,
            pumpData.mode || "inlet",
            true,
          );
        });
      }

      return true;
    } catch (error) {
      console.error("Failed to import save data:", error);
      throw new Error(`Failed to import save data: ${(error as Error).message}`);
    }
  }

  // Encoding size calculation for optimization
  calculateEncodingSizes(): Record<string, number> {
    const heightSizes = HeightSerializer.calculateEncodingSizes(this.heights);
    const basinSizes = BasinSerializer.calculateEncodingSizes(this.basinManager);

    const results: Record<string, number> = {};
    Object.entries(heightSizes).forEach(([key, value]) => {
      results[`height_${key}`] = value;
    });
    Object.entries(basinSizes).forEach(([key, value]) => {
      results[`basin_${key}`] = value;
    });

    return results;
  }

  getBestEncodingOptions(): {
    heightEncoding: string;
    basinEncoding: string;
    sizes: Record<string, number>;
  } {
    return {
      heightEncoding: HeightSerializer.getBestEncoding(this.heights),
      basinEncoding: BasinSerializer.getBestEncoding(this.basinManager),
      sizes: this.calculateEncodingSizes(),
    };
  }
}
