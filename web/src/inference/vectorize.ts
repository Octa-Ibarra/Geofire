// Convierte la grilla de probabilidades 128×128 a un polígono GeoJSON (WGS84).
// Réplica de model.py: umbral τ=0.5 -> vectorización -> reproyección.
import { contours } from "d3-contour";
import type { Pt } from "./proj";
import { utmToLonlat } from "./proj";
import { signedArea } from "./geometry";
import { RASTER_SIZE, type Window } from "./rasterize";

export const TAU_STAR = 0.5;

export interface VectorizeResult {
  geojson: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  areaM2: number;
  confidence: number;
}

// Grid (gx, gy) en espacio de la grilla d3 -> UTM.
function gridToUtm(gx: number, gy: number, w: Window): Pt {
  return [w.originX + gx * w.px, w.originY - gy * w.px];
}

export function vectorize(probs: Float32Array, w: Window): VectorizeResult {
  // confianza = media de prob dentro de la máscara umbralizada
  let sum = 0;
  let count = 0;
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] >= TAU_STAR) {
      sum += probs[i];
      count++;
    }
  }
  const confidence = count > 0 ? sum / count : 0;
  if (count === 0) return { geojson: null, areaM2: 0, confidence: 0 };

  const generator = contours().size([RASTER_SIZE, RASTER_SIZE]).thresholds([TAU_STAR]);
  const result = generator(Array.from(probs));
  const multi = result[0]; // un solo umbral -> una MultiPolygon

  if (!multi || multi.coordinates.length === 0) {
    return { geojson: null, areaM2: 0, confidence };
  }

  // d3 devuelve MultiPolygon: [polígonos][anillos][puntos]. Reproyectamos
  // cada punto a WGS84 y acumulamos el área (UTM) con shoelace.
  let areaM2 = 0;
  const mpCoords: GeoJSON.Position[][][] = multi.coordinates.map((poly) =>
    poly.map((ring, ri) => {
      const ringUtm: Pt[] = ring.map(([gx, gy]) => gridToUtm(gx, gy, w));
      const a = signedArea(ringUtm);
      // anillo exterior suma, hueco resta
      areaM2 += ri === 0 ? Math.abs(a) : -Math.abs(a);
      return ringUtm.map(([x, y]) => utmToLonlat(x, y) as GeoJSON.Position);
    })
  );

  const geojson: GeoJSON.Polygon | GeoJSON.MultiPolygon =
    mpCoords.length === 1
      ? { type: "Polygon", coordinates: mpCoords[0] }
      : { type: "MultiPolygon", coordinates: mpCoords };

  return { geojson, areaM2: Math.max(0, areaM2), confidence };
}
