"use client";
import { useEffect, useState } from "react";
import { FlaskConical, Save, Trash2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BUILTIN_SCENARIOS, evaluateScenario, type ScenarioOutput } from "@/lib/scenarios";
import { Panel, PanelHeader } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

const STORAGE_KEY = "datadaddy.savedScenarios.v1";

export default function ScenarioLabPage() {
  const builtins = BUILTIN_SCENARIOS.map(evaluateScenario);
  const [saved, setSaved] = useState<ScenarioOutput[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: ScenarioOutput[]) {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const all = [...builtins, ...saved];
  const chartData = all.map((s) => ({
    name: s.name,
    "Energy (GWh)": Number(s.annualGWh.toFixed(1)),
    "Water (ML)": Number(s.waterMillionLiters.toFixed(1)),
    "Clean %": Number(s.cleanCoveredPct.toFixed(0)),
  }));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="text-accent" size={18} />
        <h1 className="text-base font-semibold">Scenario Lab</h1>
        <span className="text-xs text-muted">
          Compare alternative development decisions. Save scenarios to browser-local state.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Energy vs. water vs. clean-energy coverage" />
          <div className="h-72 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#8ba0bf", fontSize: 10 }} interval={0} angle={-10} height={40} />
                <YAxis tick={{ fill: "#8ba0bf", fontSize: 10 }} width={38} />
                <Tooltip contentStyle={{ background: "#141b2b", border: "1px solid #273349", borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Energy (GWh)" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Water (ML)" fill="#34d399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Clean %" fill="#fbbf24" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Comparison table" />
          <div className="overflow-x-auto p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-2 py-1">Scenario</th>
                  <th className="px-2 py-1">Peak MW</th>
                  <th className="px-2 py-1">Energy GWh</th>
                  <th className="px-2 py-1">Water ML</th>
                  <th className="px-2 py-1">Clean %</th>
                  <th className="px-2 py-1">EO 658 &gt;25MW</th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {builtins.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-2 py-1.5 font-medium text-content">{s.name}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.peakMW)}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.annualGWh, 1)}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.waterMillionLiters, 1)}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.cleanCoveredPct, 0)}</td>
                    <td className="px-2 py-1.5">
                      <span className={s.thresholdExceeded ? "text-caution" : "text-muted"}>
                        {s.thresholdExceeded ? "Above" : "Below/at"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => persist([...saved, { ...s, id: `${s.id}-${Date.now()}`, name: `${s.name} (saved)` }])}
                        className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                      >
                        <Save size={11} /> Save
                      </button>
                    </td>
                  </tr>
                ))}
                {saved.map((s) => (
                  <tr key={s.id} className="border-t border-border bg-panel-2/30">
                    <td className="px-2 py-1.5 font-medium text-content">{s.name}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.peakMW)}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.annualGWh, 1)}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.waterMillionLiters, 1)}</td>
                    <td className="tabular px-2 py-1.5">{fmt(s.cleanCoveredPct, 0)}</td>
                    <td className="px-2 py-1.5">{s.thresholdExceeded ? "Above" : "Below/at"}</td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => persist(saved.filter((x) => x.id !== s.id))}
                        className="flex items-center gap-1 text-[10px] text-risk hover:underline"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        {BUILTIN_SCENARIOS.map((s) => (
          <Panel key={s.id}>
            <div className="p-3">
              <div className="text-sm font-semibold text-content">{s.name}</div>
              <p className="mt-1 text-[11px] text-muted">{s.description}</p>
            </div>
          </Panel>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Scenario outputs are calculated (energy) and modeled estimates (water, clean-energy
        coverage assumption). Saved scenarios live only in your browser.
      </p>
    </div>
  );
}
