import { cx } from "@/lib/format";
import type { Provenance } from "@/lib/data/provenance";
import { ProvenanceChip } from "./Provenance";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-lg border border-border bg-panel/80 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  icon,
  right,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {icon}
        {title}
      </div>
      {right}
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  provenance,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  provenance?: Provenance;
  accent?: "favorable" | "caution" | "risk" | "accent" | "muted";
}) {
  const accentCls = {
    favorable: "text-favorable",
    caution: "text-caution",
    risk: "text-risk",
    accent: "text-accent",
    muted: "text-muted",
  }[accent ?? "accent"];
  return (
    <div className="rounded-md border border-border bg-panel-2/60 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
        {provenance && <ProvenanceChip provenance={provenance} />}
      </div>
      <div className={cx("tabular mt-1 text-xl font-semibold", accentCls)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
