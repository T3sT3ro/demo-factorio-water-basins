// Canvas interaction controller - handles mouse and drawing operations
import { CONFIG } from "../config.js";
import { INTERACTION_CONFIG, validateDepth, validateBrushSize } from '../config/InteractionConfig.js';

/**
 * CanvasController - Handles all mouse and canvas interactions
 * 
 * Responsibilities:
 * - Mouse events (mousedown, mousemove, mouseup, wheel, leave)
 * - Brush painting and terrain modification  
 * - Zoom and pan operations
 * - Validation of user inputs
 */
export class CanvasController {
  constructor(canvas, gameState, renderer, UI_CONSTANTS, eventBus) {
    this.canvas = canvas;
    this.gameState = gameState;
    this.renderer = renderer;
    this.UI_CONSTANTS = UI_CONSTANTS;
    this.eventBus = eventBus;
    
    // Interaction state
    this.isDrawing = false;
    this.brushOverlay = new Map(); // key: "x,y", value: depth
    this.brushCenter = null; // {x, y} in tile coordinates
    this.brushSize = INTERACTION_CONFIG.BRUSH.DEFAULT_SIZE;
    this.selectedDepth = INTERACTION_CONFIG.GAME.DEFAULT_DEPTH;
    
    // Panning state
    this.isPanning = false;
    this.lastPanX = INTERACTION_CONFIG.COORDINATES.ORIGIN;
    this.lastPanY = INTERACTION_CONFIG.COORDINATES.ORIGIN;
    
    // Remove callback system - now using EventBus only
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
    if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.MIDDLE) {
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

    if (mx < INTERACTION_CONFIG.COORDINATES.ORIGIN || my < INTERACTION_CONFIG.COORDINATES.ORIGIN || mx >= CONFIG.WORLD_W || my >= CONFIG.WORLD_H) return;

    // Prevent context menu for right-click
    if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.RIGHT) {
      e.preventDefault();
    }

