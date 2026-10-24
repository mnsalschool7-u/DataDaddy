# DataDaddy — Architecture Steering

## Stack
- Next.js (App Router) + React + TypeScript + Tailwind CSS.
- shadcn-style accessible UI primitives, Lucide icons, Recharts.
- MapLibre GL JS + GeoJSON + Turf.js for geospatial work.
- Next.js route handlers for APIs; Zod for runtime validation.
- Vitest + fast-check for tests; ESLint + tsc for quality.

## Code organization
- `src/lib/model/`   — pure, deterministic simulation + scoring modules (no React).
- `src/lib/geo/`     — Turf-based spatial analysis helpers.
- `src/lib/data/`    — dataset loaders, source registry, provenance types.
- `src/lib/policy/`  — Massachusetts regulatory rule engine.
- `src/components/`  — UI; map, panels, controls, charts.
- `src/app/`         — routes: `/` (map+sim), `/scenario-lab`, `/compare`, `/policy`, `/methodology`.
- `src/app/api/`     — route handlers (analyst, report context).
- `public/data/`     — cached, attributed GeoJSON for reliable demos.
- `scripts/`         — dataset retrieval/processing scripts.

## Principles
- Model modules are pure functions, unit-testable, no side effects. UI calls them.
- All simulation inputs validated with Zod schemas shared between client and API.
- Geospatial math uses Turf (WGS84). Simplify large polygons for web display.
- Features degrade gracefully: no API key => deterministic analyst; missing dataset => layer marked unavailable.
- `npm install && npm run dev` must work with no paid keys.
