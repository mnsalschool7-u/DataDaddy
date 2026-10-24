"use client";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useSimulation } from "@/components/SimulationProvider";
import { buildAnalystContext } from "@/lib/analyst/context";
import { deterministicAnswer, SUGGESTED_QUESTIONS, type AnalystAnswer } from "@/lib/analyst/deterministic";

export function AnalystPanel() {
  const { site, project, grid, geo, result } = useSimulation();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    const context = buildAnalystContext(site, project, grid, geo, result);
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });
      if (res.ok) {
        setAnswer((await res.json()) as AnalystAnswer);
      } else {
        setAnswer(deterministicAnswer(q, context));
      }
    } catch {
      setAnswer(deterministicAnswer(q, context));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-2.5">
      <div className="flex gap-1.5">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder="Ask about this scenario…"
          className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-xs"
        />
        <button
          onClick={() => ask(question)}
          disabled={loading}
          className="flex items-center gap-1 rounded-md bg-accent/20 px-2 text-xs font-medium text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
          Ask
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuestion(q);
              ask(q);
            }}
            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:bg-panel-2"
          >
            {q.length > 36 ? q.slice(0, 34) + "…" : q}
          </button>
        ))}
      </div>

      {answer && (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-panel-2/40 p-2 text-[11px]">
          <div>
            <span className="text-[9px] uppercase tracking-wide text-accent">
              Conclusion · {answer.mode === "llm" ? "AI-phrased, grounded" : "Deterministic"}
            </span>
            <p className="mt-0.5 text-content">{answer.conclusion}</p>
          </div>
          <Section title="Supporting numbers" items={answer.supportingNumbers} />
          <Section title="Geographic evidence" items={answer.geographicEvidence} />
          <Section title="Regulatory" items={answer.regulatory} />
          <Section title="Uncertainty / missing data" items={answer.uncertainty} />
          <Section title="Inputs you could change" items={answer.inputsToChange} />
        </div>
      )}
      {!answer && !site && (
        <p className="mt-2 text-[10px] text-muted">
          Select a location to ground the analyst in real geographic evidence.
        </p>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <span className="text-[9px] uppercase tracking-wide text-muted">{title}</span>
      <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-content/90">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
