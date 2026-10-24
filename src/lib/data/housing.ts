/**
 * Housing / population CURRENT CONTEXT for demo municipalities (§8.2).
 *
 * Integrity rule: these are shown as *current context* only. DataDaddy does NOT
 * predict changes in rent or home values — it measures development exposure and
 * land-use competition, not proven housing-price effects. Values are curated,
 * attributed approximations (US Census / ACS-style ranges) for the demo subset.
 */
export interface HousingContext {
  municipality: string;
  /** Approximate median gross rent, USD/month (current context, not a forecast). */
  medianRentUSD: number;
  /** Approximate median household income, USD/yr (current context). */
  medianHouseholdIncomeUSD: number;
  /** Approximate number of housing units (context for cost-sharing scale). */
  housingUnits: number;
}

export const HOUSING_CONTEXT: Record<string, HousingContext> = {
  Worcester: { municipality: "Worcester", medianRentUSD: 1350, medianHouseholdIncomeUSD: 56000, housingUnits: 79000 },
  Lowell: { municipality: "Lowell", medianRentUSD: 1500, medianHouseholdIncomeUSD: 62000, housingUnits: 43000 },
  Boston: { municipality: "Boston", medianRentUSD: 1950, medianHouseholdIncomeUSD: 81000, housingUnits: 300000 },
  Springfield: { municipality: "Springfield", medianRentUSD: 1000, medianHouseholdIncomeUSD: 44000, housingUnits: 62000 },
  Cambridge: { municipality: "Cambridge", medianRentUSD: 2400, medianHouseholdIncomeUSD: 112000, housingUnits: 52000 },
  Framingham: { municipality: "Framingham", medianRentUSD: 1850, medianHouseholdIncomeUSD: 85000, housingUnits: 29000 },
  Marlborough: { municipality: "Marlborough", medianRentUSD: 1900, medianHouseholdIncomeUSD: 88000, housingUnits: 17000 },
  Fitchburg: { municipality: "Fitchburg", medianRentUSD: 1050, medianHouseholdIncomeUSD: 50000, housingUnits: 17000 },
  Leominster: { municipality: "Leominster", medianRentUSD: 1250, medianHouseholdIncomeUSD: 66000, housingUnits: 18000 },
  Chelmsford: { municipality: "Chelmsford", medianRentUSD: 1900, medianHouseholdIncomeUSD: 110000, housingUnits: 14000 },
};

export function housingContextFor(municipality?: string): HousingContext | null {
  if (!municipality) return null;
  return HOUSING_CONTEXT[municipality] ?? null;
}
