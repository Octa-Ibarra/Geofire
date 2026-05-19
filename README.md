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
| `paper/` | (PDF + 2 notebooks + 4 figuras) |
| `model/` | (notebook + pesos `.pt` + `.onnx` exportado + parquet + métricas) |
| `web/` | Esqueleto Vite/React copiado; |

Cada subcarpeta tiene su `README.md` con instrucciones específicas.

Ver `paper/Proyecto_MLT.pdf` para el informe completo y la bibliografía.
