"""Pre-compute predictions for every transition in the test split.

Writes `artifacts/test_predictions.json`, a small bundle the frontend gallery
reads to display "model vs reality" comparisons without hitting the model at
request time.

Each item contains:
    transition_id, event, site, hour_t,
    polygon_t   (GeoJSON in WGS84, the input P_t),
    polygon_t1  (GeoJSON in WGS84, the ground-truth P_{t+1}),
    prediction  (GeoJSON in WGS84, the U-Net's predicted P_{t+1}),
    metrics     {iou, area_pred_ha, area_true_ha, centroid_disp_m}

Run:  python -m scripts.precompute_predictions   (from backend/)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from shapely import wkt
from shapely.geometry import mapping
from tqdm import tqdm

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.geo import utm_to_wgs84
from app.model import FEATURE_COLS_20, infer, load_artifacts

ART = Path(__file__).resolve().parent.parent / "artifacts"


def _iou(a, b) -> float:
    if a is None or b is None or a.is_empty or b.is_empty:
        return 0.0
    inter = a.intersection(b).area
    union = a.union(b).area
    return inter / union if union > 0 else 0.0


def main() -> None:
    art = load_artifacts(ART)
    df = pd.read_parquet(ART / "transitions_master.parquet")
    test = df[df["split"] == "test"].copy().reset_index(drop=True)
    print(f"Test transitions: {len(test)}")

    out = []
    for _, row in tqdm(test.iterrows(), total=len(test)):
        p_t = wkt.loads(row["geometry_t_wkt"])
        p_t1 = wkt.loads(row["geometry_t1_wkt"])
        feats = {c: row.get(c, np.nan) for c in FEATURE_COLS_20}
        result = infer(p_t, feats, art)
        pred = result["pred_polygon"]
        iou = _iou(pred, p_t1) if pred is not None else 0.0
        item = {
            "transition_id": str(row["transition_id"]),
            "event": int(row["EVENT"]),
            "site": int(row["SITE"]),
            "hour_t": int(row["HOUR_T"]),
            "polygon_t": mapping(utm_to_wgs84(p_t)),
            "polygon_t1": mapping(utm_to_wgs84(p_t1)),
            "prediction": mapping(utm_to_wgs84(pred)) if pred is not None else None,
            "metrics": {
                "iou": float(iou),
                "area_pred_ha": float(pred.area / 10_000.0) if pred is not None else 0.0,
                "area_true_ha": float(p_t1.area / 10_000.0),
                "centroid_disp_m": float(pred.centroid.distance(p_t1.centroid))
                if pred is not None else None,
                "confidence": float(result["confidence"]),
            },
        }
        out.append(item)

    # Sort so the gallery leads with diverse-quality examples.
    out.sort(key=lambda x: x["metrics"]["iou"], reverse=True)

    out_path = ART / "test_predictions.json"
    out_path.write_text(json.dumps(out))
    print(f"Wrote {out_path}  ({len(out)} items)")

    # Summary
    ious = [x["metrics"]["iou"] for x in out]
    print(f"Mean IoU: {np.mean(ious):.3f}  Median: {np.median(ious):.3f}  "
          f">0.5: {np.mean(np.array(ious) > 0.5) * 100:.1f}%")


if __name__ == "__main__":
    main()
