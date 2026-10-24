"use client";
import { useEffect, useMemo, useState } from "react";
import { featureCollection, intersect, area } from "@turf/turf";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { Site } from "@/lib/schemas";
import { facilityFootprint } from "@/lib/geo/footprint";
import { LAND_USE } from "./community";

export function useLandUse(site: Site | null, acres: number) {
  const key = site ? `${site.lng},${site.lat},${acres}` : "none";
  const [state, setState] = useState<{ key: string; data: FeatureCollection<Polygon | MultiPolygon> | null; error?: string; retrievedAt?: string } | null>(null);
  useEffect(() => {
    if (!site) return;
    const controller = new AbortController();
    async function load() {
      const lat = site!.lat, lng = site!.lng;
      const radiusKm = Math.max(0.805, Math.sqrt(acres * 4046.8564224) / 1000);
      const dy = radiusKm / 110, dx = dy / Math.cos((lat + dy) * Math.PI / 180);
      const parameters = new URLSearchParams({ f: "geojson", where: "USEGENNAME LIKE 'Residential%' OR USEGENNAME LIKE 'Mixed use%' OR USEGENNAME = 'Commercial'",
        geometry: `${lng-dx},${lat-dy},${lng+dx},${lat+dy}`, geometryType: "esriGeometryEnvelope", inSR: "4326", outSR: "4326",
        outFields: "OBJECTID,USEGENNAME,FY", returnGeometry: "true", orderByFields: "OBJECTID ASC", resultRecordCount: "1000", geometryPrecision: "6" });
      const features: FeatureCollection<Polygon | MultiPolygon>["features"] = [];
      for (let i = 0; i < 15; i++) {
        parameters.set("resultOffset", String(features.length));
        const response = await fetch(`${LAND_USE}/query?${parameters}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error(`Land-use service HTTP ${response.status}`);
        const data = await response.json();
        if (data.error || data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error(data.error?.message ?? "Invalid land-use response");
        if (data.features.some((f: { geometry?: { type: string } }) => !["Polygon", "MultiPolygon"].includes(f.geometry?.type ?? ""))) throw new Error("Invalid land-use geometry");
        features.push(...data.features);
        if (!(data.exceededTransferLimit ?? data.properties?.exceededTransferLimit ?? false)) {
          if (!controller.signal.aborted) setState({ key, data: { type: "FeatureCollection", features }, retrievedAt: new Date().toISOString() });
          return;
        }
        if (!data.features.length) throw new Error("Incomplete land-use pagination");
      }
      throw new Error("Land-use query too large; coverage unavailable rather than partial");
    }
    const timer = setTimeout(() => load().catch(error => {
      if (!controller.signal.aborted) setState({ key, data: null, error: error instanceof Error ? error.message : "Land-use query failed" });
    }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const data = state?.key === key ? state.data : null;
  const impact = useMemo(() => {
    if (!site || !data || acres === 0) return null;
    const footprint = facilityFootprint(site.lng, site.lat, acres);
    let residential = 0, commercial = 0;
    for (const feature of data.features) {
      try {
        const clipped = intersect(featureCollection([footprint, feature]));
        if (!clipped) continue;
        const covered = area(clipped) / 4046.8564224;
        if (String(feature.properties?.USEGENNAME).includes("esidential")) residential += covered;
        else commercial += covered;
      } catch { return null; }
    }
    return { residentialAcres: Math.min(acres, residential), commercialAcres: Math.min(acres, commercial) };
  }, [site, data, acres]);
  return { landUse: data, landUseImpact: impact, landUseLoading: !!site && state?.key !== key,
    landUseError: state?.key === key ? state.error : undefined, landUseRetrievedAt: state?.key === key ? state.retrievedAt : undefined };
}
