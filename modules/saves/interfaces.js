// Repository interface for save/load operations (port)
export class SaveRepository {
  async save(saveData) {
    throw new Error('save method must be implemented');
  }

  async load(id) {
    throw new Error('load method must be implemented');
  }

  async list() {
    throw new Error('list method must be implemented');
  }

  async delete(id) {
    throw new Error('delete method must be implemented');
  }

  async exists(id) {
    throw new Error('exists method must be implemented');
  }
}

// Import/Export interface
export class ImportExportService {
  export(gameState, options) {
    throw new Error('export method must be implemented');
  }

  import(data, gameState) {
    throw new Error('import method must be implemented');
  }

  compress(data, encoding) {
    throw new Error('compress method must be implemented');
  }

  decompress(data, encoding) {
    throw new Error('decompress method must be implemented');
  }
}

// Compression interface
export class CompressionService {
  compress(data, encoding) {
    throw new Error('compress method must be implemented');
  }

  decompress(data, encoding) {
    throw new Error('decompress method must be implemented');
  }

  getSupportedEncodings() {
    throw new Error('getSupportedEncodings method must be implemented');
  }

  getBestEncoding(data) {
    throw new Error('getBestEncoding method must be implemented');
  }
}
