import { z } from "zod";

/**
 * Runtime-validated schemas shared between UI state and API route handlers.
 * These are the authoritative input shapes for the pure model layer.
 */

export const ProjectType = z.enum([
  "enterprise",
  "hyperscale",
  "ai-compute",
  "university-research",
]);
export type ProjectType = z.infer<typeof ProjectType>;

export const CoolingTech = z.enum([
  "air",
  "water",
  "hybrid",
  "closed-loop-liquid",
]);
export type CoolingTech = z.infer<typeof CoolingTech>;

export const BatteryStorage = z.enum(["none", "moderate", "significant"]);
export type BatteryStorage = z.infer<typeof BatteryStorage>;

export const CleanEnergyStatus = z.enum([
  "supplied-assumption",
  "documented-procurement",
  "verification-unavailable",
]);
export type CleanEnergyStatus = z.infer<typeof CleanEnergyStatus>;

/** A single development phase (for phased projects). */
export const DevelopmentPhase = z.object({
  label: z.string(),
  peakMW: z.number().min(0).max(1000),
});
export type DevelopmentPhase = z.infer<typeof DevelopmentPhase>;

export const DataCenterProject = z.object({
  id: z.string(),
  projectType: ProjectType,
  isExpansion: z.boolean().default(false),
  /** Peak facility electrical demand, MW. Slider 5..200. */
  peakFacilityMW: z.number().min(5).max(200),
  /** Average utilization fraction 0.30..1.00. */
  utilization: z.number().min(0.3).max(1),
  /** Power Usage Effectiveness, illustrative default ~1.4. */
  pue: z.number().min(1).max(3),
  cooling: CoolingTech,
  /** Water Usage Effectiveness, liters per kWh of IT electricity. */
  wue: z.number().min(0).max(10),
  /** Clean-energy coverage fraction 0..1. */
  cleanEnergyCoverage: z.number().min(0).max(1),
  cleanEnergyStatus: CleanEnergyStatus,
  battery: BatteryStorage,
  /** Project footprint in acres (illustrative starting assumption). */
  footprintAcres: z.number().min(0).max(5000),
  /** Fraction of grid upgrades funded by the developer, 0..1 (default 1). */
  developerFundedFraction: z.number().min(0).max(1),
  phases: z.array(DevelopmentPhase).default([]),
});
export type DataCenterProject = z.infer<typeof DataCenterProject>;

export const Site = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  municipality: z.string().optional(),
  /** Analysis radius in miles: 1, 3, or 5. */
  radiusMiles: z.union([z.literal(1), z.literal(3), z.literal(5)]),
});
export type Site = z.infer<typeof Site>;

/** A previously-modeled hypothetical data center sharing the area (§7 cumulative). */
export const PortfolioFacility = z.object({
  id: z.string(),
  label: z.string(),
  peakMW: z.number().min(0).max(1000),
});
export type PortfolioFacility = z.infer<typeof PortfolioFacility>;

export const GridScenario = z.object({
  mode: z.enum(["public-screening", "hypothetical"]),
  /** User-supplied available capacity in MW. null => unknown (never defaulted). */
  availableCapacityMW: z.number().min(0).max(100000).nullable(),
  /** Existing assumed load in MW within the modeled area. */
  existingLoadMW: z.number().min(0).max(100000).default(0),
  /** Additional previously-modeled data center demand in MW (aggregate shortcut). */
  priorDataCenterMW: z.number().min(0).max(100000).default(0),
  /** Named cumulative data centers in the area (§7). */
  portfolio: z.array(PortfolioFacility).default([]),
  /** Diversity/coincidence factor applied to cumulative peak, 0..1. */
  diversityFactor: z.number().min(0).max(1).default(1),
});
export type GridScenario = z.infer<typeof GridScenario>;

export const CostInputs = z.object({
  costPerMW: z.number().min(0).max(100_000_000), // USD per MW of upgrade
  incrementalMW: z.number().min(0).max(100000),
  developerFundedFraction: z.number().min(0).max(1),
  households: z.number().int().min(1).max(100_000_000),
  amortizationYears: z.number().min(1).max(100),
});
export type CostInputs = z.infer<typeof CostInputs>;

export const ScoringWeights = z.object({
  landEnv: z.number().min(0).max(1),
  infraFit: z.number().min(0).max(1),
  community: z.number().min(0).max(1),
  resource: z.number().min(0).max(1),
  dataReadiness: z.number().min(0).max(1),
});
export type ScoringWeights = z.infer<typeof ScoringWeights>;

export const DEFAULT_WEIGHTS: ScoringWeights = {
  landEnv: 0.3,
  infraFit: 0.25,
  community: 0.2,
  resource: 0.15,
  dataReadiness: 0.1,
};

export const DEFAULT_PROJECT: DataCenterProject = {
  id: "project-default",
  projectType: "enterprise",
  isExpansion: false,
  peakFacilityMW: 40,
  utilization: 0.85,
  pue: 1.4,
  cooling: "hybrid",
  wue: 0.5,
  cleanEnergyCoverage: 0.3,
  cleanEnergyStatus: "supplied-assumption",
  battery: "none",
  footprintAcres: 50,
  developerFundedFraction: 1,
  phases: [],
};

/** Analyst API request payload. */
export const AnalystRequest = z.object({
  question: z.string().min(1).max(500),
  context: z.record(z.unknown()),
});
export type AnalystRequest = z.infer<typeof AnalystRequest>;
