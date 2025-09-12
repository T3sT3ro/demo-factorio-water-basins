/// Core Noise Algorithms - Perlin, Simplex, and specialized noise functions

/// Enhanced permutation table for better quality
const PERMUTATION_TABLE = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];

/// Create doubled permutation table
const p: number[] = new Array(512);
for (let i = 0; i < 256; i++) {
  p[i] = PERMUTATION_TABLE[i]!;
  p[256 + i] = PERMUTATION_TABLE[i]!;
}

/// Smoothstep fade function for noise interpolation
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/// Linear interpolation between two values
function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

/// Gradient function for noise computation
function grad(hash: number, x: number, y: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/// 2D Perlin noise function
export function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const A = p[X]! + Y;
  const AA = p[A]!;
  const AB = p[A + 1]!;
  const B = p[X + 1]! + Y;
  const BA = p[B]!;
  const BB = p[B + 1]!;
  
  return lerp(
    v,
    lerp(u, grad(p[AA]!, x, y), grad(p[BA]!, x - 1, y)),
    lerp(u, grad(p[AB]!, x, y - 1), grad(p[BB]!, x - 1, y - 1))
  );
}

/// Gradient lookup table for simplex noise
const GRAD2_LUT: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
] as const;

/// 2D gradient function for simplex noise
function grad2(hash: number, x: number, y: number): number {
  const grad = GRAD2_LUT[hash & 7]!;
  return grad[0] * x + grad[1] * y;
}

/// 2D Simplex noise function
export function simplex2D(x: number, y: number): number {
  const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);

  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);

  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1.0 + 2.0 * G2;
  const y2 = y0 - 1.0 + 2.0 * G2;

  const ii = i & 255;
  const jj = j & 255;

  let n = 0.0;
  
  const t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    const gi0 = p[ii + p[jj]!]! & 7;
    n += t0 * t0 * t0 * t0 * grad2(gi0, x0, y0);
  }

  const t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    const gi1 = p[ii + i1 + p[jj + j1]!]! & 7;
    n += t1 * t1 * t1 * t1 * grad2(gi1, x1, y1);
  }

  const t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    const gi2 = p[ii + 1 + p[jj + 1]!]! & 7;
    n += t2 * t2 * t2 * t2 * grad2(gi2, x2, y2);
  }

  return 70.0 * n;
}

/// Ridged noise for terrain features
export function ridgedNoise2D(x: number, y: number): number {
  return 1.0 - Math.abs(noise2D(x, y));
}

/// Billowy noise for cloud-like features
export function billowyNoise2D(x: number, y: number): number {
  return Math.abs(noise2D(x, y));
}

/// Noise function type definition
export type NoiseFunction = (x: number, y: number) => number;

/// Available noise types
export const NOISE_TYPES = {
  perlin: noise2D,
  simplex: simplex2D,
  ridged: ridgedNoise2D,
  billowy: billowyNoise2D
} as const;

export type NoiseTypeName = keyof typeof NOISE_TYPES;
