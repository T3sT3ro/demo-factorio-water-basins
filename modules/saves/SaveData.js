// Domain model for save data
export class SaveData {
  constructor(name, data, metadata = {}) {
    this.id = this.generateId();
    this.name = name;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.metadata = {
      version: '1.0',
      ...metadata
    };
  }

  generateId() {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      data: this.data,
      timestamp: this.timestamp,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const save = new SaveData(parsed.name, parsed.data, parsed.metadata);
    save.id = parsed.id;
    save.timestamp = parsed.timestamp;
    return save;
  }
}

export class ExportOptions {
  constructor(heightEncoding = 'base64', basinEncoding = 'rle') {
    this.heightEncoding = heightEncoding;
    this.basinEncoding = basinEncoding;
  }
}

export class CompressionResult {
  constructor(data, originalSize, compressedSize, encoding) {
    this.data = data;
    this.originalSize = originalSize;
    this.compressedSize = compressedSize;
    this.encoding = encoding;
    this.compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;
  }
}
