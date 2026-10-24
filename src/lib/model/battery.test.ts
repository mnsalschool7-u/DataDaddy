import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeBattery, BATTERY_PROFILES } from "./battery";
import { computeEnergy } from "./energy";
import { DEFAULT_PROJECT, type BatteryStorage } from "@/lib/schemas";

function run(battery: BatteryStorage, mw = 40) {
  const project = { ...DEFAULT_PROJECT, battery, peakFacilityMW: mw };
  return computeBattery(project, computeEnergy(project));
}

describe("computeBattery — integrity", () => {
  it("no battery: no peak shave, no extra energy", () => {
    const r = run("none");
    expect(r.peakShavedMW).toBe(0);
    expect(r.effectivePeakGridMW).toBe(40);
    expect(r.annualChargingLossMWh).toBe(0);
  });

  it("a battery never REMOVES total grid energy (round-trip losses add energy)", () => {
    const project = { ...DEFAULT_PROJECT, battery: "significant" as const };
    const energy = computeEnergy(project);
    const r = computeBattery(project, energy);
    expect(r.annualGridEnergyMWh).toBeGreaterThanOrEqual(energy.annualFacilityMWh);
    expect(r.annualChargingLossMWh).toBeGreaterThan(0);
  });

  it("battery shaves peak grid demand but never below zero", () => {
    const r = run("significant");
    expect(r.effectivePeakGridMW).toBeLessThan(40);
    expect(r.effectivePeakGridMW).toBeGreaterThan(0);
    expect(r.peakShavedMW).toBeCloseTo(40 * BATTERY_PROFILES.significant.peakShaveFraction, 6);
  });

  it("larger battery shaves at least as much peak as a smaller one", () => {
    expect(run("significant").peakShavedMW).toBeGreaterThanOrEqual(run("moderate").peakShavedMW);
  });
});

describe("computeBattery — properties", () => {
  const batteries: BatteryStorage[] = ["none", "moderate", "significant"];
  it("effective peak grid MW is always in [0, facility peak]; energy never decreases", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...batteries),
        fc.double({ min: 5, max: 200, noNaN: true }),
        (b, mw) => {
          const project = { ...DEFAULT_PROJECT, battery: b, peakFacilityMW: mw };
          const energy = computeEnergy(project);
          const r = computeBattery(project, energy);
          expect(r.effectivePeakGridMW).toBeGreaterThanOrEqual(0);
          expect(r.effectivePeakGridMW).toBeLessThanOrEqual(mw + 1e-6);
          expect(r.annualGridEnergyMWh).toBeGreaterThanOrEqual(energy.annualFacilityMWh - 1e-6);
          expect(r.annualChargingLossMWh).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});
