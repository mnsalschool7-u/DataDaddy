import type { ScoringWeights } from "@/lib/schemas";
import { clamp } from "@/lib/geo/analysis";

/**
 * Transparent 0-100 screening score.
 *
 * Integrity rules:
 *  - A component whose inputs are unknown is EXCLUDED from the weighted average
 *    (its weight mass is removed) rather than scored as a favorable default.
 *  - evidenceCoverage reports how much weight mass had real inputs.
 *  - The score never overrides a documented exclusion and is not an approval.
 */

export interface ComponentInput {
  key: keyof ScoringWeights;
  label: string;
  /** Observed 0-100 score, or null if the inputs are unavailable. */
  score: number | null;
  reason: string;
}

export interface ScoredComponent extends ComponentInput {
  weight: number; // normalized weight actually applied
  contribution: number; // weight * score (0 if excluded)
  included: boolean;
}

export interface SiteAssessment {
  screeningScore: number; // 0..100
  evidenceCoverage: number; // 0..1 fraction of weight mass with real inputs
  components: ScoredComponent[];
  constraints: string[];
  advantages: string[];
  missingInfo: string[];
  mitigations: string[];
  /** A documented hard exclusion overrides the numeric score when present. */
  hardExclusion: string | null;
}

export function scoreSite(
  components: ComponentInput[],
  weights: ScoringWeights,
  opts?: {
    constraints?: string[];
    advantages?: string[];
    mitigations?: string[];
    hardExclusion?: string | null;
  },
): SiteAssessment {
  const included = components.filter((c) => c.score !== null);
  const totalWeightMass = components.reduce(
    (sum, c) => sum + (weights[c.key] ?? 0),
    0,
  );
  const includedWeightMass = included.reduce(
    (sum, c) => sum + (weights[c.key] ?? 0),
    0,
  );

  const evidenceCoverage =
    totalWeightMass > 0 ? includedWeightMass / totalWeightMass : 0;

  const scored: ScoredComponent[] = components.map((c) => {
    const rawWeight = weights[c.key] ?? 0;
    const isIncluded = c.score !== null && includedWeightMass > 0;
    const normWeight = isIncluded ? rawWeight / includedWeightMass : 0;
    const contribution = isIncluded ? normWeight * (c.score as number) : 0;
    return {
      ...c,
      weight: normWeight,
      contribution,
      included: isIncluded,
    };
  });

  const screeningScore =
    includedWeightMass > 0
      ? clamp(
          scored.reduce((sum, c) => sum + c.contribution, 0),
          0,
          100,
        )
      : 0;

  const missingInfo = components
    .filter((c) => c.score === null)
    .map((c) => `${c.label}: ${c.reason}`);

  return {
    screeningScore,
    evidenceCoverage,
    components: scored,
    constraints: (opts?.constraints ?? []).slice(0, 3),
    advantages: (opts?.advantages ?? []).slice(0, 3),
    missingInfo,
    mitigations: opts?.mitigations ?? [],
    hardExclusion: opts?.hardExclusion ?? null,
  };
}
