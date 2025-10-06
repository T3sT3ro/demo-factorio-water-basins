// Water/Basin Domain Models - TypeScript
// Pure domain objects for water basins and water flow

import { Position } from './TerrainModels.ts';

// Type definitions
export type BasinID = `${number}#${string}`;
export type PumpID = `P${number}.${number}`;

export class WaterVolume {
  constructor(public readonly amount: number) {
    if (amount < 0) throw new Error("Water volume cannot be negative");
  }

  add(other: WaterVolume): WaterVolume {
    return new WaterVolume(this.amount + other.amount);
  }

  subtract(other: WaterVolume): WaterVolume {
    return new WaterVolume(Math.max(0, this.amount - other.amount));
  }

  hasWater(): boolean {
    return this.amount > 0;
  }

  isEmpty(): boolean {
    return this.amount === 0;
  }
}

export class BasinId {
  constructor(
    public readonly depth: number,
    public readonly letter: string
  ) {}

  static create(depth: number, letter: string): BasinId {
    return new BasinId(depth, letter);
  }

  get value(): BasinID {
    return `${this.depth}#${this.letter}`;
  }

  equals(other: BasinId): boolean {
    return this.depth === other.depth && this.letter === other.letter;
  }

  toString(): string {
    return this.value;
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
  public readonly waterVolume: WaterVolume;
  public readonly outlets: OutletConnection[];

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

  addWater(amount: WaterVolume): Basin {
    return new Basin(
      this.id,
      this.depth,
      this.positions,
      this.waterVolume.add(amount),
      this.outlets
    );
  }

  removeWater(amount: WaterVolume): Basin {
    return new Basin(
      this.id,
      this.depth,
      this.positions,
      this.waterVolume.subtract(amount),
      this.outlets
    );
  }

  addPosition(x: number, y: number): Basin {
    const newPositions = new Set(this.positions);
    newPositions.add(`${x},${y}`);
    return new Basin(this.id, this.depth, newPositions, this.waterVolume, this.outlets);
  }

  containsPosition(x: number, y: number): boolean {
    return this.positions.has(`${x},${y}`);
  }

  getPositions(): Position[] {
    return Array.from(this.positions).map(pos => {
      const [x, y] = pos.split(',').map(Number);
      return { x: x!, y: y! };
    });
  }

  get size(): number {
    return this.positions.size;
  }

  hasWater(): boolean {
    return this.waterVolume.hasWater();
  }

  isEmpty(): boolean {
    return this.waterVolume.isEmpty();
  }

  addOutlet(outlet: OutletConnection): Basin {
    const newOutlets = [...this.outlets, outlet];
    return new Basin(this.id, this.depth, this.positions, this.waterVolume, newOutlets);
  }

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

  constructor(
    basin: Basin,
    children: BasinTreeNode[] = [],
    parent: BasinTreeNode | null = null
  ) {
    this.basin = basin;
    this.children = [...children];
    this.parent = parent;
  }

  addChild(child: BasinTreeNode): BasinTreeNode {
    const newChildren = [...this.children, child];
    return new BasinTreeNode(this.basin, newChildren, this.parent);
  }

  removeChild(childId: BasinId): BasinTreeNode {
    const newChildren = this.children.filter(child => !child.basin.id.equals(childId));
    return new BasinTreeNode(this.basin, newChildren, this.parent);
  }

  findChild(basinId: BasinId): BasinTreeNode | null {
    return this.children.find(child => child.basin.id.equals(basinId)) || null;
  }

  getAllDescendants(): Basin[] {
    const descendants: Basin[] = [];
    for (const child of this.children) {
      descendants.push(child.basin);
      descendants.push(...child.getAllDescendants());
    }
    return descendants;
  }

  isRoot(): boolean {
    return this.parent === null;
  }

  isLeaf(): boolean {
    return this.children.length === 0;
  }

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
  static createBasin(depth: number, letter: string, positions: Position[] = []): Basin {
    const id = BasinId.create(depth, letter);
    const positionSet = new Set(positions.map(p => `${p.x},${p.y}`));
    return new Basin(id, depth, positionSet);
  }

  static createEmptyWater(): WaterVolume {
    return new WaterVolume(0);
  }

  static createWater(amount: number): WaterVolume {
    return new WaterVolume(amount);
  }
}
