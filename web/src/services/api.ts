// Antes llamaba a un backend FastAPI (/api/...). Ahora todo corre en el
// navegador: los escenarios son constantes, las métricas y la galería se leen
// de JSON estáticos en public/model/, y la predicción usa onnxruntime-web.
import { SCENARIOS as PRESETS } from "../inference/scenarios";
import { predict as runPredict } from "../inference/runtime";

const BASE = import.meta.env.BASE_URL;
const MODEL_DIR = `${BASE}model/`;

export interface Scenario {
  id: string;
  label: { es: string; en: string };
  description: { es: string; en: string };
}

export interface Metrics {
  test: {
    mask_iou: number;
    poly_iou: number;
    centroid_disp_m: number;
    area_err_ha: number;
    perim_err_m: number;
    pct_iou_gt_0_5: number;
    n: number;
  };
  val: {
    mask_iou: number;
    poly_iou: number;
    n: number;
  };
  tau_star: number;
}

export interface PredictionItem {
  transition_id: string;
  event: number;
  site: number;
  hour_t: number;
  polygon_t: GeoJSON.Polygon;
  polygon_t1: GeoJSON.Polygon;
  prediction: GeoJSON.Polygon;
  metrics: {
    iou: number;
    area_pred_ha: number;
    area_true_ha: number;
    centroid_disp_m: number;
    confidence: number;
  };
}

export interface PredictionResponse {
  prediction: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  confidence: number;
  input_centroid: { lon: number; lat: number };
  input_area_ha: number;
  predicted_area_ha: number;
  message?: string;
}

interface RawMetrics {
  test: Record<string, number>;
  val: Record<string, number>;
}

let _predsCache: PredictionItem[] | null = null;
async function loadPredictions(): Promise<PredictionItem[]> {
  if (!_predsCache) {
    const res = await fetch(`${MODEL_DIR}test_predictions.json`);
    _predsCache = (await res.json()) as PredictionItem[];
  }
  return _predsCache;
}

export const api = {
  getScenarios: async (): Promise<Scenario[]> =>
    PRESETS.map((s) => ({ id: s.id, label: s.label, description: s.description })),

  getMetrics: async (): Promise<Metrics> => {
    const [raw, preds] = await Promise.all([
      fetch(`${MODEL_DIR}unet_metrics.json`).then((r) => r.json() as Promise<RawMetrics>),
      loadPredictions(),
    ]);
    const pct = preds.length
      ? preds.filter((p) => p.metrics.iou > 0.5).length / preds.length
      : 0;
    return {
      test: {
        mask_iou: raw.test.mask_iou,
        poly_iou: raw.test.poly_iou,
        centroid_disp_m: raw.test.centroid_disp_m,
        area_err_ha: raw.test.area_err_ha,
        perim_err_m: raw.test.perim_err_m,
        pct_iou_gt_0_5: pct,
        n: raw.test.n_total,
      },
      val: {
        mask_iou: raw.val.mask_iou,
        poly_iou: raw.val.poly_iou,
        n: raw.val.n_total,
      },
      tau_star: 0.5,
    };
  },

  getTestPredictions: async (
    limit = 60
  ): Promise<{ items: PredictionItem[]; total: number }> => {
    const preds = await loadPredictions();
    return { items: preds.slice(0, limit), total: preds.length };
  },

  predict: async (
    polygon: GeoJSON.Polygon,
    scenarioId: string
  ): Promise<PredictionResponse> => runPredict(polygon, scenarioId),
};
