import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeEnergy, computeCleanEnergy, HOURS_PER_YEAR } from "./energy";
import type { DataCenterProject } from "@/lib/schemas";
import { DEFAULT_PROJECT } from "@/lib/schemas";

function project(overrides: Partial<DataCenterProject>): DataCenterProject {
  return { ...DEFAULT_PROJECT, ...overrides };
}

describe("computeEnergy — known examples", () => {
  it("40 MW at 85% utilization = 297.84 GWh/yr (facility)", () => {
    const r = computeEnergy(project({ peakFacilityMW: 40, utilization: 0.85 }));
    expect(r.annualFacilityMWh).toBeCloseTo(297840, 3);
    expect(r.annualFacilityGWh).toBeCloseTo(297.84, 5);
  });

  it("IT energy = facility / PUE and overhead is the remainder", () => {
    const r = computeEnergy(
      project({ peakFacilityMW: 40, utilization: 0.85, pue: 1.4 }),
    );
    expect(r.annualItMWh).toBeCloseTo(297840 / 1.4, 3);
    expect(r.annualOverheadMWh).toBeCloseTo(
      r.annualFacilityMWh - r.annualItMWh,
      6,
    );
    expect(r.annualItMWh).toBeLessThan(r.annualFacilityMWh);
  });

  it("uses 8760 hours per year", () => {
    expect(HOURS_PER_YEAR).toBe(8760);
  });
});

const validProject = fc.record({
  peakFacilityMW: fc.double({ min: 5, max: 200, noNaN: true }),
  utilization: fc.double({ min: 0.3, max: 1, noNaN: true }),
  pue: fc.double({ min: 1, max: 3, noNaN: true }),
});

describe("computeEnergy — properties", () => {
  it("annual energy is never negative", () => {
    fc.assert(
      fc.property(validProject, (p) => {
        const r = computeEnergy(project(p));
        expect(r.annualFacilityMWh).toBeGreaterThanOrEqual(0);
        expect(r.annualItMWh).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("increasing MW cannot decrease annual energy (others fixed)", () => {
    fc.assert(
      fc.property(
        validProject,
        fc.double({ min: 0, max: 100, noNaN: true }),
        (p, delta) => {
          const base = computeEnergy(project(p));
          const more = computeEnergy(
            project({ ...p, peakFacilityMW: Math.min(200, p.peakFacilityMW + delta) }),
          );
          expect(more.annualFacilityMWh).toBeGreaterThanOrEqual(
            base.annualFacilityMWh - 1e-6,
          );
        },
      ),
    );
  });

  it("increasing utilization cannot decrease annual energy (others fixed)", () => {
    fc.assert(
      fc.property(
        validProject,
        fc.double({ min: 0, max: 0.7, noNaN: true }),
        (p, delta) => {
          const base = computeEnergy(project(p));
          const more = computeEnergy(
            project({ ...p, utilization: Math.min(1, p.utilization + delta) }),
          );
          expect(more.annualFacilityMWh).toBeGreaterThanOrEqual(
            base.annualFacilityMWh - 1e-6,
          );
        },
      ),
    );
  });
});

describe("computeCleanEnergy", () => {
  it("uncovered demand is never negative; covered+uncovered = requirement", () => {
    fc.assert(
      fc.property(
        validProject,
        fc.double({ min: 0, max: 1, noNaN: true }),
        (p, cov) => {
          const e = computeEnergy(project(p));
          const c = computeCleanEnergy(e, cov);
          expect(c.uncoveredMWh).toBeGreaterThanOrEqual(0);
          expect(c.suppliedMWh + c.uncoveredMWh).toBeCloseTo(c.requirementMWh, 3);
          expect(c.coveredFraction).toBeGreaterThanOrEqual(0);
          expect(c.coveredFraction).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it("30% coverage of 297.84 GWh leaves 208.488 GWh uncovered", () => {
    const e = computeEnergy(project({ peakFacilityMW: 40, utilization: 0.85 }));
    const c = computeCleanEnergy(e, 0.3);
    expect(c.uncoveredMWh).toBeCloseTo(297840 * 0.7, 3);
  });
});
