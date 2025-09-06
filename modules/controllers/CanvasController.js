// Canvas interaction controller - handles mouse and drawing operations
import { CONFIG } from "../config.js";
import { INTERACTION_CONFIG, validateDepth, validateBrushSize } from "../config/InteractionConfig.js";

export class CanvasController {
  constructor(canvas, gameState, renderer, uiConstants) {
    this.canvas = canvas;
    this.gameState = gameState;
    this.renderer = renderer;
    this.uiConstants = uiConstants;
    
    // Interaction state
    this.isDrawing = false;
    this.brushOverlay = new Map(); // key: "x,y", value: depth
    this.brushCenter = null; // {x, y} in tile coordinates
    this.brushSize = INTERACTION_CONFIG.BRUSH.DEFAULT_SIZE;
    this.selectedDepth = INTERACTION_CONFIG.GAME.DEFAULT_DEPTH;
    
    // Panning state
    this.isPanning = false;
    this.lastPanX = 0;
    this.lastPanY = 0;
    
    // Callbacks for communication with main app
    this.callbacks = {};
  }

  setCallbacks(callbacks) {
    this.callbacks = {
      onTerrainChanged: callbacks.onTerrainChanged || (() => {}),
      onWaterChanged: callbacks.onWaterChanged || (() => {}),
      onPumpsChanged: callbacks.onPumpsChanged || (() => {}),
      onLabelsToggled: callbacks.onLabelsToggled || (() => {}),
      updateInsights: callbacks.updateInsights || (() => {}),
      updateBasinAnalysis: callbacks.updateBasinAnalysis || (() => {}),
      updateReservoirControls: callbacks.updateReservoirControls || (() => {}),
      draw: callbacks.draw || (() => {}),
      setSelectedDepth: callbacks.setSelectedDepth || (() => {})
    };
  }

  setupEventHandlers() {
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    this.canvas.addEventListener("mouseleave", () => this.handleMouseLeave());
    this.canvas.addEventListener("wheel", (e) => this.handleWheel(e));
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Handle middle mouse button for panning
    if (e.button === 1) {
      this.isPanning = true;
      this.lastPanX = screenX;
      this.lastPanY = screenY;
      this.canvas.style.cursor = INTERACTION_CONFIG.MOUSE.PAN_CURSOR;
      e.preventDefault();
      return;
    }

    // Convert screen coordinates to world coordinates
    const worldPos = this.renderer.screenToWorld(screenX, screenY);
    const mx = Math.floor(worldPos.x / CONFIG.TILE_SIZE);
    const my = Math.floor(worldPos.y / CONFIG.TILE_SIZE);

    if (mx < 0 || my < 0 || mx >= CONFIG.WORLD_W || my >= CONFIG.WORLD_H) return;

    // Prevent context menu for right-click
    if (e.button === 2) {
      e.preventDefault();
    }

    this.handleGameInteraction(e, mx, my);
  }

  handleGameInteraction(e, mx, my) {
    // ALT + RMB - pipette tool
    if (e.altKey && e.button === 2) {
      const heights = this.gameState.getHeights();
      const pickedDepth = heights[my][mx];
      this.callbacks.setSelectedDepth(pickedDepth);
      return;
    }

    // Control key combinations
    if (e.ctrlKey) {
      this.handleControlInteractions(e, mx, my);
      return;
    }

    // Shift key combinations
    if (e.shiftKey) {
      this.handleShiftInteractions(e, mx, my);
      return;
    }

    // Left mouse button - start painting
    if (e.button === 0) {
      this.isDrawing = true;
      this.brushOverlay.clear();
      this.updateBrushOverlay(mx, my);
      this.gameState.setSelectedReservoir(null);
      this.callbacks.onPumpsChanged();
      this.callbacks.updateReservoirControls();
      this.callbacks.draw();
    }
  }

  handleControlInteractions(e, mx, my) {
    if (e.shiftKey) {
      if (e.button === 0) { // SHIFT + CTRL + LMB - link pump to pipe system
        if (this.gameState.linkPumpToReservoir(mx, my)) {
          console.log(`Pipe System ${this.gameState.getSelectedReservoir()} selected for linking future pumps`);
        } else {
          console.log("No pump found at this location to link to");
        }
        this.callbacks.updateReservoirControls();
        this.callbacks.draw();
      }
      return;
    }

    if (e.button === 0) { // CTRL + LMB - flood fill
      this.gameState.floodFill(mx, my, true);
      this.callbacks.onWaterChanged();
    } else if (e.button === 2) { // CTRL + RMB - flood empty
      this.gameState.floodFill(mx, my, false);
      this.callbacks.onWaterChanged();
    }
    this.callbacks.draw();
    this.callbacks.updateBasinAnalysis();
  }

