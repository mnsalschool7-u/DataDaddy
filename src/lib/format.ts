export function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtGWh(mwh: number): string {
  return `${fmt(mwh / 1000, 2)} GWh`;
}

export function fmtMWh(mwh: number): string {
  return `${fmt(mwh, 0)} MWh`;
}

export function fmtMW(mw: number): string {
  return `${fmt(mw, 1)} MW`;
}

export function fmtLiters(l: number): string {
  if (l >= 1_000_000) return `${fmt(l / 1_000_000, 2)} million L`;
  return `${fmt(l, 0)} L`;
}

export function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${fmt(n / 1_000_000, 2)}M`;
  return `$${fmt(n, 0)}`;
}

export function fmtPct(fraction0to1: number, digits = 0): string {
  return `${fmt(fraction0to1 * 100, digits)}%`;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Household sensitivities need cents so small real modeled changes stay visible. */
export function fmtMoney(n: number): string {
  return Math.abs(n) >= 10000 ? fmtUSD(n) : `$${fmt(n, 2)}`;
}
