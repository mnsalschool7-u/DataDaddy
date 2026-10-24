import type { CostInputs } from "@/lib/schemas";

export interface CostResult {
  totalUpgradeCost: number;
  developerFundedCost: number;
  nonDeveloperAllocatedCost: number;
  /**
   * Illustrative per-household annual exposure. This is a SIMPLIFIED financial
   * sensitivity figure, NOT a forecast of actual bills or approved utility rates.
   *   annualHouseholdExposure = nonDeveloperAllocated / (households * years)
   */
  annualHouseholdExposure: number;
  /** For comparison: exposure if developer funds 100%. Always 0. */
  fullDeveloperFundingExposure: number;
}

export function computeCost(inputs: CostInputs): CostResult {
  const totalUpgradeCost = inputs.costPerMW * inputs.incrementalMW;
  const developerFundedCost = totalUpgradeCost * inputs.developerFundedFraction;
  const nonDeveloperAllocatedCost = totalUpgradeCost - developerFundedCost;
  const annualHouseholdExposure =
    nonDeveloperAllocatedCost / (inputs.households * inputs.amortizationYears);

  return {
    totalUpgradeCost,
    developerFundedCost,
    nonDeveloperAllocatedCost,
    annualHouseholdExposure,
    fullDeveloperFundingExposure: 0,
  };
}
