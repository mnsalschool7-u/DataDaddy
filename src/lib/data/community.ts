"use client";
import { useEffect, useState } from "react";
import type { Site } from "@/lib/schemas";
import { siteKey } from "./loader";

export const CENSUS_TOWNS = "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/Census2020_Towns/FeatureServer/2";
export const LAND_USE = "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/LandCoverLandUse2016/FeatureServer/0";
export interface CommunityContext {
  town: string; population: number; housingUnits: number; landSqMiles: number;
  housingUnitsPerSqMile: number; sourceUrl: string; retrievedAt: string;
  rentBenchmark: number | null; medianIncome: number | null; acsRelease?: string; acsSource?: string;
  rentError?: string;
}
const cache = new Map<string, CommunityContext>();

async function retrieveCommunity(site: Site, signal: AbortSignal): Promise<CommunityContext> {
  const params = new URLSearchParams({ f: "json", where: "1=1", geometry: `${site.lng},${site.lat}`,
    geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects", returnGeometry: "false",
    outFields: "GEOID20,TOWN20,POP2020,HOUSING20,ALAND20" });
  const res = await fetch(`${CENSUS_TOWNS}/query?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  if (!res.ok) throw new Error(`Census town service HTTP ${res.status}`);
  const body = await res.json();
  const a = body.features?.[0]?.attributes;
  if (!a || !Number.isFinite(a.HOUSING20) || !Number.isFinite(a.ALAND20) || a.ALAND20 <= 0) throw new Error("No supported Massachusetts housing geography at this point");
  const key = a.GEOID20;
  if (cache.has(key)) return cache.get(key)!;
  const data: CommunityContext = { town: a.TOWN20, population: a.POP2020, housingUnits: a.HOUSING20,
    landSqMiles: a.ALAND20 / 2589988.110336, housingUnitsPerSqMile: a.HOUSING20 / (a.ALAND20 / 2589988.110336),
    sourceUrl: CENSUS_TOWNS, retrievedAt: new Date().toISOString(), rentBenchmark: null, medianIncome: null };
  // Census Reporter republishes ACS estimates without a paid key. A failure remains unknown.
  const source = `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B25064,B19013&geo_ids=06000US${a.GEOID20}`;
  try {
    const response = await fetch(source, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
    if (!response.ok) throw new Error(`ACS service HTTP ${response.status}`);
    const acs = await response.json();
    const record = acs.data?.[`06000US${a.GEOID20}`];
    const rent = record?.B25064?.estimate?.B25064001;
    const income = record?.B19013?.estimate?.B19013001;
    data.rentBenchmark = Number.isFinite(rent) && rent > 0 ? rent : null;
    data.medianIncome = Number.isFinite(income) && income > 0 ? income : null;
    data.acsRelease = acs.release?.name ?? acs.release?.id;
    data.acsSource = source;
    if (data.rentBenchmark === null) data.rentError = "No published median gross rent returned";
  } catch (error) {
    if (signal.aborted) throw error;
    data.rentError = "ACS rent/income service unavailable. Use an explicitly labeled household assumption.";
  }
  cache.set(key, data);
  return data;
}

export function useCommunityContext(site: Site | null) {
  const key = siteKey(site);
  const [state, setState] = useState<{ key: string; data: CommunityContext | null; error?: string } | null>(null);
  useEffect(() => {
    if (!site) return;
    const controller = new AbortController();
    retrieveCommunity(site, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, data: null, error: error instanceof Error ? error.message : "Housing context unavailable" });
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { community: state?.key === key ? state.data : null,
    communityLoading: !!site && state?.key !== key,
    communityError: state?.key === key ? state.error : undefined };
}
