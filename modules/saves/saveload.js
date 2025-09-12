// Save/Load Manager - Hexagonal Architecture Implementation
// This is now a facade that coordinates the different services

import { BrowserStorageAdapter } from './BrowserStorageAdapter.js';
import { GameDataCompressionService } from './GameDataCompressionService.js';
import { GameDataImportExportService } from './GameDataImportExportService.js';
import { SaveLoadUIController } from './SaveLoadUIController.js';

export class SaveLoadManager {
  constructor(gameState, onStateChanged) {
    // Core services
    this.gameState = gameState;
    this.compressionService = new GameDataCompressionService();
    this.importExportService = new GameDataImportExportService(this.compressionService);
    this.storageAdapter = new BrowserStorageAdapter();
    
    // UI Controller
    this.uiController = new SaveLoadUIController(this.storageAdapter, this.importExportService);
    this.uiController.setGameState(gameState);
    this.uiController.setStateChangeCallback(onStateChanged);
    
    // Make UI controller globally accessible for HTML onclick handlers
    globalThis.saveLoadUI = this.uiController;
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.uiController.setupEventHandlers();
  }

  // Legacy compatibility methods - delegate to appropriate services
  async exportToJSON(options) {
    return this.importExportService.export(this.gameState, options);
  }

  async importFromJSON(jsonData) {
    return this.importExportService.import(jsonData, this.gameState);
  }

  async getBestEncodingOptions() {
    return this.importExportService.getBestEncodingOptions(this.gameState);
  }

  async compressHeights(encoding) {
    const gameData = this.importExportService.extractGameData(this.gameState);
    return this.compressionService.compress(gameData.heights, encoding);
  }

  async compressBasins(encoding) {
    const gameData = this.importExportService.extractGameData(this.gameState);
    return this.compressionService.compress(gameData.basins, encoding);
  }
}
