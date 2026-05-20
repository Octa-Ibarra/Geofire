// Construye el vector de 20 features y lo estandariza. Réplica de
// features.py (geom + k-NN SRTM + preset) + model.py (imputer + scaler).
import type { Pt } from "./proj";
import { area, bounds, perimeter } from "./geometry";
import { SCENARIOS_BY_ID } from "./scenarios";

export interface ScalerJson {
  feature_cols: string[]; // longitud 20, mismo orden que el entrenamiento
  medians: number[];
  means: number[];
  stds: number[];
}

export interface NeighborsJson {
  feature_cols: string[]; // 6 columnas SRTM
  points: { lon: number; lat: number; srtm: number[] }[];
}

function geometricFeatures(ringUtm: Pt[]): Record<string, number> {
  const a = area(ringUtm); // m²
  const per = perimeter(ringUtm);
  const compactness = per > 0 ? (4 * Math.PI * a) / (per * per) : 0;
  const nVertices = ringUtm.length - 1; // anillo cerrado
  const b = bounds(ringUtm);
  return {
    t_area_ha: a / 10_000,
    t_perimeter_m: per,
    t_compactness: compactness,
    t_n_vertices: nVertices,
    t_bbox_width_m: b.maxX - b.minX,
    t_bbox_height_m: b.maxY - b.minY,
  };
}

// k-NN sobre centroides train (lon/lat), promedia las 6 features SRTM.
function locationFeatures(
  lon: number,
  lat: number,
  neighbors: NeighborsJson,
  k = 5
): Record<string, number> {
  const dists = neighbors.points.map((p, i) => ({
    i,
    d: (p.lon - lon) ** 2 + (p.lat - lat) ** 2,
  }));
  dists.sort((x, y) => x.d - y.d);
  const top = dists.slice(0, Math.min(k, dists.length));
  const cols = neighbors.feature_cols;
  const out: Record<string, number> = {};
  for (let c = 0; c < cols.length; c++) {
    let sum = 0;
    let n = 0;
    for (const { i } of top) {
      const v = neighbors.points[i].srtm[c];
      if (Number.isFinite(v)) {
        sum += v;
        n++;
      }
    }
    out[cols[c]] = n > 0 ? sum / n : NaN;
  }
  return out;
}

// Devuelve Float32Array(20) ya imputado e estandarizado, en orden scaler.feature_cols.
export function buildScaledFeatures(
  ringUtm: Pt[],
  centroidLon: number,
  centroidLat: number,
  scenarioId: string,
  scaler: ScalerJson,
  neighbors: NeighborsJson
): Float32Array {
  const preset = SCENARIOS_BY_ID[scenarioId];
  if (!preset) throw new Error(`Escenario desconocido: ${scenarioId}`);

  const feats: Record<string, number> = {
    ...geometricFeatures(ringUtm),
    ...locationFeatures(centroidLon, centroidLat, neighbors),
    ...preset.values,
  };

  const out = new Float32Array(scaler.feature_cols.length);
  for (let i = 0; i < scaler.feature_cols.length; i++) {
    const col = scaler.feature_cols[i];
    let v = feats[col];
    if (v === undefined || !Number.isFinite(v)) v = scaler.medians[i]; // imputer
    out[i] = (v - scaler.means[i]) / scaler.stds[i]; // StandardScaler
  }
  return out;
}

// Área en hectáreas del t_area_ha (para mostrar en UI sin recomputar).
export function inputAreaHa(ringUtm: Pt[]): number {
  return area(ringUtm) / 10_000;
}
