import type { SimulationResult } from "@/lib/model/orchestrator";
import type { DataCenterProject, GridScenario, Site } from "@/lib/schemas";
import type { GeoContext } from "@/lib/model/orchestrator";

/**
 * Structured context handed to the analyst (deterministic generator or LLM).
 * It carries ONLY computed outputs + known inputs + source metadata — the
 * analyst must ground its answer in this and never invent unavailable values.
 */
export interface AnalystContext {
  site: Site | null;
  project: DataCenterProject;
  grid: GridScenario;
  geo: GeoContext;
  outputs: {
    annualFacilityGWh: number;
    annualItGWh: number;
    cleanCoveredPct: number;
    uncoveredGWh: number;
    annualWaterLiters: number;
    gridStatus: string;
    gridCapacityKnown: boolean;
    remainingMW: number | null;
    shortfallMW: number | null;
    screeningScore: number;
    evidenceCoverage: number;
    thresholdExceeded: boolean;
    peakMW: number;
  };
  unknowns: string[];
}

export function buildAnalystContext(
  site: Site | null,
  project: DataCenterProject,
  grid: GridScenario,
  geo: GeoContext,
  result: SimulationResult,
): AnalystContext {
  const unknowns: string[] = [];
  if (!result.grid.capacityKnown) unknowns.push("Local available grid capacity");
  if (!geo.greenSpace?.dataAvailable) unknowns.push("Open-space coverage at this location");
  if (!geo.schools?.dataAvailable) unknowns.push("School proximity at this location");
  if (!geo.ej?.dataAvailable) unknowns.push("Environmental justice overlap");
  if (!geo.floodDataAvailable) unknowns.push("Flood hazard exposure");

  return {
    site,
    project,
    grid,
    geo,
    outputs: {
      annualFacilityGWh: result.energy.annualFacilityGWh,
      annualItGWh: result.energy.annualItGWh,
      cleanCoveredPct: result.cleanEnergy.coveredFraction * 100,
      uncoveredGWh: result.cleanEnergy.uncoveredMWh / 1000,
      annualWaterLiters: result.water.annualWaterLiters,
      gridStatus: result.grid.statusMessage,
      gridCapacityKnown: result.grid.capacityKnown,
      remainingMW: result.grid.remainingCapacityMW,
      shortfallMW: result.grid.shortfallMW,
      screeningScore: result.assessment.screeningScore,
      evidenceCoverage: result.assessment.evidenceCoverage,
      thresholdExceeded: result.policy.thresholdExceeded,
      peakMW: result.policy.peakMW,
    },
    unknowns,
  };
}
