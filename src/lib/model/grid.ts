import type { GridScenario } from "@/lib/schemas";

export interface GridResult {
  mode: GridScenario["mode"];
  /** Whether available capacity is known (user-supplied/sourced) at all. */
  capacityKnown: boolean;
  availableCapacityMW: number | null;
  /** Cumulative proposed peak demand after diversity factor, MW. */
  cumulativeProposedMW: number;
  /** remaining = available - cumulativeProposed. null when capacity unknown. */
  remainingCapacityMW: number | null;
  /** max(0, cumulativeProposed - available). null when capacity unknown. */
  shortfallMW: number | null;
  exceeded: boolean;
  statusMessage: string;
}

/**
 * Grid capacity / saturation model.
 *
 * Integrity rule: if availableCapacityMW is null, capacity stays UNKNOWN —
 * it is never silently treated as 0 or unlimited. We do not label a zone as
 * capacity-constrained without user-supplied or sourced capacity.
 *
 * cumulativeProposed = (existingLoad + priorDataCenters + newProposed) * diversity
 */
export function computeGrid(
  scenario: GridScenario,
  newProposedPeakMW: number,
): GridResult {
  const rawCumulative =
    scenario.existingLoadMW + scenario.priorDataCenterMW + newProposedPeakMW;
  const cumulativeProposedMW = rawCumulative * scenario.diversityFactor;

  const capacityKnown = scenario.availableCapacityMW !== null;

  if (!capacityKnown) {
    return {
      mode: scenario.mode,
      capacityKnown: false,
      availableCapacityMW: null,
      cumulativeProposedMW,
      remainingCapacityMW: null,
      shortfallMW: null,
      exceeded: false,
      statusMessage: "Local available capacity unknown",
    };
  }

  const available = scenario.availableCapacityMW as number;
  const remainingCapacityMW = available - cumulativeProposedMW;
  const shortfallMW = Math.max(0, cumulativeProposedMW - available);
  const exceeded = cumulativeProposedMW > available;

  return {
    mode: scenario.mode,
    capacityKnown: true,
    availableCapacityMW: available,
    cumulativeProposedMW,
    remainingCapacityMW,
    shortfallMW,
    exceeded,
    statusMessage: exceeded
      ? "Capacity exceeded under current scenario assumptions"
      : "Within modeled scenario capacity",
  };
}

/** Sum of a set of hypothetical projects' peak MW, with diversity factor. */
export function cumulativePeak(peaks: number[], diversityFactor = 1): number {
  const sum = peaks.reduce((a, b) => a + b, 0);
  return sum * diversityFactor;
}
