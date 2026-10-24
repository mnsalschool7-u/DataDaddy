import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { scoreSite, type ComponentInput } from "./scoring";
import { DEFAULT_WEIGHTS, type ScoringWeights } from "@/lib/schemas";

const KEYS: (keyof ScoringWeights)[] = [
  "landEnv",
  "infraFit",
  "community",
  "resource",
  "dataReadiness",
];

function comps(scores: (number | null)[]): ComponentInput[] {
  return KEYS.map((key, i) => ({
    key,
    label: key,
    score: scores[i],
    reason: "test",
  }));
}

describe("scoreSite — bounds & integrity", () => {
  it("score stays within [0,100]", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.constant(null), fc.double({ min: 0, max: 100, noNaN: true })),
          { minLength: 5, maxLength: 5 },
        ),
        (scores) => {
          const a = scoreSite(comps(scores as (number | null)[]), DEFAULT_WEIGHTS);
          expect(a.screeningScore).toBeGreaterThanOrEqual(0);
          expect(a.screeningScore).toBeLessThanOrEqual(100);
          expect(a.evidenceCoverage).toBeGreaterThanOrEqual(0);
          expect(a.evidenceCoverage).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it("missing data lowers evidence coverage, never invents a favorable score", () => {
    const allKnown = scoreSite(comps([80, 80, 80, 80, 80]), DEFAULT_WEIGHTS);
    expect(allKnown.evidenceCoverage).toBeCloseTo(1, 6);

    // Infra unknown: coverage drops; infra component excluded (not scored 100).
    const infraUnknown = scoreSite(comps([80, null, 80, 80, 80]), DEFAULT_WEIGHTS);
    expect(infraUnknown.evidenceCoverage).toBeLessThan(1);
    const infra = infraUnknown.components.find((c) => c.key === "infraFit")!;
    expect(infra.included).toBe(false);
    expect(infra.contribution).toBe(0);
    // With all known components equal to 80, score remains 80 (weighted over included mass).
    expect(infraUnknown.screeningScore).toBeCloseTo(80, 6);
  });

  it("all unknown => zero coverage and zero score (never a default pass)", () => {
    const a = scoreSite(comps([null, null, null, null, null]), DEFAULT_WEIGHTS);
    expect(a.evidenceCoverage).toBe(0);
    expect(a.screeningScore).toBe(0);
    expect(a.missingInfo.length).toBe(5);
  });

  it("hard exclusion is preserved alongside the numeric score", () => {
    const a = scoreSite(comps([90, 90, 90, 90, 90]), DEFAULT_WEIGHTS, {
      hardExclusion: "Documented regulatory exclusion",
    });
    expect(a.hardExclusion).toBe("Documented regulatory exclusion");
  });

  it("caps constraints/advantages to top three", () => {
    const a = scoreSite(comps([50, 50, 50, 50, 50]), DEFAULT_WEIGHTS, {
      constraints: ["a", "b", "c", "d"],
      advantages: ["w", "x", "y", "z"],
    });
    expect(a.constraints).toHaveLength(3);
    expect(a.advantages).toHaveLength(3);
  });
});
