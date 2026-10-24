import { describe, it, expect } from "vitest";
import { TRADEOFF_OPTIONS, evaluateTradeoff } from "./tradeoff";

describe("tradeoff analysis", () => {
  it("evaluates all built-in options with non-negative metrics", () => {
    for (const opt of TRADEOFF_OPTIONS) {
      const m = evaluateTradeoff(opt);
      expect(m.annualGWh).toBeGreaterThanOrEqual(0);
      expect(m.waterMillionLiters).toBeGreaterThanOrEqual(0);
      expect(m.cleanCoveredPct).toBeGreaterThanOrEqual(0);
      expect(m.cleanCoveredPct).toBeLessThanOrEqual(100);
      expect(m.uncertain.length).toBeGreaterThan(0);
    }
  });

  it("the 90 MW option triggers EO 658; the 25 MW option does not", () => {
    const large = evaluateTradeoff(TRADEOFF_OPTIONS.find((o) => o.id === "large-new-infra")!);
    const small = evaluateTradeoff(TRADEOFF_OPTIONS.find((o) => o.id === "small-industrial")!);
    expect(large.eo658Triggered).toBe(true);
    expect(small.eo658Triggered).toBe(false);
  });

  it("low-water option uses less water than the water-cooled large option", () => {
    const lowWater = evaluateTradeoff(TRADEOFF_OPTIONS.find((o) => o.id === "low-water-landlight")!);
    const waterHeavy = evaluateTradeoff(TRADEOFF_OPTIONS.find((o) => o.id === "large-new-infra")!);
    expect(lowWater.waterMillionLiters).toBeLessThan(waterHeavy.waterMillionLiters);
  });

  it("documented-procurement option drops the 'undocumented clean energy' uncertainty", () => {
    const clean = evaluateTradeoff(TRADEOFF_OPTIONS.find((o) => o.id === "developer-clean")!);
    expect(clean.uncertain.some((u) => u.includes("documented/incremental"))).toBe(false);
  });
});
