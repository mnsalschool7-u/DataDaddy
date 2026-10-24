# How Kiro was used to build DataDaddy

This document accurately records how Kiro's capabilities shaped DataDaddy. Everything
listed here corresponds to real artifacts in the repository.

## 1. Spec-driven workflow
Before writing application code, the spec was authored in [`.kiro/specs/datadaddy/`](./.kiro/specs/datadaddy):

- **`requirements.md`** — 15 requirement groups with **EARS-style acceptance criteria**
  (e.g. "WHEN a user changes MW demand, THE SYSTEM SHALL immediately recalculate annual
  electricity consumption"; "WHEN verified grid capacity is unavailable, THE SYSTEM SHALL
  identify it as unknown rather than assigning an invented capacity").
- **`design.md`** — system architecture, component hierarchy, data flow, GIS ingestion,
  simulation formulas, scoring methodology, source-attribution system, error handling, and
  testing approach.
- **`tasks.md`** — 27 trackable tasks (T1–T27) with **priority levels (P1/P2/P3)** and
  explicit traceability back to requirements (e.g. `→ R3`).

The spec drove implementation order (P1 map + simulation first) and each requirement maps to
concrete code: energy formulas → `src/lib/model/energy.ts`, grid "unknown stays unknown" →
`src/lib/model/grid.ts`, EO 658 threshold logic → `src/lib/policy/eo658.ts`.

## 2. Steering documents
Five persistent steering files in [`.kiro/steering/`](./.kiro/steering) guided every step:

| File | Role |
|------|------|
| `product.md` | Users, value proposition, hackathon priority ordering |
| `architecture.md` | Stack, folder layout, purity rules for the model layer |
| `model-integrity.md` | The hard provenance rules (never default unknowns, 25 MW ≠ >25 MW, etc.) |
| `design-system.md` | Color tokens, typography, accessibility, legend wording |
| `massachusetts-policy.md` | Official MA policy references + "do not invent laws" rules |

These are the reason provenance labeling, the "Local available capacity unknown" behavior,
and the exact EO 658 threshold wording are consistent across the codebase.

## 3. Agent hooks
Functional hooks in [`.kiro/hooks/`](./.kiro/hooks), narrowly scoped so they only fire on
relevant file changes:

- **`simulation-validation.kiro.hook`** — on edits to `src/lib/model|geo|policy/**`, runs the
  focused Vitest suites and reports failures.
- **`code-quality.kiro.hook`** — runs `tsc --noEmit` and ESLint after implementation edits.
- **`source-integrity.kiro.hook`** — on edits to `src/lib/data/**` or policy rules, validates
  that every `DataSource` record has required metadata and that assumptions are not labeled
  as observed data.

## 4. MCP / research integrations
Kiro's web research tooling was used to verify current, external facts rather than relying on
model memory — most importantly confirming the **Turf.js v7 `intersect(FeatureCollection)`
breaking change** before writing `src/lib/geo/analysis.ts`, and cross-checking the official
Massachusetts policy source URLs recorded in `src/lib/data/sources.ts`. No MCP server
credentials are committed, and no runtime feature depends on an MCP connection.

## 5. Property-based testing (fast-check)
Property tests live beside the modules they verify and encode the spec's integrity invariants:

- `energy.test.ts` — energy ≥ 0; monotonic in MW and utilization; 40 MW@85% = 297.84 GWh.
- `grid.test.ts` — remaining capacity decreases as demand rises; shortfall ≥ 0; unknown
  capacity stays unknown; diversity factor ≤ 1 never exceeds the raw sum.
- `water.test.ts` — consistent units; monotonic in WUE; water-based cooling is most intensive.
- `scoring.test.ts` — score ∈ [0,100]; **missing data never receives an invented favorable
  score** (it lowers evidence coverage instead).
- `eo658.test.ts` — 20 below, **25 not automatically above**, 30 above; tax exemption kept
  separate from the EO 658 threshold.
- `geo/analysis.test.ts` — green-space % ∈ [0,100]; distances ≥ 0; null layers stay unavailable.

Run with `npm test`. CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, and build.

## 6. Specific examples of Kiro-generated / Kiro-improved functionality
- The entire **pure model layer** (`src/lib/model/*`) was generated from the spec's formulas
  and is fully unit- and property-tested.
- The **EO 658 rule engine** encodes the exact ">25 MW" threshold and categorizes findings
  (Potentially applicable / Not triggered / More info required / Guidance under development).
- The **provenance system** (`src/lib/data/provenance.ts` + `ProvenanceChip`) enforces the
  model-integrity steering across every surfaced value.
- The **deterministic analyst** (`src/lib/analyst/deterministic.ts`) guarantees the AI feature
  works with no API key while the optional LLM path stays grounded in supplied context.

## Build-environment note
DataDaddy was assembled in a sandbox without npm-registry access, so dependency install,
typecheck, lint, tests, and `next build` are executed by the included GitHub Actions workflow
on standard runners (where npm is available) rather than inside the sandbox.
