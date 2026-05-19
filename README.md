# GeoFire

Predicción del perímetro $P_{t+1}$ de un incendio forestal en Uruguay a partir
del perímetro $P_t$ y 20 variables ambientales (geometría + SRTM + ERA5 +
FIRMS), usando una U-Net pequeña.

Proyecto académico — Uniandes, MISIS, *Machine Learning Técnicas*.

## Estructura

```
geofire/
├── paper/      Informe final (PDF), notebooks de exploración, figuras
├── model/      U-Net entrenada: notebook, scripts, pesos PyTorch + ONNX
└── web/        Demo interactivo en GitHub Pages (modelo corre en navegador)
```

| Carpeta | Estado |
| --- | --- |
| `paper/` | ✅ Listo (PDF + 2 notebooks + 4 figuras) |
| `model/` | ✅ Listo (notebook + pesos `.pt` + `.onnx` exportado + parquet + métricas) |
| `web/` | 🚧 Esqueleto Vite/React copiado; falta implementar `src/inference/` para reemplazar al backend FastAPI |

Cada subcarpeta tiene su `README.md` con instrucciones específicas.

## Demo (cuando se publique)

🔗 **https://&lt;TU-USUARIO&gt;.github.io/geofire/**

El demo correrá **100% en el navegador**: la U-Net se exportó a ONNX y se
ejecuta con [`onnxruntime-web`](https://onnxruntime.ai/docs/tutorials/web/). No
hay backend ni servidor — todo el cómputo ocurre en el cliente.

**Paridad verificada**: la diferencia entre PyTorch y ONNX es 1.19e-06 en
valor absoluto máximo (ruido numérico de float32). Es exactamente la misma
U-Net, en otro formato.

## Lo que ya está hecho

- ✅ U-Net exportada a ONNX (7.5 MB, opset 17, batch dinámico)
- ✅ Scaler + imputer serializados a `scaler.json`
- ✅ 814 centroides de train + features SRTM en `srtm_neighbors.json` (para k-NN en navegador)
- ✅ Galería pre-computada (`test_predictions.json`, 187 transiciones)
- ✅ GitHub Action lista para deploy a Pages (`.github/workflows/deploy.yml`)
- ✅ Frontend Vite/React/Tailwind/MapLibre/Three copiado y deps actualizadas

## Lo que falta (siguiente PR)

- [ ] Implementar `web/src/inference/` reemplazando `services/api.ts`:
  - `runtime.ts` — carga ONNX + scaler + neighbors
  - `proj.ts` — WGS84 ↔ UTM 21S con proj4
  - `rasterize.ts` — polígono → máscara 128×128
  - `features.ts` — k-NN SRTM + presets meteo
  - `vectorize.ts` — máscara probs → polígono (marching squares)
  - `scenarios.ts` — 4 presets bilingües
- [ ] Actualizar componentes (`PlaygroundSection`, `MetricsPanel`, `GallerySection`)
  para usar `inference/` en vez de `fetch('/api/...')`
- [ ] Probar `pnpm build && pnpm preview` localmente
- [ ] Push a GitHub → activar Pages → ver el demo en vivo

Ver `web/README.md` para la tabla de equivalencias backend → navegador.

## Reproducir el modelo desde cero

```powershell
cd model
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 1) Entrenar (genera best_unet.pt) — abrir el notebook
jupyter notebook notebooks/modelo_final.ipynb

# 2) Exportar a ONNX para la web
python -m scripts.export_onnx

# 3) Copiar artefactos al frontend
cp artifacts/model.onnx artifacts/scaler.json artifacts/srtm_neighbors.json \
   artifacts/margin.json artifacts/unet_metrics.json artifacts/tau_selection_val.json \
   artifacts/test_predictions.json ../web/public/model/
```

## Citación

Ver `paper/Proyecto_MLT.pdf` para el informe completo y la bibliografía.
