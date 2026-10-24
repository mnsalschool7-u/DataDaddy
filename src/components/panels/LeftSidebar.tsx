"use client";
import { useState } from "react";
import { Search, Layers, SlidersHorizontal, Filter } from "lucide-react";
import { useSimulation } from "@/components/SimulationProvider";
import { searchMunicipalities } from "@/lib/data/municipalities";
import { Panel, PanelHeader } from "@/components/ui/Card";
import { Slider, Select, NumberField, Toggle } from "@/components/ui/Controls";
import { COOLING_LABELS, COOLING_WUE_DEFAULTS } from "@/lib/model/water";
import type { LayerToggles } from "@/components/map/types";
import type { CoolingTech, ProjectType, BatteryStorage } from "@/lib/schemas";
import { fmtPct } from "@/lib/format";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "enterprise", label: "Enterprise data center" },
  { value: "hyperscale", label: "Hyperscale data center" },
  { value: "ai-compute", label: "AI compute facility" },
  { value: "university-research", label: "University research compute" },
];

const COOLING_OPTIONS = (Object.keys(COOLING_LABELS) as CoolingTech[]).map((c) => ({
  value: c,
  label: COOLING_LABELS[c],
}));

const BATTERY_OPTIONS: { value: BatteryStorage; label: string }[] = [
  { value: "none", label: "None" },
  { value: "moderate", label: "Moderate" },
  { value: "significant", label: "Significant" },
];

