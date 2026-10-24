"use client";
import { ExternalLink } from "lucide-react";
import type { PolicyEvaluation, ApplicabilityStatus } from "@/lib/policy/eo658";
import { STATUS_LABELS } from "@/lib/policy/eo658";
import { getSource } from "@/lib/data/sources";
import { cx } from "@/lib/format";

const STATUS_STYLE: Record<ApplicabilityStatus, string> = {
  "potentially-applicable": "border-caution/40 bg-caution/10 text-caution",
  "not-triggered": "border-border bg-panel-2/40 text-muted",
  "more-info-required": "border-accent/40 bg-accent/10 text-accent",
  "guidance-under-development": "border-excluded/40 bg-excluded/10 text-muted",
};

export function PolicyNavigator({
  evaluation,
  compact = false,
}: {
  evaluation: PolicyEvaluation;
  compact?: boolean;
}) {
  const findings = compact
    ? evaluation.findings.filter((f) => f.status !== "not-triggered")
    : evaluation.findings;

  return (
    <div className="p-2.5">
      <div className="rounded-md border border-border bg-panel-2/40 px-2.5 py-2 text-xs text-content">
        {evaluation.summary}
      </div>
      <ul className="mt-2 space-y-2">
        {findings.map((f) => {
          const src = getSource(f.sourceId);
          return (
            <li key={f.ruleId} className="rounded-md border border-border p-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-content">{f.title}</span>
                <span
                  className={cx(
                    "shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
                    STATUS_STYLE[f.status],
                  )}
                >
                  {STATUS_LABELS[f.status]}
                </span>
              </div>
              {!compact && (
                <p className="mt-1 text-[11px] leading-snug text-muted">{f.explanation}</p>
              )}
              <p className="mt-1 text-[10px] text-muted">
                <span className="text-content/80">Basis:</span> {f.basis}
              </p>
              {f.missingInfo.length > 0 && (
                <p className="mt-1 text-[10px] text-muted">
                  <span className="text-content/80">Missing:</span>{" "}
                  {f.missingInfo.join("; ")}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                <span>{f.agency}</span>
                {src && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-accent hover:underline"
                  >
                    Source <ExternalLink size={9} />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-muted">
        Some EO 658 implementation rules are still under development as of October
        2026. Pending measures are not finalized regulation.
      </p>
    </div>
  );
}
