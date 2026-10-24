import { DEFAULT_PROJECT, type DataCenterProject } from "@/lib/schemas";
import { computeEnergy } from "./energy";
import { computeWater, COOLING_WUE_DEFAULTS } from "./water";
import { computeCleanEnergy } from "./energy";
import { exceedsEo658Threshold } from "@/lib/policy/eo658";

/**
 * Tradeoff analysis (§8.3). Compares development alternatives and surfaces which
 * MODELED factors change and which remain UNCERTAIN — never labels an option
 * objectively good or bad; the point is competing consequences.
 */

export interface TradeoffOption {
  id: string;
  label: string;
  description: string;
  project: DataCenterProject;
}

export interface TradeoffMetrics {
  id: string;
  label: string;
  annualGWh: number;
  waterMillionLiters: number;
  cleanCoveredPct: number;
  eo658Triggered: boolean;
  /** Factors that remain uncertain for this option regardless of inputs. */
  uncertain: string[];
}

export const TRADEOFF_OPTIONS: TradeoffOption[] = [
  {
    id: "small-industrial",
    label: "Smaller near industrial uses",
    description: "25 MW facility sited by existing industrial land; lower new infrastructure.",
    project: { ...DEFAULT_PROJECT, id: "to-a", peakFacilityMW: 25, cooling: "hybrid", wue: COOLING_WUE_DEFAULTS.hybrid, cleanEnergyCoverage: 0.3, pue: 1.4 },
  },
  {
    id: "large-new-infra",
    label: "Larger requiring new infrastructure",
    description: "90 MW facility requiring assumed new grid/water infrastructure.",
    project: { ...DEFAULT_PROJECT, id: "to-b", peakFacilityMW: 90, cooling: "water", wue: COOLING_WUE_DEFAULTS.water, cleanEnergyCoverage: 0.2, pue: 1.5 },
  },
  {
    id: "developer-clean",
    label: "Developer-funded clean energy",
    description: "Same demand, high developer-funded clean-energy coverage.",
    project: { ...DEFAULT_PROJECT, id: "to-c", peakFacilityMW: 40, cooling: "hybrid", wue: COOLING_WUE_DEFAULTS.hybrid, cleanEnergyCoverage: 0.8, cleanEnergyStatus: "documented-procurement", pue: 1.3, developerFundedFraction: 1 },
  },
  {
    id: "low-water-landlight",
    label: "Low-water, land-light cooling",
    description: "Closed-loop liquid cooling, smaller footprint.",
    project: { ...DEFAULT_PROJECT, id: "to-d", peakFacilityMW: 40, cooling: "closed-loop-liquid", wue: COOLING_WUE_DEFAULTS["closed-loop-liquid"], cleanEnergyCoverage: 0.4, pue: 1.3, footprintAcres: 25 },
  },
];

export function evaluateTradeoff(option: TradeoffOption): TradeoffMetrics {
  const e = computeEnergy(option.project);
  const clean = computeCleanEnergy(e, option.project.cleanEnergyCoverage);
  const water = computeWater(e, option.project.wue);
  const uncertain: string[] = [
    "Local available grid capacity (unknown without utility data)",
    "Actual household cost allocation (depends on approved methodology)",
  ];
  if (option.project.cleanEnergyStatus !== "documented-procurement")
    uncertain.push("Whether clean-energy coverage is documented/incremental");
  return {
    id: option.id,
    label: option.label,
    annualGWh: e.annualFacilityGWh,
    waterMillionLiters: water.annualWaterLiters / 1_000_000,
    cleanCoveredPct: clean.coveredFraction * 100,
    eo658Triggered: exceedsEo658Threshold(option.project.peakFacilityMW),
    uncertain,
  };
}
