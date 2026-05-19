# Web — Demo en GitHub Pages

Sitio estático con el modelo U-Net ejecutándose **en el navegador** vía
[`onnxruntime-web`](https://onnxruntime.ai/docs/tutorials/web/).
Sin backend, sin servidor — todo el cómputo es del lado del cliente.

## Stack

- **Vite** + React 19 + TypeScript
- **Tailwind v4**
- **MapLibre GL** + Mapbox GL Draw (dibujar polígono)
- **Three.js** (Hero animado opcional)
- **onnxruntime-web** (inferencia U-Net en navegador)
- **@turf/turf** (operaciones geométricas y rasterización en JS)
- **proj4** (reproyección WGS84 ↔ UTM 21S)

## Estructura

```
web/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── model/                ← artefactos copiados desde model/artifacts/
│       ├── model.onnx
│       ├── scaler.json
│       ├── srtm_neighbors.json
│       ├── margin.json
│       └── test_predictions.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── HeroScene.tsx
    │   ├── PlaygroundSection.tsx
    │   ├── GallerySection.tsx
    │   ├── MetricsPanel.tsx
    │   └── ...
    ├── inference/            ← reemplaza al backend FastAPI
    │   ├── runtime.ts        Carga ONNX + scaler + KD-tree SRTM
    │   ├── rasterize.ts      Polígono → máscara 128×128 (port de rasterio)
    │   ├── vectorize.ts      Máscara probs → polígono GeoJSON
    │   ├── features.ts       20 features (geom + k-NN SRTM + presets meteo)
    │   ├── scenarios.ts      4 presets bilingües (verano_seco_norte, ...)
    │   └── proj.ts           WGS84 ↔ UTM 21S (EPSG:32721) con proj4
    └── services/
        └── api.ts            (legacy — quitar; ahora se llama a inference/)
```

## Adaptación del backend a navegador

El backend FastAPI (`despliegue/backend/app/`) hace estos pasos. Cada uno se
porta a TypeScript en `src/inference/`:

| Backend (Python) | Web (TS) | Notas |
| --- | --- | --- |
| `geo.py` proyección con `pyproj` | `proj.ts` con `proj4` | EPSG:4326 ↔ EPSG:32721 |
| `model.py::_make_window` | `inference/rasterize.ts` | Determinista, mismo MARGIN |
| `rasterio.features.rasterize` | `rasterize.ts` (point-in-polygon o canvas) | Usar `@turf/boolean-point-in-polygon` o un mini-rasterizador propio |
| `imputer + scaler` | `runtime.ts` carga `scaler.json` y aplica `(x - mean) / std` | Trivial |
| KD-tree SRTM | `features.ts` carga `srtm_neighbors.json` y hace k-NN simple (k=5) | Pocos cientos de puntos → fuerza bruta OK |
| `torch.sigmoid(model(x))` | `ort.InferenceSession.run(...)` | onnxruntime-web; **WASM** funciona en GH Pages |
| `rasterio.features.shapes` | `vectorize.ts` (marching squares) | Librería: `d3-contour` o `@turf/isobands` |

## Desarrollar localmente

```powershell
cd web
pnpm install
pnpm dev          # http://localhost:5173/geofire/
```

> **Importante**: `vite.config.ts` debe tener `base: '/geofire/'` para que las
> rutas funcionen tanto en GitHub Pages como en local. Si forkeás con otro
> nombre de repo, actualizá ese `base`.

## Desplegar a GitHub Pages

Hay un workflow listo en [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
que:

1. Se dispara en cada push a `main`
2. Instala dependencias con pnpm
3. Build: `pnpm build`
4. Sube `web/dist/` a GitHub Pages

**Una sola vez** en el repo: ir a *Settings → Pages → Source: GitHub Actions*.

## Tamaño esperado del bundle

- `model.onnx`: pocos MB (U-Net 32-base, 21 canales)
- `srtm_neighbors.json`: ~50 KB (cientos de puntos × 6 features)
- `scaler.json`: < 5 KB
- `test_predictions.json`: ~varios MB (187 transiciones con GeoJSON)
- `onnxruntime-web` WASM: ~10 MB (lazy-load)

Todo bien dentro del límite de 1 GB de GitHub Pages.

## TODO al migrar

- [ ] Copiar `despliegue/frontend/geofire/` a `web/` (sin `server.ts` ni `node_modules`)
- [ ] Reemplazar `services/api.ts` → llamadas a `inference/runtime.ts`
- [ ] Implementar los seis módulos de `src/inference/`
- [ ] Actualizar `vite.config.ts` con `base: '/geofire/'`
- [ ] Limpiar `package.json`: quitar `express`, `http-proxy-middleware`, `tsx`, `esbuild` (solo eran para el dev server de AI Studio)
- [ ] Quitar el `GEMINI_API_KEY` (no se usa para inferencia)
- [ ] Copiar artefactos de `model/artifacts/` a `web/public/model/`
- [ ] Probar `pnpm build && pnpm preview` antes de pushear
