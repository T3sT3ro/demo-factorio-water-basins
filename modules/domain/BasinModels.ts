// Water/Basin Domain Models - TypeScript
// Pure domain objects for water basins and water flow

import { Position } from './TerrainModels.ts';
import { generateLetterSequence } from '../utils.ts';

// regex type matching [0-9]#[A-Z]+
export type BasinID = `${number}#${Uppercase<string>}`;

// Basin node in a tree
export class Basin {
  public readonly parent: Basin | null = null;
  public volume: number = 0;
  public capacity: number = 0;
  public depth: number;

  constructor(parent: Basin | null) {
    this.parent = parent;
    this.depth = (parent?.depth ?? -1 ) + 1;
  }
}

/**
 * Outlet connection information
 */
export interface OutletConnection {
  targetBasinId: BasinId;
  position: Position;
  flowRate: number;
}

/**
 * Basin entity - represents a water basin
 */
export class Basin {
  public readonly id: BasinId;
  public readonly depth: number;
  public readonly positions: Set<string>; // Serialized positions as "x,y"
  public waterVolume: WaterVolume;
  public readonly outlets: OutletConnection[];

  /**
   * @param id - Basin identifier
   * @param depth - Basin depth level
   * @param positions - Set of positions in this basin
   * @param waterVolume - Current water volume
   * @param outlets - Outlet connections to other basins
   */
  constructor(
    id: BasinId,
    depth: number,
    positions: Set<string> = new Set(),
    waterVolume: WaterVolume = new WaterVolume(0),
    outlets: OutletConnection[] = []
  ) {
    this.id = id;
    this.depth = depth;
    this.positions = new Set(positions);
    this.waterVolume = waterVolume;
    this.outlets = [...outlets];
  }

  /**
   * Add water to basin
   */
  addWater(amount: WaterVolume): Basin {
    return new Basin(
      this.id,
      this.depth,
      this.positions,
      this.waterVolume.add(amount),
      this.outlets
    );
  }

  /**
   * Remove water from basin
   */
  removeWater(amount: WaterVolume): Basin {
    return new Basin(
      this.id,
      this.depth,
      this.positions,
      this.waterVolume.subtract(amount),
      this.outlets
    );
  }

  /**
   * Add position to basin
   */
  addPosition(x: number, y: number): Basin {
    const newPositions = new Set(this.positions);
    newPositions.add(`${x},${y}`);
    return new Basin(this.id, this.depth, newPositions, this.waterVolume, this.outlets);
  }

  /**
   * Check if basin contains position
   */
  containsPosition(x: number, y: number): boolean {
    return this.positions.has(`${x},${y}`);
  }

  /**
   * Get all positions as coordinate objects
   */
  getPositions(): Position[] {
    return Array.from(this.positions).map(pos => {
      const [x, y] = pos.split(',').map(Number);
      return { x: x!, y: y! };
    });
  }

  /**
   * Get basin size (number of tiles)
   */
  get size(): number {
    return this.positions.size;
  }

  /**
   * Check if basin has water
   */
  hasWater(): boolean {
    return this.waterVolume.hasWater();
  }

  /**
   * Check if basin is empty
   */
  isEmpty(): boolean {
    return this.waterVolume.isEmpty();
  }

  /**
   * Add outlet connection
   */
  addOutlet(outlet: OutletConnection): Basin {
    const newOutlets = [...this.outlets, outlet];
    return new Basin(this.id, this.depth, this.positions, this.waterVolume, newOutlets);
  }

  /**
   * Get outlets to specific depth
   */
  getOutletsToDepth(targetDepth: number): OutletConnection[] {
    return this.outlets.filter(outlet => outlet.targetBasinId.depth === targetDepth);
  }

  toString(): string {
    return `Basin(${this.id.value}, depth:${this.depth}, size:${this.size}, water:${this.waterVolume.amount})`;
  }
}

/**
 * Basin tree node for hierarchical basin management
 */
export class BasinTreeNode {
  public readonly basin: Basin;
  public readonly children: BasinTreeNode[];
  public readonly parent: BasinTreeNode | null;

  /**
   * @param basin - The basin at this node
   * @param children - Child basin nodes
   * @param parent - Parent basin node
   */
  constructor(
    basin: Basin,
    children: BasinTreeNode[] = [],
    parent: BasinTreeNode | null = null
  ) {
    this.basin = basin;
    this.children = [...children];
    this.parent = parent;
  }

  /**
   * Add child node
   */
  addChild(child: BasinTreeNode): BasinTreeNode {
    const newChildren = [...this.children, child];
    return new BasinTreeNode(this.basin, newChildren, this.parent);
  }

  /**
   * Remove child node
   */
  removeChild(childId: BasinId): BasinTreeNode {
    const newChildren = this.children.filter(child => !child.basin.id.equals(childId));
    return new BasinTreeNode(this.basin, newChildren, this.parent);
  }

  /**
   * Find child by basin ID
   */
  findChild(basinId: BasinId): BasinTreeNode | null {
    return this.children.find(child => child.basin.id.equals(basinId)) || null;
  }

  /**
   * Get all descendant basins
   */
  getAllDescendants(): Basin[] {
    const descendants: Basin[] = [];
    
    for (const child of this.children) {
      descendants.push(child.basin);
      descendants.push(...child.getAllDescendants());
    }
    
    return descendants;
  }

  /**
   * Check if this is a root node
   */
  isRoot(): boolean {
    return this.parent === null;
  }

  /**
   * Check if this is a leaf node
   */
  isLeaf(): boolean {
    return this.children.length === 0;
  }

  /**
   * Get depth in tree (root is 0)
   */
  getTreeDepth(): number {
    return this.parent ? this.parent.getTreeDepth() + 1 : 0;
  }

  toString(): string {
    return `BasinTreeNode(${this.basin.id.value}, children:${this.children.length})`;
  }
}

/**
 * Factory for creating basin-related objects
 */
export class BasinFactory {
  /**
   * Create a new basin with generated ID
   */
  static createBasin(depth: number, letter: string, positions: Position[] = []): Basin {
    const id = BasinId.create(depth, letter);
    const positionSet = new Set(positions.map(p => `${p.x},${p.y}`));
    return new Basin(id, depth, positionSet);
  }

  /**
   * Create empty water volume
   */
  static createEmptyWater(): WaterVolume {
    return new WaterVolume(0);
  }

  /**
   * Create water volume with amount
   */
  static createWater(amount: number): WaterVolume {
    return new WaterVolume(amount);
  }
}
