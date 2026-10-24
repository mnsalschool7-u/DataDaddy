# DataDaddy — Model Integrity Steering (CRITICAL)

Every output must clearly distinguish four classes of information. This is the product's
core credibility and a hard requirement.

## Provenance labels (use the `Provenance` type everywhere)
- `official`      — Official source (cite publisher + URL + retrieval date).
- `calculated`    — Deterministic math from inputs.
- `assumption`    — User-entered or illustrative scenario assumption.
- `estimated`     — Modeled estimate with stated assumptions.
- `unknown`       — Information not available; MUST stay unknown, never defaulted.
- `requires-confirmation` — e.g. "Requires utility confirmation".

## Hard rules — never violate
- Never claim exact available grid capacity unless user-supplied or sourced.
- If local capacity is unknown, display "Local available capacity unknown" — never 0 or ∞.
- Never predict actual electricity rate increases, rent/home-value changes, or health outcomes.
- Never present generic cooling assumptions as measured water use of a real facility.
- A screening color/score is NOT a permitting decision or legal approval.
- Missing data must never silently receive a favorable score; reduce confidence instead.
- A 25 MW project does NOT automatically exceed the "greater-than-25-MW" EO 658 threshold.
- Do not represent pending/proposed EO 658 implementation rules as finalized regulation.
- Do not combine the tax-exemption eligibility with EO 658's MW threshold.

## Map screening classes must be distinguished
Regulatory exclusion vs environmental constraint vs scenario capacity limit vs missing data.

## Methodology must be visible
A Data & Methodology page explains every formula, weight, and assumption openly.
Transparency is a feature, not a disclaimer to bury.
