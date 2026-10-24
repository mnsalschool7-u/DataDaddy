# DataDaddy — Design

## 1. System architecture
Single Next.js (App Router) application. Three logical tiers:
- **Pure model layer** (`src/lib`): deterministic TypeScript — no React, no I/O.
  - `model/` energy, water, grid, cost, scoring.
  - `geo/` Turf-based spatial analysis (radius intersect, nearest, distance).
  - `policy/` EO 658 + tax-exemption rule engine.
  - `data/` provenance types, source registry, dataset loaders.
  - `schemas/` Zod schemas shared by UI + API.
- **UI layer** (`src/components`, `src/app`): React components, MapLibre map, Recharts.
- **API layer** (`src/app/api`): analyst (deterministic + optional LLM), report context.

Data flows one direction for calculations: UI state (project + site + scenario) → Zod
validate → pure model functions → typed results → UI panels/charts. No model function
reaches into the DOM or network.

## 2. Component hierarchy (main `/` dashboard)
```
AppShell
 ├─ TopNav (logo, Explore, Scenario Lab, Compare, Policy, Methodology)
 ├─ LeftSidebar (search, layer toggles, project assumptions, filters)
 ├─ MapCanvas (MapLibre; boundaries, open space, EJ, schools, suitability, scenario grid)
 │    └─ Legend, RadiusCircle, SelectionMarker
 ├─ RightSidebar (SiteIntelligence, EnvIndicators, EnergyResults, PolicyNavigator, Analyst)
 └─ BottomPanel (ScenarioCharts, Calculations, Sources, ReportExport)
```
Global client state via a small React context store (`SimulationProvider`): selected site,
analysis radius, project config, grid scenario, cost inputs, scoring weights.

## 3. GIS layer ingestion
- `scripts/fetch-data.ts` documents official endpoints and (best-effort) retrieves them.
- Processing: reproject to WGS84, simplify polygons (Turf `simplify`), validate geometry,
  attach provenance, write to `public/data/*.geojson` + register in source registry.
- Reliable demo: a curated, attributed local dataset ships in-repo so the app always works
  offline. Where an official bulk download isn't retrievable in-sandbox, the curated subset
  is clearly labeled and the registry notes the limitation. We never label curated data as
  the full official layer.
- Datasets: municipalities (boundaries), protected/recreational open space (polygons),
  schools (points), EJ populations (block-group polygons). Each has a `DataSource` record.

## 4. Simulation calculations (pure)
- Energy: `annualEnergyMWh = peakMW*8760*util`; `GWh = /1000`; IT energy via PUE:
  `itMWh = facilityMWh / PUE` (facility includes cooling+overhead; IT is the subset).
- Water: `annualWaterLiters = itEnergyKWh * WUE`; daily = /365; cooling profiles set
  illustrative WUE defaults (air low, water-based high, hybrid mid, closed-loop lowest).
- Clean energy: covered = demand*coverage%; uncovered = demand-covered; separate statuses.
- Grid: `remaining = available - cumulativeProposed`; shortfall = max(0, -remaining);
  unknown capacity stays `unknown`. Diversity factor scales cumulative peak.
- Cost: `totalUpgrade = costPerMW*incrementalMW`; `nonDev = total*(1-devFrac)`;
  `annualHouseholdExposure = nonDev/(households*years)`.
- Scoring: 5 components 0–100, weighted; unknown infra → component contributes with a
  confidence penalty, not a fabricated value. Overall = Σ(weightᵢ*componentᵢ) over available
  weight mass; `evidenceCoverage` = fraction of components with real inputs.

## 5. Scoring methodology (transparent)
Weights (default, adjustable): land/env 0.30, infra fit 0.25, community 0.20, resource 0.15,
data readiness 0.10. Each component maps observed metrics → 0–100 via documented piecewise
functions (in methodology page). Missing component → excluded from weight mass, lowering
`evidenceCoverage`; never scored as perfect.

## 6. Source attribution system
`DataSource { name, publisher, url, publishedDate, retrievedDate, coverage, processingNotes,
reliabilityLimitations }`. Central registry array; every layer + metric references a source
id. UI renders provenance chips and a Sources list in the bottom panel + report.

## 7. Error handling & degradation
- Dataset load failure → layer flagged `unavailable`, UI shows banner, app continues.
- Missing AI key → `/api/analyst` returns deterministic structured explanation.
- Invalid inputs → Zod errors surfaced inline; model functions assume validated input.
- Map tile/provider failure → attribution + graceful empty basemap with boundaries still drawn.

## 8. Testing approach
- Unit tests: known examples (40 MW@85% = 297.84 GWh; 25 vs 30 MW threshold; water units).
- Property tests (fast-check): energy ≥ 0; monotonic in MW and utilization; remaining
  capacity decreases as demand rises; shortfall ≥ 0; green % ∈ [0,100]; distance ≥ 0;
  25 MW never flagged as exceeding; unknown capacity stays unknown; score ∈ [0,100];
  missing data never yields invented favorable score.
- `tsc --noEmit`, ESLint, `vitest --run`, `next build` all green before "done".

## 9. Hooks (automation)
- Simulation Validation Hook: on edits to `src/lib/model|geo|policy`, run focused vitest.
- Code Quality Hook: after tasks, run tsc + ESLint.
- Source Integrity Hook: on edits to `src/lib/data` or policy rules, validate source metadata.
