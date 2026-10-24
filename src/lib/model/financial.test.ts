import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DEFAULT_FINANCIAL, FinancialInputs, computeFinancial, annualRecoveryFactor } from "./financial";
const cost = { costPerMW: 2000000, incrementalMW: 20, developerFundedFraction: 0.5, households: 10000, amortizationYears: 20 };
describe("household and institutional financial sensitivities", () => {
  it("calculates rent changes with neutral and negative sensitivities", () => {
    expect(computeFinancial({ ...DEFAULT_FINANCIAL, rentChangePct: 3 }, cost).modeledRent).toBe(2266);
    expect(computeFinancial({ ...DEFAULT_FINANCIAL, rentChangePct: -3 }, cost).modeledRent).toBe(2134);
    expect(computeFinancial(DEFAULT_FINANCIAL, cost).rentDelta).toBe(0);
  });
  it("allocates principal without double counting, and full developer funding removes upgrade exposure", () => {
    const r = computeFinancial(DEFAULT_FINANCIAL, cost);
    expect(r.annualRecovery).toBe(1000000);
    expect(r.monthlyUpgradeExposure).toBeCloseTo(700000 / 10000 / 12);
    expect(r.businessAnnualExposure * DEFAULT_FINANCIAL.businessCount + r.schoolAnnualExposure * DEFAULT_FINANCIAL.schoolCount + r.monthlyUpgradeExposure * 12 * cost.households).toBeCloseTo(r.annualRecovery);
    expect(computeFinancial(DEFAULT_FINANCIAL, { ...cost, developerFundedFraction: 1 }).monthlyUpgradeExposure).toBe(0);
  });
  it("uses a zero-interest limit and level payment financing", () => {
    expect(annualRecoveryFactor(0, 20)).toBe(0.05);
    expect(annualRecoveryFactor(0.05, 20)).toBeCloseTo(0.080242587);
    expect(annualRecoveryFactor(1e-20, 20)).toBeCloseTo(0.05);
  });
  it("does not allow allocations beyond the remaining project principal", () => {
    expect(FinancialInputs.safeParse({ ...DEFAULT_FINANCIAL, householdAllocation: 1, businessAllocation: 1 }).success).toBe(false);
  });
  it("separates gross municipal revenue from expenses and benefits", () => {
    const r = computeFinancial(DEFAULT_FINANCIAL, cost);
    expect(r.annualPropertyTax).toBe(3000000);
    expect(r.annualMunicipalNet).toBe(2250000);
    expect(r.combinedAnnual).toBeCloseTo(r.combinedMonthly * 12);
  });
  it("higher developer funding cannot increase household upgrade exposure", () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (a,b) => {
      const lower = computeFinancial(DEFAULT_FINANCIAL, { ...cost, developerFundedFraction: Math.min(a,b) });
      const higher = computeFinancial(DEFAULT_FINANCIAL, { ...cost, developerFundedFraction: Math.max(a,b) });
      expect(higher.monthlyUpgradeExposure).toBeLessThanOrEqual(lower.monthlyUpgradeExposure + 1e-9);
    }));
  });
});
