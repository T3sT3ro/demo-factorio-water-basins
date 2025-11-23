/**
 * Basin data compression and decompression utilities.
 * Handles basin ID maps and basin tree structures.
 */

import { CONFIG } from "../config.ts";
import { BasinManager } from "../basins/BasinManager.ts";
import { coordToKey } from "../TileUtils.ts";
import type { BasinTreeNode, CompressedBasinIdMap, CompressedBasins } from "../SaveFormat.ts";

export class BasinSerializer {
  /**
   * Compress basin data including ID map and tree structure
   */
  static compress(
    basinManager: BasinManager,
    encodingType: string,
  ): CompressedBasins {
    const basinIdMap = this.createBasinIdMap(basinManager);
    const basinTree = this.createBasinTree(basinManager);

    return {
      format: "optimized_v2",
      width: CONFIG.WORLD_W,
      height: CONFIG.WORLD_H,
      basinIdMap: this.compressBasinIdMap(basinIdMap, encodingType),
      basinData: basinTree,
    };
  }

  /**
   * Decompress basin data from compressed format
   */
  static decompress(compressedBasins: CompressedBasins | unknown): {
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

  /**
   * Reconstruct basin manager state from compressed data
   */
  static reconstructBasins(
    basinManager: BasinManager,
    compressedData: CompressedBasins,
  ): void {
    const decompressed = this.decompress(compressedData);

    basinManager.basins.clear();
    basinManager.basinIdOf.forEach((row) => row.fill(""));

    if (compressedData.format === "optimized_v2") {
      this.reconstructBasinsV2(basinManager, decompressed);
    } else if (compressedData.format === "optimized_v1") {
      this.reconstructBasinsV1(basinManager, decompressed);
    }
  }

  /**
   * Import legacy basin format (array-based)
   */
  static importLegacy(basinManager: BasinManager, basinsData: unknown): void {
    if (Array.isArray(basinsData)) {
      basinsData.forEach((basinData: { id: string; volume?: number; level?: number }) => {
        const basin = basinManager.basins.get(basinData.id);
        if (basin) {
          basin.volume = basinData.volume || 0;
          basin.level = basinData.level || 0;
        }
      });
    }
  }

  /**
   * Calculate encoding sizes for basin data
   */
  static calculateEncodingSizes(basinManager: BasinManager): Record<string, number> {
    const results: Record<string, number> = {};
    const encodings = ["string_rows", "rle_basin_ids"];

    encodings.forEach((encoding) => {
      try {
        const compressed = this.compress(basinManager, encoding);
        results[encoding] = JSON.stringify(compressed).length;
      } catch {
        results[encoding] = Infinity;
      }
    });

    return results;
  }

  /**
   * Find the most efficient encoding for basin data
   */
  static getBestEncoding(basinManager: BasinManager): string {
    const sizes = this.calculateEncodingSizes(basinManager);
    let bestEncoding = "string_rows";
    let minSize = Infinity;

    Object.entries(sizes).forEach(([encoding, size]) => {
      if (size < minSize) {
        minSize = size;
        bestEncoding = encoding;
      }
    });

    return bestEncoding;
  }

  // === Private helper methods ===

  private static createBasinIdMap(basinManager: BasinManager): string[][] {
    const basinIdMap: string[][] = [];
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      basinIdMap[y] = [];
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const basinId = basinManager.basinIdOf[y]![x];
        basinIdMap[y]![x] = basinId || "0";
      }
    }
    return basinIdMap;
  }

  private static createBasinTree(basinManager: BasinManager): Record<string, BasinTreeNode> {
    const tree: Record<string, BasinTreeNode> = {};
    basinManager.basins.forEach((basin, basinId) => {
      tree[basinId] = {
        height: basin.height,
        volume: basin.volume || 0,
        level: basin.level || 0,
        tileCount: basin.tiles ? basin.tiles.size : 0,
        children: [],
      };
    });

    basinManager.basins.forEach((basin, basinId) => {
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

  private static compressBasinIdMap(
    basinIdMap: string[][],
    encodingType: string,
  ): CompressedBasinIdMap {
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

  private static runLengthEncodeBasinIds(basinIdMap: string[][]): CompressedBasinIdMap {
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

  private static decompressBasinIdMap(compressed: CompressedBasinIdMap): string[][] {
    switch (compressed.format) {
      case "string_rows":
        return compressed.data.split("\n").map((row: string) => row.split("|"));
      case "rle_basin_ids":
        return this.runLengthDecodeBasinIds(compressed);
      default:
        return [];
    }
  }

  private static runLengthDecodeBasinIds(compressed: CompressedBasinIdMap): string[][] {
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

  private static reconstructBasinsV2(
    basinManager: BasinManager,
    decompressed: {
      basinIdMap: string[][];
      basinData?: Record<string, BasinTreeNode>;
    },
  ): void {
    const { basinIdMap, basinData } = decompressed;
    if (!basinData) return;

    // Restore basin ID map
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const basinId = basinIdMap[y]![x]!;
        basinManager.basinIdOf[y]![x] = basinId === "0" ? "" : basinId;
      }
    }

    // Reconstruct basin objects
    Object.keys(basinData).forEach((basinId) => {
      if (basinId === "0") return;

      const data = basinData[basinId]!;
      const tiles = new Set<string>();

      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (basinIdMap[y]![x] === basinId) {
            tiles.add(coordToKey(x, y));
          }
        }
      }

      basinManager.basins.set(basinId, {
        tiles: tiles,
        volume: data.volume || 0,
        level: data.level || 0,
        height: data.height || 0,
        outlets: data.children || [],
        capacity: tiles.size * (data.height || 0), // Legacy: approximate capacity
        ownTiles: tiles.size, // Legacy: no split tracking
        descendantTiles: 0, // Legacy: unknown
      });
    });
  }

  private static reconstructBasinsV1(
    basinManager: BasinManager,
    decompressed: {
      basinIdMap: string[][];
      basinTree?: Record<string, { height: number; outlets: string[] }>;
      basinMetadata?: Record<string, { volume: number; level: number }>;
    },
  ): void {
    const { basinIdMap, basinTree, basinMetadata } = decompressed;
    if (!basinTree) return;

    // Restore basin ID map
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        const basinId = basinIdMap[y]![x]!;
        basinManager.basinIdOf[y]![x] = basinId === "0" ? "" : basinId;
      }
    }

    // Reconstruct basin objects
    Object.keys(basinTree).forEach((basinId) => {
      if (basinId === "0") return;

      const tiles = new Set<string>();
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (basinIdMap[y]![x] === basinId) {
            tiles.add(coordToKey(x, y));
          }
        }
      }

      const metadata = basinMetadata?.[basinId] || { volume: 0, level: 0 };
      const treeData = basinTree[basinId] || { height: 0, outlets: [] };

      basinManager.basins.set(basinId, {
        tiles: tiles,
        volume: metadata.volume || 0,
        level: metadata.level || 0,
        height: treeData.height || 0,
        outlets: treeData.outlets || [],
        capacity: tiles.size * (treeData.height || 0), // Legacy: approximate capacity
        ownTiles: tiles.size, // Legacy: no split tracking
        descendantTiles: 0, // Legacy: unknown
      });
    });
  }
}
