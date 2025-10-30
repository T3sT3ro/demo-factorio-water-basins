/**
 * Height map compression and decompression utilities.
 * Supports multiple encoding formats: 2D array, RLE, and Base64-packed.
 */

import { CONFIG } from "../config.ts";
import type { CompressedHeights } from "../SaveFormat.ts";

export class HeightSerializer {
  /**
   * Compress height map using specified encoding
   */
  static compress(heights: number[][], encodingType: string): CompressedHeights {
    switch (encodingType) {
      case "rle":
        return this.runLengthEncode(heights);
      case "base64_packed":
        return this.base64Encode(heights);
      case "2d_array":
      default:
        return this.encode2DArray(heights);
    }
  }

  /**
   * Decompress height map from any supported format
   */
  static decompress(compressed: CompressedHeights | number[][]): number[][] {
    if (Array.isArray(compressed)) {
      return compressed;
    }

    switch (compressed.format) {
      case "2d_array":
        return this.decode2DArray(compressed);
      case "rle":
        return this.runLengthDecode(compressed);
      case "base64_packed":
        return this.base64Decode(compressed);
      default:
        return Array.isArray(compressed) ? compressed : [];
    }
  }

  /**
   * Calculate byte sizes for all encoding formats
   */
  static calculateEncodingSizes(heights: number[][]): Record<string, number> {
    const results: Record<string, number> = {};
    const encodings = ["2d_array", "rle", "base64_packed"];

    encodings.forEach((encoding) => {
      try {
        const compressed = this.compress(heights, encoding);
        results[encoding] = JSON.stringify(compressed).length;
      } catch {
        results[encoding] = Infinity;
      }
    });

    return results;
  }

  /**
   * Find the most efficient encoding for given heights
   */
  static getBestEncoding(heights: number[][]): string {
    const sizes = this.calculateEncodingSizes(heights);
    let bestEncoding = "2d_array";
    let minSize = Infinity;

    Object.entries(sizes).forEach(([encoding, size]) => {
      if (size < minSize) {
        minSize = size;
        bestEncoding = encoding;
      }
    });

    return bestEncoding;
  }

  // === Format-specific encoders ===

  private static encode2DArray(heights: number[][]): CompressedHeights {
    return {
      format: "2d_array",
      width: CONFIG.WORLD_W,
      height: CONFIG.WORLD_H,
      data: heights.map((row) => row.join("")).join("\n"),
    };
  }

  private static runLengthEncode(heights: number[][]): CompressedHeights {
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

  private static base64Encode(heights: number[][]): CompressedHeights {
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

  // === Format-specific decoders ===

  private static decode2DArray(compressed: CompressedHeights): number[][] {
    return compressed.data.split("\n").map((row) =>
      row.split("").map((char) => parseInt(char, 10))
    );
  }

  private static runLengthDecode(compressed: CompressedHeights): number[][] {
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
        flattened.push(parseInt(pair, 10));
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

  private static base64Decode(compressed: CompressedHeights): number[][] {
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
}
