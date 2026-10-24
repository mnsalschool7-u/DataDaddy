"use client";
import { useState } from "react";
import {
  BarChart3,
  Calculator,
  Database,
  DollarSign,
  Zap,
  ChevronUp,
  ChevronDown,
  FileDown,
} from "lucide-react";
import { useSimulation } from "@/components/SimulationProvider";
import { NumberField, Slider, Select } from "@/components/ui/Controls";
import { DATA_SOURCES } from "@/lib/data/sources";
import { WaterSensitivityChart } from "@/components/charts/WaterSensitivityChart";
import { saveReportSnapshot } from "@/lib/report";
import { asset } from "@/lib/basePath";
import { cx, fmt, fmtUSD, fmtGWh, fmtLiters, fmtPct, fmtMW } from "@/lib/format";

type Tab = "calculations" | "grid" | "cost" | "charts" | "sources";

export function BottomPanel() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("calculations");
  const { result, project, grid, geo, cost, updateGrid, updateCost, site } = useSimulation();

  function openReport() {
    saveReportSnapshot({
      generatedAt: new Date().toISOString(),
      site,
      project,
      grid,
      geo,
      result,
    });
    window.open(asset("/report"), "_blank");
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "calculations", label: "Calculations", icon: Calculator },
    { id: "grid", label: "Grid scenario", icon: Zap },
    { id: "cost", label: "Community cost", icon: DollarSign },
    { id: "charts", label: "Charts", icon: BarChart3 },
    { id: "sources", label: "Sources", icon: Database },
  ];

  return (
    <div className="no-print flex shrink-0 flex-col border-t border-border bg-panel">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setOpen(true);
              }}
              className={cx(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
                open && tab === id
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-panel-2",
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openReport}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-content hover:bg-panel-2"
          >
            <FileDown size={13} /> Export report
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-1 text-muted hover:bg-panel-2"
            aria-label={open ? "Collapse panel" : "Expand panel"}
          >
            {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-border p-3 text-xs">
          {tab === "calculations" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 md:grid-cols-3">
              <Calc label="annualFacilityMWh = peakMW × 8760 × util">
                {fmt(project.peakFacilityMW)} × 8760 × {fmt(project.utilization, 2)} ={" "}
                {fmt(result.energy.annualFacilityMWh, 0)} MWh ({fmtGWh(result.energy.annualFacilityMWh)})
              </Calc>
              <Calc label="annualItMWh = facility / PUE">
                {fmt(result.energy.annualFacilityMWh, 0)} / {fmt(project.pue, 2)} ={" "}
                {fmt(result.energy.annualItMWh, 0)} MWh
              </Calc>
              <Calc label="clean coverage">
                {fmtPct(result.cleanEnergy.coveredFraction)} covered · uncovered{" "}
                {fmtGWh(result.cleanEnergy.uncoveredMWh)}
              </Calc>
              <Calc label="annualWaterLiters = IT kWh × WUE">
                {fmt(result.energy.annualItMWh * 1000, 0)} kWh × {fmt(project.wue, 2)} ={" "}
                {fmtLiters(result.water.annualWaterLiters)}
              </Calc>
              <Calc label="water daily average">
                {fmtLiters(result.water.dailyAverageLiters)} / day
              </Calc>
              <Calc label="screening score">
                {fmt(result.assessment.screeningScore, 1)} / 100 · coverage{" "}
                {fmtPct(result.assessment.evidenceCoverage)}
              </Calc>
            </div>
          )}

          {tab === "grid" && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Select
                label="Mode"
                value={grid.mode}
                options={[
                  { value: "public-screening", label: "A · Public screening" },
                  { value: "hypothetical", label: "B · Hypothetical scenario" },
                ]}
                onChange={(v) => updateGrid({ mode: v })}
              />
              <NumberField
                label="Available capacity (MW)"
                value={grid.availableCapacityMW}
                min={0}
                step={1}
                unit="MW"
                placeholder="unknown"
                onChange={(v) => updateGrid({ availableCapacityMW: v })}
              />
              <NumberField
                label="Existing assumed load (MW)"
                value={grid.existingLoadMW}
                min={0}
                step={1}
                unit="MW"
                onChange={(v) => updateGrid({ existingLoadMW: v ?? 0 })}
              />
              <NumberField
                label="Prior data-center load (MW)"
                value={grid.priorDataCenterMW}
                min={0}
                step={1}
                unit="MW"
                onChange={(v) => updateGrid({ priorDataCenterMW: v ?? 0 })}
              />
              <Slider
                label="Diversity factor"
                value={grid.diversityFactor}
                min={0}
                max={1}
                step={0.05}
                format={(v) => fmtPct(v)}
                onChange={(v) => updateGrid({ diversityFactor: v })}
              />
              <div className="col-span-2 self-end md:col-span-3">
                <div
                  className={cx(
                    "rounded-md border px-2.5 py-2 text-xs",
                    !grid.availableCapacityMW
                      ? "border-excluded/40 bg-excluded/10 text-muted"
                      : result.grid.exceeded
                        ? "border-risk/40 bg-risk/10 text-risk"
                        : "border-favorable/40 bg-favorable/10 text-favorable",
                  )}
                >
                  {result.grid.statusMessage}
                  {result.grid.capacityKnown && (
                    <>
                      {" · cumulative "}
                      {fmtMW(result.grid.cumulativeProposedMW)}
                      {result.grid.exceeded
                        ? ` · shortfall ${fmtMW(result.grid.shortfallMW ?? 0)}`
                        : ` · remaining ${fmtMW(result.grid.remainingCapacityMW ?? 0)}`}
                    </>
                  )}
                  <div className="mt-1 text-[10px] text-muted">
                    Simulated capacity constraint, not verified grid saturation.
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "cost" && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <NumberField
                label="Upgrade cost per MW"
                value={cost.costPerMW}
                min={0}
                step={100000}
                unit="$"
                onChange={(v) => updateCost({ costPerMW: v ?? 0 })}
              />
              <NumberField
                label="Incremental capacity"
                value={cost.incrementalMW}
                min={0}
                step={1}
                unit="MW"
                onChange={(v) => updateCost({ incrementalMW: v ?? 0 })}
              />
              <Slider
                label="Developer-funded"
                value={cost.developerFundedFraction}
                min={0}
                max={1}
                step={0.05}
                format={(v) => fmtPct(v)}
                onChange={(v) => updateCost({ developerFundedFraction: v })}
              />
              <NumberField
                label="Households sharing"
                value={cost.households}
                min={1}
                step={1000}
                onChange={(v) => updateCost({ households: v ?? 1 })}
              />
              <NumberField
                label="Amortization (years)"
                value={cost.amortizationYears}
                min={1}
                step={1}
                unit="yr"
                onChange={(v) => updateCost({ amortizationYears: v ?? 1 })}
              />
              {result.cost && (
                <div className="col-span-2 self-end rounded-md border border-border bg-panel-2/40 px-2.5 py-2 md:col-span-3">
                  Total upgrade {fmtUSD(result.cost.totalUpgradeCost)} · non-developer{" "}
                  {fmtUSD(result.cost.nonDeveloperAllocatedCost)} · illustrative household
                  exposure <span className="text-caution">{fmtUSD(result.cost.annualHouseholdExposure)}/yr</span>
                  <div className="mt-1 text-[10px] text-muted">
                    Simplified financial sensitivity model — NOT a forecast of actual
                    bills or approved utility rates. Full developer funding → $0 exposure.
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "charts" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">
                  Water use by cooling profile (modeled)
                </div>
                <WaterSensitivityChart data={result.waterSensitivity} />
              </div>
              <div className="flex flex-col justify-center gap-1.5">
                <div className="text-[11px] uppercase tracking-wide text-muted">
                  Clean-energy split (assumption)
                </div>
                <Bar label="Covered" value={result.cleanEnergy.coveredFraction} color="#34d399" />
                <Bar label="Uncovered" value={1 - result.cleanEnergy.coveredFraction} color="#f87171" />
                <div className="tabular mt-1 text-[11px] text-muted">
                  Requirement {fmtGWh(result.cleanEnergy.requirementMWh)} · additional
                  procurement {fmtGWh(result.cleanEnergy.additionalProcurementMWh)}
                </div>
              </div>
            </div>
          )}

          {tab === "sources" && (
            <ul className="space-y-1.5">
              {DATA_SOURCES.map((s) => (
                <li key={s.id} className="rounded-md border border-border px-2.5 py-1.5">
                  <div className="flex items-center justify-between">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
                      {s.name}
                    </a>
                    <span className={cx(
                      "rounded border px-1.5 py-0.5 text-[9px] uppercase",
                      s.status === "loaded" ? "border-favorable/40 text-favorable" : s.status === "reference-only" ? "border-accent/40 text-accent" : "border-excluded/40 text-muted",
                    )}>
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {s.publisher} · retrieved {s.retrievedDate}. {s.reliabilityLimitations}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!site && tab !== "sources" && tab !== "grid" && tab !== "cost" && (
            <p className="mt-2 text-[10px] text-muted">
              Showing scenario-level calculations. Select a location for geographic analysis.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Calc({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-border pl-2">
      <div className="font-mono text-[10px] text-muted">{label}</div>
      <div className="tabular text-content">{children}</div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{label}</span>
        <span className="tabular">{fmtPct(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-panel-2">
        <div className="h-full rounded" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}
