# DataDaddy — Implementation Tasks

Priorities: **P1** must work, **P2** high value, **P3** if time. Status: [ ] todo,
[~] in progress, [x] done.

## Foundation
- [ ] T1 (P1) Scaffold Next.js + TS + Tailwind app; design tokens; app shell + TopNav. → R1
- [ ] T2 (P1) Provenance types, DataSource registry, Zod schemas. → R2, R14
- [ ] T3 (P1) Curated, attributed MA GeoJSON (municipalities, open space, schools, EJ) +
  `scripts/fetch-data.ts` documenting official endpoints. → R2

## Model layer (pure, tested)
- [ ] T4 (P1) Energy model (facility vs IT via PUE; GWh). → R3
- [ ] T5 (P2) Water model (WUE, cooling profiles). → R6
- [ ] T6 (P2) Clean-energy coverage model. → R3
- [ ] T7 (P2) Grid scenario model (remaining/shortfall/diversity; unknown stays unknown). → R7
- [ ] T8 (P2) Cost sensitivity model (household exposure). → R8
- [ ] T9 (P2) Scoring model (weighted, confidence, partial). → R10
- [ ] T10 (P1) Policy engine (EO 658 threshold logic + tax exemption, categorized). → R9

## Geo layer
- [ ] T11 (P2) Turf helpers: radius buffer, open-space intersection %, nearest school, distance. → R4,R5

## UI — map & panels
- [ ] T12 (P1) MapLibre MapCanvas: basemap, boundaries, layer toggles, legend, click-select,
  municipality search, radius circle, suitability + scenario-grid classes. → R1,R2
- [ ] T13 (P1) Left sidebar: search, layer controls, project assumptions, filters. → R1,R3
- [ ] T14 (P1) Right sidebar: site intelligence, env indicators, energy results. → R3,R4,R5
- [ ] T15 (P1) Policy Navigator panel. → R9
- [ ] T16 (P2) Bottom panel: calculations, sources, charts. → R11,R14

## Pages
- [ ] T17 (P1) Compare Sites page (split-screen + scoring). → R10
- [ ] T18 (P2) Scenario Lab page (4 scenarios, charts, localStorage save). → R11
- [ ] T19 (P1) Massachusetts Policy page. → R9
- [ ] T20 (P2) Data & Methodology page. → R14
- [ ] T21 (P2) DataDaddy Intelligence analyst + `/api/analyst` (deterministic + optional LLM). → R12
- [ ] T22 (P2) Exportable site intelligence report (print/PDF). → R13

## Quality & delivery
- [ ] T23 (P1) Vitest unit tests (known examples). → R15
- [ ] T24 (P2) fast-check property tests. → R15, R20-props
- [ ] T25 (P1) Kiro hooks in `.kiro/hooks/`. → design §9
- [ ] T26 (P1) README + KIRO_USAGE.md; ensure `.kiro` not gitignored. → delivery
- [ ] T27 (P1) `npm install`, tsc, lint, test, build all green. → R15
