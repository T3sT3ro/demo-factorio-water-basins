// Browser localStorage adapter implementation
import { SaveRepository } from './interfaces.js';
import { SaveData } from './SaveData.js';

export class BrowserStorageAdapter extends SaveRepository {
  constructor(keyPrefix = 'mapSave_') {
    super();
    this.keyPrefix = keyPrefix;
  }

  async save(saveData) {
    const key = `${this.keyPrefix}${saveData.id}`;
    const serialized = JSON.stringify(saveData.toJSON());
    
    try {
      localStorage.setItem(key, serialized);
      return saveData.id;
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error.message}`);
    }
  }

  async load(id) {
    const key = `${this.keyPrefix}${id}`;
    const serialized = localStorage.getItem(key);
    
    if (!serialized) {
      throw new Error(`Save with id '${id}' not found`);
    }

    try {
      return SaveData.fromJSON(serialized);
    } catch (error) {
      throw new Error(`Failed to parse save data: ${error.message}`);
    }
  }

  async list() {
    const saves = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        try {
          const serialized = localStorage.getItem(key);
          const saveData = SaveData.fromJSON(serialized);
          saves.push({
            id: saveData.id,
            name: saveData.name,
            timestamp: saveData.timestamp,
            metadata: saveData.metadata
          });
        } catch (error) {
          console.warn(`Invalid save data for key ${key}:`, error);
        }
      }
    }

    // Sort by timestamp, newest first
    saves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return saves;
  }

  async delete(id) {
    const key = `${this.keyPrefix}${id}`;
    
    if (!localStorage.getItem(key)) {
      throw new Error(`Save with id '${id}' not found`);
    }

    localStorage.removeItem(key);
  }

  async exists(id) {
    const key = `${this.keyPrefix}${id}`;
    return localStorage.getItem(key) !== null;
  }
}
