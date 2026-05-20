// Orquestador de inferencia en el navegador: carga ONNX + scaler + vecinos +
// margin (una sola vez) y corre el pipeline completo. Reemplaza al backend
// FastAPI (despliegue/backend/app/main.py::predict).
import * as ort from "onnxruntime-web";
import type { Pt } from "./proj";
import { ringToUtm } from "./proj";
import { closeRing } from "./geometry";
import { buildScaledFeatures, type NeighborsJson, type ScalerJson } from "./features";
import { makeWindow, rasterizeMask, RASTER_SIZE } from "./rasterize";
import { vectorize } from "./vectorize";

const BASE = import.meta.env.BASE_URL; // p.ej. "/Geofire/"
const MODEL_DIR = `${BASE}model/`;

// onnxruntime-web: WASM de jsdelivr (la versión debe coincidir con la del paquete).
// numThreads=1 porque GitHub Pages no envía las cabeceras COOP/COEP que requiere
// el WASM multihilo.
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;
ort.env.wasm.numThreads = 1;

export interface PredictionResponse {
  prediction: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  confidence: number;
  input_centroid: { lon: number; lat: number };
  input_area_ha: number;
  predicted_area_ha: number;
  message?: string;
}

interface Loaded {
  session: ort.InferenceSession;
  scaler: ScalerJson;
  neighbors: NeighborsJson;
  margin: number;
}

let loadedPromise: Promise<Loaded> | null = null;

async function loadAll(): Promise<Loaded> {
  if (!loadedPromise) {
    loadedPromise = (async () => {
      const [session, scaler, neighbors, marginJson] = await Promise.all([
        ort.InferenceSession.create(`${MODEL_DIR}model.onnx`, {
          executionProviders: ["wasm"],
        }),
        fetch(`${MODEL_DIR}scaler.json`).then((r) => r.json() as Promise<ScalerJson>),
        fetch(`${MODEL_DIR}srtm_neighbors.json`).then((r) => r.json() as Promise<NeighborsJson>),
        fetch(`${MODEL_DIR}margin.json`).then((r) => r.json() as Promise<{ margin: number }>),
      ]);
      return { session, scaler, neighbors, margin: marginJson.margin };
    })();
  }
  return loadedPromise;
}

// Pre-carga opcional (para warm-up al entrar a la sección).
export function warmup(): void {
  void loadAll();
}

// Centroide por área (shoelace) sobre el anillo lon/lat.
function areaCentroid(ring: Pt[]): { lon: number; lat: number } {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-12) {
    // degenerado: promedio simple de vértices
    const n = ring.length - 1;
    const mx = ring.slice(0, n).reduce((s, p) => s + p[0], 0) / n;
    const my = ring.slice(0, n).reduce((s, p) => s + p[1], 0) / n;
    return { lon: mx, lat: my };
  }
  return { lon: cx / (6 * a), lat: cy / (6 * a) };
}

function outerRing(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): Pt[] {
  if (geom.type === "Polygon") return geom.coordinates[0] as Pt[];
  return geom.coordinates[0][0] as Pt[]; // primer polígono de la multi
}

export async function predict(
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  scenarioId: string
): Promise<PredictionResponse> {
  const ringLonLat = closeRing(outerRing(polygon));

  // Bounds check: dentro de Uruguay (igual que el backend).
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ringLonLat) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  if (!(minLon >= -59 && maxLon <= -52 && minLat >= -36 && maxLat <= -29)) {
    throw new Error("El polígono debe estar dentro de Uruguay (lon -59..-52, lat -36..-29).");
  }

  const { session, scaler, neighbors, margin } = await loadAll();

  const centroid = areaCentroid(ringLonLat);
  const ringUtm = ringToUtm(ringLonLat);

  const scaled = buildScaledFeatures(
    ringUtm, centroid.lon, centroid.lat, scenarioId, scaler, neighbors
  );

  const w = makeWindow(ringUtm, margin);
  const mask = rasterizeMask(ringUtm, w);

  // Tensor de entrada (1, 21, 128, 128): canal 0 = máscara, 1..20 = features
  // broadcasteadas como constantes.
  const planeSize = RASTER_SIZE * RASTER_SIZE;
  const input = new Float32Array(21 * planeSize);
  input.set(mask, 0);
  for (let k = 0; k < 20; k++) {
    const v = scaled[k];
    const base = (k + 1) * planeSize;
    input.fill(v, base, base + planeSize);
  }

  const tensor = new ort.Tensor("float32", input, [1, 21, RASTER_SIZE, RASTER_SIZE]);
  const outputs = await session.run({ input: tensor });
  const logits = outputs.logits.data as Float32Array;

  const probs = new Float32Array(planeSize);
  for (let i = 0; i < planeSize; i++) probs[i] = 1 / (1 + Math.exp(-logits[i]));

  const { geojson, areaM2, confidence } = vectorize(probs, w);

  const inputUtmRing = ringUtm;
  const inputAreaHa = polygonAreaHa(inputUtmRing);

  if (!geojson) {
    return {
      prediction: null,
      confidence: 0,
      input_centroid: centroid,
      input_area_ha: inputAreaHa,
      predicted_area_ha: 0,
      message: "El modelo no detectó expansión significativa para este caso.",
    };
  }

  return {
    prediction: geojson,
    confidence,
    input_centroid: centroid,
    input_area_ha: inputAreaHa,
    predicted_area_ha: areaM2 / 10_000,
  };
}

function polygonAreaHa(ringUtm: Pt[]): number {
  let a = 0;
  for (let i = 0; i < ringUtm.length - 1; i++) {
    const [x1, y1] = ringUtm[i];
    const [x2, y2] = ringUtm[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2) / 10_000;
}