    this.handleGameInteraction(e, mx, my);
  }

  handleGameInteraction(e, mx, my) {
    // ALT + RMB - pipette tool
    if (e.altKey && e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.RIGHT) {
      const heights = this.gameState.getHeights();
      const pickedDepth = heights[my][mx];
      this.eventBus.emit('depth.selected', { depth: pickedDepth });
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
    if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.LEFT) {
      this.isDrawing = true;
      this.brushOverlay.clear();
      this.updateBrushOverlay(mx, my);
      this.gameState.setSelectedReservoir(null);
      this.eventBus.emit('pumps.changed');
      this.eventBus.emit('reservoir.controls.update');
      this.eventBus.emit('render.request');
    }
  }

  handleControlInteractions(e, mx, my) {
    if (e.shiftKey) {
      if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.LEFT) { // SHIFT + CTRL + LMB - link pump to pipe system
        if (this.gameState.linkPumpToReservoir(mx, my)) {
          console.log(`Pipe System ${this.gameState.getSelectedReservoir()} selected for linking future pumps`);
        } else {
          console.log("No pump found at this location to link to");
        }
        this.eventBus.emit('reservoir.controls.update');
        this.eventBus.emit('render.request');
      }
      return;
    }

    if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.LEFT) { // CTRL + LMB - flood fill
      this.gameState.floodFill(mx, my, true);
      this.eventBus.emit('water.changed');
    } else if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.RIGHT) { // CTRL + RMB - flood empty
      this.gameState.floodFill(mx, my, false);
      this.eventBus.emit('water.changed');
    }
    this.eventBus.emit('render.request');
    this.eventBus.emit('analysis.update');
  }

  handleShiftInteractions(e, mx, my) {
    if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.LEFT) { // SHIFT + LMB - add outlet pump
      const selectedId = this.gameState.getSelectedReservoir();
      this.gameState.addPump(mx, my, "outlet", selectedId !== null);
      this.eventBus.emit('pumps.changed');
      this.eventBus.emit('reservoir.controls.update');
      this.eventBus.emit('render.request');
      this.eventBus.emit('analysis.update');
    } else if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.RIGHT) { // SHIFT + RMB - add inlet pump
      const selectedId = this.gameState.getSelectedReservoir();
      this.gameState.addPump(mx, my, "inlet", selectedId !== null);
      this.eventBus.emit('pumps.changed');
      this.eventBus.emit('reservoir.controls.update');
      this.eventBus.emit('render.request');
      this.eventBus.emit('analysis.update');
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

      this.eventBus.emit('render.request');
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
      this.eventBus.emit('insights.update', { tileInfo });
      this.eventBus.emit('render.request');
    }
  }

  handleMouseUp(e) {
    if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.MIDDLE && this.isPanning) { // Middle mouse button
      this.isPanning = false;
      this.canvas.style.cursor = INTERACTION_CONFIG.MOUSE.DEFAULT_CURSOR;
    } else if (e.button === INTERACTION_CONFIG.MOUSE.BUTTONS.LEFT && this.isDrawing) { // Left mouse button
      this.isDrawing = false;
      this.commitBrushChanges();
      this.eventBus.emit('render.request');
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
      this.eventBus.emit('render.request');
    }
    this.brushCenter = null;
    this.eventBus.emit('insights.update', { tileInfo: null });
    this.eventBus.emit('render.request');
  }

  handleWheel(e) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (e.shiftKey) {
      // SHIFT + Wheel - change brush size
      const delta = e.deltaY > 0 ? INTERACTION_CONFIG.MOUSE.ZOOM.OUT : INTERACTION_CONFIG.MOUSE.ZOOM.IN;
      this.brushSize = validateBrushSize(this.brushSize + delta);
      console.log(`Brush size: ${this.brushSize}`);
      this.eventBus.emit('insights.update', { tileInfo: null });
      this.eventBus.emit('render.request');
    } else if (e.altKey) {
      // ALT + Wheel - change selected depth
      const delta = e.deltaY > 0 ? INTERACTION_CONFIG.MOUSE.ZOOM.OUT : INTERACTION_CONFIG.MOUSE.ZOOM.IN;
      this.eventBus.emit('depth.selected', { depth: this.selectedDepth + delta });
    } else {
      // Normal zoom
      const zoomFactor = e.deltaY > 0 
        ? INTERACTION_CONFIG.MOUSE.ZOOM_FACTOR_OUT 
        : INTERACTION_CONFIG.MOUSE.ZOOM_FACTOR_IN;
      this.renderer.zoomAt(screenX, screenY, zoomFactor);
      this.eventBus.emit('insights.update', { tileInfo: null });
      this.eventBus.emit('render.request');
    }
  }

  // Brush management methods
  getBrushTiles(centerX, centerY) {
    const tiles = [];
    const radius = Math.floor(this.brushSize / INTERACTION_CONFIG.COORDINATES.BRUSH_RADIUS_DIVISOR);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= INTERACTION_CONFIG.COORDINATES.MIN_BOUNDARY && 
            y >= INTERACTION_CONFIG.COORDINATES.MIN_BOUNDARY && 
            x < CONFIG.WORLD_W && 
            y < CONFIG.WORLD_H) {
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
    if (this.brushOverlay.size === INTERACTION_CONFIG.COORDINATES.EMPTY_SIZE) return;

    // Apply all changes at once
    for (const [key, depth] of this.brushOverlay) {
      const [x, y] = key.split(",").map((n) => parseInt(n));
      this.gameState.setDepthAtBatch(x, y, depth);
    }

    this.brushOverlay.clear();

    // Revalidate and update displays
    this.gameState.revalidateMap();
    this.eventBus.emit('terrain.changed');
    this.eventBus.emit('water.changed');
    this.eventBus.emit('labels.toggled');
    this.eventBus.emit('analysis.update');
  }

  getTileInfo(x, y) {
    if (x < INTERACTION_CONFIG.COORDINATES.MIN_BOUNDARY || 
        y < INTERACTION_CONFIG.COORDINATES.MIN_BOUNDARY || 
        x >= CONFIG.WORLD_W || 
        y >= CONFIG.WORLD_H) {
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
