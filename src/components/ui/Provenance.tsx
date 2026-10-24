import { PROVENANCE_LABELS, type Provenance } from "@/lib/data/provenance";
import { cx } from "@/lib/format";

const STYLES: Record<Provenance, string> = {
  official: "bg-favorable/15 text-favorable border-favorable/30",
  calculated: "bg-accent/15 text-accent border-accent/30",
  assumption: "bg-caution/15 text-caution border-caution/30",
  estimated: "bg-caution/10 text-caution/90 border-caution/25",
  unknown: "bg-excluded/20 text-muted border-excluded/40",
  "requires-confirmation": "bg-risk/10 text-risk border-risk/30",
};

export function ProvenanceChip({
  provenance,
  className,
}: {
  provenance: Provenance;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        STYLES[provenance],
        className,
      )}
      title={PROVENANCE_LABELS[provenance]}
    >
      {PROVENANCE_LABELS[provenance]}
    </span>
  );
}
