import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { api, Scenario, PredictionResponse } from "../services/api";
import { useLanguage } from "../hooks/useLanguage";
import { useLenis } from "../hooks/useLenis";
import { motion, AnimatePresence } from "motion/react";
import { Play, Trash2, Loader2, Info, Sparkles } from "lucide-react";
import {
  MAX_VERTICES,
  MIN_VERTICES,
  validatePolygon,
  type ValidationCode,
} from "../lib/polygonValidation";
import { DRAW_THEME } from "../lib/drawTheme";

// LngLatBoundsLike — keep the user from panning past Uruguay so they don't
// "get lost" zooming over the Atlantic. Tight box with a small buffer.
const URUGUAY_BOUNDS: [[number, number], [number, number]] = [
  [-59.0, -35.5],
  [-52.5, -29.5],
];

type RealExample = {
  id: string;
  label: string;
  areaHa: number;
  geometry: GeoJSON.Polygon;
};

export function PlaygroundSection() {
  const { t, lang } = useLanguage();
  const lenis = useLenis();

  // Map + draw lifetimes are completely decoupled from the rest of the
  // component state — they're created exactly once on mount and reused.
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);

  // Refs for the latest callbacks. The map effect cannot depend on these
  // (we don't want to tear the map down whenever the language toggle flips a
  // callback identity), so it reads them through refs at fire time.
  const handlersRef = useRef<{
    onCreate: () => void;
    onUpdate: () => void;
    onDelete: () => void;
    onModeChange: (e: { mode: string }) => void;
  }>(null!);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vertexCount, setVertexCount] = useState(0);
  const [polygonValid, setPolygonValid] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  // Examples are visible by default — they give the user something to play
  // with on first paint and act as decoration on a country-wide view.
  const [showExamples, setShowExamples] = useState(true);
  const [pickedExampleIds, setPickedExampleIds] = useState<Set<string>>(new Set());
  const [examples, setExamples] = useState<RealExample[]>([]);
  const [focusExampleId, setFocusExampleId] = useState<string | null>(null);

  const errorFor = useCallback(
    (code: ValidationCode): string => {
      switch (code) {
        case "too_few": return t.playground.err_too_few;
        case "too_many": return t.playground.err_too_many;
        case "self_intersecting": return t.playground.err_self_intersect;
        case "not_polygon": return t.playground.err_no_polygon;
        default: return "";
      }
    },
    [t]
  );

  const clearPredictionLayer = useCallback(() => {
    const m = map.current;
    if (!m) return;
    if (m.getLayer("prediction-fill")) m.removeLayer("prediction-fill");
    if (m.getLayer("prediction-outline")) m.removeLayer("prediction-outline");
    if (m.getSource("prediction")) m.removeSource("prediction");
  }, []);

  const focusExample = useCallback((id: string) => {
    const ex = examples.find((e) => e.id === id);
    if (!ex || !map.current) return;
    const lons = ex.geometry.coordinates[0].map((c) => c[0]);
    const lats = ex.geometry.coordinates[0].map((c) => c[1]);
    const cx = (Math.min(...lons) + Math.max(...lons)) / 2;
    const cy = (Math.min(...lats) + Math.max(...lats)) / 2;
    map.current.flyTo({ center: [cx, cy], zoom: 100, duration: 1200 });
  }, [examples]);

  const validateAndSync = useCallback((): GeoJSON.Polygon | null => {
    const d = draw.current;
    if (!d) return null;
    const all = d.getAll();
    if (all.features.length === 0) {
      setVertexCount(0);
      setPolygonValid(false);
      return null;
    }
    if (all.features.length > 1) {
      for (let i = 0; i < all.features.length - 1; i++) {
        d.delete(all.features[i].id as string);
      }
    }
    const last = d.getAll().features[0];
    const result = validatePolygon(last.geometry as GeoJSON.Geometry);
    setVertexCount(result.vertices);
    if (!result.ok) {
      setPolygonValid(false);
      setError(errorFor(result.code));
      d.delete(last.id as string);
      return null;
    }
    setPolygonValid(true);
    setError(null);
    return last.geometry as GeoJSON.Polygon;
  }, [errorFor]);

  // Keep handlers ref fresh on every render so the map can call the latest
  // closure without forcing the map to re-initialise.
  handlersRef.current = {
    onCreate: () => {
      clearPredictionLayer();
      setPrediction(null);
      validateAndSync();
    },
    onUpdate: () => {
      clearPredictionLayer();
      setPrediction(null);
      validateAndSync();
    },
    onDelete: () => {
      setVertexCount(0);
      setPolygonValid(false);
      setError(null);
      setPrediction(null);
      clearPredictionLayer();
    },
    onModeChange: (e: { mode: string }) => {
      if (e.mode === "draw_polygon") setError(null);
    },
  };

  // Fetch scenarios on mount.
  useEffect(() => {
    api.getScenarios().then((data) => {
      setScenarios(data);
      if (data.length > 0) setSelectedScenario(data[0].id);
    });
  }, []);

  useEffect(() => {
    api.getTestPredictions(50).then((data) => {
      const items: RealExample[] = data.items.map((item) => ({
        id: item.transition_id,
        label: item.transition_id,
        areaHa: item.metrics.area_true_ha,
        geometry: item.polygon_t as GeoJSON.Polygon,
      }));
      setExamples(items);
      setFocusExampleId((prev) => prev ?? items[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const container = mapContainer.current;
    if (!container || !lenis) return;
    const stopScroll = () => lenis.stop();
    const startScroll = () => lenis.start();
    container.addEventListener("mouseenter", stopScroll);
    container.addEventListener("mouseleave", startScroll);
    container.addEventListener("touchstart", stopScroll, { passive: true });
    container.addEventListener("touchend", startScroll);
    return () => {
      container.removeEventListener("mouseenter", stopScroll);
      container.removeEventListener("mouseleave", startScroll);
      container.removeEventListener("touchstart", stopScroll);
      container.removeEventListener("touchend", startScroll);
    };
  }, [lenis]);

  // Map initialisation. Empty dep array — runs once per mount. StrictMode in
  // React 19 dev double-invokes it, so we MUST be robust to that: the cleanup
  // tears the map fully down.
  useEffect(() => {
    if (!mapContainer.current) {
      // eslint-disable-next-line no-console
      console.warn("[Playground] map container ref not ready");
      return;
    }
    if (map.current) return;

    let mapInstance: maplibregl.Map;
    let drawInstance: MapboxDraw;
    try {
      mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution:
                "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID",
            },
          },
          layers: [{ id: "satellite", type: "raster", source: "satellite" }],
        },
        center: [-56.0, -32.8],
        zoom: 5.8,
        minZoom: 5.6, // user can't zoom further out than seeing all of Uruguay
        maxZoom: 14,
        maxBounds: URUGUAY_BOUNDS, // hard clamp inside Uruguay-ish
      });

      drawInstance = new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
        defaultMode: "draw_polygon",
        styles: DRAW_THEME as never,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Playground] failed to create map:", err);
      return;
    }

    map.current = mapInstance;
    draw.current = drawInstance;

    mapInstance.on("load", () => {
      // eslint-disable-next-line no-console
      console.log("[Playground] map ready");
      setMapReady(true);
      try {
        mapInstance.addControl(drawInstance as never);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Playground] failed to add Draw control:", err);
      }
    });

    mapInstance.on("draw.create", () => handlersRef.current.onCreate());
    mapInstance.on("draw.update", () => handlersRef.current.onUpdate());
    mapInstance.on("draw.delete", () => handlersRef.current.onDelete());
    mapInstance.on("draw.modechange", (e: { mode: string }) =>
      handlersRef.current.onModeChange(e)
    );

    return () => {
      try {
        mapInstance.remove();
      } catch {
        /* already removed */
      }
      map.current = null;
      draw.current = null;
      setMapReady(false);
    };
  }, []);

  // Load an example fire into the draw layer as if the user had drawn it.
  // Other examples stay on the map for context.
  const loadExample = useCallback(
    (id: string) => {
      const ex = examples.find((e) => e.id === id);
      if (!ex || !draw.current || !map.current) return;
      setFocusExampleId(id);
      draw.current.deleteAll();
      draw.current.add({ type: "Feature", properties: {}, geometry: ex.geometry });
      draw.current.changeMode("simple_select");
      const poly = validateAndSync();
      if (poly) {
        focusExample(id);
      }
      // The picked example is now in the draw layer; mark it so we don't also
      // render it in the examples overlay (avoids visual double-painting).
      setPickedExampleIds((prev) => new Set(prev).add(id));
    },
    [examples, focusExample, validateAndSync]
  );

  // Examples overlay: a separate source/layer on top of the map, visible only
  // when `showExamples` is true. Clicking a feature loads it into the draw.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const SRC = "examples";
    const FILL_ID = "examples-fill";
    const LINE_ID = "examples-outline";
    const LABEL_ID = "examples-label";

    const cleanup = () => {
      if (m.getLayer(LABEL_ID)) m.removeLayer(LABEL_ID);
      if (m.getLayer(LINE_ID)) m.removeLayer(LINE_ID);
      if (m.getLayer(FILL_ID)) m.removeLayer(FILL_ID);
      if (m.getSource(SRC)) m.removeSource(SRC);
    };

    if (!showExamples) {
      cleanup();
      return;
    }

    // Hide the example the user has currently loaded into the draw layer so
    // we don't paint it twice in different colors.
    const features: GeoJSON.Feature[] = examples.filter(
      (ex) => !pickedExampleIds.has(ex.id)
    ).map((ex) => ({
      type: "Feature",
      properties: {
        id: ex.id,
        name: ex.label,
        area: `${ex.areaHa.toFixed(1)} ${t.playground.area_ha}`,
      },
      geometry: ex.geometry,
    }));
    if (features.length === 0) {
      cleanup();
      return;
    }

    cleanup(); // start fresh
    m.addSource(SRC, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    m.addLayer({
      id: FILL_ID,
      type: "fill",
      source: SRC,
      paint: { "fill-color": "#b42318", "fill-opacity": 0.25 },
    });
    m.addLayer({
      id: LINE_ID,
      type: "line",
      source: SRC,
      paint: { "line-color": "#ff6b6b", "line-width": 2 },
    });

    // Pointer cursor over examples so it's obvious they're clickable.
    const onEnter = () => {
      m.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      m.getCanvas().style.cursor = "";
    };
    const onClick = (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = (f.properties as { id?: string } | null)?.id;
      if (id) loadExample(id);
    };
    m.on("mouseenter", FILL_ID, onEnter);
    m.on("mouseleave", FILL_ID, onLeave);
    m.on("click", FILL_ID, onClick);

    return () => {
      m.off("mouseenter", FILL_ID, onEnter);
      m.off("mouseleave", FILL_ID, onLeave);
      m.off("click", FILL_ID, onClick);
      cleanup();
    };
  }, [showExamples, mapReady, lang, t, loadExample, pickedExampleIds, examples]);

  useEffect(() => {
    if (!mapReady || !focusExampleId) return;
    focusExample(focusExampleId);
  }, [mapReady, focusExampleId, focusExample]);

  const cycleExample = useCallback(() => {
    if (examples.length === 0) return;
    setFocusExampleId((prev) => {
      const idx = prev ? examples.findIndex((e) => e.id === prev) : -1;
      const next = examples[(idx + 1) % examples.length];
      return next?.id ?? null;
    });
  }, [examples]);

  const handlePredict = async () => {
    if (!draw.current || !selectedScenario) return;
    const poly = validateAndSync();
    if (!poly) {
      if (vertexCount === 0) setError(t.playground.err_no_polygon);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.predict(poly, selectedScenario);
      setPrediction(res);
      if (res.prediction && map.current) {
        clearPredictionLayer();
        map.current.addSource("prediction", { type: "geojson", data: res.prediction });
        // Predicted P_{t+1}: crimson red, clearly distinct from the input
        // (ember yellow) and from the example fires (forest green).
        map.current.addLayer({
          id: "prediction-fill",
          type: "fill",
          source: "prediction",
          paint: { "fill-color": "#d62828", "fill-opacity": 0.5 },
        });
        map.current.addLayer({
          id: "prediction-outline",
          type: "line",
          source: "prediction",
          paint: {
            "line-color": "#ff5757",
            "line-width": 3,
            "line-dasharray": ["literal", [2, 1]] as never,
          },
        });
      } else if (!res.prediction) {
        // Build a helpful explanation. The most common cause for null is that
        // the user picked a calm scenario for a small fire, so all U-Net
        // probabilities stay below the τ=0.5 threshold. Suggest switching.
        const calm = ["primavera_humeda", "otono_calmo"];
        const tip = calm.includes(selectedScenario)
          ? ` → ${t.playground.try_aggressive}`
          : "";
        setError((res.message || t.playground.no_growth) + tip);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    draw.current?.deleteAll();
    draw.current?.changeMode("draw_polygon");
    setPrediction(null);
    setError(null);
    setVertexCount(0);
    setPolygonValid(false);
    clearPredictionLayer();
    // Free up the previously-picked examples so they reappear on the overlay.
    setPickedExampleIds(new Set());
  };

  const counterColor =
    vertexCount === 0
      ? "text-white/40"
      : vertexCount < MIN_VERTICES
        ? "text-amber-400"
        : vertexCount > MAX_VERTICES
          ? "text-red-500"
          : polygonValid
            ? "text-emerald-400"
            : "text-amber-400";

  return (
    <section id="playground" className="py-32 px-6 bg-transparent flex flex-col items-center mt-32">
      <div className="max-w-7xl w-full">
        <header className="mb-16">
          <span className="text-[10px] uppercase tracking-[0.5em] text-ember-600 font-mono mb-4 block">
            04 / {t.sections.playground}
          </span>
          <h2 className="text-6xl md:text-8xl font-display leading-[0.9] tracking-tight">
            {t.playground.title}
          </h2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <label className="text-[10px] uppercase tracking-widest text-[#ff8a32] font-bold block">
                {t.playground.scenario}
              </label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-black/40 border border-[#f5f1ea]/20 rounded-lg p-3 text-xs focus:outline-none focus:border-ember-500 transition-colors cursor-pointer text-ui-text"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id} className="bg-ash-800">
                    {s.label[lang as keyof typeof s.label]}
                  </option>
                ))}
              </select>
              {selectedScenario && (
                <p className="text-[11px] text-white/50 italic leading-relaxed">
                  {scenarios.find((sc) => sc.id === selectedScenario)?.description[lang as "es" | "en"]}
                </p>
              )}
            </div>

            <div className="glass-panel p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                  {t.playground.vertex_counter}
                </span>
                <span className={`font-mono text-base ${counterColor} transition-colors`}>
                  {vertexCount}
                  <span className="text-white/30">/{MAX_VERTICES}</span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    polygonValid
                      ? "bg-emerald-500"
                      : vertexCount > MAX_VERTICES
                        ? "bg-red-500"
                        : "bg-ember-500"
                  }`}
                  style={{ width: `${Math.min(100, (vertexCount / MAX_VERTICES) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">
                {t.playground.rules_hint}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePredict}
                disabled={loading || !polygonValid}
                className="w-full bg-ember-600 hover:bg-ember-700 disabled:opacity-30 disabled:cursor-not-allowed text-black text-[12px] font-bold uppercase tracking-widest py-4 rounded-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-ember-600/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                {t.playground.predict_btn}
              </button>
              <button
                onClick={handleClear}
                className="w-full bg-transparent hover:bg-white/5 text-white/40 text-[11px] font-bold uppercase tracking-widest py-4 rounded-lg flex items-center justify-center gap-3 transition-all border border-[#f5f1ea]/10"
              >
                <Trash2 size={16} />
                {t.playground.clear_btn}
              </button>
              <button
                onClick={() => setShowExamples((s) => !s)}
                className={`w-full text-[11px] font-bold uppercase tracking-widest py-3 rounded-lg flex items-center justify-center gap-3 transition-all border ${
                  showExamples
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                    : "bg-transparent border-emerald-500/20 text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-200"
                }`}
              >
                <Sparkles size={14} />
                {showExamples ? t.playground.hide_examples : t.playground.show_examples}
              </button>
              {showExamples && (
                <p className="text-[10px] text-white/40 leading-relaxed pl-1">
                  {t.playground.examples_hint}
                </p>
              )}
            </div>

              <button
                onClick={cycleExample}
                disabled={examples.length === 0}
                className="w-full bg-ember-600 hover:bg-ember-700 disabled:opacity-40 disabled:cursor-not-allowed text-black text-[11px] font-bold uppercase tracking-widest py-3 rounded-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-ember-600/20 border border-ember-500/40"
              >
                {t.playground.center_example}
              </button>

            <AnimatePresence>
              {prediction && prediction.prediction && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-6 rounded-xl border-ember-600/30 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-[#ff8a32] font-bold">
                      {t.playground.confidence}
                    </span>
                    <span className="text-xl font-display italic text-ui-text">
                      {(prediction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">
                        {t.playground.input_area}
                      </div>
                      <div className="text-sm font-mono text-white/70">
                        {prediction.input_area_ha.toFixed(1)} <span className="text-[10px]">ha</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">
                        {t.playground.output_area}
                      </div>
                      <div className="text-sm font-mono text-white/70">
                        {prediction.predicted_area_ha.toFixed(1)} <span className="text-[10px]">ha</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3"
                >
                  <Info className="text-red-500 shrink-0" size={16} />
                  <p className="text-xs text-red-500 leading-relaxed font-mono uppercase tracking-wider">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Map — inline width/height as belt-and-braces in case Tailwind
              arbitrary classes don't apply in this nested grid context. */}
          <div
            className="lg:col-span-3 rounded-3xl overflow-hidden relative border border-white/5 bg-ash-900"
            style={{ width: "100%", height: 720, minHeight: 480 }}
          >
            <div
              ref={mapContainer}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
            <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-2 rounded-full flex items-center gap-2 pointer-events-none">
              <div className={`w-2 h-2 rounded-full ${mapReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-[10px] uppercase tracking-widest font-mono text-white/60">
                {mapReady ? "Live Satellite Data" : "Loading map…"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
