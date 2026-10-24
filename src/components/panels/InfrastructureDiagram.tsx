"use client";
import { useState } from "react";
import { useSimulation } from "@/components/SimulationProvider";
import { fmtMW, fmtLiters } from "@/lib/format";
export function InfrastructureDiagram() {
  const { project, result, finance } = useSimulation();
  const [selected, setSelected] = useState("Grid");
  const nodes = [
    ["Grid", `${fmtMW(result.battery.effectivePeakGridMW)} modeled peak grid draw; headroom ${result.grid.capacityKnown ? "user-supplied" : "unknown"}.`],
    ["Battery", `${project.battery}; ${fmtMW(result.battery.peakShavedMW)} modeled peak shaving. Charging losses still consume electricity.`],
    ["IT racks", `${project.peakFacilityMW} MW facility, PUE ${project.pue}; ${result.energy.annualItGWh.toFixed(2)} GWh/year IT workload.`],
    ["Cooling", `${project.cooling}; WUE ${project.wue} L/kWh IT; ${fmtLiters(result.water.annualWaterLiters)}/year modeled water.`],
    ["Clean supply", `${Math.round(project.cleanEnergyCoverage * 100)}% assumed qualifying clean procurement; not necessarily on-site generation.`],
    ["Backup", `${finance.backupGeneratorMW} MW × ${finance.generatorHours} hours = ${(finance.backupGeneratorMW * finance.generatorHours).toFixed(0)} MWh potential generator output. Fuel use/emissions unmodeled; not deducted from grid consumption.`],
  ];
  return <div className="rounded-md border border-border p-3">
    <h3 className="mb-2 text-xs font-semibold">Facility infrastructure · select a component</h3>
    <svg viewBox="0 0 360 165" className="w-full" aria-label="Interactive infrastructure flow">
      <defs><marker id="infrastructure-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" /></marker></defs>
      <g fill="none" stroke="#38bdf8" strokeWidth="1.5" markerEnd="url(#infrastructure-arrow)">
        <path d="M105,35 H128" /><path d="M232,35 H255" /><path d="M180,112 V62" /><path d="M308,62 V111" /><path d="M105,135 H128" />
      </g>
      {nodes.map(([name], i) => {
        const order = [0, 1, 2, 5, 3, 4][i];
        const x = 3 + (order % 3) * 126, y = order < 3 ? 10 : 110;
        return <g key={name} role="button" tabIndex={0} aria-label={`Inspect ${name}`} onClick={() => setSelected(name)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(name); } }} style={{ cursor: "pointer" }}>
          <rect x={x} y={y} width="103" height="43" rx="6" fill={selected === name ? "#12364d" : "#141b2b"} stroke={selected === name ? "#38bdf8" : "#475569"} />
          <text x={x+51.5} y={y+26} textAnchor="middle" fill={selected === name ? "#38bdf8" : "#cbd5e1"} fontSize="11">{name}</text>
        </g>;
      })}
    </svg>
    <p className="mt-2 text-[11px] text-muted" role="status">{nodes.find(n => n[0] === selected)?.[1]}</p>
    <p className="mt-1 text-[10px] text-muted">Grid / clean procurement → battery &amp; IT → cooling. Backup is standby. Conceptual system, not an engineering interconnection design.</p>
  </div>;
}
