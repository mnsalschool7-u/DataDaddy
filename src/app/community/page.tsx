"use client";
import { useMemo, useState } from "react";
import { Users, Home, Scale3d, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MUNICIPALITIES } from "@/lib/data/municipalities";
import { housingContextFor } from "@/lib/data/housing";
import { computeCost } from "@/lib/model/cost";
import { TRADEOFF_OPTIONS, evaluateTradeoff } from "@/lib/model/tradeoff";
import { Panel, PanelHeader, Metric } from "@/components/ui/Card";
import { Slider, NumberField } from "@/components/ui/Controls";
import { ProvenanceChip } from "@/components/ui/Provenance";
import { fmt, fmtUSD, fmtPct } from "@/lib/format";

export default function CommunityPage() {
  const [muni, setMuni] = useState("Worcester");
  const [costPerMW, setCostPerMW] = useState(2_000_000);
  const [incrementalMW, setIncrementalMW] = useState(20);
  const [devFrac, setDevFrac] = useState(1);
  const [households, setHouseholds] = useState(150_000);
  const [years, setYears] = useState(20);

  const housing = housingContextFor(muni);
  const cost = useMemo(
    () => computeCost({ costPerMW, incrementalMW, developerFundedFraction: devFrac, households, amortizationYears: years }),
    [costPerMW, incrementalMW, devFrac, households, years],
  );
  const tradeoffs = TRADEOFF_OPTIONS.map(evaluateTradeoff);
  const chartData = tradeoffs.map((t) => ({
    name: t.label,
    "Energy (GWh)": Number(t.annualGWh.toFixed(0)),
    "Water (ML)": Number(t.waterMillionLiters.toFixed(0)),
    "Clean %": Number(t.cleanCoveredPct.toFixed(0)),
  }));

  // Illustrative annual household exposure as a % of median rent (context only).
  const rentPctContext =
    housing && cost.annualHouseholdExposure > 0
      ? (cost.annualHouseholdExposure / (housing.medianRentUSD * 12)) * 100
      : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="text-accent" size={18} />
        <h1 className="text-base font-semibold">Community Impact</h1>
        <span className="text-xs text-muted">
          Development exposure &amp; land-use competition — not a prediction of rents, bills, or home values.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Cost sensitivity */}
        <Panel>
          <PanelHeader title="Infrastructure cost sensitivity (§8.1)" icon={<Scale3d size={13} />} />
          <div className="grid grid-cols-2 gap-3 p-3">
            <NumberField label="Upgrade cost / MW" value={costPerMW} min={0} step={100000} unit="$" onChange={(v) => setCostPerMW(v ?? 0)} />
            <NumberField label="Incremental capacity" value={incrementalMW} min={0} step={1} unit="MW" onChange={(v) => setIncrementalMW(v ?? 0)} />
            <Slider label="Developer-funded" value={devFrac} min={0} max={1} step={0.05} format={(v) => fmtPct(v)} onChange={setDevFrac} />
            <NumberField label="Households sharing" value={households} min={1} step={1000} onChange={(v) => setHouseholds(v ?? 1)} />
            <NumberField label="Amortization (yr)" value={years} min={1} step={1} unit="yr" onChange={(v) => setYears(v ?? 1)} />
          </div>
          <div className="grid grid-cols-3 gap-2 px-3 pb-3">
            <Metric label="Total upgrade" value={fmtUSD(cost.totalUpgradeCost)} provenance="assumption" />
            <Metric label="Non-developer" value={fmtUSD(cost.nonDeveloperAllocatedCost)} provenance="calculated" accent={cost.nonDeveloperAllocatedCost > 0 ? "caution" : "favorable"} />
            <Metric label="Household/yr" value={fmtUSD(cost.annualHouseholdExposure)} sub="illustrative" provenance="estimated" accent="caution" />
          </div>
          <p className="px-3 pb-3 text-[10px] leading-snug text-muted">
            Simplified financial sensitivity model, NOT a forecast of actual household
            electricity bills or approved utility rates. Full developer funding → $0 exposure.
          </p>
        </Panel>

        {/* Housing / population context */}
        <Panel>
          <PanelHeader title="Residential & institutional context (§8.2)" icon={<Home size={13} />} />
          <div className="p-3">
            <label className="block">
              <div className="text-[11px] uppercase tracking-wide text-muted">Municipality</div>
              <select value={muni} onChange={(e) => setMuni(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm">
                {MUNICIPALITIES.map((m) => (<option key={m.name} value={m.name}>{m.name}</option>))}
              </select>
            </label>
            {housing ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Metric label="Population" value={fmt(MUNICIPALITIES.find((m) => m.name === muni)?.population ?? 0)} provenance="official" accent="muted" />
                  <Metric label="Housing units" value={fmt(housing.housingUnits)} provenance="official" accent="muted" />
                  <Metric label="Median gross rent" value={`${fmtUSD(housing.medianRentUSD)}/mo`} sub="current context" provenance="official" accent="muted" />
                  <Metric label="Median hh income" value={`${fmtUSD(housing.medianHouseholdIncomeUSD)}/yr`} sub="current context" provenance="official" accent="muted" />
                </div>
                {rentPctContext != null && (
                  <p className="mt-2 rounded border border-border bg-panel-2/40 px-2 py-1.5 text-[11px] text-content">
                    For scale only: the illustrative household exposure of{" "}
                    {fmtUSD(cost.annualHouseholdExposure)}/yr is ~{fmt(rentPctContext, 1)}% of one
                    year of median rent here. This is a magnitude comparison, not a predicted bill or rent change.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-[11px] text-muted">Housing context <ProvenanceChip provenance="unknown" /> unavailable for this municipality in the demo subset.</p>
            )}
            <p className="mt-2 text-[10px] leading-snug text-muted">
              DataDaddy measures development exposure and land-use competition. It does
              not predict changes in rents or home values without an independently supported causal model.
            </p>
          </div>
        </Panel>
      </div>

      {/* Tradeoff analysis */}
      <Panel className="mt-3">
        <PanelHeader title="Tradeoff analysis (§8.3)" />
        <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 30, left: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#8ba0bf", fontSize: 9 }} interval={0} angle={-12} height={50} />
                <YAxis tick={{ fill: "#8ba0bf", fontSize: 9 }} width={34} />
                <Tooltip contentStyle={{ background: "#141b2b", border: "1px solid #273349", borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Energy (GWh)" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Water (ML)" fill="#34d399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Clean %" fill="#fbbf24" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {tradeoffs.map((t, i) => (
              <div key={t.id} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-content">{t.label}</span>
                  <span className={`text-[10px] ${t.eo658Triggered ? "text-caution" : "text-muted"}`}>
                    {t.eo658Triggered ? "EO 658 >25 MW" : "at/below 25 MW"}
                  </span>
                </div>
                <div className="tabular mt-1 text-[11px] text-muted">
                  {fmt(t.annualGWh, 0)} GWh · {fmt(t.waterMillionLiters, 0)} ML water · {fmt(t.cleanCoveredPct, 0)}% clean (assumption)
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  <span className="text-content/80">Stays uncertain:</span> {t.uncertain.join("; ")}
                </div>
                {TRADEOFF_OPTIONS[i] && <div className="mt-1 text-[10px] text-muted">{TRADEOFF_OPTIONS[i].description}</div>}
              </div>
            ))}
          </div>
        </div>
        <p className="px-3 pb-3 text-[10px] leading-snug text-muted">
          Tradeoffs show competing modeled consequences and which factors remain uncertain —
          the goal is to inform, not to label development good or bad.
        </p>
      </Panel>
    </div>
  );
}
