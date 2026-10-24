import type { FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";
import { booleanPointInPolygon, point } from "@turf/turf";
import type { Site } from "@/lib/schemas";

export type LayerId = "openspace" | "schools" | "ej" | "municipalities";
export const GIS_SERVICES = {
  openspace: "https://gis.eea.mass.gov/server/rest/services/Protected_and_Recreational_OpenSpace_Polygons/FeatureServer/0",
  schools: "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/Schools/FeatureServer/0",
  ej: "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/EJ2020/FeatureServer/0",
  municipalities: "https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Municipalities_Hosted/FeatureServer/0",
} as const;

export interface LoadedLayer<T extends FeatureCollection> {
  id: LayerId;
  data: T | null;
  available: boolean;
  error?: string;
  sourceUrl?: string;
  retrievedAt?: string;
}
export interface AllLayers {
  openspace: LoadedLayer<FeatureCollection<Polygon | MultiPolygon>>;
  schools: LoadedLayer<FeatureCollection<Point>>;
  ej: LoadedLayer<FeatureCollection<Polygon | MultiPolygon>>;
  municipalities: LoadedLayer<FeatureCollection<Polygon | MultiPolygon>>;
}

// Cache successful, complete responses only; failed/aborted requests must be retried.
const cache = new Map<string, { data: FeatureCollection; retrievedAt: string; expires: number }>();
const FIELDS: Record<LayerId, string> = {
  openspace: "OBJECTID,SITE_NAME,LEV_PROT,PUB_ACCESS",
  schools: "OBJECTID,NAME,GRADES,TOWN,TYPE_DESC",
  ej: "OBJECTID,GEOGRAPHICAREANAME,MUNICIPALITY,EJ,EJ_CRIT_DESC",
  municipalities: "OBJECTID,TOWN,COUNTY,POP2020",
};

export function unavailableLayers(message = "Select a Massachusetts location"): AllLayers {
  const missing = (id: LayerId) => ({ id, data: null, available: false, error: message });
  return { openspace: missing("openspace"), schools: missing("schools"), ej: missing("ej"), municipalities: missing("municipalities") };
}

export function siteKey(site: Site | null): string {
  return site ? `${site.lng},${site.lat},${site.radiusMiles}` : "none";
}

/** Official ArcGIS GeoJSON, WGS84, with complete pagination and bounded requests. */
export async function queryLayer<T extends FeatureCollection>(
  id: LayerId, parameters: Record<string, string> = {}, signal?: AbortSignal,
): Promise<LoadedLayer<T>> {
  const params = new URLSearchParams({
    f: "geojson", where: id === "ej" ? "EJ = 'Yes'" : "1=1",
    outFields: FIELDS[id], outSR: "4326", returnGeometry: "true",
    orderByFields: "OBJECTID ASC", resultRecordCount: "1000",
    ...parameters,
  });
  const key = `${id}:${params}`;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) {
    return { id, data: existing.data as T, available: true, sourceUrl: GIS_SERVICES[id], retrievedAt: existing.retrievedAt };
  }
  try {
    const features: FeatureCollection["features"] = [];
    for (let page = 0; page < 50; page++) {
      signal?.throwIfAborted();
      params.set("resultOffset", String(features.length));
      const timeout = AbortSignal.timeout(30_000);
      const response = await fetch(`${GIS_SERVICES[id]}/query?${params}`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (body.error) throw new Error(body.error.message ?? "GIS service error");
      if (body.type !== "FeatureCollection" || !Array.isArray(body.features)) throw new Error("Invalid GIS response");
      const types = id === "schools" ? ["Point"] : ["Polygon", "MultiPolygon"];
      if (body.features.some((f: FeatureCollection["features"][number]) => !f.geometry || !types.includes(f.geometry.type))) {
        throw new Error("Unexpected or missing geometry in GIS response");
      }
      features.push(...body.features);
      const more = body.exceededTransferLimit ?? body.properties?.exceededTransferLimit ?? false;
      if (!more) {
        const data = { type: "FeatureCollection" as const, features };
        for (const feature of features) {
          const p = feature.properties ?? {};
          feature.properties = { ...p, name: p.NAME ?? p.SITE_NAME ?? p.GEOGRAPHICAREANAME ?? p.TOWN,
            level: p.GRADES, provenance: "official" };
        }
        const retrievedAt = new Date().toISOString();
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(key, { data, retrievedAt, expires: Date.now() + 10 * 60_000 });
        return { id, data: data as T, available: true, sourceUrl: GIS_SERVICES[id], retrievedAt };
      }
      if (!body.features.length) throw new Error("GIS pagination returned an incomplete result");
    }
    throw new Error("GIS result exceeded the safe pagination limit");
  } catch (error) {
    if (signal?.aborted) throw error;
    return { id, data: null, available: false, sourceUrl: GIS_SERVICES[id],
      error: error instanceof Error ? error.message : "GIS query failed" };
  }
}

/** Query only the selected radius for detailed polygon layers; schools and town boundaries are statewide. */
export async function loadAllLayers(site: Site | null = null, signal?: AbortSignal): Promise<AllLayers> {
  const municipalities = await queryLayer<FeatureCollection<Polygon | MultiPolygon>>("municipalities", {
    geometryPrecision: "6", maxAllowableOffset: "0.00001",
  }, signal);
  const missing = unavailableLayers();
  if (!site) return { ...missing, municipalities };
  // Do not mistake an empty out-of-state query for evidence of no constraints.
  if (!municipalities.available || !municipalities.data?.features.some(f => booleanPointInPolygon(point([site.lng, site.lat]), f))) {
    return { ...unavailableLayers(municipalities.available ? "Outside Massachusetts data coverage" : "Could not verify Massachusetts coverage"), municipalities };
  }
  // A padded envelope fully contains the geodesic analysis circle.
  const latitudeDelta = site.radiusMiles / 68 * 1.02;
  const longitudeDelta = latitudeDelta / Math.cos((site.lat + latitudeDelta) * Math.PI / 180);
  const spatial = {
    geometry: JSON.stringify({ xmin: site.lng - longitudeDelta, ymin: site.lat - latitudeDelta,
      xmax: site.lng + longitudeDelta, ymax: site.lat + latitudeDelta, spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryEnvelope", inSR: "4326", spatialRel: "esriSpatialRelIntersects",
    geometryPrecision: "6",
  };
  const [openspace, schools, ej] = await Promise.all([
    queryLayer<FeatureCollection<Polygon | MultiPolygon>>("openspace", spatial, signal),
    queryLayer<FeatureCollection<Point>>("schools", {}, signal),
    queryLayer<FeatureCollection<Polygon | MultiPolygon>>("ej", spatial, signal),
  ]);
  return { openspace, schools, ej, municipalities };
}
