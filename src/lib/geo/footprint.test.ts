import { describe, expect, it } from "vitest";
import { area } from "@turf/turf";
import { facilityFootprint } from "./footprint";
describe("conceptual facility footprint", () => {
 it("preserves requested acreage on the Massachusetts map", () => {
   for (const acres of [1, 50, 500]) expect(area(facilityFootprint(-71.3162, 42.6334, acres)) / 4046.8564224).toBeCloseTo(acres, 1);
 });
});
