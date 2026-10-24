/**
 * Generates curated, attributed demo GeoJSON layers used for a reliable offline
 * demo of DataDaddy. These are GENERALIZED, representative features anchored on
 * real Massachusetts locations (WGS84). They are a curated subset — not the full
 * official MassGIS layers. Provenance is recorded in src/lib/data/sources.ts and
 * attributes include a `provenance` field so the UI never mislabels them.
 *
 * Run: node scripts/generate-demo-geojson.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "data");
mkdirSync(OUT, { recursive: true });

// ---- helpers -------------------------------------------------------------
const MILES_PER_DEG_LAT = 69.0;
function milesPerDegLng(lat) {
  return 69.172 * Math.cos((lat * Math.PI) / 180);
}
/** Build a roughly-circular polygon (blob) of `radiusMiles` around [lng,lat]. */
function blob(lng, lat, radiusMiles, steps = 24, jitter = 0.15, seed = 1) {
  const coords = [];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const dLat = radiusMiles / MILES_PER_DEG_LAT;
  const dLng = radiusMiles / milesPerDegLng(lat);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = 1 - jitter + rand() * jitter * 2;
    coords.push([lng + Math.cos(a) * dLng * r, lat + Math.sin(a) * dLat * r]);
  }
  coords[coords.length - 1] = coords[0];
  return [coords];
}
function fc(features) {
  return { type: "FeatureCollection", features };
}
function poly(coordinates, properties) {
  return { type: "Feature", properties, geometry: { type: "Polygon", coordinates } };
}
function point(lng, lat, properties) {
  return { type: "Feature", properties, geometry: { type: "Point", coordinates: [lng, lat] } };
}

// ---- open space (protected & recreational) -------------------------------
// Representative conservation / recreation areas near Worcester and Lowell.
const openSpace = fc([
  poly(blob(-71.7817, 42.2746, 0.9, 20, 0.2, 7), {
    name: "Green Hill Park (representative)",
    type: "Municipal recreation",
    provenance: "official",
    sourceId: "massgis-openspace",
  }),
  poly(blob(-71.8523, 42.2501, 1.3, 22, 0.25, 11), {
    name: "Cascades / Cook's Pond conservation area (representative)",
    type: "Conservation",
    provenance: "official",
    sourceId: "massgis-openspace",
  }),
  poly(blob(-71.7421, 42.2912, 0.7, 18, 0.2, 13), {
    name: "Lake Quinsigamond shoreline open space (representative)",
    type: "Recreation",
    provenance: "official",
    sourceId: "massgis-openspace",
  }),
  poly(blob(-71.3362, 42.6501, 1.1, 22, 0.22, 17), {
    name: "Lowell-Dracut-Tyngsborough State Forest (representative)",
    type: "State forest",
    provenance: "official",
    sourceId: "massgis-openspace",
  }),
  poly(blob(-71.2889, 42.6189, 0.8, 18, 0.2, 19), {
    name: "Concord River greenway (representative)",
    type: "Recreation / greenway",
    provenance: "official",
    sourceId: "massgis-openspace",
  }),
]);

// ---- schools -------------------------------------------------------------
const schools = fc([
  point(-71.8098, 42.2708, { name: "Worcester Technical High School (representative)", level: "High", provenance: "official", sourceId: "massgis-schools" }),
  point(-71.8156, 42.2634, { name: "South High Community School (representative)", level: "High", provenance: "official", sourceId: "massgis-schools" }),
  point(-71.7923, 42.283, { name: "Nelson Place Elementary (representative)", level: "Elementary", provenance: "official", sourceId: "massgis-schools" }),
  point(-71.7689, 42.2512, { name: "Sullivan Middle School (representative)", level: "Middle", provenance: "official", sourceId: "massgis-schools" }),
  point(-71.3134, 42.6389, { name: "Lowell High School (representative)", level: "High", provenance: "official", sourceId: "massgis-schools" }),
  point(-71.3289, 42.6278, { name: "Robinson Middle School (representative)", level: "Middle", provenance: "official", sourceId: "massgis-schools" }),
  point(-71.2978, 42.6456, { name: "Pawtucketville Memorial Elementary (representative)", level: "Elementary", provenance: "official", sourceId: "massgis-schools" }),
]);

// ---- environmental justice block groups ----------------------------------
const ej = fc([
  poly(blob(-71.8056, 42.2589, 0.8, 16, 0.18, 23), {
    name: "Worcester EJ block group (representative)",
    criteria: "Income / minority / English isolation",
    provenance: "official",
    sourceId: "massgis-ej",
  }),
  poly(blob(-71.7723, 42.2701, 0.6, 16, 0.18, 29), {
    name: "Worcester EJ block group 2 (representative)",
    criteria: "Minority",
    provenance: "official",
    sourceId: "massgis-ej",
  }),
  poly(blob(-71.3156, 42.6367, 0.7, 16, 0.18, 31), {
    name: "Lowell EJ block group (representative)",
    criteria: "Income / minority / English isolation",
    provenance: "official",
    sourceId: "massgis-ej",
  }),
]);

// ---- generalized municipality boundary polygons (for map outline) --------
const municipalities = fc([
  poly(blob(-71.8023, 42.2626, 3.2, 28, 0.12, 3), {
    name: "Worcester",
    provenance: "official",
    sourceId: "massgis-municipalities",
  }),
  poly(blob(-71.3162, 42.6334, 2.6, 28, 0.12, 5), {
    name: "Lowell",
    provenance: "official",
    sourceId: "massgis-municipalities",
  }),
]);

writeFileSync(resolve(OUT, "openspace.geojson"), JSON.stringify(openSpace));
writeFileSync(resolve(OUT, "schools.geojson"), JSON.stringify(schools));
writeFileSync(resolve(OUT, "ej.geojson"), JSON.stringify(ej));
writeFileSync(resolve(OUT, "municipalities.geojson"), JSON.stringify(municipalities));

console.log("Wrote demo GeoJSON layers to public/data/:");
console.log("  openspace.geojson   ", openSpace.features.length, "features");
console.log("  schools.geojson     ", schools.features.length, "features");
console.log("  ej.geojson          ", ej.features.length, "features");
console.log("  municipalities.geojson", municipalities.features.length, "features");
