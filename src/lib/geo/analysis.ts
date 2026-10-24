import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";

export const SQ_METERS_PER_SQ_MILE = 2_589_988.110336;
export const ACRES_PER_SQ_MILE = 640;
export const SQ_METERS_PER_ACRE = 4046.8564224;

export interface GreenSpaceResult {
  radiusMiles: number;
  analysisAreaSqMiles: number;
  openSpaceAcres: number;
  openSpaceAcresPerSqMile: number;
  /** Percentage of the analysis circle covered by mapped open space, 0..100. */
  coveragePercent: number;
  /** Whether any open-space geometry was available to analyze. */
  dataAvailable: boolean;
}

/**
 * Compute mapped protected/recreational open space within a radius of a point
 * using real spatial intersection (Turf). Coverage percent is clamped to [0,100]
 * to guard against floating-point / overlapping-polygon artifacts.
 */
export function greenSpaceWithinRadius(
  lng: number,
  lat: number,
  radiusMiles: number,
  openSpace: FeatureCollection<Polygon | MultiPolygon> | null,
): GreenSpaceResult {
  const circle = turf.circle([lng, lat], radiusMiles, {
    units: "miles",
    steps: 64,
  });
  const analysisAreaSqMeters = turf.area(circle);
  const analysisAreaSqMiles = analysisAreaSqMeters / SQ_METERS_PER_SQ_MILE;

  if (!openSpace) {
    return {
      radiusMiles,
      analysisAreaSqMiles,
      openSpaceAcres: 0,
      openSpaceAcresPerSqMile: 0,
      coveragePercent: 0,
      dataAvailable: false,
    };
  }

  let intersectedAreaSqMeters = 0;
  for (const feature of openSpace.features) {
    try {
      const clipped = turf.intersect(
        turf.featureCollection([
          circle as Feature<Polygon>,
          feature as Feature<Polygon | MultiPolygon>,
        ]),
      );
      if (clipped) intersectedAreaSqMeters += turf.area(clipped);
    } catch {
      // Skip invalid geometries rather than fabricating coverage.
    }
  }

  // Guard against overlapping source polygons double-counting beyond the circle.
  intersectedAreaSqMeters = Math.min(
    intersectedAreaSqMeters,
    analysisAreaSqMeters,
  );

  const openSpaceAcres = intersectedAreaSqMeters / SQ_METERS_PER_ACRE;
  const coveragePercent = clamp(
    (intersectedAreaSqMeters / analysisAreaSqMeters) * 100,
    0,
    100,
  );

  return {
    radiusMiles,
    analysisAreaSqMiles,
    openSpaceAcres,
    openSpaceAcresPerSqMile:
      analysisAreaSqMiles > 0 ? openSpaceAcres / analysisAreaSqMiles : 0,
    coveragePercent,
    dataAvailable: true,
  };
}

export interface SchoolProximityResult {
  within1Mile: number;
  within3Miles: number;
  nearestDistanceMiles: number | null;
  nearestName: string | null;
  dataAvailable: boolean;
}

export function schoolProximity(
  lng: number,
  lat: number,
  schools: FeatureCollection<Point> | null,
): SchoolProximityResult {
  if (!schools) {
    return {
      within1Mile: 0,
      within3Miles: 0,
      nearestDistanceMiles: null,
      nearestName: null,
      dataAvailable: false,
    };
  }

  const from = turf.point([lng, lat]);
  let within1 = 0;
  let within3 = 0;
  let nearest = Infinity;
  let nearestName: string | null = null;

  for (const f of schools.features) {
    const d = turf.distance(from, f as Feature<Point>, { units: "miles" });
    if (d <= 1) within1 += 1;
    if (d <= 3) within3 += 1;
    if (d < nearest) {
      nearest = d;
      nearestName =
        (f.properties?.name as string | undefined) ??
        (f.properties?.NAME as string | undefined) ??
        null;
    }
  }

  return {
    within1Mile: within1,
    within3Miles: within3,
    nearestDistanceMiles: Number.isFinite(nearest) ? nearest : null,
    nearestName,
    dataAvailable: true,
  };
}

/** Does the point fall inside any designated EJ block group polygon? */
export function ejOverlap(
  lng: number,
  lat: number,
  ej: FeatureCollection<Polygon | MultiPolygon> | null,
): { overlaps: boolean; dataAvailable: boolean; names: string[] } {
  if (!ej) {
    return { overlaps: false, dataAvailable: false, names: [] };
  }
  const pt = turf.point([lng, lat]);
  const names: string[] = [];
  for (const f of ej.features) {
    try {
      if (turf.booleanPointInPolygon(pt, f as Feature<Polygon | MultiPolygon>)) {
        const label =
          (f.properties?.name as string | undefined) ??
          (f.properties?.label as string | undefined);
        if (label) names.push(label);
      }
    } catch {
      // ignore invalid geometry
    }
  }
  return { overlaps: names.length > 0, dataAvailable: true, names };
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}
