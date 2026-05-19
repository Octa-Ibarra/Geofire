/**
 * Custom mapbox-gl-draw theme compatible with MapLibre GL 4+.
 *
 * The library ships default styles that use the legacy `line-dasharray: [n, n]`
 * literal-array syntax. MapLibre 4 promoted `line-dasharray` to an
 * expression-only property, so any literal array must be wrapped in
 * `["literal", [...]]`. Passing this array as `styles` to the MapboxDraw
 * constructor replaces the broken defaults.
 *
 * Colors match the UruFire ember palette so the in-progress polygon visually
 * matches the rest of the UI.
 */
const EMBER = "#ffd199";
const EMBER_DARK = "#f96e1c";

export const DRAW_THEME = [
  // Polygon fill — inactive (already-drawn but not selected)
  {
    id: "gl-draw-polygon-fill-inactive",
    type: "fill",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    paint: { "fill-color": EMBER_DARK, "fill-outline-color": EMBER_DARK, "fill-opacity": 0.12 },
  },
  // Polygon fill — active (selected / being drawn)
  {
    id: "gl-draw-polygon-fill-active",
    type: "fill",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    paint: { "fill-color": EMBER, "fill-outline-color": EMBER, "fill-opacity": 0.2 },
  },
  // Static polygons (locked features) — unused here but required for completeness
  {
    id: "gl-draw-polygon-fill-static",
    type: "fill",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    paint: { "fill-color": "#404040", "fill-outline-color": "#404040", "fill-opacity": 0.1 },
  },
  // Polygon stroke — inactive
  {
    id: "gl-draw-polygon-stroke-inactive",
    type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": EMBER_DARK, "line-width": 2 },
  },
  // Polygon stroke — active (DASHED — wrapped in literal expression)
  {
    id: "gl-draw-polygon-stroke-active",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": EMBER,
      "line-dasharray": ["literal", [0.3, 2]],
      "line-width": 2,
    },
  },
  // Polygon stroke — static
  {
    id: "gl-draw-polygon-stroke-static",
    type: "line",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#404040", "line-width": 2 },
  },
  // LineString — inactive
  {
    id: "gl-draw-line-inactive",
    type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "LineString"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": EMBER_DARK, "line-width": 2 },
  },
  // LineString — active (used while drawing, dashed)
  {
    id: "gl-draw-line-active",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": EMBER,
      "line-dasharray": ["literal", [0.3, 2]],
      "line-width": 2,
    },
  },
  // Vertex halo (outer ring around points)
  {
    id: "gl-draw-polygon-and-line-vertex-stroke-inactive",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 7, "circle-color": "#fff" },
  },
  // Vertex point (clickable square)
  {
    id: "gl-draw-polygon-and-line-vertex-inactive",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 5, "circle-color": EMBER_DARK },
  },
  // Midpoint (the "+" that appears mid-edge for inserting new vertices)
  {
    id: "gl-draw-polygon-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: { "circle-radius": 4, "circle-color": EMBER },
  },
  // Point feature (unused for this app but required)
  {
    id: "gl-draw-point-point-stroke-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 6, "circle-opacity": 1, "circle-color": "#fff" },
  },
  {
    id: "gl-draw-point-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 4, "circle-color": EMBER_DARK },
  },
  {
    id: "gl-draw-point-stroke-active",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "active", "true"], ["!=", "meta", "midpoint"]],
    paint: { "circle-radius": 8, "circle-color": "#fff" },
  },
  {
    id: "gl-draw-point-active",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["!=", "meta", "midpoint"], ["==", "active", "true"]],
    paint: { "circle-radius": 6, "circle-color": EMBER },
  },
  {
    id: "gl-draw-point-static",
    type: "circle",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Point"]],
    paint: { "circle-radius": 4, "circle-color": "#404040" },
  },
];
