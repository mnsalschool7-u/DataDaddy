"use client";
import { MapPin, Leaf, Zap, Droplets, Scale, Brain } from "lucide-react";
import { useSimulation } from "@/components/SimulationProvider";
import { Panel, PanelHeader, Metric } from "@/components/ui/Card";
import { PolicyNavigator } from "./PolicyNavigator";
import { AnalystPanel } from "./AnalystPanel";
import { fmt, fmtGWh, fmtMWh, fmtLiters, fmtMW, fmtPct } from "@/lib/format";

export function RightSidebar() {
  const { site, geo, result, grid } = useSimulation();

  if (!site) {
    return (
      <aside className="no-print flex w-96 shrink-0 flex-col items-center justify-center gap-3 border-l border-border bg-bg/60 p-6 text-center">
        <MapPin className="text-muted" size={28} />
        <h2 className="text-sm font-semibold text-content">No location selected</h2>
        <p className="text-xs text-muted">
          Click a point on the Massachusetts map or search a municipality to open
          the site intelligence panel and run the simulation.
        </p>
      </aside>
    );
  }

  const gs = geo.greenSpace;
  const sc = geo.schools;
  const ej = geo.ej;

  return (
    <aside className="no-print flex w-96 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-bg/60 p-3">
      {/* Site intelligence */}
      <Panel>
        <PanelHeader title="Site intelligence" icon={<MapPin size={13} />} />
        <div className="p-2.5">
          <div className="text-sm font-semibold text-content">{site.name}</div>
          <div className="tabular mt-0.5 text-[11px] text-muted">
            {site.lat.toFixed(4)}, {site.lng.toFixed(4)} · radius {site.radiusMiles} mi
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Metric
              label="Screening score"
              value={fmt(result.assessment.screeningScore, 0)}
              sub={`Evidence coverage ${fmtPct(result.assessment.evidenceCoverage)}`}
              accent={
                result.assessment.screeningScore >= 66
                  ? "favorable"
                  : result.assessment.screeningScore >= 40
                    ? "caution"
                    : "risk"
              }
              provenance="estimated"
            />
            <Metric
              label="Annual electricity"
              value={fmtGWh(result.energy.annualFacilityMWh)}
              sub="Total facility demand"
              provenance="calculated"
            />
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted">
            Screening score is a product-defined preliminary model, not a permitting
            decision. Missing inputs lower evidence coverage rather than inflating the score.
          </p>
        </div>
      </Panel>

      {/* Environmental & geographic indicators */}
      <Panel>
        <PanelHeader title="Environmental context" icon={<Leaf size={13} />} />
        <div className="grid grid-cols-2 gap-2 p-2.5">
          <Metric
            label={`Open space (${site.radiusMiles} mi)`}
            value={gs?.dataAvailable ? fmtPct(gs.coveragePercent / 100, 1) : "Unknown"}
            sub={gs?.dataAvailable ? `${fmt(gs.openSpaceAcres, 0)} ac mapped` : "Layer unavailable"}
            accent={gs?.dataAvailable ? "favorable" : "muted"}
            provenance={gs?.dataAvailable ? "official" : "unknown"}
          />
          <Metric
            label="Analysis area"
            value={gs ? `${fmt(gs.analysisAreaSqMiles, 1)} mi²` : "—"}
            sub={gs?.dataAvailable ? `${fmt(gs.openSpaceAcresPerSqMile, 0)} ac/mi²` : undefined}
            provenance="calculated"
          />
          <Metric
            label="Schools ≤ 1 mi"
            value={sc?.dataAvailable ? fmt(sc.within1Mile, 0) : "Unknown"}
            sub={sc?.dataAvailable ? `${fmt(sc.within3Miles, 0)} within 3 mi` : "Layer unavailable"}
            accent={sc?.dataAvailable && sc.within1Mile > 0 ? "caution" : "muted"}
            provenance={sc?.dataAvailable ? "official" : "unknown"}
          />
          <Metric
            label="Nearest school"
            value={
              sc?.nearestDistanceMiles != null
                ? `${fmt(sc.nearestDistanceMiles, 2)} mi`
                : "Unknown"
            }
            sub={sc?.nearestName ?? undefined}
            provenance={sc?.dataAvailable ? "calculated" : "unknown"}
          />
          <Metric
            label="Environmental justice"
            value={
              ej?.dataAvailable ? (ej.overlaps ? "Within EJ" : "No overlap") : "Unknown"
            }
            sub={ej?.overlaps ? ej.names[0] : ej?.dataAvailable ? "In mapped subset" : "Layer unavailable"}
            accent={ej?.overlaps ? "caution" : "muted"}
            provenance={ej?.dataAvailable ? "official" : "unknown"}
          />
          <Metric
            label="Flood hazard"
            value="Unknown"
            sub="Layer unavailable"
            accent="muted"
            provenance="unknown"
          />
          <p className="col-span-2 text-[10px] leading-snug text-muted">
            Open-space datasets do not include every tree, lawn, or undeveloped
            parcel. Absence of mapped features is not proof of absence on the ground.
          </p>
        </div>
      </Panel>

      {/* Energy & water results */}
      <Panel>
        <PanelHeader title="Energy & water" icon={<Zap size={13} />} />
        <div className="grid grid-cols-2 gap-2 p-2.5">
          <Metric
            label="Facility demand"
            value={fmtGWh(result.energy.annualFacilityMWh)}
            sub={`${fmtMWh(result.energy.annualFacilityMWh)}/yr`}
            provenance="calculated"
          />
          <Metric
            label="IT demand (via PUE)"
            value={fmtGWh(result.energy.annualItMWh)}
            sub={`PUE basis; distinct from facility`}
            provenance="calculated"
          />
          <Metric
            label="Clean-energy gap"
            value={fmtGWh(result.cleanEnergy.uncoveredMWh)}
            sub={`${fmtPct(result.cleanEnergy.coveredFraction)} covered (assumption)`}
            accent="caution"
            provenance="estimated"
          />
          <Metric
            label="Modeled water use"
            value={fmtLiters(result.water.annualWaterLiters)}
            sub={<span className="flex items-center gap-1"><Droplets size={10} />{fmtLiters(result.water.dailyAverageLiters)}/day</span>}
            accent="accent"
            provenance="estimated"
          />
        </div>
      </Panel>

      {/* Grid scenario */}
      <Panel>
        <PanelHeader title="Grid capacity" icon={<Zap size={13} />} />
        <div className="p-2.5">
          <div
            className={`rounded-md border px-2.5 py-2 text-xs ${
              !grid.availableCapacityMW
                ? "border-excluded/40 bg-excluded/10 text-muted"
                : result.grid.exceeded
                  ? "border-risk/40 bg-risk/10 text-risk"
                  : "border-favorable/40 bg-favorable/10 text-favorable"
            }`}
          >
            {result.grid.statusMessage}
          </div>
          {result.grid.capacityKnown && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Metric
                label="Cumulative demand"
                value={fmtMW(result.grid.cumulativeProposedMW)}
                provenance="assumption"
              />
              <Metric
                label={result.grid.exceeded ? "Shortfall" : "Remaining"}
                value={
                  result.grid.exceeded
                    ? fmtMW(result.grid.shortfallMW ?? 0)
                    : fmtMW(result.grid.remainingCapacityMW ?? 0)
                }
                accent={result.grid.exceeded ? "risk" : "favorable"}
                provenance="calculated"
              />
            </div>
          )}
          <p className="mt-2 text-[10px] leading-snug text-muted">
            Capacity is a simulated scenario constraint, not verified grid
            saturation. Configure it in the bottom panel (Grid scenario).
          </p>
        </div>
      </Panel>

      {/* Policy navigator */}
      <Panel>
        <PanelHeader title="Massachusetts Policy Navigator" icon={<Scale size={13} />} />
        <PolicyNavigator evaluation={result.policy} compact />
      </Panel>

      {/* AI analyst */}
      <Panel>
        <PanelHeader title="DataDaddy Intelligence" icon={<Brain size={13} />} />
        <AnalystPanel />
      </Panel>
    </aside>
  );
}
