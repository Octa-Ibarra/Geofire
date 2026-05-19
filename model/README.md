# Model

U-Net pequeña que predice el perímetro $P_{t+1}$ de un incendio a partir del
perímetro $P_t$ y 20 variables ambientales (geometría + SRTM + ERA5 + FIRMS).

## Estructura

```
model/
├── notebooks/
│   └── modelo_final.ipynb        Entrenamiento + evaluación
├── scripts/
│   ├── export_onnx.py            Convierte best_unet.pt → modelo.onnx + scaler.json
│   └── precompute_predictions.py Galería pre-computada (187 transiciones de test)
├── artifacts/
│   ├── best_unet.pt              Pesos PyTorch
│   ├── unet_metrics.json         Métricas test
│   ├── tau_selection_val.json    Selección del umbral en val
│   ├── margin.json               Constante MARGIN re-derivada del train split
│   ├── test_predictions.json     Galería pre-computada
│   └── transitions_master.parquet  (opcional, grande — gestionar con LFS)
└── requirements.txt
```

## Arquitectura

- **U-Net** simétrica: 3 niveles de encoder + bottleneck + 3 de decoder
- **Input**: `(21, 128, 128)` — 1 canal de máscara $P_t$ + 20 features broadcasteadas
- **Output**: `(1, 128, 128)` logits — sigmoide → umbral $\tau^\star = 0.5$
- **base = 32** canales
- ~ pocos MB en disco; ideal para correr en navegador con ONNX

Definición fiel a entrenamiento en
[`despliegue/backend/app/model.py`](../../despliegue/backend/app/model.py).

## Pipeline de features (20)

| Bloque | Features | Origen |
| --- | --- | --- |
| Geometría (6) | área, perímetro, compactness, bbox w/h, n_vertices | Calculadas directamente del polígono |
| SRTM (6) | elev mean/std, slope mean/max, aspect sin/cos mean | Imputadas por **k-NN espacial (k=5)** sobre centroides del train |
| ERA5 + FIRMS (8) | temperatura, HR, viento (módulo + dir sin/cos), índice de sequía, FIRMS n_10km + FRP | Por **escenario** (preset bilingüe) o por fecha real en el entrenamiento |

## Reproducir

```powershell
cd model
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 1) Entrenar (genera best_unet.pt) — abrir el notebook
jupyter notebook notebooks/modelo_final.ipynb

# 2) Pre-cómputo de galería de test (~3 s)
python -m scripts.precompute_predictions

# 3) Exportar a ONNX para la web
python -m scripts.export_onnx
```

`export_onnx.py` produce:

- `artifacts/model.onnx` — la red exportada con input `(1, 21, 128, 128)` float32
- `artifacts/scaler.json` — `{means: [...20], stds: [...20], medians: [...20]}` (imputer + scaler)
- `artifacts/srtm_neighbors.json` — centroides train (lon, lat) + sus 6 features SRTM, para el k-NN en navegador
- `artifacts/margin.json` — constante MARGIN

Estos cuatro archivos se copian a `web/public/model/`.

## Métricas

Ver `artifacts/unet_metrics.json`. Resumen (test split, 187 transiciones):

- **IoU mediano**: 0.541
- Umbral $\tau^\star$: 0.5 (seleccionado en val)

## TODO al copiar archivos

- [ ] Copiar `modelo_final.ipynb` a `notebooks/`
- [ ] Copiar pesos y JSONs de `despliegue/backend/artifacts/` a `artifacts/`
- [ ] Adaptar `precompute_predictions.py` de `despliegue/backend/scripts/`
- [ ] Implementar `scripts/export_onnx.py` (ver stub provisto)
