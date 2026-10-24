# DataDaddy — Product Steering

## What it is
DataDaddy is an AI-powered geospatial intelligence platform that evaluates where data
centers should be developed across Massachusetts and models how their construction and
operation could affect electrical infrastructure, environmental sustainability, green
space, nearby communities, and local economic conditions.

**Taglines**
- Primary: "Putting data centers in their place."
- Secondary: "Intelligence for where AI infrastructure belongs."

## Central question
"Where can Massachusetts sustainably accommodate new data centers, and what happens to
the surrounding community when one is built?"

## Users
Infrastructure developers, institutional investors, municipal governments, policymakers,
universities, and researchers.

## Core capabilities (what must work)
1. Geospatial site selection over a real Massachusetts map.
2. Infrastructure capacity modeling (public screening + hypothetical scenario modes).
3. Community & environmental impact (green space, schools, EJ, cost sensitivity).
4. Interactive scenario simulation (size, cooling, clean energy, phasing).
5. Massachusetts regulatory intelligence (Executive Order 658 + tax exemption).

## Hackathon priorities (strict order)
- P1 (must work): app launches, MA map renders, municipality search, location select,
  >=2 real MA datasets load, project controls, live energy calc, geographic context panel,
  site comparison, regulatory panel, real `.kiro` artifacts.
- P2 (high value): green-space radius analysis, school proximity, water model, grid
  scenario model, screening score, AI analyst explanations, exportable report, property tests.
- P3 (if time): more live layers, grid stress viz, cost-allocation, persisted scenarios.

A working map + simulation engine beats many superficial features.
