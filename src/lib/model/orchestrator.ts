import type {
  DataCenterProject,
  GridScenario,
  CostInputs,
  ScoringWeights,
  Site,
} from "@/lib/schemas";
import { computeEnergy, computeCleanEnergy, type EnergyResult, type CleanEnergyResult } from "./energy";
import { computeWater, waterSensitivity, type WaterResult } from "./water";
import { computeBattery, type BatteryResult } from "./battery";
import { computeGrid, type GridResult } from "./grid";
import { computeCost, type CostResult } from "./cost";
import { scoreSite, type SiteAssessment, type ComponentInput } from "./scoring";
import { evaluatePolicy, type PolicyEvaluation } from "@/lib/policy/eo658";
import type { GreenSpaceResult, SchoolProximityResult } from "@/lib/geo/analysis";
import { clamp } from "@/lib/geo/analysis";

/** Geographic analysis inputs produced on the client (Turf). */
export interface GeoContext {
  greenSpace: GreenSpaceResult | null;
  schools: SchoolProximityResult | null;
  ej: { overlaps: boolean; dataAvailable: boolean; names: string[] } | null;
  floodDataAvailable: boolean;
}

export interface SimulationResult {
  energy: EnergyResult;
  cleanEnergy: CleanEnergyResult;
  water: WaterResult;
  waterSensitivity: ReturnType<typeof waterSensitivity>;
  battery: BatteryResult;
  grid: GridResult;
  cost: CostResult | null;
  policy: PolicyEvaluation;
  assessment: SiteAssessment;
}

/**
 * Builds the scoring components from geo context + model outputs, applying the
 * integrity rule that unknown inputs are excluded (null), never defaulted.
 */
function buildScoreComponents(
  geo: GeoContext,
  grid: GridResult,
  project: DataCenterProject,
): { components: ComponentInput[]; constraints: string[]; advantages: string[]; mitigations: string[] } {
  const constraints: string[] = [];
  const advantages: string[] = [];
  const mitigations: string[] = [];

  // Land / environment: higher open-space coverage near a site = more land-use
  // competition/sensitivity => lower favorability for siting here.
  let landEnv: number | null = null;
  if (geo.greenSpace?.dataAvailable) {
    const cov = geo.greenSpace.coveragePercent;
    landEnv = clamp(100 - cov * 1.5, 0, 100);
    if (cov > 25) constraints.push(`High mapped open-space coverage (${cov.toFixed(1)}%) nearby`);
    else advantages.push(`Modest mapped open-space coverage (${cov.toFixed(1)}%) nearby`);
  }

  // Infra fit: only known when capacity is supplied.
  let infraFit: number | null = null;
  if (grid.capacityKnown && grid.remainingCapacityMW !== null) {
    if (grid.exceeded) {
      infraFit = 0;
      constraints.push(`Modeled capacity exceeded by ${grid.shortfallMW?.toFixed(1)} MW`);
      mitigations.push("Reduce facility demand, phase development, or fund upgrades");
    } else {
      const headroomRatio = clamp(grid.remainingCapacityMW / Math.max(1, grid.availableCapacityMW ?? 1), 0, 1);
      infraFit = clamp(headroomRatio * 100, 0, 100);
      advantages.push("Within modeled scenario grid capacity");
    }
  }

  // Community exposure: schools nearby + EJ overlap increase exposure.
  let community: number | null = null;
  if (geo.schools?.dataAvailable || geo.ej?.dataAvailable) {
    let score = 100;
    if (geo.schools?.dataAvailable) {
      score -= Math.min(40, geo.schools.within1Mile * 20 + geo.schools.within3Miles * 5);
      if (geo.schools.within1Mile > 0)
        constraints.push(`${geo.schools.within1Mile} mapped school(s) within 1 mile`);
    }
    if (geo.ej?.dataAvailable && geo.ej.overlaps) {
      score -= 30;
      constraints.push("Within a designated Environmental Justice block group");
      mitigations.push("Early, meaningful engagement with EJ communities");
    }
    community = clamp(score, 0, 100);
  }

  // Resource efficiency: better PUE/WUE and higher clean-energy coverage = higher score.
  const pueScore = clamp((2.0 - project.pue) / (2.0 - 1.1), 0, 1); // 1.1 best, 2.0 poor
  const cleanScore = project.cleanEnergyCoverage;
  const resource = clamp((pueScore * 0.5 + cleanScore * 0.5) * 100, 0, 100);
  if (project.cleanEnergyCoverage >= 0.6) advantages.push("High assumed clean-energy coverage");
  if (project.pue <= 1.3) advantages.push("Efficient assumed PUE");
  mitigations.push("Increase documented incremental clean-energy procurement");

  // Data readiness: fraction of geo layers that returned data + capacity known.
  const signals = [
    geo.greenSpace?.dataAvailable,
    geo.schools?.dataAvailable,
    geo.ej?.dataAvailable,
    geo.floodDataAvailable,
    grid.capacityKnown,
  ];
  const known = signals.filter(Boolean).length;
  const dataReadiness = clamp((known / signals.length) * 100, 0, 100);
  if (!grid.capacityKnown) constraints.push("Local available grid capacity unknown");
  if (!geo.floodDataAvailable) mitigations.push("Obtain flood hazard layer for the site");

  const components: ComponentInput[] = [
    { key: "landEnv", label: "Land-use & environmental constraints", score: landEnv, reason: geo.greenSpace?.dataAvailable ? "" : "Open-space layer unavailable here" },
    { key: "infraFit", label: "Infrastructure scenario fit", score: infraFit, reason: grid.capacityKnown ? "" : "Available capacity unknown (not defaulted)" },
    { key: "community", label: "Community exposure", score: community, reason: geo.schools?.dataAvailable || geo.ej?.dataAvailable ? "" : "Community layers unavailable here" },
    { key: "resource", label: "Resource efficiency & sustainability", score: resource, reason: "" },
    { key: "dataReadiness", label: "Data availability & planning readiness", score: dataReadiness, reason: "" },
  ];

  return { components, constraints, advantages, mitigations };
}

export interface SimulationInputs {
  site: Site | null;
  project: DataCenterProject;
  grid: GridScenario;
  cost: CostInputs | null;
  weights: ScoringWeights;
  geo: GeoContext;
}

export function runSimulation(inputs: SimulationInputs): SimulationResult {
  const energy = computeEnergy(inputs.project);
  const cleanEnergy = computeCleanEnergy(energy, inputs.project.cleanEnergyCoverage);
  const water = computeWater(energy, inputs.project.wue);
  const sensitivity = waterSensitivity(energy);
  const battery = computeBattery(inputs.project, energy);
  // Battery dispatch shaves the facility's PEAK grid draw (demand shifted, not
  // removed). The grid scenario sees the effective peak. Total energy is unchanged
  // except for round-trip losses captured in battery.annualGridEnergyMWh.
  const grid = computeGrid(inputs.grid, battery.effectivePeakGridMW);
  const cost = inputs.cost ? computeCost(inputs.cost) : null;
  const policy = evaluatePolicy(inputs.project);

  const { components, constraints, advantages, mitigations } = buildScoreComponents(
    inputs.geo,
    grid,
    inputs.project,
  );
  const assessment = scoreSite(components, inputs.weights, {
    constraints,
    advantages,
    mitigations,
    hardExclusion: null,
  });

  return { energy, cleanEnergy, water, waterSensitivity: sensitivity, battery, grid, cost, policy, assessment };
}
