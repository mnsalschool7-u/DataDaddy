import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeGrid, cumulativePeak } from "./grid";
import type { GridScenario } from "@/lib/schemas";

function scenario(overrides: Partial<GridScenario>): GridScenario {
  return {
    mode: "hypothetical",
    availableCapacityMW: 100,
    existingLoadMW: 0,
    priorDataCenterMW: 0,
    diversityFactor: 1,
    ...overrides,
  };
}

describe("computeGrid — integrity", () => {
  it("unknown capacity stays unknown (not 0, not unlimited)", () => {
    const r = computeGrid(scenario({ availableCapacityMW: null }), 40);
    expect(r.capacityKnown).toBe(false);
    expect(r.availableCapacityMW).toBeNull();
    expect(r.remainingCapacityMW).toBeNull();
    expect(r.shortfallMW).toBeNull();
    expect(r.statusMessage).toBe("Local available capacity unknown");
  });

  it("remaining = available - cumulative when known", () => {
    const r = computeGrid(scenario({ availableCapacityMW: 100 }), 40);
    expect(r.remainingCapacityMW).toBeCloseTo(60, 6);
    expect(r.exceeded).toBe(false);
    expect(r.shortfallMW).toBe(0);
  });

  it("flags exceeded with shortfall when demand > capacity", () => {
    const r = computeGrid(scenario({ availableCapacityMW: 30 }), 40);
    expect(r.exceeded).toBe(true);
    expect(r.shortfallMW).toBeCloseTo(10, 6);
    expect(r.statusMessage).toBe(
      "Capacity exceeded under current scenario assumptions",
    );
  });
});

describe("computeGrid — properties", () => {
  it("remaining capacity decreases as proposed demand increases", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 1000, noNaN: true }),
        fc.double({ min: 5, max: 200, noNaN: true }),
        fc.double({ min: 0, max: 200, noNaN: true }),
        (cap, base, delta) => {
          const a = computeGrid(scenario({ availableCapacityMW: cap }), base);
          const b = computeGrid(
            scenario({ availableCapacityMW: cap }),
            base + delta,
          );
          expect(b.remainingCapacityMW!).toBeLessThanOrEqual(
            a.remainingCapacityMW! + 1e-6,
          );
        },
      ),
    );
  });

  it("shortfall is never negative", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (cap, demand) => {
          const r = computeGrid(scenario({ availableCapacityMW: cap }), demand);
          expect(r.shortfallMW!).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it("cumulativePeak with diversity<=1 never exceeds raw sum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 200, noNaN: true }), { maxLength: 8 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (peaks, div) => {
          const raw = peaks.reduce((a, b) => a + b, 0);
          expect(cumulativePeak(peaks, div)).toBeLessThanOrEqual(raw + 1e-6);
        },
      ),
    );
  });
});
