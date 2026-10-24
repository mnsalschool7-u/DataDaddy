# DataDaddy — Requirements

## Introduction
DataDaddy is a geospatial decision-support platform for siting data centers in
Massachusetts and modeling their infrastructure, environmental, community, and regulatory
consequences. Requirements use EARS-style acceptance criteria. Model integrity
(real data vs. assumption vs. calculation vs. unknown) is a cross-cutting requirement.

## R1 — Interactive Massachusetts map
**User story:** As a developer, I want an interactive MA map so I can explore candidate sites.
- WHEN the app loads, THE SYSTEM SHALL render an interactive map centered on Massachusetts
  with zoom, pan, and a legend.
- WHEN a user searches for a Massachusetts municipality, THE SYSTEM SHALL locate and focus it.
- WHEN a user clicks a supported location, THE SYSTEM SHALL open a site intelligence panel.
- THE SYSTEM SHALL label the legend as a preliminary screening model, not a permit decision.

## R2 — Real Massachusetts datasets
- WHEN the app loads, THE SYSTEM SHALL load at least two real MA geographic datasets
  (municipal boundaries, open space, schools, or EJ populations).
- IF a dataset cannot be retrieved, THEN THE SYSTEM SHALL mark that layer unavailable and
  continue functioning with the datasets that did load (never fabricate official data).
- THE SYSTEM SHALL record source URL, publisher, and retrieval date for each dataset.

## R3 — Project simulator & energy calculation
- WHEN a user changes proposed MW demand, THE SYSTEM SHALL immediately recalculate annual
  electricity consumption using `annualEnergyMWh = peakMW × 8760 × utilization`.
- WHEN a user changes utilization, PUE, cooling, clean-energy %, footprint, or financing,
  THE SYSTEM SHALL recalculate affected outputs live.
- THE SYSTEM SHALL distinguish total facility demand from IT-equipment demand (via PUE).
- For a 40 MW facility at 85% utilization THE SYSTEM SHALL report 297.84 GWh/yr.

## R4 — Green-space radius analysis
- WHEN a user selects a location and radius (1/3/5 mi), THE SYSTEM SHALL compute, from real
  open-space geometry via spatial intersection: analysis area (sq mi), mapped open-space
  acreage, acreage per sq mi, and % of area covered.
- THE SYSTEM SHALL state that open-space datasets exclude many trees/lawns/undeveloped parcels.

## R5 — Schools & residential proximity
- WHEN a user selects a location, THE SYSTEM SHALL compute schools within 1 mi and 3 mi and
  distance to the nearest mapped school from real point data.
- THE SYSTEM SHALL treat school proximity as a planning consideration, never auto-illegal.

## R6 — Water-use model
- WHEN a user changes cooling tech or WUE, THE SYSTEM SHALL recompute annual and daily water
  use as `annualWaterLiters = annualITEnergyKWh × WUE`, labeled as modeled estimate.
- THE SYSTEM SHALL never present a generic cooling assumption as a real facility's measured use.

## R7 — Grid capacity & saturation model
- Mode A (public screening): WHEN local capacity is unknown, THE SYSTEM SHALL display
  "Local available capacity unknown" and never substitute 0 or unlimited.
- Mode B (hypothetical): WHEN a user supplies available capacity and demands, THE SYSTEM
  SHALL compute `remaining = available - cumulativeProposed`; IF proposed exceeds available,
  THEN show "Capacity exceeded under current scenario assumptions" and the MW shortfall,
  labeled a simulated constraint (not verified saturation).
- THE SYSTEM SHALL support cumulative multi-project demand with optional diversity factor.

## R8 — Community economic impact
- WHEN a user supplies cost/MW, capacity, developer-funded %, households, and amortization,
  THE SYSTEM SHALL compute total upgrade cost, non-developer allocation, and an illustrative
  `annualHouseholdExposure = nonDeveloperAllocated / (households × years)`, labeled a
  simplified sensitivity model (not a bill forecast).

## R9 — Massachusetts regulatory intelligence
- WHEN project specs potentially trigger EO 658, THE SYSTEM SHALL display relevant
  considerations with source links and categorize each finding (Potentially applicable /
  Not triggered / More information required / Guidance under development).
- A 25 MW project SHALL NOT be reported as exceeding the ">25 MW" threshold; 30 MW SHALL.
- THE SYSTEM SHALL keep the Qualified Data Center Tax Exemption separate from EO 658.

## R10 — Site comparison & scoring
- WHEN two sites are selected, THE SYSTEM SHALL show side-by-side metrics using the same
  project config by default, with per-site overrides allowed.
- THE SYSTEM SHALL compute a transparent 0–100 screening score from weighted components
  (land/env 30, infra fit 25, community 20, resource 15, data readiness 10), with
  user-adjustable weights, and SHALL show component contributions.
- IF infrastructure data is unknown, THEN THE SYSTEM SHALL compute a partial score with
  reduced confidence — never an invented favorable value. A score SHALL NOT override a
  documented exclusion or claim legal approval.

## R11 — Scenario Lab
- THE SYSTEM SHALL provide >=4 scenarios (conventional, clean energy, low water, phased)
  with energy, water, clean-energy, capacity, cost, env, and regulatory outputs, charts,
  and the ability to save scenarios in browser-local state.

## R12 — DataDaddy Intelligence (AI analyst)
- WHEN asked an analytical question, THE SYSTEM SHALL answer using actual simulation outputs
  and geo data, returning: conclusion, supporting numbers, geographic evidence, regulatory
  considerations, uncertainty/missing data, and inputs to change.
- IF no AI key is configured, THEN THE SYSTEM SHALL use a deterministic explanation generator.
- THE SYSTEM SHALL NOT invent grid headroom, permits, rates, or impacts.

## R13 — Exportable report
- WHEN a user exports an assessment, THE SYSTEM SHALL produce a printable report including
  specs, energy, water, clean-energy, capacity sensitivity, geo context, proximity, MA
  regulatory considerations, screening findings, uncertainties, and data-source citations,
  with calculation assumptions and provenance. It SHALL never claim certification/approval.

## R14 — Provenance & methodology
- THE SYSTEM SHALL label every value with provenance (official/calculated/assumption/
  estimated/unknown/requires-confirmation) and provide a visible Methodology page.

## R15 — Quality
- THE SYSTEM SHALL build successfully, pass tsc + ESLint, and include unit + property-based
  tests (fast-check) over the model and geo modules.
