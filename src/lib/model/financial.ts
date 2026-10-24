import { z } from "zod";
import { CostInputs, type DataCenterProject } from "@/lib/schemas";
import { computeEnergy } from "./energy";
import { computeWater } from "./water";

const money = z.number().finite().min(0).max(1e12);
export const FinancialInputs = z.object({
  baselineRent: money.default(2200), baselineElectricity: money.default(180),
  annualIncome: z.number().finite().min(1).max(1e9).default(72000),
  householdSize: z.number().int().min(1).max(30).default(3),
  rentChangePct: z.number().min(-50).max(100).default(0),
  interestRate: z.number().min(0).max(0.25).default(0),
  householdAllocation: z.number().min(0).max(1).default(0.7),
  businessAllocation: z.number().min(0).max(1).default(0.2),
  schoolAllocation: z.number().min(0).max(1).default(0.1),
  businessCount: z.number().int().min(1).max(1e7).default(1000),
  schoolCount: z.number().int().min(1).max(1e6).default(100),
  businessAnnualEnergy: money.default(24000), schoolAnnualEnergy: money.default(200000),
  utilityRateChangePct: z.number().min(-100).max(500).default(0),
  businessCapex: money.default(0), schoolLandOpportunityCost: money.default(0),
  taxableValue: money.default(200000000), taxPerThousand: z.number().min(0).max(100).default(15),
  taxAbatementPct: z.number().min(0).max(100).default(0),
  publicCapital: money.default(5000000), publicAnnualServices: money.default(500000),
  annualCommunityBenefits: money.default(0), environmentalMitigation: money.default(0),
  upgradeFraction: z.number().min(0).max(2).default(0.5),
  manualUpgradeMW: z.number().min(0).max(100000).nullable().default(null),
  lowCostMultiplier: z.number().min(0).max(1).default(0.5),
  highCostMultiplier: z.number().min(1).max(10).default(1.5),
  backupGeneratorMW: z.number().min(0).max(1000).default(20),
  generatorHours: z.number().min(0).max(8760).default(24),
  residentialLandAssumptionAcres: z.number().min(0).max(5000).default(0),
}).refine(x => x.householdAllocation + x.businessAllocation + x.schoolAllocation <= 1.0000001, {
  message: "Household, business and school allocations must sum to 100% or less",
});
export type FinancialInputs = z.infer<typeof FinancialInputs>;
export const DEFAULT_FINANCIAL = FinancialInputs.parse({});

/** Annual level-payment factor. Zero interest is straight-line recovery. */
export function annualRecoveryFactor(rate: number, years: number): number {
  return rate === 0 ? 1 / years : rate / -Math.expm1(-years * Math.log1p(rate));
}

export function computeFinancial(raw: FinancialInputs, cost: CostInputs) {
  const input = FinancialInputs.parse(raw);
  cost = CostInputs.parse(cost);
  const factor = annualRecoveryFactor(input.interestRate, cost.amortizationYears);
  const upgradeInvestment = cost.costPerMW * cost.incrementalMW;
  const developerInvestment = upgradeInvestment * cost.developerFundedFraction;
  const remainingPrincipal = upgradeInvestment - developerInvestment;
  const annualRecovery = remainingPrincipal * factor;
  const monthlyUpgradeExposure = annualRecovery * input.householdAllocation / cost.households / 12;
  const rentDelta = input.baselineRent * input.rentChangePct / 100;
  const modeledRent = input.baselineRent + rentDelta;
  const rateDelta = input.baselineElectricity * input.utilityRateChangePct / 100;
  const modeledElectricity = input.baselineElectricity + rateDelta + monthlyUpgradeExposure;
  const baselineCombined = input.baselineRent + input.baselineElectricity;
  const combinedMonthly = modeledRent + modeledElectricity;
  const annualPropertyTax = input.taxableValue * input.taxPerThousand / 1000 * (1 - input.taxAbatementPct / 100);
  const annualPublicCost = input.publicCapital * factor + input.publicAnnualServices;
  return {
    upgradeInvestment, developerInvestment, remainingPrincipal, annualRecovery, monthlyUpgradeExposure,
    modeledRent, rentDelta, rateDelta, modeledElectricity, baselineCombined, combinedMonthly,
    combinedAnnual: combinedMonthly * 12, monthlyDifference: combinedMonthly - baselineCombined,
    annualDifference: (combinedMonthly - baselineCombined) * 12,
    incomeShare: combinedMonthly * 12 / input.annualIncome,
    baselineIncomeShare: baselineCombined * 12 / input.annualIncome,
    perPersonMonthly: combinedMonthly / input.householdSize,
    annualPropertyTax, annualPublicCost,
    annualMunicipalNet: annualPropertyTax + input.annualCommunityBenefits - annualPublicCost,
    unallocatedAnnualRecovery: annualRecovery * Math.max(0, 1 - input.householdAllocation - input.businessAllocation - input.schoolAllocation),
    businessAnnualExposure: annualRecovery * input.businessAllocation / input.businessCount + input.businessAnnualEnergy * input.utilityRateChangePct / 100,
    schoolAnnualExposure: annualRecovery * input.schoolAllocation / input.schoolCount + input.schoolAnnualEnergy * input.utilityRateChangePct / 100,
    scenarios: [input.lowCostMultiplier, 1, input.highCostMultiplier].map((multiplier, i) => ({
      name: ["Low", "Medium", "High"][i], multiplier,
      monthlyElectricity: input.baselineElectricity + rateDelta + monthlyUpgradeExposure * multiplier,
      monthlyUpgradeExposure: monthlyUpgradeExposure * multiplier,
      combinedMonthly: modeledRent + input.baselineElectricity + rateDelta + monthlyUpgradeExposure * multiplier,
    })),
    incomeComparisons: [30000, 60000, 100000, input.annualIncome].filter((n, i, a) => a.indexOf(n) === i).sort((a,b) => a-b).map(income => ({
      income, baselineShare: baselineCombined * 12 / income, scenarioShare: combinedMonthly * 12 / income,
    })),
  };
}
export type FinancialResult = ReturnType<typeof computeFinancial>;

export function developmentVariants(project: DataCenterProject, finance: FinancialInputs) {
  // Peak demand is the same; green efficiency lowers facility utilization at a fixed IT workload.
  const greenPue = Math.min(project.pue, 1.2);
  const greenUtilization = Math.max(0.3, project.utilization * greenPue / project.pue);
  return [
    { id: "conventional", name: "Conventional", project: { ...project }, finance: { ...finance }, note: "Current project and financing inputs" },
    { id: "green", name: "Green", project: { ...project, pue: greenPue, utilization: greenUtilization, cooling: "closed-loop-liquid" as const,
      wue: Math.min(project.wue, 0.1), cleanEnergyCoverage: Math.max(project.cleanEnergyCoverage, 0.8) }, finance: { ...finance },
      note: "PUE ≤1.2; utilization scaled to preserve IT workload where the 30% lower bound permits; WUE ≤0.1; clean coverage ≥80%" },
    { id: "community", name: "Community-optimized", project: { ...project, developerFundedFraction: 1 },
      finance: { ...finance, environmentalMitigation: finance.environmentalMitigation, annualCommunityBenefits: finance.annualCommunityBenefits },
      note: "100% developer grid funding; mitigation and benefits use your entered commitments (default $0)" },
  ];
}

export function variantMetrics(project: DataCenterProject) {
  const energy = computeEnergy(project);
  return { energyGWh: energy.annualFacilityGWh, waterML: computeWater(energy, project.wue).annualWaterLiters / 1e6 };
}
