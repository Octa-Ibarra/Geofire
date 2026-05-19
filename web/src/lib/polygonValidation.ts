/**
 * Pure-geometry utilities for validating user-drawn fire polygons.
 *
 * Constraints applied in the playground:
 *   - At least 3 vertices.
 *   - At most 7 vertices.
 *   - The exterior ring must not self-intersect.
 */

export const MIN_VERTICES = 3;
export const MAX_VERTICES = 7;

export type ValidationCode =
  | "ok"
  | "too_few"
  | "too_many"
  | "self_intersecting"
  | "not_polygon";

export type ValidationResult = {
  ok: boolean;
  code: ValidationCode;
  vertices: number; // unique placed vertices (excluding the closing duplicate)
};

type Pt = [number, number];

/**
 * Count the unique vertices of a polygon ring. mapbox-gl-draw stores the
 * closing vertex as a duplicate of the first; we strip it (when present) so
 * the count matches what the user actually clicked.
 */
export function uniqueVertices(ring: Pt[]): number {
  if (ring.length === 0) return 0;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = last[0] === first[0] && last[1] === first[1];
  return closed ? ring.length - 1 : ring.length;
}

/**
 * Standard CCW segment-intersection test (Sedgewick). Returns true iff the
 * open segments AB and CD properly cross. Endpoints that merely touch are
 * not counted as intersections.
 */
function segmentsIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const ccw = (p: Pt, q: Pt, r: Pt) =>
    (r[1] - p[1]) * (q[0] - p[0]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = ccw(c, d, a);
  const d2 = ccw(c, d, b);
  const d3 = ccw(a, b, c);
  const d4 = ccw(a, b, d);
  // Proper crossing
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

/**
 * Check whether the closed polygon described by `ring` (assumed to repeat the
 * first vertex at the end) has any pair of non-adjacent edges that cross.
 */
export function isSelfIntersecting(ring: Pt[]): boolean {
  const n = uniqueVertices(ring);
  if (n < 4) return false; // triangles cannot self-intersect
  // Edges: (v_i, v_{i+1}) for i in [0, n-1], with wrap-around to v_0.
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      // Skip the last edge against the first (they share v_0).
      if (i === 0 && j === n - 1) continue;
      const c = ring[j];
      const dpt = ring[(j + 1) % n];
      if (segmentsIntersect(a, b, c, dpt)) return true;
    }
  }
  return false;
}

/**
 * Validate a freshly-drawn polygon. Caller is expected to delete the feature
 * from the map when `ok === false`.
 */
export function validatePolygon(geom: GeoJSON.Geometry | null | undefined): ValidationResult {
  if (!geom || geom.type !== "Polygon") {
    return { ok: false, code: "not_polygon", vertices: 0 };
  }
  const ring = (geom.coordinates[0] || []) as Pt[];
  const vertices = uniqueVertices(ring);
  if (vertices < MIN_VERTICES) return { ok: false, code: "too_few", vertices };
  if (vertices > MAX_VERTICES) return { ok: false, code: "too_many", vertices };
  if (isSelfIntersecting(ring)) {
    return { ok: false, code: "self_intersecting", vertices };
  }
  return { ok: true, code: "ok", vertices };
}