  handleShiftInteractions(e, mx, my) {
    if (e.button === 0) { // SHIFT + LMB - add outlet pump
      const selectedId = this.gameState.getSelectedReservoir();
      this.gameState.addPump(mx, my, "outlet", selectedId !== null);
      this.callbacks.onPumpsChanged();
      this.callbacks.updateReservoirControls();
      this.callbacks.draw();
      this.callbacks.updateBasinAnalysis();
    } else if (e.button === 2) { // SHIFT + RMB - add inlet pump
      const selectedId = this.gameState.getSelectedReservoir();
      this.gameState.addPump(mx, my, "inlet", selectedId !== null);
      this.callbacks.onPumpsChanged();
      this.callbacks.updateReservoirControls();
      this.callbacks.draw();
      this.callbacks.updateBasinAnalysis();
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isPanning) {
      const deltaX = screenX - this.lastPanX;
      const deltaY = screenY - this.lastPanY;

      this.renderer.pan(-deltaX, -deltaY);

      this.lastPanX = screenX;
      this.lastPanY = screenY;

      this.callbacks.draw();
    } else {
      // Update tile info and brush position
      const worldPos = this.renderer.screenToWorld(screenX, screenY);
      const tileX = Math.floor(worldPos.x / CONFIG.TILE_SIZE);
      const tileY = Math.floor(worldPos.y / CONFIG.TILE_SIZE);

      // Update brush center for overlay rendering
      this.brushCenter = { x: tileX, y: tileY };

      // Continue painting if drawing
      if (this.isDrawing) {
        this.updateBrushOverlay(tileX, tileY);
      }

      const tileInfo = this.getTileInfo(tileX, tileY);
      this.callbacks.updateInsights(tileInfo);
      this.callbacks.draw();
    }
  }

  handleMouseUp(e) {
    if (e.button === 1 && this.isPanning) { // Middle mouse button
      this.isPanning = false;
      this.canvas.style.cursor = INTERACTION_CONFIG.MOUSE.DEFAULT_CURSOR;
    } else if (e.button === 0 && this.isDrawing) { // Left mouse button
      this.isDrawing = false;
      this.commitBrushChanges();
      this.callbacks.draw();
    }
  }

  handleMouseLeave() {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = INTERACTION_CONFIG.MOUSE.DEFAULT_CURSOR;
    }
    if (this.isDrawing) {
      this.isDrawing = false;
      this.commitBrushChanges();
      this.callbacks.draw();
    }
    this.brushCenter = null;
    this.callbacks.updateInsights();
    this.callbacks.draw();
  }

  handleWheel(e) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (e.shiftKey) {
      // SHIFT + Wheel - change brush size
      const delta = e.deltaY > 0 ? -1 : 1;
      this.brushSize = validateBrushSize(this.brushSize + delta);
      console.log(`Brush size: ${this.brushSize}`);
      this.callbacks.updateInsights();
      this.callbacks.draw();
    } else if (e.altKey) {
      // ALT + Wheel - change selected depth
      const delta = e.deltaY > 0 ? -1 : 1;
      this.callbacks.setSelectedDepth(this.selectedDepth + delta);
    } else {
      // Normal zoom
      const zoomFactor = e.deltaY > 0 
        ? INTERACTION_CONFIG.MOUSE.ZOOM_FACTOR_OUT 
        : INTERACTION_CONFIG.MOUSE.ZOOM_FACTOR_IN;
      this.renderer.zoomAt(screenX, screenY, zoomFactor);
      this.callbacks.updateInsights();
      this.callbacks.draw();
    }
  }

  // Brush management methods
  getBrushTiles(centerX, centerY) {
    const tiles = [];
    const radius = Math.floor(this.brushSize / 2);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            tiles.push({ x, y });
          }
        }
      }
    }

    return tiles;
  }

  updateBrushOverlay(centerX, centerY) {
    if (!this.isDrawing) return;

    const tiles = this.getBrushTiles(centerX, centerY);
    for (const tile of tiles) {
      const key = `${tile.x},${tile.y}`;
      this.brushOverlay.set(key, this.selectedDepth);
    }
  }

  commitBrushChanges() {
    if (this.brushOverlay.size === 0) return;

    // Apply all changes at once
    for (const [key, depth] of this.brushOverlay) {
      const [x, y] = key.split(",").map((n) => parseInt(n));
      this.gameState.setDepthAtBatch(x, y, depth);
    }

    this.brushOverlay.clear();

    // Revalidate and update displays
    this.gameState.revalidateMap();
    this.callbacks.onTerrainChanged();
    this.callbacks.onWaterChanged();
    this.callbacks.onLabelsToggled();
    this.callbacks.updateBasinAnalysis();
  }

  getTileInfo(x, y) {
    if (x < 0 || y < 0 || x >= CONFIG.WORLD_W || y >= CONFIG.WORLD_H) {
      return null;
    }

    const heights = this.gameState.getHeights();
    const basinManager = this.gameState.getBasinManager();
    const pumps = this.gameState.getPumps();

    const depth = heights[y][x];
    const basinId = basinManager.getBasinIdAt(x, y);

    // Check if there's a pump at this location
    const pump = pumps.find((p) => p.x === x && p.y === y);
    const pumpInfo = pump ? { mode: pump.mode, reservoirId: pump.reservoirId } : null;

    return { x, y, depth, basinId, pumpInfo };
  }

  // Getters for brush state
  getBrushSize() { return this.brushSize; }
  getBrushCenter() { return this.brushCenter; }
  getBrushOverlay() { return this.brushOverlay; }
  getSelectedDepth() { return this.selectedDepth; }
  
  // Setters
  setBrushSize(size) { 
    this.brushSize = validateBrushSize(size); 
  }
  
  setSelectedDepth(depth) { 
    this.selectedDepth = validateDepth(depth); 
  }
}
