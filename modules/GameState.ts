// Game state management and main game logic

import { CONFIG } from "./config.ts";
import { HeightGenerator } from "./noise/NoiseGenerator.ts";
import type { NoiseSettings } from "./noise/NoiseSettings.ts";
import { BasinManager } from "./basins.ts";
import { PumpManager, ReservoirManager } from "./pumps.ts";

interface Reservoir {
  id: number;
  volume: number;
}

interface PumpSaveData {
  x: number;
  y: number;
  mode: "inlet" | "outlet";
  reservoirId: number;
}

interface SaveData {
  version: string;
  timestamp: string;
  encodingOptions: {
    heightEncoding: string;
    basinEncoding: string;
  };
  currentSeed: number;
  heights: CompressedHeights;
  tickCounter: number;
  noiseSettings: NoiseSettings;
  basins: CompressedBasins;
  pumps: PumpSaveData[];
  reservoirs: Reservoir[];
}

interface CompressedHeights {
  format: "2d_array" | "rle" | "base64_packed";
  width: number;
  height: number;
  data: string;
}

interface CompressedBasinIdMap {
  format: "string_rows" | "rle_basin_ids";
  data: string;
}

interface BasinTreeNode {
  height: number;
  volume: number;
  level: number;
  tileCount: number;
  children: string[];
}

