import { describe, expect, it } from "vitest";
import { assessZone } from "./zones";
import { DEFAULT_PROJECT, DEFAULT_WEIGHTS } from "@/lib/schemas";
import { DEFAULT_FINANCIAL, computeFinancial } from "./financial";
import { runSimulation } from "./orchestrator";
const geo = { greenSpace: null, schools: null, ej: null, floodDataAvailable: false };
const cost = { costPerMW: 2e6, incrementalMW: 20, developerFundedFraction: 1, households: 10000, amortizationYears: 20 };
function result(mw: number, availableCapacityMW: number | null) {
 return runSimulation({ site: null, project: { ...DEFAULT_PROJECT, peakFacilityMW: mw }, weights: DEFAULT_WEIGHTS, cost, geo,
 grid: { mode: "hypothetical", availableCapacityMW, existingLoadMW: 0, priorDataCenterMW: 0, portfolio: [], diversityFactor: 1 } });
}
describe("map screening classifications", () => {
 it("10 MW is green but 100 MW is red against the same explicit 50 MW scenario", () => {
   const finance = computeFinancial(DEFAULT_FINANCIAL, cost);
   expect(assessZone("grid", result(10, 50), geo, finance, DEFAULT_FINANCIAL).category).toBe("green");
   expect(assessZone("grid", result(100, 50), geo, finance, DEFAULT_FINANCIAL).category).toBe("red");
 });
 it("unknown capacity stays unknown, and zero entered capacity is a real constraint", () => {
   const finance = computeFinancial(DEFAULT_FINANCIAL, cost);
   expect(assessZone("grid", result(10, null), geo, finance, DEFAULT_FINANCIAL).category).toBe("unknown");
   expect(assessZone("grid", result(10, 0), geo, finance, DEFAULT_FINANCIAL).category).toBe("red");
 });
 it("does not hide an explicit capacity shortfall when geographic sources are unavailable", () => {
   const finance = computeFinancial(DEFAULT_FINANCIAL, cost);
   expect(assessZone("overall", result(100, 50), geo, finance, DEFAULT_FINANCIAL, true).category).toBe("red");
 });
 it("financial layers disclose municipality-level assumptions", () => {
   const finance = computeFinancial(DEFAULT_FINANCIAL, cost);
   expect(assessZone("energy", result(10, null), geo, finance, DEFAULT_FINANCIAL).unit).toBe("municipality");
   expect(assessZone("overall", result(10, null), geo, finance, DEFAULT_FINANCIAL).category).toBe("unknown");
 });
});
