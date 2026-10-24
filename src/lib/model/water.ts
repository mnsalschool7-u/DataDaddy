import type { CoolingTech } from "@/lib/schemas";
import type { EnergyResult } from "@/lib/model/energy";

/**
 * Illustrative WUE defaults (liters of water per kWh of IT electricity).
 * These are MODELED assumptions, not measured values for any real facility.
 * Ordering reflects typical relative water intensity by cooling approach.
 */
export const COOLING_WUE_DEFAULTS: Record<CoolingTech, number> = {
  air: 0.1, // air-cooled: low direct water use
  "closed-loop-liquid": 0.2, // recirculating liquid: low makeup water
  hybrid: 0.5, // mixed economizer/evaporative
  water: 1.8, // evaporative / water-based: highest
};

export const COOLING_LABELS: Record<CoolingTech, string> = {
  air: "Air cooled",
  water: "Water based",
  hybrid: "Hybrid",
  "closed-loop-liquid": "Closed-loop liquid cooling",
};

export interface WaterResult {
  wue: number; // L per kWh IT
  annualWaterLiters: number;
  annualWaterCubicMeters: number;
  /** US gallons for readability. 1 m^3 = 264.172 gal. */
  annualWaterGallons: number;
  dailyAverageLiters: number;
}

/**
 *   annualWaterLiters = annualItEnergyKWh * WUE
 * IT energy from the energy model is in MWh; 1 MWh = 1000 kWh.
 */
export function computeWater(energy: EnergyResult, wue: number): WaterResult {
  const annualItKWh = energy.annualItMWh * 1000;
  const annualWaterLiters = annualItKWh * wue;
  const annualWaterCubicMeters = annualWaterLiters / 1000;
  return {
    wue,
    annualWaterLiters,
    annualWaterCubicMeters,
    annualWaterGallons: annualWaterCubicMeters * 264.172,
    dailyAverageLiters: annualWaterLiters / 365,
  };
}

/** Compare water use across all cooling profiles for sensitivity display. */
export function waterSensitivity(
  energy: EnergyResult,
): Array<{ cooling: CoolingTech; label: string; annualWaterLiters: number }> {
  return (Object.keys(COOLING_WUE_DEFAULTS) as CoolingTech[]).map((cooling) => ({
    cooling,
    label: COOLING_LABELS[cooling],
    annualWaterLiters: computeWater(energy, COOLING_WUE_DEFAULTS[cooling])
      .annualWaterLiters,
  }));
}
