import type { FinancialInputs, FinancialResult } from "@/lib/model/financial";
import type { CommunityContext } from "@/lib/data/community";
import type { CostInputs } from "@/lib/schemas";
import type { SimulationResult } from "@/lib/model/orchestrator";
import type { DataCenterProject, GridScenario, Site } from "@/lib/schemas";
import type { GeoContext } from "@/lib/model/orchestrator";

export const REPORT_KEY = "datadaddy.reportSnapshot.v1";

export interface ReportSnapshot {
  finance?: { inputs: FinancialInputs; cost: CostInputs; result: FinancialResult; community: CommunityContext | null;
    landUseImpact?: { residentialAcres: number; commercialAcres: number } | null; landUseRetrievedAt?: string;
    variants: { name: string; inputs: FinancialInputs; project: DataCenterProject; financial: FinancialResult; energyGWh: number; waterML: number; score: number; note: string }[] };
  generatedAt: string;
  site: Site | null;
  project: DataCenterProject;
  grid: GridScenario;
  geo: GeoContext;
  result: SimulationResult;
}

export function saveReportSnapshot(snap: ReportSnapshot) {
  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

export function loadReportSnapshot(): ReportSnapshot | null {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    return raw ? (JSON.parse(raw) as ReportSnapshot) : null;
  } catch {
    return null;
  }
}
