// Basin computation and management

import { CONFIG } from "./config.js";
import { DepthPriorityQueue } from "./DepthPriorityQueue.js";
import { generateLetterSequence } from "./utils.js";

export class BasinManager {
  constructor() {
    this.basins = new Map(); // id -> {volume, level, height, outlets, parent, tileCount}
    this.basinIdOf = new Array(CONFIG.WORLD_H);
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      this.basinIdOf[y] = new Array(CONFIG.WORLD_W).fill(0);
    }
    this.nextBasinId = 1;
    this.highlightedBasin = null;

    // Optimization state
    this.lastHeights = null;
  }

  // Get all tiles that belong to a specific basin
  getBasinTiles(basinId) {
    const tiles = [];
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        if (this.basinIdOf[y][x] === basinId) {
          tiles.push(`${x},${y}`);
        }
      }
    }
    return tiles;
  }

  // Get tile count for a specific basin
  getBasinTileCount(basinId) {
    const basin = this.basins.get(basinId);
    return basin ? basin.tileCount : 0;
  }

  // Update tile count for a basin (called during basin creation)
  updateBasinTileCount(basinId, count) {
    const basin = this.basins.get(basinId);
    if (basin) {
      basin.tileCount = count;
    }
  }

    computeBasins(heights, _options = {}) {
    console.log('BasinManager.computeBasins called');

    performance.mark("basin-computation-start");

    // Check if we can skip computation
    const changedTiles = this.detectChangedTiles(heights);
    if (changedTiles.size === 0 && this.lastHeights !== null) {
      performance.mark("basin-computation-end");
      performance.measure("Total Basin Computation", "basin-computation-start", "basin-computation-end");
      return;
    }

    // Clear existing data
    this.basinIdOf.forEach(row => row.fill(0));
    this.basins.clear();
    this.nextBasinId = 1;

    // Convert changed tiles to the format expected by generateBasins
    const toRevalidate = Array.from(changedTiles).map(tileKey => {
      const [x, y] = tileKey.split(',').map(Number);
      return [y, x]; // [row, column] format
    });

    // Run synchronously
    this.runBasinComputation(heights, toRevalidate);

    // Store current heights for next comparison
    this.lastHeights = heights.map(row => [...row]);

    performance.mark("basin-computation-end");
    performance.measure("Total Basin Computation", "basin-computation-start", "basin-computation-end");

    // Log performance info
    const measures = performance.getEntriesByType("measure");
    const lastMeasure = measures[measures.length - 1];
    console.log(
      `        └─ Basin Computation (${changedTiles.size} changed tiles, ${this.basins.size} basins): ${lastMeasure.duration.toFixed(2)}ms`
    );
  }

  detectChangedTiles(heights) {
    const changed = new Set();

    if (!this.lastHeights) {
      // First run - everything is "changed"
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (heights[y][x] > 0) {
            changed.add(`${x},${y}`);
          }
        }
      }
      return changed;
    }

    // Find actually changed tiles
    for (let y = 0; y < CONFIG.WORLD_H; y++) {
      for (let x = 0; x < CONFIG.WORLD_W; x++) {
        if (heights[y][x] !== this.lastHeights[y][x]) {
          changed.add(`${x},${y}`);
        }
      }
    }

    return changed;
  }

  runBasinComputation(heights, toRevalidate) {
    // Synchronous version - call the function directly
    this.generateBasins(heights, toRevalidate, "automatic");
  }

  // Helper methods
  isValidTile(x, y) {
    return x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H;
  }

  createBasin(tiles, depth) {
    return {
      volume: 0,
      level: 0,
      height: depth,
      outlets: [],
      parent: null,
      tileCount: tiles.size || tiles.length || 0
    };
  }

  finalizeBasins(basinNodes) {
    // Convert numeric IDs to depth#letter format and establish parent relationships
    const basinIdMap = new Map();
    const depthGroups = new Map();

    // Group basins by depth
    for (const [oldId, { basin }] of basinNodes) {
      const depth = basin.height;
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth).push({ oldId, basin });
    }

    // Assign new IDs and find outlets/parents
    const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

    for (const depth of sortedDepths) {
      const basinsAtDepth = depthGroups.get(depth);
      let letterIndex = 0;

      for (const { oldId, basin } of basinsAtDepth) {
        const letters = generateLetterSequence(letterIndex++);
        const newBasinId = `${depth}#${letters}`;

        basinIdMap.set(oldId, newBasinId);

        // Update basin in main map
        this.basins.delete(oldId);
        this.basins.set(newBasinId, basin);

        // Update basinIdOf array - find all tiles that belong to this basin
        for (let y = 0; y < CONFIG.WORLD_H; y++) {
          for (let x = 0; x < CONFIG.WORLD_W; x++) {
            if (this.basinIdOf[y][x] === oldId) {
              this.basinIdOf[y][x] = newBasinId;
            }
          }
        }

        // Find outlets (connections to shallower basins)
        this.findBasinOutlets(newBasinId, basin);
      }
    }

    // Update outlet references to use new IDs
    for (const basin of this.basins.values()) {
      basin.outlets = basin.outlets
        .map(oldId => basinIdMap.get(oldId) || oldId)
        .filter(id => this.basins.has(id));
    }
  }

  findBasinOutlets(basinId, basin) {
    const outlets = new Set();

    const basinTiles = this.getBasinTiles(basinId);
    for (const tileKey of basinTiles) {
      const [tx, ty] = tileKey.split(',').map(Number);

      for (const [dx, dy] of CONFIG.BASIN_COMPUTATION.DIRECTIONS.ALL) {
        const nx = tx + dx;
        const ny = ty + dy;

        if (!this.isValidTile(nx, ny)) continue;

        const neighborBasinId = this.basinIdOf[ny][nx];
        if (!neighborBasinId) continue;

        const neighborBasin = this.basins.get(neighborBasinId);
        if (neighborBasin && neighborBasin.height < basin.height) {
          outlets.add(neighborBasinId);
        }
      }
    }

    basin.outlets = Array.from(outlets);
  }

  isDiagonalValid(x1, y1, x2, y2, heights) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (Math.abs(dx) + Math.abs(dy) !== 2) return true; // Not diagonal

    // Check the two orthogonal neighbors that form the "crossing"
    const cross1x = x1 + dx, cross1y = y1;
    const cross2x = x1, cross2y = y1 + dy;

    // If both crossing tiles are within bounds, check for land blocking
    if (this.isValidTile(cross1x, cross1y) && this.isValidTile(cross2x, cross2y)) {
      const cross1IsLand = heights[cross1y][cross1x] === 0;
      const cross2IsLand = heights[cross2y][cross2x] === 0;

      // Block diagonal if both crossing tiles are land (complete blockage)
      return !(cross1IsLand && cross2IsLand);
    }

    return true;
  }

  // Basin management methods (rest of the API)
  getBasinAt(x, y) {
    if (!this.isValidTile(x, y)) return null;
    const basinId = this.basinIdOf[y][x];
    return basinId ? this.basins.get(basinId) : null;
  }

  getBasinIdAt(x, y) {
    if (!this.isValidTile(x, y)) return null;
    return this.basinIdOf[y][x] || null;
  }

  floodFill(startX, startY, fillWithWater) {
    const startBasinId = this.basinIdOf[startY][startX];
    if (!startBasinId) return;

    const basin = this.basins.get(startBasinId);
    if (!basin) return;

    if (fillWithWater) {
      basin.volume = basin.tileCount * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
    } else {
      basin.volume = 0;
    }

    this.updateWaterLevels();
  }

  updateWaterLevels() {
    this.handleWaterOverflow();

    this.basins.forEach((basin) => {
      const capacityPerLevel = basin.tileCount * CONFIG.VOLUME_UNIT;
      basin.level = Math.floor(basin.volume / capacityPerLevel);
      if (basin.level < 0) basin.level = 0;
      if (basin.level > CONFIG.MAX_DEPTH) basin.level = CONFIG.MAX_DEPTH;
    });
  }

  handleWaterOverflow() {
    const sortedBasins = Array.from(this.basins.entries()).sort((a, b) =>
      b[1].height - a[1].height
    );

    sortedBasins.forEach(([_basinId, basin]) => {
      if (!basin.outlets || basin.outlets.length === 0) return;

      const maxCapacity = basin.tileCount * CONFIG.VOLUME_UNIT * CONFIG.MAX_DEPTH;
      if (basin.volume > maxCapacity) {
        const overflow = basin.volume - maxCapacity;
        basin.volume = maxCapacity;

        const outletCount = basin.outlets.length;
        const overflowPerOutlet = overflow / outletCount;

        basin.outlets.forEach((outletId) => {
          const outletBasin = this.basins.get(outletId);
          if (outletBasin) {
            outletBasin.volume += overflowPerOutlet;
          }
        });
      }
    });
  }

  clearAllWater() {
    this.basins.forEach((basin) => {
      basin.volume = 0;
      basin.level = 0;
    });
  }

  setHighlightedBasin(basinId) {
    this.highlightedBasin = basinId;
  }

  getHighlightedBasin() {
    return this.highlightedBasin;
  }

  getBasinAnalysis(heights) {
    const connections = new Map();
    const basinArray = Array.from(this.basins.entries()).sort((a, b) => {
      const [levelA, lettersA] = a[0].split("#");
      const [levelB, lettersB] = b[0].split("#");
      if (levelA !== levelB) return parseInt(levelA) - parseInt(levelB);
      return lettersA.localeCompare(lettersB);
    });

    // Build connection graph
    basinArray.forEach(([id]) => {
      connections.set(id, new Set());

      // Iterate through all tiles to find those belonging to this basin
      for (let y = 0; y < CONFIG.WORLD_H; y++) {
        for (let x = 0; x < CONFIG.WORLD_W; x++) {
          if (this.basinIdOf[y][x] === id) {
            CONFIG.BASIN_COMPUTATION.DIRECTIONS.ALL.forEach(([dx, dy]) => {
              const nx = x + dx, ny = y + dy;
              if (this.isValidTile(nx, ny)) {
                const neighborBasinId = this.basinIdOf[ny][nx];
                if (neighborBasinId && neighborBasinId !== id) {
                  const isDiagonal = Math.abs(dx) + Math.abs(dy) === 2;
                  if (isDiagonal && heights) {
                    const cross1x = x + dx, cross1y = y;
                    const cross2x = x, cross2y = y + dy;

                    if (this.isValidTile(cross1x, cross1y) && this.isValidTile(cross2x, cross2y)) {
                      const cross1IsLand = heights[cross1y][cross1x] === 0;
                      const cross2IsLand = heights[cross2y][cross2x] === 0;

                      if (cross1IsLand && cross2IsLand) return;
                    }
                  }

                  connections.get(id).add(neighborBasinId);
                }
              }
            });
          }
        }
      }
    });

    const basinCount = this.basins.size;
    const maxDepth = basinArray.length > 0
      ? Math.max(...basinArray.map(([id]) => parseInt(id.split("#")[0])))
      : 0;

    let maxDegree = 0;
    connections.forEach((connectionSet) => {
      maxDegree = Math.max(maxDegree, connectionSet.size);
    });

    return {
      basinCount,
      maxDepth,
      maxDegree,
      basinArray,
      connections,
    };
  }

    /**
   * Revalidates basins around changed tiles using tree-based BFS.
   * 
   * Algorithm:
   * - Uses a virtual root basin at depth 0
   * - Basin tree cursor moves up/down as we cross depth boundaries  
   * - Creates child basins on demand when descending
   * - Updates parent sizes when ascending
   * - Queue items carry basin node references
   * - Basin IDs assigned in post-processing
   * 
   * @param {number[][]} heights
   * @param {[[row: number, column: number]]} toRevalidate
  /**
   * Generate letter sequence for basin IDs (A, B, C, ..., Z, AA, AB, ...)
   * @param {number} index - Zero-based index
   * @returns {string} Letter sequence
   */
  generateLetter(index) {
    let result = '';
    let num = index;
    do {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    } while (num > 0);
    return result;
  }
  generateBasins(heights, toRevalidate, _mode = "automatic") {
    /** @type {Set<string>} */
    const dirtyBasins = new Set();
    const bucketsQueue = new DepthPriorityQueue();
    /** @type {Set<string>} */
    const visited = new Set();
    
    // Basin forest structure: Map<depth, Map<basinId, BasinNode>>
    const basinForest = new Map();
    const basinNodes = new Map(); // basinId -> { basin, parent }
    
    // Create virtual root basin at depth 0
    basinForest.set(0, new Map([["root", { size: 0, depth: 0, parent: null, tiles: new Set() }]]));
    
    // Add initial boundary tiles to queue
    for (const [row, column] of toRevalidate) {
      const tileKey = `${column},${row}`;
      if (visited.has(tileKey)) continue;
      
      const depth = heights[row][column];
      if (depth > 0) { // Only process water tiles
        bucketsQueue.push({ x: column, y: row, depth, tileKey });
        visited.add(tileKey);
        
        // Collect any existing basin IDs for dirty tracking
        const existingBasinId = this.basinIdOf[row][column];
        if (existingBasinId) {
          dirtyBasins.add(existingBasinId);
        }
      }
    }
    
    // Current basin tracking
    let currentBasinId = this.nextBasinId;
    
    // Process tiles in depth-priority order
    // Track processed tiles to avoid processing same tile in multiple connected components
    const processedTiles = new Set();
    
    while (bucketsQueue.length > 0) {
      const tile = bucketsQueue.pop();
      if (!tile) break;
      
      const { x, y, depth, tileKey } = tile;
      
      // Skip if already processed by a connected component
      if (processedTiles.has(tileKey)) continue;
      
      // Start a new connected component (basin) at this depth
      currentBasinId = this.nextBasinId++;
      
      // Flood-fill this connected component at this specific depth
      const componentTiles = this.floodFillComponent(x, y, depth, heights, processedTiles);
      
      // Create the actual basin object
      const basin = this.createBasin(componentTiles, depth);
      
      // Find parent basin for this connected component
      const parentBasin = this.findParentBasinForComponent(basinForest, depth, componentTiles, heights);
      basinNodes.set(currentBasinId, { basin, parent: parentBasin });
      
      // Store in basins map
      this.basins.set(currentBasinId, basin);
      
      // Assign tiles to basin ID
      for (const componentTile of componentTiles) {
        const [tx, ty] = componentTile.split(',').map(Number);
        this.basinIdOf[ty][tx] = currentBasinId;
      }
      
      // Add to basin forest structure (for parent/child relationships)
      if (!basinForest.has(depth)) {
        basinForest.set(depth, new Map());
      }
      basinForest.get(depth).set(currentBasinId.toString(), {
        id: currentBasinId,
        basin,
        tiles: componentTiles,
        depth,
        parent: parentBasin
      });
      
      // Add neighboring tiles at different depths to the main queue
      for (const componentTile of componentTiles) {
        const [tx, ty] = componentTile.split(',').map(Number);
        this.addNeighborsToMainQueue(tx, ty, heights, visited, bucketsQueue);
      }
    }
    
    // Finalize all basins
    this.finalizeBasins(basinNodes);
    
    return { basinForest, dirtyBasins };
  }

  /**
   * Flood-fill a connected component of tiles at the same depth
   * @param {number} startX 
   * @param {number} startY 
   * @param {number} depth 
   * @param {number[][]} heights 
   * @param {Set<string>} processedTiles 
   * @returns {string[]} Array of tile keys
   */
  floodFillComponent(startX, startY, depth, heights, processedTiles) {
    const componentTiles = [];
    const componentQueue = [[startX, startY]];
    const componentVisited = new Set();
    const startTileKey = `${startX},${startY}`;
    
    componentVisited.add(startTileKey);
    componentTiles.push(startTileKey);
    processedTiles.add(startTileKey);
    
    while (componentQueue.length > 0) {
      const [x, y] = componentQueue.shift();
      
      // Check all orthogonal neighbors at the same depth
      for (const [dx, dy] of CONFIG.BASIN_COMPUTATION.DIRECTIONS.ORTHOGONAL) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborKey = `${nx},${ny}`;
        
        if (this.isValidTile(nx, ny) && !componentVisited.has(neighborKey)) {
          const neighborDepth = heights[ny][nx];
          
          // Only include tiles at exactly the same depth
          if (neighborDepth === depth) {
            componentVisited.add(neighborKey);
            componentTiles.push(neighborKey);
            componentQueue.push([nx, ny]);
            processedTiles.add(neighborKey);
          }
        }
      }
    }
    
    return componentTiles;
  }

  /**
   * Add neighboring tiles at different depths to the main processing queue
   * @param {number} x 
   * @param {number} y 
   * @param {number[][]} heights 
   * @param {Set<string>} visited 
   * @param {DepthPriorityQueue} bucketsQueue 
   */
  addNeighborsToMainQueue(x, y, heights, visited, bucketsQueue) {
    for (const [dx, dy] of CONFIG.BASIN_COMPUTATION.DIRECTIONS.ORTHOGONAL) {
      const nx = x + dx;
      const ny = y + dy;
      const neighborKey = `${nx},${ny}`;
      
      if (this.isValidTile(nx, ny) && !visited.has(neighborKey)) {
        const neighborDepth = heights[ny][nx];
        
        if (neighborDepth > 0) {
          bucketsQueue.push({ x: nx, y: ny, depth: neighborDepth, tileKey: neighborKey });
          visited.add(neighborKey);
        }
      }
    }
  }

  /**
   * Find the parent basin for a connected component at given depth
   * @param {Map} basinForest 
   * @param {number} depth 
   * @param {string[]} componentTiles 
   * @param {number[][]} heights 
   * @returns {Object|null} Parent basin or null
   */
  findParentBasinForComponent(basinForest, depth, componentTiles, _heights) {
    if (depth <= 1) return null; // No parent for depth 1 basins
    
    // Look for basins at depth - 1 that are adjacent to this component
    const parentDepthBasins = basinForest.get(depth - 1);
    if (!parentDepthBasins) return null;
    
    for (const [_parentBasinId, parentBasin] of parentDepthBasins) {
      // Check if any tile in this component is adjacent to any tile in the parent basin
      for (const tile of componentTiles) {
        const [x, y] = tile.split(',').map(Number);
        
        for (const [dx, dy] of CONFIG.BASIN_COMPUTATION.DIRECTIONS.ORTHOGONAL) {
          const nx = x + dx;
          const ny = y + dy;
          const neighborKey = `${nx},${ny}`;
          
          if (parentBasin.tiles && parentBasin.tiles.includes(neighborKey)) {
            return parentBasin;
          }
        }
      }
    }
    
    return null; // No adjacent parent found
  }
}

/** @typedef {{size: number, depth: number, parent: any}} BasinNode */