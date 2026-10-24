/**
 * Provenance labels are a core credibility feature of DataDaddy.
 * Every value surfaced to the user should carry one of these labels so that
 * real data, calculations, user assumptions, modeled estimates, and unknowns
 * are never confused with one another.
 *
 * See .kiro/steering/model-integrity.md
 */
export type Provenance =
  | "official" // from an official / cited source
  | "calculated" // deterministic math from inputs
  | "assumption" // user-entered or illustrative scenario assumption
  | "estimated" // modeled estimate with stated assumptions
  | "unknown" // not available; MUST remain unknown, never defaulted
  | "requires-confirmation"; // e.g. "Requires utility confirmation"

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  official: "Official source",
  calculated: "Calculated",
  assumption: "Scenario assumption",
  estimated: "Estimated",
  unknown: "Unknown",
  "requires-confirmation": "Requires utility confirmation",
};

/** A single value tagged with its provenance and an optional unit/source. */
export interface Tagged<T = number> {
  value: T;
  provenance: Provenance;
  unit?: string;
  /** Optional id referencing a DataSource in the registry. */
  sourceId?: string;
  /** Short human note, e.g. assumption rationale. */
  note?: string;
}

export function tag<T>(
  value: T,
  provenance: Provenance,
  extra?: Partial<Omit<Tagged<T>, "value" | "provenance">>,
): Tagged<T> {
  return { value, provenance, ...extra };
}

/** Explicit sentinel for values that must stay unknown rather than defaulting. */
export const UNKNOWN: Tagged<null> = { value: null, provenance: "unknown" };
