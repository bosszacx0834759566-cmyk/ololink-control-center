// Shared mission-state model. Both the 3D globe and the 2D map derive their
// geometry from these functions, so they always agree.

export type AssetKind = "leo" | "haps" | "drone" | "gs";

export interface BaseAsset {
  id: string;
  kind: AssetKind;
  cluster: number;
  clusterName: string;
  status: "nominal" | "degraded" | "standby";
}

export interface OrbitAsset extends BaseAsset {
  kind: "leo";
  inclination: number; // rad
  raan: number; // rad
  phase: number; // rad
  altitudeKm: number;
  periodMin: number;
}

export interface FixedAsset extends BaseAsset {
  kind: "haps" | "drone" | "gs";
  lat: number;
  lon: number;
  altitudeKm: number;
  driftRadius: number; // deg, station-keeping loiter
  driftPeriod: number; // seconds
  driftPhase: number;
  parent?: string;
}

export type Asset = OrbitAsset | FixedAsset;

export const EARTH_RADIUS_KM = 6371;
/** Sub-100km layers are exaggerated so HAPS/drones stay readable on screen. */
export const LOW_ALT_EXAGGERATION = 90;

export const KIND_LABEL: Record<AssetKind, string> = {
  leo: "LEO Satellite",
  haps: "HAPS Platform",
  drone: "Relay Drone",
  gs: "Ground Station",
};

const REGIONS: Array<{ name: string; lat: number; lon: number }> = [
  { name: "North Atlantic", lat: 45, lon: -35 },
  { name: "Northeast Corridor", lat: 40.7, lon: -74 },
  { name: "Great Lakes", lat: 43, lon: -83 },
  { name: "Gulf Coast", lat: 29.8, lon: -95.4 },
  { name: "Pacific Northwest", lat: 47.6, lon: -122.3 },
  { name: "Baja Pacific", lat: 27, lon: -113 },
  { name: "Central Mexico", lat: 19.4, lon: -99.1 },
  { name: "Caribbean Basin", lat: 18.2, lon: -66.5 },
  { name: "Amazon Basin", lat: -3.1, lon: -60 },
  { name: "Rio Plate", lat: -34.6, lon: -58.4 },
  { name: "Andes South", lat: -33.4, lon: -70.6 },
  { name: "Patagonia", lat: -45, lon: -70 },
  { name: "Brazil Northeast", lat: -8, lon: -35 },
  { name: "Alaska Arc", lat: 61.2, lon: -149.9 },
  { name: "Hudson Bay", lat: 58, lon: -94 },
  { name: "Greenland Edge", lat: 64.2, lon: -51.7 },
  { name: "Iceland Gate", lat: 64.1, lon: -21.9 },
  { name: "British Isles", lat: 51.5, lon: -0.1 },
  { name: "Iberia", lat: 40.4, lon: -3.7 },
  { name: "Western Europe", lat: 48.9, lon: 2.35 },
  { name: "Baltic North", lat: 59.3, lon: 18.1 },
  { name: "Central Europe", lat: 52.5, lon: 13.4 },
  { name: "Adriatic", lat: 41.9, lon: 12.5 },
  { name: "Black Sea", lat: 44.4, lon: 26.1 },
  { name: "Anatolia", lat: 39.9, lon: 32.9 },
  { name: "Levant", lat: 31.8, lon: 35.2 },
  { name: "Nile Delta", lat: 30.0, lon: 31.2 },
  { name: "Maghreb", lat: 33.6, lon: -7.6 },
  { name: "Sahel West", lat: 12.6, lon: -8 },
  { name: "Gulf of Guinea", lat: 6.5, lon: 3.4 },
  { name: "Congo Basin", lat: -4.3, lon: 15.3 },
  { name: "East Africa Rift", lat: -1.3, lon: 36.8 },
  { name: "Horn of Africa", lat: 9.0, lon: 38.7 },
  { name: "Southern Africa", lat: -26.2, lon: 28 },
  { name: "Madagascar", lat: -18.9, lon: 47.5 },
  { name: "Arabian Gulf", lat: 25.2, lon: 55.3 },
  { name: "Caspian", lat: 40.4, lon: 49.9 },
  { name: "Ural Corridor", lat: 56.8, lon: 60.6 },
  { name: "Siberia Central", lat: 61.0, lon: 90 },
  { name: "Moscow Region", lat: 55.75, lon: 37.6 },
  { name: "Indus Valley", lat: 31.5, lon: 74.3 },
  { name: "Gangetic Plain", lat: 28.6, lon: 77.2 },
  { name: "Deccan", lat: 12.97, lon: 77.6 },
  { name: "Bay of Bengal", lat: 16, lon: 88 },
  { name: "Indochina", lat: 13.75, lon: 100.5 },
  { name: "Maritime SEA", lat: -6.2, lon: 106.8 },
  { name: "South China", lat: 22.3, lon: 114.2 },
  { name: "Yellow Sea", lat: 37.6, lon: 126.9 },
  { name: "Honshu", lat: 35.7, lon: 139.7 },
  { name: "Coral Sea", lat: -27.5, lon: 153 },
  { name: "Southern Australia", lat: -33.9, lon: 151.2 },
  { name: "Tasman", lat: -41.3, lon: 174.8 },
  { name: "Mid Pacific", lat: 21.3, lon: -157.8 },
  { name: "Kamchatka", lat: 53, lon: 158.6 },
];

