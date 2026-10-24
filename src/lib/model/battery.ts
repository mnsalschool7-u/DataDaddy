import type { BatteryStorage, DataCenterProject } from "@/lib/schemas";
import type { EnergyResult } from "@/lib/model/energy";

/**
 * Battery storage model (§6.1).
 *
 * Integrity rule: a battery does NOT eliminate grid demand. It shifts demand in
 * time — shaving peak grid draw during dispatch while ADDING charging energy
 * (round-trip losses mean total annual grid energy slightly INCREASES, never
 * decreases). We model that explicitly rather than pretending storage removes load.
 */

export interface BatteryProfile {
  /** Fraction of facility peak the battery can shave during dispatch (0..1). */
  peakShaveFraction: number;
  /** Hours per day the battery dispatches to shave peak. */
  dailyDispatchHours: number;
  /** Round-trip efficiency (0..1); losses add to charging energy. */
  roundTripEfficiency: number;
}

export const BATTERY_PROFILES: Record<BatteryStorage, BatteryProfile> = {
  none: { peakShaveFraction: 0, dailyDispatchHours: 0, roundTripEfficiency: 1 },
  moderate: { peakShaveFraction: 0.1, dailyDispatchHours: 2, roundTripEfficiency: 0.88 },
  significant: { peakShaveFraction: 0.2, dailyDispatchHours: 4, roundTripEfficiency: 0.86 },
};

export const BATTERY_LABELS: Record<BatteryStorage, string> = {
  none: "None",
  moderate: "Moderate",
  significant: "Significant",
};

export interface BatteryResult {
  profile: BatteryStorage;
  /** Peak grid demand after dispatch shaving, MW (<= facility peak). */
  effectivePeakGridMW: number;
  /** MW of peak shaved by dispatch. */
  peakShavedMW: number;
  /** Extra annual charging energy incl. round-trip losses, MWh (>= 0). */
  annualChargingLossMWh: number;
  /**
   * Total annual grid energy the facility pulls, MWh. Equal to facility energy
   * plus round-trip charging losses — storage never reduces total energy.
   */
  annualGridEnergyMWh: number;
}

/**
 * Compute battery effects on PEAK grid demand and TOTAL grid energy.
 * - Peak grid MW is reduced by dispatch (demand shifted, not removed).
 * - Total grid energy rises by round-trip losses on the energy cycled.
 */
export function computeBattery(
  project: DataCenterProject,
  energy: EnergyResult,
): BatteryResult {
  const p = BATTERY_PROFILES[project.battery];
  const peakShavedMW = project.peakFacilityMW * p.peakShaveFraction;
  const effectivePeakGridMW = project.peakFacilityMW - peakShavedMW;

  // Energy cycled through the battery per year (MWh) = shaved MW * dispatch h/day * 365.
  const cycledMWh = peakShavedMW * p.dailyDispatchHours * 365;
  // Losses that must be drawn from the grid to recharge.
  const annualChargingLossMWh =
    p.roundTripEfficiency > 0 ? cycledMWh * (1 / p.roundTripEfficiency - 1) : 0;

  return {
    profile: project.battery,
    effectivePeakGridMW,
    peakShavedMW,
    annualChargingLossMWh,
    annualGridEnergyMWh: energy.annualFacilityMWh + annualChargingLossMWh,
  };
}
