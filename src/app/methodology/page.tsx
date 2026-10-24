import { BookOpen } from "lucide-react";
import { DATA_SOURCES } from "@/lib/data/sources";
import { DEFAULT_WEIGHTS } from "@/lib/schemas";
import { PROVENANCE_LABELS, type Provenance } from "@/lib/data/provenance";
import { Panel, PanelHeader } from "@/components/ui/Card";
import { fmtPct } from "@/lib/format";

export const metadata = { title: "Data & Methodology — DataDaddy" };

export default function MethodologyPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="text-accent" size={18} />
        <h1 className="text-base font-semibold">Data &amp; Methodology</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Energy & water formulas" />
          <div className="space-y-2 p-3 font-mono text-[11px] text-content/90">
            <p>annualFacilityMWh = peakFacilityMW × 8760 × utilization</p>
            <p>annualFacilityGWh = annualFacilityMWh / 1000</p>
            <p>annualItMWh = annualFacilityMWh / PUE  <span className="text-muted">{"// IT \u2260 facility"}</span></p>
            <p>annualOverheadMWh = annualFacilityMWh − annualItMWh</p>
            <p>cleanUncoveredMWh = max(0, facility − facility × coverage)</p>
            <p>annualWaterLiters = (annualItMWh × 1000) × WUE</p>
            <p>dailyWaterLiters = annualWaterLiters / 365</p>
            <p className="text-muted">Example: 40 MW × 8760 × 0.85 = 297,840 MWh = 297.84 GWh</p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Grid & cost formulas" />
          <div className="space-y-2 p-3 font-mono text-[11px] text-content/90">
            <p>cumulative = (existing + prior + proposed) × diversity</p>
            <p>remaining = available − cumulative  <span className="text-muted">{"// null if unknown"}</span></p>
            <p>shortfall = max(0, cumulative − available)</p>
            <p>totalUpgrade = costPerMW × incrementalMW</p>
            <p>nonDeveloper = total × (1 − developerFunded)</p>
            <p>householdExposure = nonDeveloper / (households × years)</p>
            <p className="text-muted">
              If available capacity is null → status stays &quot;Local available capacity
              unknown&quot;. Never defaulted to 0 or unlimited.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Screening score methodology" />
          <div className="p-3 text-[11px] text-content/90">
            <p className="mb-2 text-muted">
              Transparent 0–100 score = weighted average over components that have real
              inputs. Unknown components are excluded (weight mass removed), lowering
              evidence coverage — never scored as a favorable default. The score never
              overrides a documented exclusion or implies approval.
            </p>
            <table className="w-full">
              <tbody>
                {Object.entries(DEFAULT_WEIGHTS).map(([k, v]) => (
                  <tr key={k} className="border-t border-border">
                    <td className="py-1 capitalize">{k.replace(/([A-Z])/g, " $1")}</td>
                    <td className="tabular py-1 text-right text-accent">{fmtPct(v as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Provenance labels" />
          <div className="space-y-1.5 p-3 text-[11px]">
            {(Object.keys(PROVENANCE_LABELS) as Provenance[]).map((p) => (
              <div key={p} className="flex justify-between border-b border-border pb-1">
                <span className="font-medium text-content">{PROVENANCE_LABELS[p]}</span>
                <span className="font-mono text-muted">{p}</span>
              </div>
            ))}
            <p className="pt-1 text-muted">
              Every surfaced value carries one of these so real data, calculations,
              assumptions, estimates, and unknowns are never confused.
            </p>
          </div>
        </Panel>
      </div>

      <Panel className="mt-3">
        <PanelHeader title="Financial and geographic sensitivity methodology" />
        <div className="space-y-2 p-3 text-[11px] text-muted">
          <p>Financial inputs are household and project assumptions, not observed local tariffs or a causal housing forecast. Baseline rent and electricity can be edited; a published ACS rent is used only when available and explicitly selected.</p>
          <p>Upgrade investment = assumed upgrade MW × cost per MW. Non-developer principal = investment × (1 − developer share). Annual financing recovery = principal × r / (1 − (1+r)^−years); with r = 0 use principal / years. Household monthly exposure = recovery × household allocation / affected households / 12. Business and school shares use separate affected-customer counts; the three shares cannot exceed 100%.</p>
          <p>Scenario rent = baseline rent × (1 + rent-change percentage / 100). Combined expense = scenario rent + baseline electricity + separately assumed utility-rate change + monthly upgrade allocation. Income burden = annual combined expense / entered household income. Rent changes may be positive, zero or negative and are not attributed to construction.</p>
          <p>Municipal gross tax = assumed incremental taxable value × tax per $1,000 / 1,000 × (1 − abatement). Net = gross tax + annual benefits − annualized separate municipal capital − annual public services. One-time business capex, mitigation budgets and school land opportunity value remain separate from recurring utility bills.</p>
          <p>Financial overlays apply one disclosed scenario to the selected official municipality only. Other towns are hatched as unavailable; no street-level financial precision is implied. Environmental and grid overlays refer to the selected analysis radius, not a verified utility service area. Legends disclose product-defined thresholds. An entered capacity shortfall overrides overall classification to red; absent grid data stays unknown. Grey exclusion is reserved for documented restrictions; no legal exclusions are inferred from school or park proximity.</p>
          <p>Town housing density uses 2020 Census housing units divided by land area. Purple and orange overlays are historical 2016 residential/commercial/mixed land use near the conceptual footprint; intersection acres are not displaced homes or verified present-day development constraints. The 3D block is conceptual, not a surveyed parcel or building plan.</p>
          <p>Green scenario efficiency scales utilization at the same peak rating to preserve modeled IT workload where the supported utilization range permits. Clean procurement does not automatically lower grid peak demand. Community funding changes cost allocation; mitigation spending alone does not improve environmental scores. Standby generator output is capacity × entered hours; fuel, emissions and dispatch are unmodeled.</p>
        </div>
      </Panel>

      <Panel className="mt-3">
        <PanelHeader title="Data sources & provenance" />
        <div className="p-3">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-muted">
                <th className="px-2 py-1">Source</th>
                <th className="px-2 py-1">Publisher</th>
                <th className="px-2 py-1">Retrieved</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Limitations</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((s) => (
                <tr key={s.id} className="border-t border-border align-top">
                  <td className="px-2 py-1.5">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {s.name}
                    </a>
                  </td>
                  <td className="px-2 py-1.5 text-muted">{s.publisher}</td>
                  <td className="px-2 py-1.5 text-muted">{s.retrievedDate}</td>
                  <td className="px-2 py-1.5 text-muted">{s.status}</td>
                  <td className="px-2 py-1.5 text-muted">{s.reliabilityLimitations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-3">
        <PanelHeader title="Scientific integrity — what DataDaddy does NOT claim" />
        <ul className="list-inside list-disc space-y-1 p-3 text-[11px] text-muted">
          <li>Exact available grid capacity (unless user-supplied or sourced).</li>
          <li>Actual electricity rate increases or approved utility rates.</li>
          <li>Predicted changes in residential rent or home values.</li>
          <li>Data centers causing particular health outcomes.</li>
          <li>Actual water consumption without measured facility data.</li>
          <li>Legal permissibility of specific parcels or government approval.</li>
        </ul>
      </Panel>
    </div>
  );
}