interface CompressedBasins {
  format: "optimized_v2" | "optimized_v1";
  width: number;
  height: number;
  basinIdMap: CompressedBasinIdMap;
  basinData: Record<string, BasinTreeNode>;
  basinTree?: Record<string, { height: number; outlets: string[] }>;
  basinMetadata?: Record<string, { volume: number; level: number }>;
}

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

  setDepthAt(x: number, y: number, depth: number): void {
    if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
      this.heights[y]![x] = Math.max(0, Math.min(CONFIG.MAX_DEPTH, depth));
      this.recomputeAll();
    }
  }

  setDepthAtBatch(x: number, y: number, depth: number): void {
    if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
      this.heights[y]![x] = Math.max(0, Math.min(CONFIG.MAX_DEPTH, depth));
    }
  }

  revalidateMap(): void {
    this.recomputeAll();
  }

  increaseDepthAt(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
      this.heights[y]![x] = Math.min(CONFIG.MAX_DEPTH, this.heights[y]![x]! + 1);
      this.recomputeAll();
    }
  }

  decreaseDepthAt(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
      this.heights[y]![x] = Math.max(0, this.heights[y]![x]! - 1);
      this.recomputeAll();
    }
  }

  setToMinNeighborHeight(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
      const minHeight = this.getMinNeighborHeight(x, y);
      this.heights[y]![x] = minHeight;
      this.recomputeAll();
    }
  }

  getMinNeighborHeight(x: number, y: number): number {
    let minHeight = CONFIG.MAX_DEPTH + 1;
    const neighbors: [number, number][] = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && ny >= 0 && nx < CONFIG.WORLD_W && ny < CONFIG.WORLD_H) {
        minHeight = Math.min(minHeight, this.heights[ny]![nx]!);
      }
    }

    return minHeight <= CONFIG.MAX_DEPTH ? minHeight : this.heights[y]![x]!;
  }

  // Pump operations
  addPump(x: number, y: number, mode: "inlet" | "outlet", linkToExisting = false): number | null {
    const reservoirId = this.pumpManager.addPumpAt(x, y, mode, linkToExisting);
    return reservoirId;
  }

  linkPumpToReservoir(x: number, y: number): boolean {
    return this.pumpManager.linkPumpToReservoir(x, y);
  }

  clearPumps(): void {
    this.pumpManager.clearAll();
  }

  // Water operations
  floodFill(x: number, y: number, fillWithWater: boolean): void {
    this.basinManager.floodFill(x, y, fillWithWater);
  }

  clearAllWater(): void {
    this.basinManager.clearAllWater();
    this.reservoirManager.clearAllWater();
  }

  // Simulation tick
  tick(): void {
    this.tickCounter++;
    this.pumpManager.tick();
  }

  // Reservoir management
  setSelectedReservoir(id: number | null): void {
    this.reservoirManager.setSelectedReservoir(id);
  }

  getSelectedReservoir(): number | null {
    return this.reservoirManager.getSelectedReservoir();
  }

  // Basin highlighting
  setHighlightedBasin(basinId: string | null): void {
    this.basinManager.setHighlightedBasin(basinId);
  }

  getHighlightedBasin(): string | null {
    return this.basinManager.getHighlightedBasin();
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

  // Getters for rendering
  getHeights(): number[][] {
    return this.heights;
  }

  getBasins() {
    return this.basinManager.basins;
  }

  getPumps() {
    return this.pumpManager.getAllPumps();
  }

  getReservoirs() {
    return this.reservoirManager.getAllReservoirs();
  }

  getPumpsByReservoir() {
    return this.pumpManager.getPumpsByReservoir();
  }

  getTickCounter(): number {
    return this.tickCounter;
  }

  // Getters for managers (for UI access)
  getBasinManager(): BasinManager {
    return this.basinManager;
  }

  getReservoirManager(): ReservoirManager {
    return this.reservoirManager;
  }

  getPumpManager(): PumpManager {
    return this.pumpManager;
  }

  getHeightGenerator(): HeightGenerator {
    return this.heightGenerator;
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
      heights: this.compressHeights(heightEncoding),
      tickCounter: this.tickCounter,
      noiseSettings: this.heightGenerator.getNoiseSettings(),
      basins: this.compressBasins(basinEncoding),
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
        this.heights = this.decompressHeights(data.heights);
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
          this.reconstructBasinsFromCompressed(data.basins);
        } else {
          this.importLegacyBasins(data.basins);
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

  // Compression utilities for better save format
  compressHeights(encodingType: string): CompressedHeights {
    switch (encodingType) {
      case "rle":
        return this.runLengthEncode(this.heights);
      case "base64_packed":
        return this.base64Encode(this.heights);
      case "2d_array":
      default:
        return {
          format: "2d_array",
          width: CONFIG.WORLD_W,
          height: CONFIG.WORLD_H,
          data: this.heights.map((row) => row.join("")).join("\n"),
        };
    }
  }

  runLengthEncode(heights: number[][]): CompressedHeights {
    const flattened = heights.flat();
    let compressed = "";
    let current = flattened[0];
    let count = 1;

    for (let i = 1; i < flattened.length; i++) {
      if (flattened[i] === current) {
        count++;
      } else {
        compressed += (compressed ? "," : "") + current + (count > 1 ? ":" + count : "");
        current = flattened[i]!;
        count = 1;
      }
    }
    compressed += (compressed ? "," : "") + current + (count > 1 ? ":" + count : "");

    return {
      format: "rle",
      width: CONFIG.WORLD_W,
      height: CONFIG.WORLD_H,
      data: compressed,
    };
  }

  base64Encode(heights: number[][]): CompressedHeights {
    const flattened = heights.flat();
    const bytes: number[] = [];

    for (let i = 0; i < flattened.length; i += 2) {
      const val1 = flattened[i] || 0;
      const val2 = flattened[i + 1] || 0;
      bytes.push((val1 << 4) | val2);
    }

    const uint8Array = new Uint8Array(bytes);
    const base64 = btoa(String.fromCharCode(...uint8Array));

    return {
      format: "base64_packed",
      width: CONFIG.WORLD_W,
      height: CONFIG.WORLD_H,
      data: base64,
    };
  }

  decompressHeights(compressed: CompressedHeights | number[][]): number[][] {
    if (Array.isArray(compressed)) {
      return compressed;
    }

    switch (compressed.format) {
      case "2d_array":
        return compressed.data.split("\n").map((row) =>
          row.split("").map((char) => parseInt(char, 10))
        );

      case "rle":
        return this.runLengthDecode(compressed);

      case "base64_packed":
        return this.base64Decode(compressed);

      default:
        return Array.isArray(compressed) ? compressed : [];
    }
  }

  runLengthDecode(compressed: CompressedHeights): number[][] {
    const flattened: number[] = [];
    const pairs = compressed.data.split(",");

    for (const pair of pairs) {
      if (pair.includes(":")) {
        const [valueStr, countStr] = pair.split(":");
        const value = parseInt(valueStr!, 10);
        const count = parseInt(countStr!, 10);
        for (let i = 0; i < count; i++) {
          flattened.push(value);
        }
      } else {
        const value = parseInt(pair, 10);
        flattened.push(value);
      }
    }

    const heights: number[][] = [];
    for (let y = 0; y < compressed.height; y++) {
      heights[y] = [];
      for (let x = 0; x < compressed.width; x++) {
        heights[y]![x] = flattened[y * compressed.width + x]!;
      }
    }
    return heights;
  }

  base64Decode(compressed: CompressedHeights): number[][] {
    const binaryString = atob(compressed.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const flattened: number[] = [];
    for (const byte of bytes) {
      flattened.push((byte >> 4) & 0xF);
      flattened.push(byte & 0xF);
    }

    const heights: number[][] = [];
    for (let y = 0; y < compressed.height; y++) {
      heights[y] = [];
      for (let x = 0; x < compressed.width; x++) {
        const index = y * compressed.width + x;
        heights[y]![x] = index < flattened.length ? flattened[index]! : 0;
      }
    }
    return heights;
  }

  // Basin compression utilities
  compressBasins(encodingType: string): CompressedBasins {
    const basinIdMap = this.createBasinIdMap();
    const basinTree = this.createBasinTree();

    return {
      format: "optimized_v2",
      width: CONFIG.WORLD_W,
      height: CONFIG.WORLD_H,
      basinIdMap: this.compressBasinIdMap(basinIdMap, encodingType),
      basinData: basinTree,
    };
  }

  createBasinIdMap(): string[][] {
    const basinIdMap: string[][] = [];
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      basinIdMap[y] = [];
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const basinId = this.basinManager.basinIdOf[y]![x];
        basinIdMap[y]![x] = basinId || "0";
      }
    }
    return basinIdMap;
  }

  compressBasinIdMap(basinIdMap: string[][], encodingType: string): CompressedBasinIdMap {
    switch (encodingType) {
      case "rle_basin_ids":
        return this.runLengthEncodeBasinIds(basinIdMap);
      case "string_rows":
      default:
        return {
          format: "string_rows",
          data: basinIdMap.map((row) => row.join("|")).join("\n"),
        };
    }
  }

  runLengthEncodeBasinIds(basinIdMap: string[][]): CompressedBasinIdMap {
    const flattened = basinIdMap.flat();
    let compressed = "";
    let current = flattened[0];
    let count = 1;

    for (let i = 1; i < flattened.length; i++) {
      if (flattened[i] === current) {
        count++;
      } else {
        compressed += (compressed ? "," : "") + current + (count > 1 ? ":" + count : "");
        current = flattened[i]!;
        count = 1;
      }
    }
    compressed += (compressed ? "," : "") + current + (count > 1 ? ":" + count : "");

    return {
      format: "rle_basin_ids",
      data: compressed,
    };
  }

  createBasinTree(): Record<string, BasinTreeNode> {
    const tree: Record<string, BasinTreeNode> = {};
    this.basinManager.basins.forEach((basin, basinId) => {
      tree[basinId] = {
        height: basin.height,
        volume: basin.volume || 0,
        level: basin.level || 0,
        tileCount: basin.tiles ? basin.tiles.size : 0,
        children: [],
      };
    });

    this.basinManager.basins.forEach((basin, basinId) => {
      if (basin.outlets && basin.outlets.length > 0) {
        basin.outlets.forEach((outletId) => {
          if (tree[basinId]) {
            tree[basinId]!.children.push(outletId);
          }
        });
      }
    });

    return tree;
  }

  decompressBasins(compressedBasins: CompressedBasins | unknown): {
    basinIdMap: string[][];
    basinData?: Record<string, BasinTreeNode>;
    basinTree?: Record<string, { height: number; outlets: string[] }>;
    basinMetadata?: Record<string, { volume: number; level: number }>;
  } {
    const typed = compressedBasins as CompressedBasins;
    if (!typed.format) {
      return { basinIdMap: [] };
    }

    if (typed.format === "optimized_v2") {
      return {
        basinIdMap: this.decompressBasinIdMap(typed.basinIdMap),
        basinData: typed.basinData,
      };
    } else if (typed.format === "optimized_v1") {
      return {
        basinIdMap: this.decompressBasinIdMap(typed.basinIdMap),
        ...(typed.basinTree && { basinTree: typed.basinTree }),
        ...(typed.basinMetadata && { basinMetadata: typed.basinMetadata }),
      };
    }

    return { basinIdMap: [] };
  }

  decompressBasinIdMap(compressed: CompressedBasinIdMap): string[][] {
    switch (compressed.format) {
      case "string_rows":
        return compressed.data.split("\n").map((row) => row.split("|"));

      case "rle_basin_ids":
        return this.runLengthDecodeBasinIds(compressed);

      default:
        return [];
    }
  }

  runLengthDecodeBasinIds(compressed: CompressedBasinIdMap): string[][] {
    const flattened: string[] = [];
    const pairs = compressed.data.split(",");

    for (const pair of pairs) {
      if (pair.includes(":")) {
        const [value, countStr] = pair.split(":");
        const count = parseInt(countStr!, 10);
        for (let i = 0; i < count; i++) {
          flattened.push(value!);
        }
      } else {
        flattened.push(pair);
      }
    }

    const basinIdMap: string[][] = [];
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      basinIdMap[y] = [];
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        basinIdMap[y]![x] = flattened[y * CONFIG.WORLD_W + x]!;
      }
    }
    return basinIdMap;
  }

  reconstructBasinsFromCompressed(compressedData: CompressedBasins): void {
    const decompressed = this.decompressBasins(compressedData);

    this.basinManager.basins.clear();
    this.basinManager.basinIdOf.forEach((row) => row.fill(""));

    if (compressedData.format === "optimized_v2") {
      this.reconstructBasinsV2(decompressed);
    } else if (compressedData.format === "optimized_v1") {
      this.reconstructBasinsV1(decompressed);
    }
  }

  reconstructBasinsV2(decompressed: {
    basinIdMap: string[][];
    basinData?: Record<string, BasinTreeNode>;
  }): void {
    const { basinIdMap, basinData } = decompressed;
    if (!basinData) return;

    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const basinId = basinIdMap[y]![x]!;
        this.basinManager.basinIdOf[y]![x] = basinId === "0" ? "" : basinId;
      }
    }

    Object.keys(basinData).forEach((basinId) => {
      if (basinId === "0") return;

      const data = basinData[basinId]!;

      const tiles = new Set<string>();
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (basinIdMap[y]![x] === basinId) {
            tiles.add(`${x},${y}`);
          }
        }
      }

      const outlets = data.children || [];

      this.basinManager.basins.set(basinId, {
        tiles: tiles,
        volume: data.volume || 0,
        level: data.level || 0,
        height: data.height || 0,
        outlets: outlets,
      });
    });
  }

  reconstructBasinsV1(decompressed: {
    basinIdMap: string[][];
    basinTree?: Record<string, { height: number; outlets: string[] }>;
    basinMetadata?: Record<string, { volume: number; level: number }>;
  }): void {
    const { basinIdMap, basinTree, basinMetadata } = decompressed;
    if (!basinTree) return;

    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const basinId = basinIdMap[y]![x]!;
        this.basinManager.basinIdOf[y]![x] = basinId === "0" ? "" : basinId;
      }
    }

    Object.keys(basinTree).forEach((basinId) => {
      if (basinId === "0") return;

      const tiles = new Set<string>();
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (basinIdMap[y]![x] === basinId) {
            tiles.add(`${x},${y}`);
          }
        }
      }

      const metadata = basinMetadata?.[basinId] || { volume: 0, level: 0 };
      const treeData = basinTree[basinId] || { height: 0, outlets: [] };

      this.basinManager.basins.set(basinId, {
        tiles: tiles,
        volume: metadata.volume || 0,
        level: metadata.level || 0,
        height: treeData.height || 0,
        outlets: treeData.outlets || [],
      });
    });
  }

  importLegacyBasins(basinsData: unknown): void {
    if (Array.isArray(basinsData)) {
      basinsData.forEach((basinData: { id: string; volume?: number; level?: number }) => {
        const basin = this.basinManager.basins.get(basinData.id);
        if (basin) {
          basin.volume = basinData.volume || 0;
          basin.level = basinData.level || 0;
        }
      });
    }
  }

  // Size calculation utilities
  calculateEncodingSizes(): Record<string, number> {
    const results: Record<string, number> = {};

    const heightOptions = ["2d_array", "rle", "base64_packed"];
    heightOptions.forEach((option) => {
      try {
        const compressed = this.compressHeights(option);
        const json = JSON.stringify(compressed);
        results[`height_${option}`] = json.length;
      } catch {
        results[`height_${option}`] = Infinity;
      }
    });

    const basinOptions = ["string_rows", "rle_basin_ids"];
    basinOptions.forEach((option) => {
      try {
        const compressed = this.compressBasins(option);
        const json = JSON.stringify(compressed);
        results[`basin_${option}`] = json.length;
      } catch {
        results[`basin_${option}`] = Infinity;
      }
    });

    return results;
  }

  getBestEncodingOptions(): {
    heightEncoding: string;
    basinEncoding: string;
    sizes: Record<string, number>;
  } {
    const sizes = this.calculateEncodingSizes();

    let bestHeight = "2d_array";
    let minHeightSize = Infinity;
    ["2d_array", "rle", "base64_packed"].forEach((option) => {
      const size = sizes[`height_${option}`]!;
      if (size < minHeightSize) {
        minHeightSize = size;
        bestHeight = option;
      }
    });

    let bestBasin = "string_rows";
    let minBasinSize = Infinity;
    ["string_rows", "rle_basin_ids"].forEach((option) => {
      const size = sizes[`basin_${option}`]!;
      if (size < minBasinSize) {
        minBasinSize = size;
        bestBasin = option;
      }
    });

    return {
      heightEncoding: bestHeight,
      basinEncoding: bestBasin,
      sizes: sizes,
    };
  }
}