export function LeftSidebar({
  toggles,
  setToggles,
}: {
  toggles: LayerToggles;
  setToggles: (t: LayerToggles) => void;
}) {
  const { site, setSite, project, updateProject, layers } = useSimulation();
  const [query, setQuery] = useState("");
  const results = query ? searchMunicipalities(query) : [];

  const setToggle = (k: keyof LayerToggles, v: boolean) =>
    setToggles({ ...toggles, [k]: v });

  const avail = (k: "openspace" | "schools" | "ej" | "municipalities") =>
    layers?.[k].available ?? false;

  return (
    <aside className="no-print flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-bg/60 p-3">
      {/* Search */}
      <Panel>
        <PanelHeader title="Location search" icon={<Search size={13} />} />
        <div className="p-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a Massachusetts municipality…"
            className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm"
          />
          {results.length > 0 && (
            <ul className="mt-1.5 max-h-44 overflow-y-auto rounded-md border border-border">
              {results.map((m) => (
                <li key={m.name}>
                  <button
                    className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-panel-2"
                    onClick={() => {
                      setSite({
                        id: `muni-${m.name}`,
                        name: m.name,
                        lat: m.lat,
                        lng: m.lng,
                        municipality: m.name,
                        radiusMiles: site?.radiusMiles ?? 3,
                      });
                      setQuery("");
                    }}
                  >
                    <span className="font-medium text-content">{m.name}</span>
                    <span className="text-muted">{m.county} Co.</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-[10px] text-muted">
            Or click anywhere on the map to select a location.
          </p>
        </div>
      </Panel>

      {/* Layer controls */}
      <Panel>
        <PanelHeader title="Data layers" icon={<Layers size={13} />} />
        <div className="space-y-1.5 p-2.5">
          <Toggle
            label="Municipal boundaries"
            checked={toggles.municipalities}
            onChange={(v) => setToggle("municipalities", v)}
            swatch={<Swatch color="#8ba0bf" />}
          />
          <Toggle
            label="Protected & recreational open space"
            checked={toggles.openspace}
            onChange={(v) => setToggle("openspace", v)}
            swatch={<Swatch color="#34d399" />}
          />
          <Toggle
            label="Environmental justice block groups"
            checked={toggles.ej}
            onChange={(v) => setToggle("ej", v)}
            swatch={<Swatch color="#a3e635" />}
          />
          <Toggle
            label="Schools"
            checked={toggles.schools}
            onChange={(v) => setToggle("schools", v)}
            swatch={<Swatch color="#fbbf24" />}
          />
          <Toggle
            label="Grid-scenario greyout (capacity exceeded)"
            checked={toggles.gridScenario}
            onChange={(v) => setToggle("gridScenario", v)}
            swatch={<Swatch color="#64748b" />}
          />
          <div className="rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] text-muted">
            Flood hazard &amp; documented data centers: layer data unavailable in this
            build — shown as unavailable rather than fabricated. Grid-scenario greyout
            is a simulated constraint (enter capacity in the bottom panel), not verified
            saturation.
          </div>
          {layers && (
            <div className="pt-1 text-[10px] text-muted">
              Loaded:{" "}
              {(["municipalities", "openspace", "schools", "ej"] as const)
                .filter(avail)
                .join(", ") || "none"}
            </div>
          )}
        </div>
      </Panel>

      {/* Project assumptions */}
      <Panel>
        <PanelHeader title="Project assumptions" icon={<SlidersHorizontal size={13} />} />
        <div className="space-y-3 p-2.5">
          <Select
            label="Project type"
            value={project.projectType}
            options={PROJECT_TYPES}
            onChange={(v) => updateProject({ projectType: v })}
          />
          <Slider
            label="Peak facility demand"
            value={project.peakFacilityMW}
            min={5}
            max={200}
            step={1}
            unit="MW"
            onChange={(v) => updateProject({ peakFacilityMW: v })}
          />
          <Slider
            label="Average utilization"
            value={project.utilization}
            min={0.3}
            max={1}
            step={0.01}
            format={(v) => fmtPct(v)}
            onChange={(v) => updateProject({ utilization: v })}
          />
          <NumberField
            label="PUE (illustrative default 1.4)"
            value={project.pue}
            min={1}
            max={3}
            step={0.05}
            onChange={(v) => updateProject({ pue: v ?? 1.4 })}
          />
          <Select
            label="Cooling technology"
            value={project.cooling}
            options={COOLING_OPTIONS}
            onChange={(v) =>
              updateProject({ cooling: v, wue: COOLING_WUE_DEFAULTS[v] })
            }
          />
          <NumberField
            label="WUE (L / kWh IT, illustrative)"
            value={project.wue}
            min={0}
            max={10}
            step={0.05}
            onChange={(v) => updateProject({ wue: v ?? 0.5 })}
          />
          <Slider
            label="Clean-energy coverage"
            value={project.cleanEnergyCoverage}
            min={0}
            max={1}
            step={0.01}
            format={(v) => fmtPct(v)}
            onChange={(v) => updateProject({ cleanEnergyCoverage: v })}
          />
          <Select
            label="Battery storage"
            value={project.battery}
            options={BATTERY_OPTIONS}
            onChange={(v) => updateProject({ battery: v })}
          />
          <NumberField
            label="Project footprint (illustrative)"
            value={project.footprintAcres}
            min={0}
            max={5000}
            step={5}
            unit="acres"
            onChange={(v) => updateProject({ footprintAcres: v ?? 50 })}
          />
          <Slider
            label="Developer-funded upgrades"
            value={project.developerFundedFraction}
            min={0}
            max={1}
            step={0.05}
            format={(v) => fmtPct(v)}
            onChange={(v) => updateProject({ developerFundedFraction: v })}
          />
        </div>
      </Panel>

      {/* Development filters */}
      <Panel>
        <PanelHeader title="Development filters" icon={<Filter size={13} />} />
        <div className="space-y-2 p-2.5">
          <Toggle
            label="Treat as expansion of existing capacity"
            checked={project.isExpansion}
            onChange={(v) => updateProject({ isExpansion: v })}
          />
          <div className="text-[11px] uppercase tracking-wide text-muted">
            Analysis radius
          </div>
          <div className="flex gap-1.5">
            {([1, 3, 5] as const).map((r) => (
              <button
                key={r}
                disabled={!site}
                onClick={() => site && setSite({ ...site, radiusMiles: r })}
                className={`flex-1 rounded-md border px-2 py-1 text-xs transition disabled:opacity-40 ${
                  site?.radiusMiles === r
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-panel-2/40 text-muted hover:bg-panel-2"
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </aside>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="h-3 w-3 rounded-sm" style={{ background: color }} />;
}
