"use client";
import { useMemo, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import { MUNICIPALITIES } from "@/lib/data/municipalities";
import { DEFAULT_WEIGHTS, type Site } from "@/lib/schemas";
import { type AllLayers } from "@/lib/data/loader";
import { useSiteLayers } from "@/lib/data/useSiteLayers";
import { greenSpaceWithinRadius, schoolProximity, ejOverlap } from "@/lib/geo/analysis";
import { runSimulation, type GeoContext } from "@/lib/model/orchestrator";
import { Panel, PanelHeader, Metric } from "@/components/ui/Card";
import { fmt, fmtGWh, fmtLiters, fmtPct } from "@/lib/format";
import { useSimulation } from "@/components/SimulationProvider";
import { WeightsEditor } from "@/components/panels/WeightsEditor";

function siteFromMuni(name: string): Site {
  const m = MUNICIPALITIES.find((x) => x.name === name)!;
  return { id: `cmp-${name}`, name, lat: m.lat, lng: m.lng, municipality: name, radiusMiles: 3 };
}

function geoFor(site: Site, layers: AllLayers | null): GeoContext {
  const os = layers?.openspace.available ? layers.openspace.data : null;
  const sc = layers?.schools.available ? layers.schools.data : null;
  const ej = layers?.ej.available ? layers.ej.data : null;
  return {
    greenSpace: greenSpaceWithinRadius(site.lng, site.lat, site.radiusMiles, os),
    schools: schoolProximity(site.lng, site.lat, sc),
    ej: ejOverlap(site.lng, site.lat, ej),
    floodDataAvailable: false,
  };
}

export default function ComparePage() {
  const { project, grid, cost } = useSimulation();
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [aName, setAName] = useState("Worcester");
  const [bName, setBName] = useState("Lowell");

  const siteA = useMemo(() => siteFromMuni(aName), [aName]);
  const siteB = useMemo(() => siteFromMuni(bName), [bName]);
  const { layers: layersA, layersLoading: loadingA } = useSiteLayers(siteA);
  const { layers: layersB, layersLoading: loadingB } = useSiteLayers(siteB);

  const resA = useMemo(
    () => runSimulation({ site: siteA, project, grid, cost, weights, geo: geoFor(siteA, layersA) }),
    [siteA, layersA, weights, project, grid, cost],
  );
  const resB = useMemo(
    () => runSimulation({ site: siteB, project, grid, cost, weights, geo: geoFor(siteB, layersB) }),
    [siteB, layersB, weights, project, grid, cost],
  );

  const geoA = geoFor(siteA, layersA);
  const geoB = geoFor(siteB, layersB);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <GitCompareArrows className="text-accent" size={18} />
        <h1 className="text-base font-semibold">Compare Sites</h1>
        <span className="text-xs text-muted">
          Current {project.peakFacilityMW} MW {project.projectType} project and shared scenario assumptions applied to both sites.
        </span>
      </div>

      {(loadingA || loadingB) && <p role="status" className="mb-3 text-xs text-muted">Loading official site data…</p>}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <SitePicker label="Site A" value={aName} onChange={setAName} />
        <SitePicker label="Site B" value={bName} onChange={setBName} />
      </div>

      <div className="mb-3">
        <WeightsEditor weights={weights} onChange={setWeights} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SiteColumn name={aName} geo={geoA} result={resA} />
        <SiteColumn name={bName} geo={geoB} result={resB} />
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Comparison highlights tradeoffs under product-defined weights; it does not
        declare one location objectively superior or grant any approval. Missing
        inputs reduce evidence coverage rather than inflating scores.
      </p>
    </div>
  );
}

function SitePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm"
      >
        {MUNICIPALITIES.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SiteColumn({
  name,
  geo,
  result,
}: {
  name: string;
  geo: GeoContext;
  result: ReturnType<typeof runSimulation>;
}) {
  const a = result.assessment;
  return (
    <Panel>
      <PanelHeader title={name} right={<span className="tabular text-sm font-bold text-accent">{fmt(a.screeningScore, 0)}/100</span>} />
      <div className="grid grid-cols-2 gap-2 p-2.5">
        <Metric label="Evidence coverage" value={fmtPct(a.evidenceCoverage)} provenance="calculated" />
        <Metric label="Annual electricity" value={fmtGWh(result.energy.annualFacilityMWh)} provenance="calculated" />
        <Metric
          label="Open space (3 mi)"
          value={geo.greenSpace?.dataAvailable ? fmtPct(geo.greenSpace.coveragePercent / 100, 1) : "Unknown"}
          provenance={geo.greenSpace?.dataAvailable ? "official" : "unknown"}
        />
        <Metric
          label="Schools ≤ 1 mi"
          value={geo.schools?.dataAvailable ? fmt(geo.schools.within1Mile, 0) : "Unknown"}
          provenance={geo.schools?.dataAvailable ? "official" : "unknown"}
        />
        <Metric
          label="EJ overlap"
          value={geo.ej?.dataAvailable ? (geo.ej.overlaps ? "Yes" : "No") : "Unknown"}
          provenance={geo.ej?.dataAvailable ? "official" : "unknown"}
        />
        <Metric label="Modeled water" value={fmtLiters(result.water.annualWaterLiters)} provenance="estimated" />
      </div>
      <div className="border-t border-border p-2.5 text-[11px]">
        <ListBlock title="Top constraints" items={a.constraints} tone="risk" />
        <ListBlock title="Top advantages" items={a.advantages} tone="favorable" />
        <ListBlock title="Missing information" items={a.missingInfo} tone="muted" />
        <ListBlock title="Possible mitigations" items={a.mitigations.slice(0, 3)} tone="accent" />
      </div>
    </Panel>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: "risk" | "favorable" | "muted" | "accent" }) {
  const color = { risk: "text-risk", favorable: "text-favorable", muted: "text-muted", accent: "text-accent" }[tone];
  return (
    <div className="mb-1.5">
      <div className={`text-[9px] uppercase tracking-wide ${color}`}>{title}</div>
      {items.length ? (
        <ul className="mt-0.5 list-inside list-disc text-content/90">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      ) : (
        <div className="text-[11px] text-muted">None flagged.</div>
      )}
    </div>
  );
}
