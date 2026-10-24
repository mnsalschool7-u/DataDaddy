import { DEFAULT_PROJECT, type DataCenterProject } from "@/lib/schemas";
import { computeEnergy, computeCleanEnergy } from "@/lib/model/energy";
import { computeWater } from "@/lib/model/water";
import { evaluatePolicy } from "@/lib/policy/eo658";

export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  project: DataCenterProject;
}

export const BUILTIN_SCENARIOS: ScenarioDef[] = [
  {
    id: "conventional",
    name: "A · Conventional",
    description: "40 MW, standard cooling, no additional on-site energy resources.",
    project: { ...DEFAULT_PROJECT, id: "sc-a", peakFacilityMW: 40, cooling: "water", wue: 1.8, cleanEnergyCoverage: 0.1, pue: 1.5 },
  },
  {
    id: "clean-energy",
    name: "B · Clean Energy",
    description: "Same demand, higher assumed clean-energy coverage and improved efficiency.",
    project: { ...DEFAULT_PROJECT, id: "sc-b", peakFacilityMW: 40, cooling: "hybrid", wue: 0.5, cleanEnergyCoverage: 0.8, cleanEnergyStatus: "documented-procurement", pue: 1.25 },
  },
  {
    id: "low-water",
    name: "C · Lower Water",
    description: "Same demand, closed-loop liquid cooling with lower water-use assumptions.",
    project: { ...DEFAULT_PROJECT, id: "sc-c", peakFacilityMW: 40, cooling: "closed-loop-liquid", wue: 0.2, cleanEnergyCoverage: 0.4, pue: 1.3 },
  },
  {
    id: "phased",
    name: "D · Phased",
    description: "Two staged increments: 20 MW then +30 MW, comparing peak demand over time.",
    project: {
      ...DEFAULT_PROJECT,
      id: "sc-d",
      peakFacilityMW: 50,
      cooling: "hybrid",
      wue: 0.5,
      cleanEnergyCoverage: 0.5,
      phases: [
        { label: "Phase 1", peakMW: 20 },
        { label: "Phase 2", peakMW: 30 },
      ],
    },
  },
];

export interface ScenarioOutput {
  id: string;
  name: string;
  annualGWh: number;
  waterMillionLiters: number;
  cleanCoveredPct: number;
  peakMW: number;
  thresholdExceeded: boolean;
}

export function evaluateScenario(def: ScenarioDef): ScenarioOutput {
  const energy = computeEnergy(def.project);
  const clean = computeCleanEnergy(energy, def.project.cleanEnergyCoverage);
  const water = computeWater(energy, def.project.wue);
  const policy = evaluatePolicy(def.project);
  return {
    id: def.id,
    name: def.name,
    annualGWh: energy.annualFacilityGWh,
    waterMillionLiters: water.annualWaterLiters / 1_000_000,
    cleanCoveredPct: clean.coveredFraction * 100,
    peakMW: def.project.peakFacilityMW,
    thresholdExceeded: policy.thresholdExceeded,
  };
}
