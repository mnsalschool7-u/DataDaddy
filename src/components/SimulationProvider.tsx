"use client";
import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PROJECT,
  DEFAULT_WEIGHTS,
  CostInputs,
  DataCenterProject,
  GridScenario,
  type ScoringWeights,
  type Site,
} from "@/lib/schemas";
import { FinancialInputs, DEFAULT_FINANCIAL, computeFinancial, type FinancialResult } from "@/lib/model/financial";
import { useCommunityContext, type CommunityContext } from "@/lib/data/community";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { useLandUse } from "@/lib/data/landuse";
import { type OverlayMode } from "@/lib/model/zones";
import type { AllLayers } from "@/lib/data/loader";
import { useSiteLayers } from "@/lib/data/useSiteLayers";
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
  landUse: FeatureCollection<Polygon | MultiPolygon> | null;
  landUseImpact: { residentialAcres: number; commercialAcres: number } | null;
  landUseLoading: boolean;
  landUseError?: string;
  landUseRetrievedAt?: string;
  finance: FinancialInputs;
  financialResult: FinancialResult;
  updateFinance: (f: Partial<FinancialInputs>) => void;
  financeError: string | null;
  community: CommunityContext | null;
  communityLoading: boolean;
  communityError?: string;
  overlay: OverlayMode;
  setOverlay: (o: OverlayMode) => void;
  impactTab: "site" | "finance";
  setImpactTab: (v: "site" | "finance") => void;
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
  households: 10_000,
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
  const [baseCost, setCost] = useState<CostInputs>(DEFAULT_COST);
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [finance, setFinance] = useState<FinancialInputs>(DEFAULT_FINANCIAL);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayMode>("overall");
  const [impactTab, setImpactTab] = useState<"site" | "finance">("site");
  const landUseState = useLandUse(site, project.footprintAcres);
  const { community, communityLoading, communityError } = useCommunityContext(site);
  const cost = useMemo(() => ({ ...baseCost,
    incrementalMW: finance.manualUpgradeMW ?? project.peakFacilityMW * finance.upgradeFraction,
    developerFundedFraction: project.developerFundedFraction,
  }), [baseCost, finance.manualUpgradeMW, finance.upgradeFraction, project.peakFacilityMW, project.developerFundedFraction]);
  const financialResult = useMemo(() => computeFinancial(finance, cost), [finance, cost]);
  const { layers, layersLoading } = useSiteLayers(site);

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

  const selectSite = useCallback((s: Site | null) => { setSite(s); if (s) setImpactTab("finance"); }, []);
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
    ...landUseState, finance, financialResult, financeError, community, communityLoading, communityError, overlay, setOverlay, impactTab, setImpactTab,
    updateFinance: f => setFinance(previous => {
      const parsed = FinancialInputs.safeParse({ ...previous, ...f });
      if (!parsed.success) { setFinanceError(parsed.error.issues[0].message); return previous; }
      setFinanceError(null); return parsed.data;
    }),
    setSite: selectSite,
    updateProject: p => {
      const parsed = DataCenterProject.safeParse({ ...project, ...p });
      if (!parsed.success) { setFinanceError(parsed.error.issues[0].message); return; }
      setProject(parsed.data); setFinanceError(null);
    },
    updateGrid: g => {
      const parsed = GridScenario.safeParse({ ...grid, ...g });
      if (!parsed.success) { setFinanceError(parsed.error.issues[0].message); return; }
      setGrid(parsed.data); setFinanceError(null);
    },
    updateCost: c => {
      const parsed = CostInputs.safeParse({ ...cost, ...c });
      if (!parsed.success) { setFinanceError(parsed.error.issues[0].message); return; }
      setFinanceError(null);
      setCost(prev => ({ ...prev, ...c }));
      if (c.incrementalMW !== undefined) setFinance(prev => ({ ...prev, manualUpgradeMW: c.incrementalMW! }));
      if (c.developerFundedFraction !== undefined) setProject(prev => ({ ...prev, developerFundedFraction: c.developerFundedFraction! }));
    },
    setWeights,
  };

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
