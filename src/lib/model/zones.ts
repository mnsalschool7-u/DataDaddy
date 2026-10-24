import type { SimulationResult, GeoContext } from "./orchestrator";
import type { FinancialResult, FinancialInputs } from "./financial";
export const OVERLAYS = {
  overall: "Overall development suitability", environment: "Environmental suitability", grid: "Grid capacity scenario",
  energy: "Household energy cost exposure", housing: "Housing affordability", burden: "Community financial burden", land: "Green space and land use",
} as const;
export type OverlayMode = keyof typeof OVERLAYS;
export const ZONE_COLORS = { green: "#34d399", yellow: "#fbbf24", red: "#f87171", unknown: "#64748b", excluded: "#475569" };
export interface ZoneAssessment { category: keyof typeof ZONE_COLORS; label: string; reasons: string[]; legend: string; unit: "site radius" | "municipality" }
export function assessZone(mode: OverlayMode, result: SimulationResult, geo: GeoContext, f: FinancialResult, input: FinancialInputs, loading = false): ZoneAssessment {
  const financial = ["energy", "housing", "burden"].includes(mode);
  const unit = financial ? "municipality" : "site radius";
  const unknown = (reason: string): ZoneAssessment => ({ category: "unknown", label: "Insufficient data", reasons: [reason], legend: "Hatching = insufficient evidence; grey exclusion is reserved for documented restrictions", unit });
  if (loading && !financial && mode !== "grid") return unknown("Official geographic evidence is still loading");
  let category: ZoneAssessment["category"] = "green";
  const reasons: string[] = [];
  let legend = "Green ≥66, yellow 40–65, red <40 screening points; known capacity shortfall overrides to red";
  if (mode === "grid") {
    if (!result.grid.capacityKnown) return unknown("Local utility capacity unknown. Enter a hypothetical capacity to evaluate this scenario.");
    category = result.grid.exceeded ? "red" : (result.grid.remainingCapacityMW ?? 0) < result.grid.cumulativeProposedMW * 0.2 ? "yellow" : "green";
    reasons.push(`User-supplied capacity ${result.grid.availableCapacityMW} MW; cumulative modeled draw ${result.grid.cumulativeProposedMW.toFixed(1)} MW; shortfall ${(result.grid.shortfallMW ?? 0).toFixed(1)} MW. This is not verified utility headroom.`);
    legend = "Green ≥20% of modeled demand remains; yellow <20%; red demand exceeds entered capacity";
  } else if (mode === "energy") {
    category = f.monthlyUpgradeExposure > 20 ? "red" : f.monthlyUpgradeExposure > 5 ? "yellow" : "green";
    reasons.push(`Hypothetical household upgrade exposure $${f.monthlyUpgradeExposure.toFixed(2)}/month; assumed baseline $${input.baselineElectricity}/month. Same assumptions apply to this selected municipality; no street-level tariff model.`);
    legend = "Monthly upgrade exposure: green ≤$5; yellow $5–$20; red >$20; user assumptions";
  } else if (mode === "housing") {
    const ratio = f.modeledRent * 12 / input.annualIncome;
    category = ratio > 0.5 ? "red" : ratio > 0.3 ? "yellow" : "green";
    reasons.push(`Scenario rent is ${(ratio * 100).toFixed(1)}% of entered household income; rent sensitivity ${input.rentChangePct}%. This is not a prediction of data-center-caused rent changes.`);
    legend = "Rent / entered income: green ≤30%; yellow 30–50%; red >50% (product-defined thresholds)";
  } else if (mode === "burden") {
    const ratio = f.annualDifference / input.annualIncome;
    category = ratio > 0.05 ? "red" : ratio > 0.01 ? "yellow" : "green";
    reasons.push(`Combined hypothetical expense change $${f.monthlyDifference.toFixed(2)}/month (${(ratio * 100).toFixed(2)}% of income annually). Includes rent sensitivity, separate rate-change assumption and upgrade allocation.`);
    legend = "Additional annual expense / income: green ≤1%; yellow 1–5%; red >5%; assumptions only";
  } else if (mode === "environment" || mode === "land") {
    if (!geo.greenSpace?.dataAvailable) return unknown("Protected open-space layer unavailable here");
    const coverage = geo.greenSpace.coveragePercent;
    category = coverage > 25 ? "red" : coverage > 10 || geo.ej?.overlaps ? "yellow" : "green";
    reasons.push(`${coverage.toFixed(1)}% mapped protected/recreational open space within selected radius; ${geo.schools?.dataAvailable ? geo.schools.within1Mile : "unknown"} schools within one mile; EJ ${geo.ej?.dataAvailable ? geo.ej.overlaps ? "overlap" : "no overlap" : "unknown"}. Proximity does not imply illegality.`);
    legend = "Open-space coverage: green ≤10%; yellow 10–25% or EJ overlap; red >25%; preliminary sensitivity";
  } else {
    if (!geo.greenSpace?.dataAvailable && !geo.schools?.dataAvailable && !geo.ej?.dataAvailable) return unknown("No usable geographic evidence for a site screening");
    category = result.grid.exceeded || f.annualDifference / input.annualIncome > 0.05 ? "red" : result.assessment.screeningScore >= 66 ? "green" : result.assessment.screeningScore >= 40 ? "yellow" : "red";
    reasons.push(`Screening score ${result.assessment.screeningScore.toFixed(1)}/100; evidence coverage ${(result.assessment.evidenceCoverage * 100).toFixed(0)}%.`, ...result.assessment.constraints);
    if (result.grid.exceeded) reasons.push(`Entered capacity exceeded by ${result.grid.shortfallMW?.toFixed(1)} MW.`);
    if (!result.grid.capacityKnown) reasons.push("Local utility headroom is unknown, not implicitly unlimited.");
  }
  return { category, label: category === "green" ? "Relatively favorable under this model" : category === "yellow" ? "Moderate modeled constraints" : "Significant modeled constraints", reasons, legend, unit };
}
