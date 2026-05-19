import { useEffect, useState, useMemo } from "react";
import { api, PredictionItem } from "../services/api";
import { useLanguage } from "../hooks/useLanguage";
import { motion, AnimatePresence } from "motion/react";
import { Filter, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export function GallerySection() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<PredictionItem[]>([]);
  const [filter, setFilter] = useState<"random" | "best" | "worst">("random");

  const loadData = async () => {
    try {
      const data = await api.getTestPredictions(60);
      setItems(data.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const list = [...items];
    if (filter === "best") return list.sort((a, b) => b.metrics.iou - a.metrics.iou).slice(0, 12);
    if (filter === "worst") return list.sort((a, b) => a.metrics.iou - b.metrics.iou).slice(0, 12);
    return list.sort(() => Math.random() - 0.5).slice(0, 12);
  }, [items, filter]);

  return (
    <section id="gallery" className="py-32 px-6 bg-transparent overflow-hidden mt-32">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase tracking-[0.5em] text-ember-600 font-mono mb-4 block">03 / {t.sections.gallery}</span>
            <h2 className="text-6xl md:text-8xl font-display leading-[0.9] tracking-tight">{t.gallery.filters}</h2>
          </div>

          <div className="flex flex-wrap gap-2 p-1 bg-ash-800 rounded-full border border-white/5">
            {[
              { id: "best", label: t.gallery.best, icon: TrendingUp },
              { id: "worst", label: t.gallery.worst, icon: TrendingDown },
              { id: "random", label: t.gallery.random, icon: RefreshCw },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded-full text-xs uppercase tracking-widest font-mono transition-all
                  ${filter === f.id ? "bg-white text-ash-900" : "text-white/40 hover:text-white/70"}
                `}
              >
                <f.icon size={12} />
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => (
              <PredictionCard key={item.transition_id} item={item} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function PredictionCard({ item, index }: { item: PredictionItem; index: number }) {
  const { t } = useLanguage();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.8 }}
      className="group glass-panel rounded-xl overflow-hidden hover:border-ember-600/50 transition-all flex flex-col"
    >
      <div className="aspect-square bg-black/20 relative overflow-hidden flex items-center justify-center p-8">
        <PolygonPreview
          polygons={[
            // Input Pₜ — neutral grey dashed outline (the "before")
            { geo: item.polygon_t, color: "rgba(245, 241, 234, 0.06)", stroke: "#f5f1ea", dash: "3 3" },
            // Real Pₜ₊₁ — vivid emerald (the ground truth, what actually happened)
            { geo: item.polygon_t1, color: "rgba(16, 185, 129, 0.30)", stroke: "#10b981" },
            // Predicted Pₜ₊₁ — crimson (what the model said would happen)
            { geo: item.prediction, color: "rgba(214, 40, 40, 0.30)", stroke: "#ff5757" },
          ]}
        />
        <div className="absolute top-4 left-4 font-mono text-[10px] text-white/30 uppercase tracking-widest">
          {item.transition_id}
        </div>
        {/* Legend in the corner so the colour map is always visible */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 text-[9px] font-mono uppercase tracking-wider opacity-80">
          <span className="flex items-center gap-2"><span className="w-3 h-[2px] bg-[#f5f1ea]" /> Pₜ</span>
          <span className="flex items-center gap-2"><span className="w-3 h-[2px] bg-[#10b981]" /> {t.gallery.real_label}</span>
          <span className="flex items-center gap-2"><span className="w-3 h-[2px] bg-[#ff5757]" /> {t.gallery.pred_label}</span>
        </div>
      </div>
      
      <div className="p-6 flex flex-col gap-4 bg-black/10 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-[#ff8a32] font-bold">IoU SCORE</span>
            <span className="text-2xl font-display italic text-ui-text">{(item.metrics.iou || 0).toFixed(3)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">ACCURACY</span>
            <span className="text-lg font-mono text-white/70">{(item.metrics.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#f5f1ea]/10">
          <div>
            <span className="text-[9px] uppercase tracking-[0.2em] opacity-40 block mb-1">Prediccion</span>
            <span className="text-xs font-mono">{item.metrics.area_pred_ha.toFixed(1)} ha</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-[0.2em] opacity-40 block mb-1">Observado</span>
            <span className="text-xs font-mono">{item.metrics.area_true_ha.toFixed(1)} ha</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

type PolyLike = GeoJSON.Polygon | GeoJSON.MultiPolygon | null | undefined;
type Ring = [number, number][];

// A Polygon's outer ring is coords[0]; a MultiPolygon has coords[i][0]. We
// collect every outer ring so the bounds, projection and SVG render handle
// disconnected predictions (which the U-Net produces fairly often).
function outerRings(geo: PolyLike): Ring[] {
  if (!geo) return [];
  if (geo.type === "Polygon") return [geo.coordinates[0] as Ring];
  if (geo.type === "MultiPolygon") return (geo.coordinates as Ring[][]).map((p) => p[0]);
  return [];
}

function PolygonPreview({
  polygons,
}: {
  polygons: { geo: PolyLike; color: string; stroke: string; dash?: string }[];
}) {
  const allCoords = polygons.flatMap((p) => outerRings(p.geo).flat());
  if (allCoords.length === 0) return null;

  const lons = allCoords.map((c) => c[0]);
  const lats = allCoords.map((c) => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // Guard against degenerate bounds (single point or zero-width footprint).
  const padLon = 0.1 * (maxLon - minLon || 0.01);
  const padLat = 0.1 * (maxLat - minLat || 0.01);
  const viewWidth = 200;
  const viewHeight = 200;

  const project = (lon: number, lat: number) => {
    const x = ((lon - (minLon - padLon)) / (maxLon - minLon + 2 * padLon)) * viewWidth;
    const y =
      viewHeight - ((lat - (minLat - padLat)) / (maxLat - minLat + 2 * padLat)) * viewHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-full drop-shadow-[0_0_15px_rgba(249,110,28,0.2)]"
    >
      {polygons.flatMap((p, pi) =>
        outerRings(p.geo).map((ring, ri) => (
          <polygon
            key={`${pi}-${ri}`}
            points={ring.map((c) => project(c[0], c[1])).join(" ")}
            fill={p.color}
            stroke={p.stroke}
            strokeWidth="1.5"
            strokeDasharray={p.dash || "0"}
            className="transition-all duration-1000"
          />
        ))
      )}
    </svg>
  );
}
