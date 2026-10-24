import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluatePolicy, exceedsEo658Threshold, taxExemptionInfo } from "./eo658";
import { DEFAULT_PROJECT } from "@/lib/schemas";

function at(mw: number, overrides = {}) {
  return evaluatePolicy({ ...DEFAULT_PROJECT, peakFacilityMW: mw, ...overrides });
}

describe("EO 658 threshold logic", () => {
  it("20 MW is below the >25 MW threshold", () => {
    expect(exceedsEo658Threshold(20)).toBe(false);
    expect(at(20).thresholdExceeded).toBe(false);
  });

  it("25 MW does NOT automatically exceed the threshold", () => {
    expect(exceedsEo658Threshold(25)).toBe(false);
    const ev = at(25);
    expect(ev.thresholdExceeded).toBe(false);
    const scope = ev.findings.find((f) => f.ruleId === "eo658-scope")!;
    expect(scope.status).toBe("more-info-required");
  });

  it("30 MW is above the threshold", () => {
    expect(exceedsEo658Threshold(30)).toBe(true);
    expect(at(30).thresholdExceeded).toBe(true);
  });

  it("property: exactly 25 MW never flagged as exceeding", () => {
    fc.assert(
      fc.property(fc.constant(25), (mw) => {
        expect(exceedsEo658Threshold(mw)).toBe(false);
      }),
    );
  });

  it("property: exceeds iff strictly > 25", () => {
    fc.assert(
      fc.property(fc.double({ min: 5, max: 200, noNaN: true }), (mw) => {
        expect(exceedsEo658Threshold(mw)).toBe(mw > 25);
      }),
    );
  });
});

describe("EO 658 findings", () => {
  it("always includes a 'guidance under development' caveat", () => {
    const ev = at(40);
    expect(
      ev.findings.some((f) => f.status === "guidance-under-development"),
    ).toBe(true);
  });

  it("university research surfaces an exemption pathway", () => {
    const ev = at(40, { projectType: "university-research" });
    expect(ev.findings.some((f) => f.ruleId === "eo658-university-exemption")).toBe(
      true,
    );
  });

  it("expansion adds a separate applicability finding", () => {
    const ev = at(10, { isExpansion: true });
    expect(ev.findings.some((f) => f.ruleId === "eo658-expansion")).toBe(true);
  });
});

describe("tax exemption is separate from EO 658", () => {
  it("references the QDC tax exemption source, not EO 658", () => {
    expect(taxExemptionInfo().sourceId).toBe("qdc-tax-exemption");
  });
});
