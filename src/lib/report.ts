import type { SimulationResult } from "@/lib/model/orchestrator";
import type { DataCenterProject, GridScenario, Site } from "@/lib/schemas";
import type { GeoContext } from "@/lib/model/orchestrator";

export const REPORT_KEY = "datadaddy.reportSnapshot.v1";

export interface ReportSnapshot {
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
