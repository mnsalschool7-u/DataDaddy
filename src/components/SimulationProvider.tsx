"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PROJECT,
  DEFAULT_WEIGHTS,
  type CostInputs,
  type DataCenterProject,
  type GridScenario,
  type ScoringWeights,
  type Site,
} from "@/lib/schemas";
import { loadAllLayers, type AllLayers } from "@/lib/data/loader";
import {
  greenSpaceWithinRadius,
  schoolProximity,
  ejOverlap,
} from "@/lib/geo/analysis";
import { runSimulation, type GeoContext, type SimulationResult } from "@/lib/model/orchestrator";

export interface SimState {
  site: Site | null;
  project: DataCenterProject;
  grid: GridScenario;
  cost: CostInputs;
  weights: ScoringWeights;
}

interface SimContextValue extends SimState {
  layers: AllLayers | null;
  layersLoading: boolean;
  geo: GeoContext;
  result: SimulationResult;
  setSite: (s: Site | null) => void;
  updateProject: (p: Partial<DataCenterProject>) => void;
  updateGrid: (g: Partial<GridScenario>) => void;
  updateCost: (c: Partial<CostInputs>) => void;
  setWeights: (w: ScoringWeights) => void;
}

const DEFAULT_GRID: GridScenario = {
  mode: "public-screening",
  availableCapacityMW: null,
  existingLoadMW: 0,
  priorDataCenterMW: 0,
  portfolio: [],
  diversityFactor: 1,
};

const DEFAULT_COST: CostInputs = {
  costPerMW: 2_000_000,
  incrementalMW: 20,
  developerFundedFraction: 1,
  households: 150_000,
  amortizationYears: 20,
};

const SimContext = createContext<SimContextValue | null>(null);

export function useSimulation(): SimContextValue {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<Site | null>(null);
  const [project, setProject] = useState<DataCenterProject>(DEFAULT_PROJECT);
  const [grid, setGrid] = useState<GridScenario>(DEFAULT_GRID);
  const [cost, setCost] = useState<CostInputs>(DEFAULT_COST);
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [layers, setLayers] = useState<AllLayers | null>(null);
  const [layersLoading, setLayersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadAllLayers()
      .then((l) => {
        if (active) {
          setLayers(l);
          setLayersLoading(false);
        }
      })
      .catch(() => active && setLayersLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const geo: GeoContext = useMemo(() => {
    if (!site) {
      return { greenSpace: null, schools: null, ej: null, floodDataAvailable: false };
    }
    const openSpaceLayer = layers?.openspace.available ? layers.openspace.data : null;
    const schoolsLayer = layers?.schools.available ? layers.schools.data : null;
    const ejLayer = layers?.ej.available ? layers.ej.data : null;
    return {
      greenSpace: greenSpaceWithinRadius(site.lng, site.lat, site.radiusMiles, openSpaceLayer),
      schools: schoolProximity(site.lng, site.lat, schoolsLayer),
      ej: ejOverlap(site.lng, site.lat, ejLayer),
      floodDataAvailable: false, // flood layer not bundled; stays unavailable, never faked
    };
  }, [site, layers]);

  const result = useMemo(
    () =>
      runSimulation({
        site,
        project,
        grid,
        cost: cost,
        weights,
        geo,
      }),
    [site, project, grid, cost, weights, geo],
  );

  const value: SimContextValue = {
    site,
    project,
    grid,
    cost,
    weights,
    layers,
    layersLoading,
    geo,
    result,
    setSite,
    updateProject: (p) => setProject((prev) => ({ ...prev, ...p })),
    updateGrid: (g) => setGrid((prev) => ({ ...prev, ...g })),
    updateCost: (c) => setCost((prev) => ({ ...prev, ...c })),
    setWeights,
  };

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
