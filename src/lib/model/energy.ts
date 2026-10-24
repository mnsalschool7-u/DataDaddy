import type { DataCenterProject } from "@/lib/schemas";

export const HOURS_PER_YEAR = 8760;

export interface EnergyResult {
  /** Total facility annual electricity, MWh. */
  annualFacilityMWh: number;
  annualFacilityGWh: number;
  /**
   * IT-equipment annual electricity, MWh. Derived from facility energy via PUE.
   * facilityEnergy = itEnergy * PUE  =>  itEnergy = facilityEnergy / PUE.
   * Explicitly distinct from total facility demand.
   */
  annualItMWh: number;
  annualItGWh: number;
  /** Non-IT (cooling + overhead) annual electricity, MWh. */
  annualOverheadMWh: number;
}

/**
 * Deterministic annual electricity consumption.
 *
 *   annualFacilityMWh = peakFacilityMW * 8760 * utilization
 *
 * Example: 40 MW at 85% utilization => 40 * 8760 * 0.85 = 297,840 MWh = 297.84 GWh.
 */
export function computeEnergy(project: DataCenterProject): EnergyResult {
  const annualFacilityMWh =
    project.peakFacilityMW * HOURS_PER_YEAR * project.utilization;
  const annualItMWh = annualFacilityMWh / project.pue;
  const annualOverheadMWh = annualFacilityMWh - annualItMWh;

  return {
    annualFacilityMWh,
    annualFacilityGWh: annualFacilityMWh / 1000,
    annualItMWh,
    annualItGWh: annualItMWh / 1000,
    annualOverheadMWh,
  };
}

export interface CleanEnergyResult {
  requirementMWh: number;
  /** Assumed qualifying clean-energy supply, MWh. */
  suppliedMWh: number;
  /** Uncovered annual demand, MWh (never negative). */
  uncoveredMWh: number;
  coveredFraction: number; // 0..1
  /** Additional procurement that would be required to reach 100%, MWh. */
  additionalProcurementMWh: number;
}

/**
 * Clean-energy coverage against TOTAL facility demand.
 * Note: buying RECs is not asserted to satisfy incremental-generation
 * expectations — status is tracked separately on the project.
 */
export function computeCleanEnergy(
  energy: EnergyResult,
  coverageFraction: number,
): CleanEnergyResult {
  const requirementMWh = energy.annualFacilityMWh;
  const coveredFraction = Math.min(Math.max(coverageFraction, 0), 1);
  const suppliedMWh = requirementMWh * coveredFraction;
  const uncoveredMWh = Math.max(0, requirementMWh - suppliedMWh);
  return {
    requirementMWh,
    suppliedMWh,
    uncoveredMWh,
    coveredFraction,
    additionalProcurementMWh: uncoveredMWh,
  };
}
