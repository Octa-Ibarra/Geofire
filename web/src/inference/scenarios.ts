// Presets meteorológicos/de actividad. Port fiel de features.py::SCENARIOS.
// Las 8 features se calibraron contra la distribución del split de train.

export interface Scenario {
  id: string;
  label: { es: string; en: string };
  description: { es: string; en: string };
}

// Las 8 columnas (en orden de FEATURE_COLS_20 índices 12..19) que controla el preset.
export const SCENARIO_FEATURE_COLS = [
  "t_era5_fire_mean_temperature_2m",
  "t_era5_fire_mean_relative_humidity_2m",
  "t_era5_fire_mean_wind_speed_10m",
  "t_era5_fire_wind_dir_sin_mean",
  "t_era5_fire_wind_dir_cos_mean",
  "t_era5_fire_dryness_index",
  "t_firms_total_n_10km",
  "t_firms_viirs_frp_mean_10km",
] as const;

export interface ScenarioPreset extends Scenario {
  values: Record<string, number>;
}

export const SCENARIOS: ScenarioPreset[] = [
  {
    id: "verano_seco_norte",
    label: { es: "Verano seco, viento norte", en: "Dry summer, north wind" },
    description: {
      es: "Temporada de incendios típica del litoral norte: alta temperatura, baja humedad, viento sostenido y suelo seco.",
      en: "Typical northern-coast fire season: high temperature, low humidity, sustained wind and dry soil.",
    },
    values: {
      t_era5_fire_mean_temperature_2m: 22.4,
      t_era5_fire_mean_relative_humidity_2m: 67.5,
      t_era5_fire_mean_wind_speed_10m: 23.0,
      t_era5_fire_wind_dir_sin_mean: 0.33,
      t_era5_fire_wind_dir_cos_mean: 0.04,
      t_era5_fire_dryness_index: 240.0,
      t_firms_total_n_10km: 200.0,
      t_firms_viirs_frp_mean_10km: 12.0,
    },
  },
  {
    id: "primavera_humeda",
    label: { es: "Primavera húmeda, viento suave", en: "Wet spring, light wind" },
    description: {
      es: "Suelo húmedo, temperatura moderada y viento débil. El incendio tiende a crecer poco y la pluma es corta.",
      en: "Moist soil, moderate temperature and light wind. Fires tend to grow slowly with short plumes.",
    },
    values: {
      t_era5_fire_mean_temperature_2m: 20.6,
      t_era5_fire_mean_relative_humidity_2m: 78.0,
      t_era5_fire_mean_wind_speed_10m: 14.0,
      t_era5_fire_wind_dir_sin_mean: 0.3,
      t_era5_fire_wind_dir_cos_mean: 0.0,
      t_era5_fire_dryness_index: 20.0,
      t_firms_total_n_10km: 15.0,
      t_firms_viirs_frp_mean_10km: 5.5,
    },
  },
  {
    id: "pampero_intenso",
    label: { es: "Pampero intenso (SW fuerte)", en: "Strong pampero (SW)" },
    description: {
      es: "Viento del suroeste fuerte tras un frente frío. El incendio se propaga rápido.",
      en: "Strong southwesterly wind after a cold front. Fire spreads quickly.",
    },
    values: {
      t_era5_fire_mean_temperature_2m: 21.6,
      t_era5_fire_mean_relative_humidity_2m: 70.5,
      t_era5_fire_mean_wind_speed_10m: 23.8,
      t_era5_fire_wind_dir_sin_mean: 0.31,
      t_era5_fire_wind_dir_cos_mean: 0.08,
      t_era5_fire_dryness_index: 160.0,
      t_firms_total_n_10km: 90.0,
      t_firms_viirs_frp_mean_10km: 9.2,
    },
  },
  {
    id: "otono_calmo",
    label: { es: "Otoño calmo", en: "Calm autumn" },
    description: {
      es: "Temperatura templada, humedad media-alta y viento moderado.",
      en: "Mild temperature, moderate-high humidity and moderate wind.",
    },
    values: {
      t_era5_fire_mean_temperature_2m: 21.0,
      t_era5_fire_mean_relative_humidity_2m: 75.5,
      t_era5_fire_mean_wind_speed_10m: 13.0,
      t_era5_fire_wind_dir_sin_mean: 0.32,
      t_era5_fire_wind_dir_cos_mean: 0.03,
      t_era5_fire_dryness_index: 80.0,
      t_firms_total_n_10km: 40.0,
      t_firms_viirs_frp_mean_10km: 7.4,
    },
  },
];

export const SCENARIOS_BY_ID: Record<string, ScenarioPreset> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s])
);
