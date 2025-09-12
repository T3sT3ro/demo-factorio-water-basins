// Compression service implementation
import { CompressionService } from './interfaces.js';
import { CompressionResult } from './SaveData.js';

export class GameDataCompressionService extends CompressionService {
  constructor() {
    super();
    this.supportedEncodings = ['base64', 'rle', 'json', 'compressed'];
  }

  compress(data, encoding) {
    const originalSize = JSON.stringify(data).length;
    let compressedData;

    switch (encoding) {
      case 'base64':
        compressedData = this.compressToBase64(data);
        break;
      case 'rle':
        compressedData = this.compressWithRLE(data);
        break;
      case 'json':
        compressedData = data; // No compression
        break;
      case 'compressed':
        compressedData = this.compressWithBestMethod(data);
        break;
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }

    const compressedSize = JSON.stringify(compressedData).length;
    return new CompressionResult(compressedData, originalSize, compressedSize, encoding);
  }

  decompress(data, encoding) {
    switch (encoding) {
      case 'base64':
        return this.decompressFromBase64(data);
      case 'rle':
        return this.decompressFromRLE(data);
      case 'json':
        return data; // No decompression needed
      case 'compressed':
        return this.decompressFromBestMethod(data);
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
  }

  getSupportedEncodings() {
    return [...this.supportedEncodings];
  }

  getBestEncoding(data) {
    const results = this.supportedEncodings.map(encoding => {
      try {
        const result = this.compress(data, encoding);
        return { encoding, ratio: result.compressionRatio, size: result.compressedSize };
      } catch {
        return { encoding, ratio: 1, size: Infinity };
      }
    });

    return results.reduce((best, current) => 
      current.size < best.size ? current : best
    ).encoding;
  }

  // Base64 compression methods
  compressToBase64(data) {
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  }

  decompressFromBase64(base64Data) {
    const jsonString = atob(base64Data);
    return JSON.parse(jsonString);
  }

  // Run-Length Encoding methods
  compressWithRLE(data) {
    if (Array.isArray(data)) {
      return this.compressArrayWithRLE(data);
    }
    return data; // Non-array data not supported for RLE
  }

  decompressFromRLE(rleData) {
    if (rleData && rleData.__rle) {
      return this.decompressArrayFromRLE(rleData);
    }
    return rleData;
  }

  compressArrayWithRLE(array) {
    const result = [];
    let current = array[0];
    let count = 1;

    for (let i = 1; i < array.length; i++) {
      if (array[i] === current) {
        count++;
      } else {
        result.push({ value: current, count });
        current = array[i];
        count = 1;
      }
    }
    
    if (array.length > 0) {
      result.push({ value: current, count });
    }

    return { __rle: true, data: result };
  }

  decompressArrayFromRLE(rleData) {
    const result = [];
    for (const segment of rleData.data) {
      for (let i = 0; i < segment.count; i++) {
        result.push(segment.value);
      }
    }
    return result;
  }

  // Best method compression (tries multiple methods)
  compressWithBestMethod(data) {
    const methods = ['base64', 'rle', 'json'];
    let bestResult = null;
    let bestSize = Infinity;

    for (const method of methods) {
      try {
        const result = this.compress(data, method);
        if (result.compressedSize < bestSize) {
          bestSize = result.compressedSize;
          bestResult = { method, data: result.data };
        }
      } catch {
        // Continue with next method
      }
    }

    return bestResult || { method: 'json', data };
  }

  decompressFromBestMethod(compressedData) {
    if (!compressedData || !compressedData.method) {
      return compressedData;
    }

    return this.decompress(compressedData.data, compressedData.method);
  }
}
