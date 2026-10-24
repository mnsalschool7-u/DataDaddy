import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeCost } from "./cost";

describe("computeCost", () => {
  it("full developer funding => zero non-developer allocation and exposure", () => {
    const r = computeCost({
      costPerMW: 2_000_000,
      incrementalMW: 20,
      developerFundedFraction: 1,
      households: 100_000,
      amortizationYears: 20,
    });
    expect(r.totalUpgradeCost).toBe(40_000_000);
    expect(r.nonDeveloperAllocatedCost).toBe(0);
    expect(r.annualHouseholdExposure).toBe(0);
  });

  it("household exposure = nonDev / (households * years)", () => {
    const r = computeCost({
      costPerMW: 2_000_000,
      incrementalMW: 20,
      developerFundedFraction: 0.5,
      households: 100_000,
      amortizationYears: 20,
    });
    expect(r.nonDeveloperAllocatedCost).toBe(20_000_000);
    expect(r.annualHouseholdExposure).toBeCloseTo(20_000_000 / (100_000 * 20), 6);
  });

  it("property: non-developer allocation in [0, total]; exposure >= 0", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 5_000_000, noNaN: true }),
        fc.double({ min: 0, max: 200, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.double({ min: 1, max: 50, noNaN: true }),
        (costPerMW, incrementalMW, dev, households, years) => {
          const r = computeCost({
            costPerMW,
            incrementalMW,
            developerFundedFraction: dev,
            households,
            amortizationYears: years,
          });
          expect(r.nonDeveloperAllocatedCost).toBeGreaterThanOrEqual(-1e-6);
          expect(r.nonDeveloperAllocatedCost).toBeLessThanOrEqual(
            r.totalUpgradeCost + 1e-6,
          );
          expect(r.annualHouseholdExposure).toBeGreaterThanOrEqual(-1e-6);
        },
      ),
    );
  });
});
