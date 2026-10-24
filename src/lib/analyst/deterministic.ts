import type { AnalystContext } from "./context";
import { fmt } from "@/lib/format";

export interface AnalystAnswer {
  conclusion: string;
  supportingNumbers: string[];
  geographicEvidence: string[];
  regulatory: string[];
  uncertainty: string[];
  inputsToChange: string[];
  mode: "deterministic" | "llm";
}

/**
 * Deterministic, grounded explanation generator. Used when no LLM key is
 * configured so the demo always works. It only references values present in the
 * provided context and never invents grid headroom, permits, rates, or impacts.
 */
export function deterministicAnswer(
  question: string,
  ctx: AnalystContext,
): AnalystAnswer {
  const q = question.toLowerCase();
  const o = ctx.outputs;
  const gs = ctx.geo.greenSpace;
  const sc = ctx.geo.schools;

  const supportingNumbers = [
    `Annual facility electricity: ${fmt(o.annualFacilityGWh, 2)} GWh (calculated).`,
    `IT electricity via PUE ${fmt(ctx.project.pue, 2)}: ${fmt(o.annualItGWh, 2)} GWh.`,
    `Clean-energy coverage assumption: ${fmt(o.cleanCoveredPct, 0)}%; uncovered ${fmt(o.uncoveredGWh, 2)} GWh.`,
    `Modeled annual water use: ${fmt(o.annualWaterLiters, 0)} L (estimate).`,
    `Screening score: ${fmt(o.screeningScore, 0)} / 100 at ${fmt(o.evidenceCoverage * 100, 0)}% evidence coverage.`,
  ];

  if (ctx.financial) supportingNumbers.push(
    `Hypothetical monthly upgrade exposure: $${fmt(ctx.financial.monthlyUpgradeExposure, 2)}; rent sensitivity difference: $${fmt(ctx.financial.rentDelta, 2)}/month. These are editable assumptions, not causal forecasts.`,
    `Combined housing and energy: $${fmt(ctx.financial.combinedMonthly, 2)}/month (${fmt(ctx.financial.incomeShare * 100, 1)}% of entered annual household income).`,
    `Municipal annual fiscal sensitivity: $${fmt(ctx.financial.annualMunicipalNet, 0)} net after modeled public costs, not confirmed revenue.`,
  );
  const geographicEvidence: string[] = [];
  if (gs?.dataAvailable)
    geographicEvidence.push(
      `Mapped open space covers ${fmt(gs.coveragePercent, 1)}% of the ${gs.radiusMiles}-mile analysis area (${fmt(gs.openSpaceAcres, 0)} acres).`,
    );
  if (sc?.dataAvailable)
    geographicEvidence.push(
      `${sc.within1Mile} mapped school(s) within 1 mile; nearest ${sc.nearestDistanceMiles != null ? fmt(sc.nearestDistanceMiles, 2) + " mi" : "unknown"}.`,
    );
  if (ctx.geo.ej?.dataAvailable)
    geographicEvidence.push(
      ctx.geo.ej.overlaps
        ? `Location falls within a mapped Environmental Justice block group.`
        : `No EJ overlap at the selected point in the official designated block-group layer.`,
    );

  const regulatory: string[] = [];
  if (o.thresholdExceeded)
    regulatory.push(
      `At ${fmt(o.peakMW, 0)} MW the project is above EO 658's >25 MW threshold; several requirements are potentially applicable.`,
    );
  else if (o.peakMW === 25)
    regulatory.push(`At exactly 25 MW the >25 MW threshold is not automatically met; more information required.`);
  else
    regulatory.push(`At ${fmt(o.peakMW, 0)} MW the project is below EO 658's >25 MW threshold under current assumptions.`);
  regulatory.push(`Some EO 658 implementation guidance remains under development (not finalized regulation).`);

  const uncertainty = ctx.unknowns.length
    ? ctx.unknowns.map((u) => `${u}: unknown / not defaulted.`)
    : ["No major data gaps flagged for this scenario."];

  const inputsToChange: string[] = [
    "Peak facility demand (MW) — drives energy, water, and EO 658 threshold.",
    "Clean-energy coverage — closes the uncovered demand gap.",
    "Cooling technology / WUE — changes modeled water use.",
    "Available grid capacity — resolves the unknown capacity status.",
  ];

  // Tailor the conclusion to the question.
  let conclusion: string;
  if (q.includes("water") || q.includes("sustainab")) {
    conclusion = `Modeled annual water use is about ${fmt(o.annualWaterLiters / 1_000_000, 2)} million liters, driven by the ${ctx.project.cooling} cooling assumption (WUE ${fmt(ctx.project.wue, 2)} L/kWh IT). Lower-WUE cooling and higher clean-energy coverage are the main sustainability levers here.`;
  } else if (q.includes("25") || q.includes("60") || q.includes("reduce") || q.includes("mw")) {
    conclusion = `Annual facility electricity scales linearly with peak MW and utilization. At ${fmt(o.peakMW, 0)} MW the facility draws ${fmt(o.annualFacilityGWh, 2)} GWh/yr; reducing peak demand lowers energy, water, and can move the project below EO 658's >25 MW threshold.`;
  } else if (q.includes("constrain") || q.includes("why")) {
    conclusion = `This location's screening reflects observed factors only: score ${fmt(o.screeningScore, 0)}/100 at ${fmt(o.evidenceCoverage * 100, 0)}% evidence coverage. ${ctx.unknowns.length ? "Unknown inputs lower confidence rather than inflating the score." : "Most inputs were available."}`;
  } else if (q.includes("regulat") || q.includes("policy") || q.includes("rule")) {
    conclusion = o.thresholdExceeded
      ? `At ${fmt(o.peakMW, 0)} MW, EO 658's large-project scope is potentially applicable; review clean-electricity procurement, water, ratepayer cost allocation, community benefits, and reporting.`
      : `At ${fmt(o.peakMW, 0)} MW, EO 658's large-project scope is not clearly triggered; verify final peak demand and any aggregation or expansion rules.`;
  } else {
    conclusion = `For the current ${fmt(o.peakMW, 0)} MW ${ctx.project.projectType} scenario, facility demand is ${fmt(o.annualFacilityGWh, 2)} GWh/yr with a screening score of ${fmt(o.screeningScore, 0)}/100. The biggest modeled levers are peak demand, clean-energy coverage, and cooling choice.`;
  }

  return {
    conclusion,
    supportingNumbers,
    geographicEvidence: geographicEvidence.length
      ? geographicEvidence
      : ["No geographic layers available at this location in the current build."],
    regulatory,
    uncertainty,
    inputsToChange,
    mode: "deterministic",
  };
}

export const SUGGESTED_QUESTIONS = [
  "Why is this area classified the way it is?",
  "What changes if I reduce facility demand from 60 MW to 25 MW?",
  "What Massachusetts rules should a 35 MW university facility investigate?",
  "Which assumptions have the biggest influence on this simulation?",
  "What could make this site more sustainable?",
];
