"use client";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { loadReportSnapshot, type ReportSnapshot } from "@/lib/report";
import { DATA_SOURCES } from "@/lib/data/sources";
import { COOLING_LABELS } from "@/lib/model/water";
import { STATUS_LABELS } from "@/lib/policy/eo658";
import { fmt, fmtGWh, fmtLiters, fmtPct, fmtMW, fmtUSD } from "@/lib/format";

export default function ReportPage() {
  const [snap, setSnap] = useState<ReportSnapshot | null>(null);
  useEffect(() => setSnap(loadReportSnapshot()), []);

  if (!snap) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
        No report snapshot found. Open the Explore map, configure a scenario, and click
        &quot;Export report&quot;.
      </div>
    );
  }

  const { site, project, result, grid, geo } = snap;
  const date = new Date(snap.generatedAt).toLocaleString();

  return (
    <div className="mx-auto max-w-4xl overflow-y-auto bg-white p-8 text-black">
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white"
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <header className="border-b-2 border-slate-800 pb-3">
        <h1 className="text-xl font-bold">DataDaddy Infrastructure Site Intelligence Report</h1>
        <p className="text-sm text-slate-600">Generated {date}</p>
      </header>

      <Section n="1" title="Project & location">
        <Grid>
          <KV k="Site" v={site?.name ?? "Scenario (no location)"} />
          <KV k="Coordinates" v={site ? `${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}` : "—"} />
          <KV k="Analysis radius" v={site ? `${site.radiusMiles} mi` : "—"} />
          <KV k="Project type" v={project.projectType} />
        </Grid>
      </Section>

      <Section n="2" title="Data center specifications (assumptions)">
        <Grid>
          <KV k="Peak facility demand" v={fmtMW(project.peakFacilityMW)} />
          <KV k="Utilization" v={fmtPct(project.utilization)} />
          <KV k="PUE" v={fmt(project.pue, 2)} />
          <KV k="Cooling" v={COOLING_LABELS[project.cooling]} />
          <KV k="WUE" v={`${fmt(project.wue, 2)} L/kWh IT`} />
          <KV k="Clean-energy coverage" v={fmtPct(project.cleanEnergyCoverage)} />
          <KV k="Footprint" v={`${fmt(project.footprintAcres)} acres`} />
          <KV k="Developer-funded upgrades" v={fmtPct(project.developerFundedFraction)} />
        </Grid>
      </Section>

      <Section n="3" title="Energy, clean-energy & water (calculated / estimated)">
        <Grid>
          <KV k="Annual facility electricity" v={`${fmtGWh(result.energy.annualFacilityMWh)} (calculated)`} />
          <KV k="IT electricity (via PUE)" v={`${fmtGWh(result.energy.annualItMWh)} (calculated)`} />
          <KV k="Clean-energy covered" v={`${fmtPct(result.cleanEnergy.coveredFraction)} (assumption)`} />
          <KV k="Uncovered demand" v={`${fmtGWh(result.cleanEnergy.uncoveredMWh)} (calculated)`} />
          <KV k="Modeled annual water" v={`${fmtLiters(result.water.annualWaterLiters)} (estimated)`} />
          <KV k="Daily average water" v={`${fmtLiters(result.water.dailyAverageLiters)} (estimated)`} />
        </Grid>
      </Section>

      <Section n="4" title="Infrastructure capacity sensitivity">
        <p className="text-sm">
          {result.grid.statusMessage}
          {result.grid.capacityKnown && (
            <>
              {" — "}cumulative {fmtMW(result.grid.cumulativeProposedMW)};{" "}
              {result.grid.exceeded
                ? `shortfall ${fmtMW(result.grid.shortfallMW ?? 0)}`
                : `remaining ${fmtMW(result.grid.remainingCapacityMW ?? 0)}`}
              .
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {grid.availableCapacityMW == null
            ? "Local available capacity was not supplied; it remains unknown (not defaulted)."
            : "Simulated scenario constraint — not verified grid saturation."}
        </p>
      </Section>

      <Section n="5" title="Environmental & community context">
        <Grid>
          <KV k="Open space in radius" v={geo.greenSpace?.dataAvailable ? `${fmtPct(geo.greenSpace.coveragePercent / 100, 1)} (${fmt(geo.greenSpace.openSpaceAcres, 0)} ac)` : "Unknown"} />
          <KV k="Schools ≤ 1 mi" v={geo.schools?.dataAvailable ? fmt(geo.schools.within1Mile) : "Unknown"} />
          <KV k="Nearest school" v={geo.schools?.nearestDistanceMiles != null ? `${fmt(geo.schools.nearestDistanceMiles, 2)} mi` : "Unknown"} />
          <KV k="Environmental justice" v={geo.ej?.dataAvailable ? (geo.ej.overlaps ? "Within EJ block group" : "No overlap in subset") : "Unknown"} />
          <KV k="Flood hazard" v="Unknown (layer unavailable)" />
        </Grid>
      </Section>

      <Section n="6" title="Massachusetts regulatory considerations">
        <p className="text-sm">{result.policy.summary}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {result.policy.findings
            .filter((f) => f.status !== "not-triggered")
            .map((f) => (
              <li key={f.ruleId}>
                <strong>{f.title}</strong> — {STATUS_LABELS[f.status]}. {f.basis}
              </li>
            ))}
        </ul>
      </Section>

      <Section n="7" title="Site-screening findings">
        <p className="text-sm">
          Screening score <strong>{fmt(result.assessment.screeningScore, 0)}/100</strong> at{" "}
          {fmtPct(result.assessment.evidenceCoverage)} evidence coverage.
        </p>
        <FindingList title="Top constraints" items={result.assessment.constraints} />
        <FindingList title="Top advantages" items={result.assessment.advantages} />
        <FindingList title="Missing information" items={result.assessment.missingInfo} />
        <FindingList title="Possible mitigations" items={result.assessment.mitigations.slice(0, 3)} />
      </Section>

      {result.cost && (
        <Section n="8" title="Community cost sensitivity (illustrative)">
          <p className="text-sm">
            Total upgrade {fmtUSD(result.cost.totalUpgradeCost)}; non-developer allocation{" "}
            {fmtUSD(result.cost.nonDeveloperAllocatedCost)}; illustrative household exposure{" "}
            {fmtUSD(result.cost.annualHouseholdExposure)}/yr.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Simplified financial sensitivity model — not a forecast of actual bills or approved rates.
          </p>
        </Section>
      )}

      <Section n="9" title="Data-source citations">
        <ul className="space-y-1 text-xs">
          {DATA_SOURCES.map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong> — {s.publisher}. Retrieved {s.retrievedDate}.{" "}
              <a href={s.url} className="text-blue-700 underline">{s.url}</a>
            </li>
          ))}
        </ul>
      </Section>

      <footer className="mt-6 border-t-2 border-slate-800 pt-3 text-xs text-slate-500">
        This report presents modeled findings for planning exploration. It is NOT a
        regulatory certification, permitting decision, or legal approval. Values are
        labeled as official data, calculations, assumptions, estimates, or unknowns.
      </footer>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">{children}</div>;
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-1">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
function FindingList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-1.5 text-sm">
      <span className="font-semibold">{title}:</span>
      <ul className="ml-5 list-disc">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
