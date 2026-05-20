// Geometría 2D sobre anillos en coordenadas UTM (metros). Réplica de las
// features geométricas de features.py::_geometric_features.
import type { Pt } from "./proj";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function bounds(ring: Pt[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

// Área con signo (shoelace). Positiva o negativa según el sentido del anillo.
export function signedArea(ring: Pt[]): number {
  let a = 0;
  const n = ring.length;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function area(ring: Pt[]): number {
  return Math.abs(signedArea(ring));
}

export function perimeter(ring: Pt[]): number {
  let p = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    p += Math.hypot(x2 - x1, y2 - y1);
  }
  return p;
}

// Ray-casting point-in-polygon sobre un anillo cerrado.
export function pointInRing(x: number, y: number, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Asegura un anillo cerrado (primer punto == último).
export function closeRing(ring: Pt[]): Pt[] {
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) return [...ring, [fx, fy]];
  return ring;
}
