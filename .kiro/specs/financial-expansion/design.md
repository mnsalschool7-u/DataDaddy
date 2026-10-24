# Architecture

Existing SimulationProvider owns project/grid state plus validated financial assumptions. Cost inputs synchronize developer funding with the project; upgrade capacity defaults to a disclosed fraction of facility peak demand, with optional manual override. Pure financial.ts and zones.ts functions drive UI, charts, reports and analyst context.

MapLibre sources retain current official GIS layers, add fill-extrusion for an acreage-based footprint, selected-radius classifications, municipality financial shading, missing-data hatch patterns and historical land-use shading. HTML drag-and-drop uses MapLibre.unproject; a draggable map marker relocates the facility. No arbitrary municipality values or utility headroom are generated.

Separate cancellable Census-town and land-use hooks prevent stale site results; Census Reporter ACS is optional with an explicit unavailable fallback. Housing counts and land-area values come from official MassGIS Census2020_Towns. Historical residential/commercial polygon intersections use Turf, with source dates displayed.

FinancialDashboard is shared by the map impact panel and full Community page. Existing policy, simulator, scenario lab and geographic analysis remain. Reports persist a snapshot of inputs, calculated outputs, source context and variant metrics. Conventional/green/community variants disclose altered assumptions; no environmental benefits are inferred merely from a mitigation budget.

Validation: Zod financial schema and cost schema, unit/property tests for allocation, financing, rent sensitivity, demand-dependent classifications, and footprint acreage; browser checks for placement, edits, sources, diagram and export; static production build and CI.
