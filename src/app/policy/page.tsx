"use client";
import { useMemo, useState } from "react";
import { Scale, ExternalLink } from "lucide-react";
import { evaluatePolicy, taxExemptionInfo, EO658_THRESHOLD_MW } from "@/lib/policy/eo658";
import { DEFAULT_PROJECT, type ProjectType } from "@/lib/schemas";
import { PolicyNavigator } from "@/components/panels/PolicyNavigator";
import { Panel, PanelHeader } from "@/components/ui/Card";
import { Slider, Select, Toggle } from "@/components/ui/Controls";
import { getSource } from "@/lib/data/sources";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "enterprise", label: "Enterprise" },
  { value: "hyperscale", label: "Hyperscale" },
  { value: "ai-compute", label: "AI compute" },
  { value: "university-research", label: "University research" },
];

export default function PolicyPage() {
  const [mw, setMw] = useState(40);
  const [type, setType] = useState<ProjectType>("enterprise");
  const [isExpansion, setExpansion] = useState(false);

  const evaluation = useMemo(
    () => evaluatePolicy({ ...DEFAULT_PROJECT, peakFacilityMW: mw, projectType: type, isExpansion }),
    [mw, type, isExpansion],
  );
  const tax = taxExemptionInfo();
  const eoSource = getSource("eo-658");
  const taxSource = getSource("qdc-tax-exemption");
  const soeSource = getSource("soe-2026");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <Scale className="text-accent" size={18} />
        <h1 className="text-base font-semibold">Massachusetts Policy Navigator</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <PanelHeader title="Scenario inputs" />
          <div className="space-y-3 p-3">
            <Slider label="Peak facility demand" value={mw} min={5} max={200} step={1} unit="MW" onChange={setMw} />
            <div className="flex gap-1.5">
              {[20, 25, 30].map((v) => (
                <button
                  key={v}
                  onClick={() => setMw(v)}
                  className="flex-1 rounded-md border border-border bg-panel-2/40 px-2 py-1 text-xs hover:bg-panel-2"
                >
                  {v} MW
                </button>
              ))}
            </div>
            <Select label="Project type" value={type} options={PROJECT_TYPES} onChange={setType} />
            <Toggle label="Treat as expansion" checked={isExpansion} onChange={setExpansion} />
            <div className="rounded-md border border-border bg-panel-2/40 px-2.5 py-2 text-xs">
              Threshold is <strong>greater than {EO658_THRESHOLD_MW} MW</strong>. At {mw} MW:{" "}
              <span className={evaluation.thresholdExceeded ? "text-caution" : "text-muted"}>
                {evaluation.thresholdExceeded ? "above threshold" : mw === 25 ? "exactly at 25 MW — not automatically above" : "below threshold"}
              </span>
              .
            </div>
          </div>
        </Panel>

        <div className="lg:col-span-2">
          <Panel>
            <PanelHeader title="Findings" />
            <PolicyNavigator evaluation={evaluation} />
          </Panel>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Panel>
          <PanelHeader title="Executive Order 658 (primary source)" />
          <div className="p-3 text-xs text-muted">
            <p>
              Issued September 8, 2026. Establishes requirements for responsible data
              center development and operations in Massachusetts to protect ratepayers,
              communities, and the environment. Addresses large projects exceeding 25 MW,
              community benefits, environmental/public-health requirements, clean-electricity
              procurement, water, ratepayer protection, cost allocation, and reporting.
              Some implementation guidance remains under development as of October 2026.
            </p>
            {eoSource && (
              <a href={eoSource.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-accent hover:underline">
                Read EO 658 <ExternalLink size={11} />
              </a>
            )}
            {soeSource && (
              <a href={soeSource.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-accent hover:underline">
                Statement of Expectations (June 25, 2026)
              </a>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Qualified Data Center Tax Exemption (separate)" />
          <div className="p-3 text-xs text-muted">
            <p>{tax.explanation}</p>
            <p className="mt-2 rounded border border-accent/30 bg-accent/5 px-2 py-1 text-accent">
              This exemption is independent of EO 658's MW threshold — the two frameworks are not combined.
            </p>
            {taxSource && (
              <a href={taxSource.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-accent hover:underline">
                Tax exemption details <ExternalLink size={11} />
              </a>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
