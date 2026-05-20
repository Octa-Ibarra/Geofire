// WGS84 (EPSG:4326, lon/lat) <-> UTM 21S (EPSG:32721), réplica de geo.py.
import proj4 from "proj4";

const UTM21S = "+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs";
proj4.defs("EPSG:32721", UTM21S);

export type Pt = [number, number];

export function lonlatToUtm(lon: number, lat: number): Pt {
  return proj4("EPSG:4326", "EPSG:32721", [lon, lat]) as Pt;
}

export function utmToLonlat(x: number, y: number): Pt {
  return proj4("EPSG:32721", "EPSG:4326", [x, y]) as Pt;
}

export function ringToUtm(ring: Pt[]): Pt[] {
  return ring.map(([lon, lat]) => lonlatToUtm(lon, lat));
}

export function ringToLonlat(ring: Pt[]): Pt[] {
  return ring.map(([x, y]) => utmToLonlat(x, y));
}
