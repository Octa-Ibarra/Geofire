// Rasteriza P_t a una máscara 128×128 con la misma ventana que en
// entrenamiento. Réplica de model.py::_make_window + rasterio.features.rasterize
// (all_touched=True aproximado con relleno por centro + recorrido de bordes).
import type { Pt } from "./proj";
import { bounds, pointInRing } from "./geometry";

export const RASTER_SIZE = 128;

export interface Window {
  cx: number;
  cy: number;
  side: number;
  px: number; // tamaño de píxel en metros
  originX: number; // utm x del borde izquierdo
  originY: number; // utm y del borde superior
}

export function makeWindow(ringUtm: Pt[], margin: number): Window {
  const b = bounds(ringUtm);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const side = Math.max(b.maxX - b.minX, b.maxY - b.minY, 1.0) * margin;
  const px = side / RASTER_SIZE;
  return { cx, cy, side, px, originX: cx - side / 2, originY: cy + side / 2 };
}

// (col, row) -> centro del píxel en UTM.
export function pixelCenter(col: number, row: number, w: Window): Pt {
  return [w.originX + (col + 0.5) * w.px, w.originY - (row + 0.5) * w.px];
}

// UTM -> índice de píxel (col, row), truncado.
function utmToPixel(x: number, y: number, w: Window): [number, number] {
  const col = Math.floor((x - w.originX) / w.px);
  const row = Math.floor((w.originY - y) / w.px);
  return [col, row];
}

export function rasterizeMask(ringUtm: Pt[], w: Window): Float32Array {
  const n = RASTER_SIZE * RASTER_SIZE;
  const mask = new Float32Array(n);

  // 1) Relleno: point-in-polygon en el centro de cada píxel.
  for (let row = 0; row < RASTER_SIZE; row++) {
    for (let col = 0; col < RASTER_SIZE; col++) {
      const [x, y] = pixelCenter(col, row, w);
      if (pointInRing(x, y, ringUtm)) mask[row * RASTER_SIZE + col] = 1;
    }
  }

  // 2) Bordes (all_touched): recorre cada arista en pasos sub-píxel y marca
  //    el píxel que contiene cada muestra. Importante porque la ventana es
  //    grande (margin ~16) y el polígono ocupa pocos píxeles.
  for (let i = 0; i < ringUtm.length - 1; i++) {
    const [x1, y1] = ringUtm[i];
    const [x2, y2] = ringUtm[i + 1];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.ceil((segLen / w.px) * 2));
    for (let s = 0; s <= steps; s++) {
      const tt = s / steps;
      const px = x1 + (x2 - x1) * tt;
      const py = y1 + (y2 - y1) * tt;
      const [col, row] = utmToPixel(px, py, w);
      if (col >= 0 && col < RASTER_SIZE && row >= 0 && row < RASTER_SIZE) {
        mask[row * RASTER_SIZE + col] = 1;
      }
    }
  }

  return mask;
}
