import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeWater, COOLING_WUE_DEFAULTS } from "./water";
import { computeEnergy } from "./energy";
import { DEFAULT_PROJECT } from "@/lib/schemas";

const energy40 = computeEnergy({
  ...DEFAULT_PROJECT,
  peakFacilityMW: 40,
  utilization: 0.85,
  pue: 1.4,
});

describe("computeWater — units", () => {
  it("liters = IT kWh * WUE; m^3 = liters/1000; daily = annual/365", () => {
    const wue = 0.5;
    const r = computeWater(energy40, wue);
    const itKWh = energy40.annualItMWh * 1000;
    expect(r.annualWaterLiters).toBeCloseTo(itKWh * wue, 3);
    expect(r.annualWaterCubicMeters).toBeCloseTo(r.annualWaterLiters / 1000, 6);
    expect(r.dailyAverageLiters).toBeCloseTo(r.annualWaterLiters / 365, 6);
  });
});

describe("computeWater — properties", () => {
  it("water scales linearly and is never negative", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 10, noNaN: true }), (wue) => {
        const r = computeWater(energy40, wue);
        expect(r.annualWaterLiters).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("higher WUE never yields less water", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 5, noNaN: true }),
        fc.double({ min: 0, max: 5, noNaN: true }),
        (a, b) => {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          expect(computeWater(energy40, hi).annualWaterLiters).toBeGreaterThanOrEqual(
            computeWater(energy40, lo).annualWaterLiters - 1e-6,
          );
        },
      ),
    );
  });

  it("water-based cooling default is the most water-intensive profile", () => {
    const vals = Object.values(COOLING_WUE_DEFAULTS);
    expect(COOLING_WUE_DEFAULTS.water).toBe(Math.max(...vals));
  });
});
