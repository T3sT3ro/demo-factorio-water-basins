/**
 * Utility functions for 2D tile coordinate operations.
 * Handles coordinate validation, serialization, and direction vectors.
 */

import { CONFIG } from "./config.ts";

/**
 * 2D coordinate
 */
export interface Coord {
  x: number;
  y: number;
}

/**
 * Direction vector (dx, dy)
 */
export type Direction = [number, number];

/**
 * All 8 directions (orthogonal + diagonal)
 */
export const DIRECTIONS_8: readonly Direction[] = [
  [-1, 0], // left
  [1, 0], // right
  [0, -1], // up
  [0, 1], // down
  [-1, -1], // top-left
  [1, 1], // bottom-right
  [-1, 1], // bottom-left
  [1, -1], // top-right
] as const;

/**
 * Only orthogonal directions (no diagonals)
 */
export const DIRECTIONS_4: readonly Direction[] = [
  [-1, 0], // left
  [1, 0], // right
  [0, -1], // up
  [0, 1], // down
] as const;

/**
 * Check if coordinates are within world bounds
 */
export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < CONFIG.WORLD_W && y < CONFIG.WORLD_H;
}

/**
 * Check if coordinate object is within world bounds
 */
export function isCoordInBounds(coord: Coord): boolean {
  return isInBounds(coord.x, coord.y);
}

/**
 * Serialize coordinates to string key "x,y"
 */
export function coordToKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Serialize coordinate object to string key
 */
export function coordObjToKey(coord: Coord): string {
  return coordToKey(coord.x, coord.y);
}

/**
 * Parse string key "x,y" to coordinates
 */
export function keyToCoord(key: string): Coord {
  const parts = key.split(",");
  return {
    x: parseInt(parts[0]!, 10),
    y: parseInt(parts[1]!, 10),
  };
}

/**
 * Parse string key "x,y" to coordinate tuple
 */
export function keyToTuple(key: string): [number, number] {
  const parts = key.split(",");
  return [parseInt(parts[0]!, 10), parseInt(parts[1]!, 10)];
}

/**
 * Check if a diagonal move is blocked by adjacent land tiles.
 * For a diagonal move from (x,y) to (x+dx, y+dy), both orthogonal
 * crossing tiles must not be land (height 0).
 *
 * @param x Current x coordinate
 * @param y Current y coordinate
 * @param dx Direction x offset (-1, 0, or 1)
 * @param dy Direction y offset (-1, 0, or 1)
 * @param heights Height map
 * @returns true if the diagonal is blocked, false otherwise
 */
export function isDiagonalBlocked(
  x: number,
  y: number,
  dx: number,
  dy: number,
  heights: number[][],
): boolean {
  // Only check for actual diagonal moves
  if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1) {
    return false;
  }

  const cross1x = x;
  const cross1y = y + dy;
  const cross2x = x + dx;
  const cross2y = y;

  // Check if both crossing tiles are within bounds
  if (!isInBounds(cross1x, cross1y) || !isInBounds(cross2x, cross2y)) {
    return false;
  }

  const cross1IsLand = heights[cross1y]![cross1x] === 0;
  const cross2IsLand = heights[cross2y]![cross2x] === 0;

  // Diagonal is blocked if both crossing tiles are land
  return cross1IsLand && cross2IsLand;
}

/**
 * Get valid neighbors for a tile, respecting bounds and diagonal blocking
 *
 * @param x Current x coordinate
 * @param y Current y coordinate
 * @param heights Height map (for diagonal blocking check)
 * @param includeDiagonals Whether to include diagonal neighbors
 * @returns Array of valid neighbor coordinates
 */
export function getValidNeighbors(
  x: number,
  y: number,
  heights: number[][],
  includeDiagonals = true,
): Coord[] {
  const directions = includeDiagonals ? DIRECTIONS_8 : DIRECTIONS_4;
  const neighbors: Coord[] = [];

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (!isInBounds(nx, ny)) continue;

    // Check diagonal blocking for diagonal moves
    if (includeDiagonals && Math.abs(dx) === 1 && Math.abs(dy) === 1) {
      if (isDiagonalBlocked(x, y, dx, dy, heights)) {
        continue;
      }
    }

    neighbors.push({ x: nx, y: ny });
  }

  return neighbors;
}

/**
 * Calculate Manhattan distance between two coordinates
 */
export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Calculate Euclidean distance between two coordinates
 */
export function euclideanDistance(a: Coord, b: Coord): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate centroid of a set of tiles
 */
export function calculateCentroid(tiles: Set<string>): Coord {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const key of tiles) {
    const coord = keyToCoord(key);
    sumX += coord.x;
    sumY += coord.y;
    count++;
  }

  return count > 0 ? { x: Math.round(sumX / count), y: Math.round(sumY / count) } : { x: 0, y: 0 };
}
