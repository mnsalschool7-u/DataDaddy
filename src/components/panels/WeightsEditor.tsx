"use client";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { DEFAULT_WEIGHTS, type ScoringWeights } from "@/lib/schemas";
import { Panel, PanelHeader } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Controls";
import { fmtPct } from "@/lib/format";

const LABELS: Record<keyof ScoringWeights, string> = {
  landEnv: "Land-use & environmental",
  infraFit: "Infrastructure scenario fit",
  community: "Community exposure",
  resource: "Resource efficiency",
  dataReadiness: "Data availability & readiness",
};

export function WeightsEditor({
  weights,
  onChange,
}: {
  weights: ScoringWeights;
  onChange: (w: ScoringWeights) => void;
}) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return (
    <Panel>
      <PanelHeader
        title="Screening weights (adjustable)"
        icon={<SlidersHorizontal size={13} />}
        right={
          <button
            onClick={() => onChange(DEFAULT_WEIGHTS)}
            className="flex items-center gap-1 text-[10px] text-muted hover:text-content"
          >
            <RotateCcw size={11} /> Reset
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-2.5 md:grid-cols-5">
        {(Object.keys(LABELS) as (keyof ScoringWeights)[]).map((k) => (
          <Slider
            key={k}
            label={LABELS[k]}
            value={weights[k]}
            min={0}
            max={1}
            step={0.05}
            format={(v) => fmtPct(v)}
            onChange={(v) => onChange({ ...weights, [k]: v })}
          />
        ))}
      </div>
      <div className="px-2.5 pb-2 text-[10px] text-muted">
        Weights are product-defined, not official MA regulatory standards. Current
        total: {fmtPct(total)} (the score normalizes over available components).
      </div>
    </Panel>
  );
}