/** Deterministic PRNG so 3D and 2D and reloads agree. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const DEG = Math.PI / 180;
const KM_PER_DEG = 111.32;

function statusFor(r: number): BaseAsset["status"] {
  if (r > 0.94) return "degraded";
  if (r > 0.86) return "standby";
  return "nominal";
}

function build() {
  const rnd = mulberry(20260829);
  const assets: Asset[] = [];

  // 100 LEO satellites across 10 orbital planes.
  const planes = 10;
  for (let i = 0; i < 100; i++) {
    const plane = i % planes;
    const inPlane = Math.floor(i / planes);
    const inclination = (plane % 2 === 0 ? 53 : 70) * DEG + (rnd() - 0.5) * 0.02;
    const altitudeKm = 540 + plane * 12 + rnd() * 8;
    assets.push({
      id: `LEO-${pad(i + 1)}`,
      kind: "leo",
      cluster: plane,
      clusterName: `Orbital Plane ${plane + 1}`,
      status: statusFor(rnd()),
      inclination,
      raan: (plane / planes) * Math.PI * 2,
      phase: ((inPlane + (plane % 2) * 0.5) / 10) * Math.PI * 2,
      altitudeKm,
      periodMin: 95 + altitudeKm / 400,
    });
  }

  // 50 operational clusters: HAPS -> Drone -> Ground Station.
  for (let c = 0; c < 50; c++) {
    const region = REGIONS[c % REGIONS.length];
    const jitterLat = (rnd() - 0.5) * 4;
    const jitterLon = (rnd() - 0.5) * 6;
    const lat = Math.max(-78, Math.min(78, region.lat + jitterLat));
    const lon = ((region.lon + jitterLon + 540) % 360) - 180;
    const n = pad(c + 1);

    const hapsAlt = 18 + rnd() * 2; // 18-20 km
    const droneAlt = hapsAlt - (2 + rnd() * 3); // 2-5 km lower

    // Ground station 10-15 km from the drone's ground track.
    const gsRangeKm = 10 + rnd() * 5;
    const bearing = rnd() * Math.PI * 2;
    const gsLat = lat + (gsRangeKm * Math.cos(bearing)) / KM_PER_DEG;
    const gsLon =
      lon + (gsRangeKm * Math.sin(bearing)) / (KM_PER_DEG * Math.cos(lat * DEG) || 1);

    assets.push({
      id: `HAPS-${n}`,
      kind: "haps",
      cluster: c,
      clusterName: region.name,
      status: statusFor(rnd()),
      lat,
      lon,
      altitudeKm: hapsAlt,
      driftRadius: 0.22,
      driftPeriod: 240 + rnd() * 180,
      driftPhase: rnd() * Math.PI * 2,
    });
    assets.push({
      id: `Drone-${n}`,
      kind: "drone",
      cluster: c,
      clusterName: region.name,
      status: statusFor(rnd()),
      lat: lat + 0.05,
      lon: lon + 0.05,
      altitudeKm: droneAlt,
      driftRadius: 0.5,
      driftPeriod: 90 + rnd() * 60,
      driftPhase: rnd() * Math.PI * 2,
      parent: `HAPS-${n}`,
    });
    assets.push({
      id: `GS-${n}`,
      kind: "gs",
      cluster: c,
      clusterName: region.name,
      status: statusFor(rnd()),
      lat: gsLat,
      lon: gsLon,
      altitudeKm: 0,
      driftRadius: 0,
      driftPeriod: 1,
      driftPhase: 0,
      parent: `Drone-${n}`,
    });
  }

  return assets;
}

export const ASSETS: Asset[] = build();
export const ASSETS_BY_KIND: Record<AssetKind, Asset[]> = {
  leo: ASSETS.filter((a) => a.kind === "leo"),
  haps: ASSETS.filter((a) => a.kind === "haps"),
  drone: ASSETS.filter((a) => a.kind === "drone"),
  gs: ASSETS.filter((a) => a.kind === "gs"),
};

export interface Geo {
  lat: number;
  lon: number;
  altitudeKm: number;
}

/** Position of an asset at mission time t (seconds). */
export function geoAt(a: Asset, t: number): Geo {
  if (a.kind === "leo") {
    const u = a.phase + (t / (a.periodMin * 60)) * Math.PI * 2;
    const si = Math.sin(a.inclination);
    const ci = Math.cos(a.inclination);
    const lat = Math.asin(si * Math.sin(u)) / DEG;
    const lonInertial = a.raan + Math.atan2(ci * Math.sin(u), Math.cos(u));
    // Earth rotation (sidereal day) so ground tracks precess realistically.
    const lon =
      (((lonInertial / DEG - (t / 86164) * 360 + 180) % 360) + 360) % 360 - 180;
    return { lat, lon, altitudeKm: a.altitudeKm };
  }
  if (a.driftRadius === 0) return { lat: a.lat, lon: a.lon, altitudeKm: 0 };
  const w = (t / a.driftPeriod) * Math.PI * 2 + a.driftPhase;
  return {
    lat: a.lat + Math.sin(w) * a.driftRadius * 0.6,
    lon: a.lon + Math.cos(w) * a.driftRadius,
    altitudeKm: a.altitudeKm,
  };
}

/** Unit-sphere (radius 1 = Earth surface) cartesian, Y up, texture-aligned. */
export function geoToVec3(
  lat: number,
  lon: number,
  radius: number,
  out: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  const s = Math.sin(phi);
  out[0] = -radius * s * Math.cos(theta);
  out[1] = radius * Math.cos(phi);
  out[2] = radius * s * Math.sin(theta);
  return out;
}

export function sceneRadius(altitudeKm: number, kind: AssetKind): number {
  const exaggerated = kind === "leo" ? altitudeKm : altitudeKm * LOW_ALT_EXAGGERATION;
  return 1 + exaggerated / EARTH_RADIUS_KM;
}
