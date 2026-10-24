import { describe, it, expect } from "vitest";
import fc from "fast-check";
import * as turf from "@turf/turf";
import type { FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";
import { greenSpaceWithinRadius, schoolProximity, ejOverlap } from "./analysis";

const LNG = -71.8023;
const LAT = 42.2626; // Worcester

describe("greenSpaceWithinRadius", () => {
  it("returns dataAvailable=false for a null layer (no fabricated coverage)", () => {
    const r = greenSpaceWithinRadius(LNG, LAT, 3, null);
    expect(r.dataAvailable).toBe(false);
    expect(r.coveragePercent).toBe(0);
    expect(r.openSpaceAcres).toBe(0);
    expect(r.analysisAreaSqMiles).toBeGreaterThan(0);
  });

  it("coverage percent stays within [0,100] for arbitrary overlapping polygons", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.2, max: 2, noNaN: true }),
        fc.integer({ min: 1, max: 5 }),
        (blobR, n) => {
          const feats = Array.from({ length: n }, () =>
            turf.circle([LNG, LAT], blobR, { units: "miles", steps: 24 }),
          );
          const layer: FeatureCollection<Polygon | MultiPolygon> = {
            type: "FeatureCollection",
            features: feats as never,
          };
          const r = greenSpaceWithinRadius(LNG, LAT, 3, layer);
          expect(r.coveragePercent).toBeGreaterThanOrEqual(0);
          expect(r.coveragePercent).toBeLessThanOrEqual(100);
        },
      ),
    );
  });

  it("a circle fully covering the analysis radius yields ~100% coverage", () => {
    const big = turf.circle([LNG, LAT], 10, { units: "miles", steps: 48 });
    const layer: FeatureCollection<Polygon | MultiPolygon> = {
      type: "FeatureCollection",
      features: [big as never],
    };
    const r = greenSpaceWithinRadius(LNG, LAT, 1, layer);
    expect(r.coveragePercent).toBeGreaterThan(95);
  });
});

describe("schoolProximity", () => {
  it("returns unavailable for null data", () => {
    const r = schoolProximity(LNG, LAT, null);
    expect(r.dataAvailable).toBe(false);
    expect(r.nearestDistanceMiles).toBeNull();
  });

  it("distances are non-negative and within<=1 implies within<=3", () => {
    const schools: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: [
        turf.point([LNG + 0.005, LAT], { name: "A" }) as never,
        turf.point([LNG + 0.05, LAT], { name: "B" }) as never,
      ],
    };
    const r = schoolProximity(LNG, LAT, schools);
    expect(r.nearestDistanceMiles!).toBeGreaterThanOrEqual(0);
    expect(r.within1Mile).toBeLessThanOrEqual(r.within3Miles);
  });
});

describe("ejOverlap", () => {
  it("returns unavailable for null data", () => {
    const r = ejOverlap(LNG, LAT, null);
    expect(r.dataAvailable).toBe(false);
    expect(r.overlaps).toBe(false);
  });

  it("detects a point inside a polygon", () => {
    const poly = turf.circle([LNG, LAT], 1, { units: "miles", steps: 24 });
    poly.properties = { name: "EJ test" };
    const layer: FeatureCollection<Polygon | MultiPolygon> = {
      type: "FeatureCollection",
      features: [poly as never],
    };
    const r = ejOverlap(LNG, LAT, layer);
    expect(r.overlaps).toBe(true);
    expect(r.names).toContain("EJ test");
  });
});

 describe("complete empty official queries", () => {
  it("distinguishes no mapped features from an unavailable source", () => {
    const empty = { type: "FeatureCollection" as const, features: [] };
    expect(greenSpaceWithinRadius(LNG, LAT, 3, empty).dataAvailable).toBe(true);
    expect(schoolProximity(LNG, LAT, empty).dataAvailable).toBe(true);
    expect(ejOverlap(LNG, LAT, empty)).toEqual({ dataAvailable: true, overlaps: false, names: [] });
  });
});
