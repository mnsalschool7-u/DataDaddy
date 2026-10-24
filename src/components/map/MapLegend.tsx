"use client";
import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { cx } from "@/lib/format";

const CLASSES = [
  { color: "#34d399", label: "Lower modeled constraints", desc: "Relatively favorable under screening assumptions" },
  { color: "#fbbf24", label: "Constrained", desc: "Environmental / community / infrastructure considerations" },
  { color: "#64748b", label: "Excluded (verified)", desc: "Documented restriction incompatible with the project" },
];

export function MapLegend({
  gridStatus,
  capacityKnown,
}: {
  gridStatus: string;
  capacityKnown: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="no-print absolute bottom-6 right-3 z-10 w-64 rounded-lg border border-border bg-panel/95 p-3 text-xs backdrop-blur">
      <button
        className="flex w-full items-center justify-between font-semibold text-content"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-1.5 uppercase tracking-wide text-muted">
          <Info size={13} /> Screening legend
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {CLASSES.map((c) => (
            <div key={c.label} className="flex items-start gap-2">
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                style={{ background: c.color }}
              />
              <div>
                <div className="font-medium text-content">{c.label}</div>
                <div className="text-[10px] text-muted">{c.desc}</div>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2">
            <span className="hatch mt-0.5 h-3 w-3 shrink-0 rounded-sm border border-unavailable" />
            <div>
              <div className="font-medium text-content">Data unavailable</div>
              <div className="text-[10px] text-muted">Insufficient info to classify</div>
            </div>
          </div>
          <div
            className={cx(
              "mt-2 rounded border px-2 py-1 text-[10px]",
              capacityKnown
                ? "border-border text-muted"
                : "border-excluded/40 bg-excluded/10 text-muted",
            )}
          >
            Grid: {gridStatus}
          </div>
          <p className="mt-2 border-t border-border pt-2 text-[10px] leading-snug text-muted">
            Colors represent a preliminary screening model — <strong>not</strong> a
            government permitting decision or approval for development.
          </p>
        </div>
      )}
    </div>
  );
}
