// Import/Export service implementation
import { ImportExportService } from './interfaces.js';
import { ExportOptions } from './SaveData.js';

export class GameDataImportExportService extends ImportExportService {
  constructor(compressionService) {
    super();
    this.compressionService = compressionService;
  }

  export(gameState, options = new ExportOptions()) {
    try {
      // Extract game data
      const gameData = this.extractGameData(gameState);
      
      // Compress different parts based on options
      const heightData = this.compressionService.compress(gameData.heights, options.heightEncoding);
      const basinData = this.compressionService.compress(gameData.basins, options.basinEncoding);
      
      // Create export structure
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        compression: {
          heights: {
            encoding: options.heightEncoding,
            originalSize: heightData.originalSize,
            compressedSize: heightData.compressedSize,
            ratio: heightData.compressionRatio
          },
          basins: {
            encoding: options.basinEncoding,
            originalSize: basinData.originalSize,
            compressedSize: basinData.compressedSize,
            ratio: basinData.compressionRatio
          }
        },
        data: {
          heights: heightData.data,
          basins: basinData.data,
          pumps: gameData.pumps,
          reservoirs: gameData.reservoirs,
          water: gameData.water,
          metadata: gameData.metadata
        }
      };

      return JSON.stringify(exportData);
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  import(jsonData, gameState) {
    try {
      const importData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      // Validate import data structure
      this.validateImportData(importData);
      
      // Decompress data
      const heights = this.compressionService.decompress(
        importData.data.heights, 
        importData.compression.heights.encoding
      );
      
      const basins = this.compressionService.decompress(
        importData.data.basins,
        importData.compression.basins.encoding
      );
      
      // Apply data to game state
      this.applyGameData(gameState, {
        heights,
        basins,
        pumps: importData.data.pumps,
        reservoirs: importData.data.reservoirs,
        water: importData.data.water,
        metadata: importData.data.metadata
      });

    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  extractGameData(gameState) {
    // This method should extract all necessary data from the game state
    // Implementation depends on the actual GameState structure
    return {
      heights: gameState.getHeightData ? gameState.getHeightData() : [],
      basins: gameState.getBasinData ? gameState.getBasinData() : [],
      pumps: gameState.getPumpData ? gameState.getPumpData() : [],
      reservoirs: gameState.getReservoirData ? gameState.getReservoirData() : [],
      water: gameState.getWaterData ? gameState.getWaterData() : [],
      metadata: {
        worldSize: gameState.getWorldSize ? gameState.getWorldSize() : { width: 100, height: 100 },
        tickCounter: gameState.getTickCounter ? gameState.getTickCounter() : 0
      }
    };
  }

  applyGameData(gameState, gameData) {
    // This method should apply the data to the game state
    // Implementation depends on the actual GameState structure
    if (gameState.setHeightData) gameState.setHeightData(gameData.heights);
    if (gameState.setBasinData) gameState.setBasinData(gameData.basins);
    if (gameState.setPumpData) gameState.setPumpData(gameData.pumps);
    if (gameState.setReservoirData) gameState.setReservoirData(gameData.reservoirs);
    if (gameState.setWaterData) gameState.setWaterData(gameData.water);
    if (gameState.setTickCounter) gameState.setTickCounter(gameData.metadata.tickCounter);
  }

  validateImportData(importData) {
    if (!importData || typeof importData !== 'object') {
      throw new Error('Invalid import data format');
    }

    if (!importData.version) {
      throw new Error('Missing version information');
    }

    if (!importData.data) {
      throw new Error('Missing data section');
    }

    if (!importData.compression) {
      throw new Error('Missing compression information');
    }

    // Additional validation can be added here
  }

  getBestEncodingOptions(gameState) {
    const gameData = this.extractGameData(gameState);
    
    return {
      heightEncoding: this.compressionService.getBestEncoding(gameData.heights),
      basinEncoding: this.compressionService.getBestEncoding(gameData.basins)
    };
  }

  calculateCompressionStats(gameState, options) {
    const gameData = this.extractGameData(gameState);
    
    const heightResult = this.compressionService.compress(gameData.heights, options.heightEncoding);
    const basinResult = this.compressionService.compress(gameData.basins, options.basinEncoding);
    
    return {
      heights: {
        originalSize: heightResult.originalSize,
        compressedSize: heightResult.compressedSize,
        ratio: heightResult.compressionRatio,
        encoding: options.heightEncoding
      },
      basins: {
        originalSize: basinResult.originalSize,
        compressedSize: basinResult.compressedSize,
        ratio: basinResult.compressionRatio,
        encoding: options.basinEncoding
      }
    };
  }
}
