"""Export trained U-Net + preprocessing artifacts for browser inference.

Produces four files inside ``model/artifacts/`` ready to be copied into
``web/public/model/``:

- ``model.onnx``           the U-Net with input ``(1, 21, 128, 128)`` float32
- ``scaler.json``          imputer medians + scaler means/stds (length 20)
- ``srtm_neighbors.json``  train centroids (lon, lat) + their 6 SRTM features
                           for in-browser k-NN imputation

Run from ``model/``:
    python -m scripts.export_onnx
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler


# --- U-Net architecture (mirror of modelo_final.ipynb / despliegue backend) ---

class DoubleConv(nn.Module):
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class UNetSmall(nn.Module):
    def __init__(self, in_ch: int = 21, base: int = 32):
        super().__init__()
        b = base
        self.d1, self.p1 = DoubleConv(in_ch, b), nn.MaxPool2d(2)
        self.d2, self.p2 = DoubleConv(b, b * 2), nn.MaxPool2d(2)
        self.d3, self.p3 = DoubleConv(b * 2, b * 4), nn.MaxPool2d(2)
        self.bottleneck = DoubleConv(b * 4, b * 8)
        self.u3 = nn.ConvTranspose2d(b * 8, b * 4, 2, stride=2)
        self.c3 = DoubleConv(b * 8, b * 4)
        self.u2 = nn.ConvTranspose2d(b * 4, b * 2, 2, stride=2)
        self.c2 = DoubleConv(b * 4, b * 2)
        self.u1 = nn.ConvTranspose2d(b * 2, b, 2, stride=2)
        self.c1 = DoubleConv(b * 2, b)
        self.out = nn.Conv2d(b, 1, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1 = self.d1(x)
        x2 = self.d2(self.p1(x1))
        x3 = self.d3(self.p2(x2))
        xb = self.bottleneck(self.p3(x3))
        y = self.c3(torch.cat([self.u3(xb), x3], dim=1))
        y = self.c2(torch.cat([self.u2(y), x2], dim=1))
        y = self.c1(torch.cat([self.u1(y), x1], dim=1))
        return self.out(y)


# --- Feature columns (same order as training) ---

FEATURE_COLS_20 = [
    "t_area_ha", "t_perimeter_m", "t_compactness", "t_n_vertices",
    "t_bbox_width_m", "t_bbox_height_m",
    "t_srtm_elev_mean_m", "t_srtm_elev_std_m",
    "t_srtm_slope_mean_deg", "t_srtm_slope_max_deg",
    "t_srtm_aspect_sin_mean", "t_srtm_aspect_cos_mean",
    "t_era5_fire_mean_temperature_2m", "t_era5_fire_mean_relative_humidity_2m",
    "t_era5_fire_mean_wind_speed_10m",
    "t_era5_fire_wind_dir_sin_mean", "t_era5_fire_wind_dir_cos_mean",
    "t_era5_fire_dryness_index",
    "t_firms_total_n_10km", "t_firms_viirs_frp_mean_10km",
]

SRTM_COLS = [
    "t_srtm_elev_mean_m", "t_srtm_elev_std_m",
    "t_srtm_slope_mean_deg", "t_srtm_slope_max_deg",
    "t_srtm_aspect_sin_mean", "t_srtm_aspect_cos_mean",
]

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"


def export_model_onnx() -> None:
    model = UNetSmall(in_ch=21, base=32)
    state = torch.load(ARTIFACTS / "best_unet.pt", map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()

    dummy = torch.zeros(1, 21, 128, 128, dtype=torch.float32)
    out_path = ARTIFACTS / "model.onnx"
    torch.onnx.export(
        model, dummy, out_path,
        input_names=["input"], output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
    size_kb = out_path.stat().st_size / 1024
    print(f"[ok] {out_path}  ({size_kb:.1f} KB)")


def export_scaler_json(train: pd.DataFrame) -> None:
    imputer = SimpleImputer(strategy="median").fit(train[FEATURE_COLS_20])
    scaler = StandardScaler().fit(imputer.transform(train[FEATURE_COLS_20]))
    payload = {
        "feature_cols": FEATURE_COLS_20,
        "medians": imputer.statistics_.tolist(),
        "means": scaler.mean_.tolist(),
        "stds": scaler.scale_.tolist(),
    }
    out_path = ARTIFACTS / "scaler.json"
    out_path.write_text(json.dumps(payload, indent=2))
    print(f"[ok] {out_path}")


def export_srtm_neighbors(train: pd.DataFrame) -> None:
    """Persist train centroids + SRTM features for browser-side k-NN."""
    required = {"t_centroid_lon", "t_centroid_lat", *SRTM_COLS}
    missing = required - set(train.columns)
    if missing:
        raise SystemExit(
            f"transitions_master.parquet missing columns for SRTM k-NN: {missing}"
        )
    df = train[["t_centroid_lon", "t_centroid_lat", *SRTM_COLS]].dropna()
    payload = {
        "feature_cols": SRTM_COLS,
        "points": [
            {
                "lon": float(r.t_centroid_lon),
                "lat": float(r.t_centroid_lat),
                "srtm": [float(getattr(r, c)) for c in SRTM_COLS],
            }
            for r in df.itertuples()
        ],
    }
    out_path = ARTIFACTS / "srtm_neighbors.json"
    out_path.write_text(json.dumps(payload))
    print(f"[ok] {out_path}  ({len(payload['points'])} points)")


def main() -> None:
    parquet_path = ARTIFACTS / "transitions_master.parquet"
    if not parquet_path.exists():
        raise SystemExit(
            f"Missing {parquet_path}. Copy it from "
            "despliegue/backend/artifacts/ first."
        )

    df = pd.read_parquet(parquet_path)
    train = df[df["split"] == "train"].copy()

    export_model_onnx()
    export_scaler_json(train)
    export_srtm_neighbors(train)
    print("done. Copy artifacts/*.onnx and *.json to web/public/model/")


if __name__ == "__main__":
    main()
