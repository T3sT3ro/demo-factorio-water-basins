// Terrain Domain Models - TypeScript

export interface Position {
  x: number;
  y: number;
}

export class TerrainTile {
  public depth: number;

  constructor(depth = 0) {
    this.depth = Math.floor(Math.max(0, Math.min(depth, 10))); // Assuming max depth 10
  }
}

export class TileMap2D {
  public readonly tiles: TerrainTile[][];

  constructor(width: number, height: number, tiles?: TerrainTile[][] | null) {
    if (tiles) {
      this.tiles = tiles;
    } else {
      this.tiles = [];
      for (let y = 0; y < height; y++) {
        this.tiles[y] = [];
        for (let x = 0; x < width; x++) {
          this.tiles[y]![x] = new TerrainTile();
        }
      }  
    }
  }

  get width() { return this.tiles[0]?.length || 0; }
  get height() { return this.tiles.length; }

  getTile(x: number, y: number): TerrainTile {
    if (!this.isValidPosition(x, y))
      throw new Error(`Invalid position: ${x}, ${y}`);
    return this.tiles[y]![x]!;
  }

  setTile(x: number, y: number, tile: TerrainTile): void {
    if (!this.isValidPosition(x, y))
      throw new Error(`Invalid position: ${x}, ${y}`);
    this.tiles[y]![x] = tile;
  }

  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getNeighborPositions(x: number, y: number): Position[] {
    const neighbors: Position[] = [
      { x: x - 1, y: y },
      { x: x + 1, y: y },
      { x: x, y: y - 1 },
      { x: x, y: y + 1 }
    ];
    return neighbors.filter(pos => this.isValidPosition(pos.x, pos.y));
  }

  getNeighborTiles(x: number, y: number): TerrainTile[] {
    return this.getNeighborPositions(x, y)
      .map(pos => this.getTile(pos.x, pos.y));
  }

  * getAllTiles(): Generator<Position & { tile: TerrainTile }> {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        yield { x, y, tile: this.tiles[y]![x]! };
      }
    }
  }
}
