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
  prediction: GeoJSON.Polygon | null;
  confidence: number;
  input_centroid: { lon: number; lat: number };
  input_area_ha: number;
  predicted_area_ha: number;
  message?: string;
}

const API_BASE = "/api";

export const api = {
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
  getScenarios: async (): Promise<Scenario[]> => {
    const res = await fetch(`${API_BASE}/scenarios`);
    return res.json();
  },
  getMetrics: async (): Promise<Metrics> => {
    const res = await fetch(`${API_BASE}/metrics`);
    return res.json();
  },
  getTestPredictions: async (limit = 60): Promise<{ items: PredictionItem[]; total: number }> => {
    const res = await fetch(`${API_BASE}/test-predictions?limit=${limit}`);
    return res.json();
  },
  predict: async (polygon: GeoJSON.Polygon, scenarioId: string): Promise<PredictionResponse> => {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polygon, scenario_id: scenarioId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error predicting");
    }
    return res.json();
  },
};
