"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSimulation } from "@/components/SimulationProvider";
import { NumberField, Slider } from "@/components/ui/Controls";
import { Metric } from "@/components/ui/Card";
import { fmt, fmtMoney as fmtUSD, fmtPct } from "@/lib/format";
import { computeFinancial, developmentVariants, type FinancialInputs } from "@/lib/model/financial";
import { runSimulation } from "@/lib/model/orchestrator";
import { InfrastructureDiagram } from "./InfrastructureDiagram";
import { LAND_USE } from "@/lib/data/community";
import { saveReportSnapshot } from "@/lib/report";

export function FinancialDashboard({ compact = false }: { compact?: boolean }) {
  const sim = useSimulation();
  const router = useRouter();
  const { finance: f, financialResult: r, project, cost, updateFinance, updateProject, updateCost, updateGrid,
    community, communityLoading, communityError, site, result, grid, geo, weights } = sim;
  const [section, setSection] = useState("household");
  const variants = developmentVariants(project, f).map(v => {
    const variantCost = { ...cost, incrementalMW: v.finance.manualUpgradeMW ?? v.project.peakFacilityMW * v.finance.upgradeFraction,
      developerFundedFraction: v.project.developerFundedFraction };
    const financial = computeFinancial(v.finance, variantCost);
    const modeled = runSimulation({ site, project: v.project, grid, cost: variantCost, weights, geo });
    return { ...v, financial, modeled, name: v.name, energy: modeled.energy.annualFacilityGWh, water: modeled.water.annualWaterLiters / 1e6,
      monthly: financial.monthlyDifference };
  });
  const field = (key: keyof FinancialInputs, label: string, min = 0, max = 1e12, step = 1) => <NumberField key={key} label={label} value={f[key] as number | null} min={min} max={max} step={step} onChange={value => updateFinance({ [key]: value ?? min })} />;
  function exportReport() {
    saveReportSnapshot({ generatedAt: new Date().toISOString(), site, project, grid, geo, result,
      finance: { inputs: f, cost, result: r, community, landUseImpact: sim.landUseImpact, landUseRetrievedAt: sim.landUseRetrievedAt, variants: variants.map(v => ({ name: v.name, inputs: v.finance, project: v.project, financial: v.financial, energyGWh: v.energy, waterML: v.water, score: v.modeled.assessment.screeningScore, note: v.note })) } });
    router.push("/report");
  }
  const sections = ["household", "infrastructure", "housing", "institutions", "scenarios", "diagram"];
  return <div className={compact ? "space-y-3 p-3" : "mx-auto max-w-7xl space-y-4 p-4"}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-semibold">Financial impact simulator</h2><p className="text-[11px] text-muted">{community?.town ?? site?.name ?? "Select a site on Explore Map"} · {project.peakFacilityMW} MW proposed</p></div>
      <button onClick={exportReport} className="rounded border border-border px-2 py-1 text-xs text-accent">Export financial report</button>
      {compact && <Link href="/community" className="text-xs text-accent underline">Open full dashboard ↗</Link>}
    </div>
    <p className="rounded border border-caution/30 bg-caution/5 p-2 text-[10px] text-muted">Scenario sensitivity, not a forecast. Rent changes are independent user assumptions, not an inferred effect of this facility. Actual utility bills depend on tariffs, regulation and approved cost allocation. Baselines are household assumptions unless you explicitly use a published benchmark.</p>
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4"}`}>
      <Metric label="Household electricity" value={`${fmtUSD(r.modeledElectricity)}/mo`} sub={`Baseline ${fmtUSD(f.baselineElectricity)}; upgrade +${fmtUSD(r.monthlyUpgradeExposure)}`} provenance="estimated" />
      <Metric label="Scenario rent" value={`${fmtUSD(r.modeledRent)}/mo`} sub={`${f.rentChangePct >= 0 ? "+" : ""}${f.rentChangePct}% hypothetical sensitivity`} provenance="assumption" />
      <Metric label="Combined monthly" value={fmtUSD(r.combinedMonthly)} sub={`Change ${r.monthlyDifference >= 0 ? "+" : ""}${fmtUSD(r.monthlyDifference)}`} provenance="calculated" />
      <Metric label="Share of income" value={fmtPct(r.incomeShare)} sub={`${fmtUSD(r.combinedAnnual)}/yr · ${f.householdSize} people`} provenance="calculated" />
    </div>
    {sim.financeError && <p role="alert" className="text-xs text-risk">{sim.financeError}. Previous valid assumptions remain in effect.</p>}
    <div className="flex flex-wrap gap-1 border-b border-border pb-2">{sections.map(name => <button key={name} aria-pressed={section === name} onClick={() => setSection(name)} className={`rounded px-2 py-1 text-[11px] capitalize ${section === name ? "bg-accent/20 text-accent" : "bg-panel-2 text-muted"}`}>{name}</button>)}</div>
    {section === "household" && <>
      <div className="grid grid-cols-2 gap-3">
        {field("baselineElectricity", "Baseline electricity $/month", 0, 100000)}
        {field("baselineRent", "Baseline rent $/month (assumption)", 0, 100000)}
        {field("annualIncome", "Household income $/year", 1, 1e9, 1000)}
        {field("householdSize", "Household size", 1, 30)}
        <Slider label="Hypothetical rent change" value={f.rentChangePct} min={-20} max={20} step={0.25} unit="%" onChange={rentChangePct => updateFinance({ rentChangePct })} />
        <Slider label="Developer-funded upgrades" value={project.developerFundedFraction} min={0} max={1} step={0.01} format={fmtPct} onChange={developerFundedFraction => updateProject({ developerFundedFraction })} />
      </div>
      <div className="rounded border border-border p-2 text-[11px] text-muted">
        Rent: {fmtUSD(f.baselineRent)} × (1 + {f.rentChangePct}/100) = {fmtUSD(r.modeledRent)}.<br/>
        Electricity: {fmtUSD(f.baselineElectricity)} + {fmtUSD(r.rateDelta)} separate rate sensitivity + {fmtUSD(r.monthlyUpgradeExposure)} allocated upgrades = {fmtUSD(r.modeledElectricity)}.<br/>
        Combined annual: ({fmtUSD(r.modeledRent)} + {fmtUSD(r.modeledElectricity)}) × 12 = {fmtUSD(r.combinedAnnual)}.<br/>
        Monthly per person (simple division, not equivalized income): {fmtUSD(r.perPersonMonthly)}.
      </div>
      <h3 className="text-xs font-semibold">Same expenses, different household incomes</h3>
      <div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead><tr><th>Annual income</th><th>Baseline share</th><th>Scenario share</th></tr></thead><tbody>{r.incomeComparisons.map(row => <tr className="border-t border-border" key={row.income}><td className="py-2">{fmtUSD(row.income)}</td><td>{fmtPct(row.baselineShare)}</td><td>{fmtPct(row.scenarioShare)}</td></tr>)}</tbody></table></div>
      <h3 className="text-xs font-semibold">Low / medium / high infrastructure investment</h3>
      <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={r.scenarios}><XAxis dataKey="name" tick={{ fill: "#8ba0bf", fontSize: 10 }} /><YAxis tick={{ fill: "#8ba0bf", fontSize: 10 }} /><Tooltip /><Bar dataKey="monthlyUpgradeExposure" name="Monthly household upgrade exposure ($)" fill="#38bdf8" /></BarChart></ResponsiveContainer></div>
      <div className="grid grid-cols-2 gap-3">{field("lowCostMultiplier", "Low investment multiplier", 0, 1, 0.1)}{field("highCostMultiplier", "High investment multiplier", 1, 10, 0.1)}</div>
      <p className="text-[10px] text-muted">Low/medium/high vary upgrade investment only ({f.lowCostMultiplier}× / 1× / {f.highCostMultiplier}×); all other assumptions stay fixed.</p>
    </>}
    {section === "infrastructure" && <>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Facility demand MW" value={project.peakFacilityMW} min={5} max={200} onChange={v => updateProject({ peakFacilityMW: v ?? 5 })} />
        <NumberField label="Assumed available capacity MW" value={grid.availableCapacityMW} min={0} max={100000} placeholder="Unknown" onChange={availableCapacityMW => updateGrid({ availableCapacityMW, mode: "hypothetical" })} />
        <NumberField label="Upgrade cost $/MW" value={cost.costPerMW} min={0} max={1e8} step={100000} onChange={costPerMW => updateCost({ costPerMW: costPerMW ?? 0 })} />
        {field("upgradeFraction", "Upgrade MW / facility MW", 0, 2, 0.1)}
        <NumberField label="Manual upgrade MW (blank = demand × fraction)" value={f.manualUpgradeMW} min={0} max={100000} onChange={manualUpgradeMW => updateFinance({ manualUpgradeMW })} />
        <NumberField label="Recovery years" value={cost.amortizationYears} min={1} max={100} onChange={v => updateCost({ amortizationYears: v ?? 1 })} />
        <NumberField label="Affected households" value={cost.households} min={1} max={1e8} step={1} onChange={v => updateCost({ households: Math.round(v ?? 1) })} />
        <Slider label="Developer-funded upgrades" value={project.developerFundedFraction} min={0} max={1} step={0.01} format={fmtPct} onChange={developerFundedFraction => updateProject({ developerFundedFraction })} />
        <Slider label="Financing interest" value={f.interestRate} min={0} max={0.15} step={0.005} format={fmtPct} onChange={interestRate => updateFinance({ interestRate })} />
        {field("utilityRateChangePct", "Separate utility rate sensitivity %", -100, 500, 0.5)}
        {field("householdAllocation", "Ratepayer recovery: household share", 0, 1, 0.05)}
        {field("businessAllocation", "Ratepayer recovery: business share", 0, 1, 0.05)}
        {field("schoolAllocation", "Ratepayer recovery: school share", 0, 1, 0.05)}
        {field("backupGeneratorMW", "Backup generator capacity MW", 0, 1000)}
        {field("generatorHours", "Generator operating hours / year", 0, 8760)}
      </div>
      <div className="grid grid-cols-2 gap-2"><Metric label="Upgrade investment" value={fmtUSD(r.upgradeInvestment)} provenance="assumption" /><Metric label="Developer contribution" value={fmtUSD(r.developerInvestment)} provenance="calculated" /><Metric label="Remaining principal" value={fmtUSD(r.remainingPrincipal)} provenance="calculated" /><Metric label="Annual ratepayer recovery" value={fmtUSD(r.annualRecovery)} provenance="calculated" /></div>
      <p className="text-[10px] text-muted">Upgrade investment = {fmt(cost.incrementalMW, 1)} assumed upgrade MW × {fmtUSD(cost.costPerMW)}/MW. Annual recovery = non-developer principal × r / [1 − (1+r)^−years]; at zero interest use principal / years. Household monthly exposure = annual recovery × household share / affected households / 12. Unallocated annual recovery: {fmtUSD(r.unallocatedAnnualRecovery)}. Capacity is independently entered, not inferred from investment. Grid draw includes battery dispatch; generator fuel and emissions require additional data.</p>
    </>}
    {section === "housing" && <>
      <h3 className="text-xs font-semibold">Existing geographic housing context</h3>
      {communityLoading ? <p role="status" className="text-xs text-muted">Loading official Census municipality housing context…</p> : community ? <>
        <div className="grid grid-cols-2 gap-2"><Metric label="2020 housing units" value={fmt(community.housingUnits)} provenance="official" /><Metric label="Town housing density" value={`${fmt(community.housingUnitsPerSqMile)} units/mi²`} provenance="calculated" /><Metric label="2020 population" value={fmt(community.population)} provenance="official" /><Metric label="Published median rent" value={community.rentBenchmark != null ? `${fmtUSD(community.rentBenchmark)}/mo` : "Unavailable"} sub={community.acsRelease} provenance={community.rentBenchmark != null ? "official" : "unknown"} /></div>
        <p className="text-[10px] text-muted">{community.town}: municipality-wide 2020 Census housing units / Census land area, not housing density within the site radius. <a className="text-accent underline" href={community.sourceUrl} target="_blank" rel="noreferrer">Official source</a> · retrieved {new Date(community.retrievedAt).toLocaleString()}.</p>
        {community.acsSource && <a className="text-[10px] text-accent underline" href={community.acsSource} target="_blank" rel="noreferrer">ACS estimates via Census Reporter · {community.acsRelease}</a>}
        {community.rentError && <p className="text-[10px] text-caution">{community.rentError}</p>}
        {community.rentBenchmark != null && <button className="rounded border border-accent p-2 text-xs text-accent" onClick={() => updateFinance({ baselineRent: community.rentBenchmark! })}>Use published rent as household baseline</button>}
      </> : <p className="text-xs text-muted">{communityError ?? "Select a Massachusetts location for official housing context."}</p>}
      {community?.medianIncome != null && <div className="grid grid-cols-2 gap-2">
        <Metric label="Published median household income" value={`${fmtUSD(community.medianIncome)}/yr`} sub={community.acsRelease} provenance="official" />
        <Metric label="Published rent / income context" value={community.rentBenchmark != null ? fmtPct(community.rentBenchmark * 12 / community.medianIncome) : "Unknown"} sub="Ratio of town medians, not individual renter burden" provenance="calculated" />
      </div>}
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Residential land in footprint (2016)" value={sim.landUseImpact ? `${fmt(sim.landUseImpact.residentialAcres, 2)} ac` : sim.landUseLoading ? "Loading…" : "Unknown"} provenance={sim.landUseImpact ? "calculated" : "unknown"} />
        <Metric label="Commercial / mixed land in footprint (2016)" value={sim.landUseImpact ? `${fmt(sim.landUseImpact.commercialAcres, 2)} ac` : sim.landUseLoading ? "Loading…" : "Unknown"} provenance={sim.landUseImpact ? "calculated" : "unknown"} />
      </div>
      <p className="text-[10px] text-muted">Historical land use around a minimum 0.5-mile envelope; expands for larger footprints. Does not identify occupied homes or individual businesses. <a className="text-accent underline" href={LAND_USE} target="_blank" rel="noreferrer">MassGIS 2016 source</a>{sim.landUseRetrievedAt ? ` · retrieved ${new Date(sim.landUseRetrievedAt).toLocaleString()}` : ""}. {sim.landUseError}</p>
      <div className="grid grid-cols-2 gap-3">{field("baselineRent", "Rent baseline $/month (assumption)", 0, 100000)}{field("annualIncome", "Household income $/year", 1, 1e9, 1000)}{field("residentialLandAssumptionAcres", "Residential acres affected (assumption)", 0, 5000, 0.1)}</div>
      <Slider label="Hypothetical rent sensitivity" value={f.rentChangePct} min={-20} max={20} step={0.25} unit="%" onChange={rentChangePct => updateFinance({ rentChangePct })} />
      <p className="text-xs">{fmtUSD(f.baselineRent)} → {fmtUSD(r.modeledRent)}/month ({fmtUSD(r.rentDelta)} difference). Rent alone: {fmtPct(r.modeledRent * 12 / f.annualIncome)} of entered income.</p>
      <p className="text-[10px] text-muted">Residential/commercial shading uses historical 2016 MassGIS land use when available. Parcel availability, displaced homes, current zoning and actual rent causality are unknown. The footprint is conceptual. Entered affected residential acreage is an independent sensitivity, not a measured displacement count.</p>
    </>}
    {section === "institutions" && <>
      <h3 className="text-xs font-semibold">Businesses, schools and municipal finances · editable assumptions</h3>
      <div className="grid grid-cols-2 gap-3">
        {field("businessAnnualEnergy", "Business baseline energy $/yr", 0, 1e12, 1000)}{field("businessCount", "Businesses sharing allocation", 1, 1e7)}
        {field("businessCapex", "Business development capex $", 0, 1e12, 10000)}{field("schoolAnnualEnergy", "School/campus baseline energy $/yr", 0, 1e12, 10000)}
        {field("schoolCount", "Schools sharing allocation", 1, 1e6)}{field("schoolLandOpportunityCost", "School alternative land value $", 0, 1e12, 10000)}
        {field("taxableValue", "Assumed incremental taxable value $", 0, 1e12, 1000000)}{field("taxPerThousand", "Assumed tax $ / $1,000", 0, 100, 0.1)}
        {field("taxAbatementPct", "Assumed tax abatement %", 0, 100)}{field("publicCapital", "Municipal capital investment $", 0, 1e12, 100000)}
        {field("publicAnnualServices", "Annual public service cost $", 0, 1e12, 10000)}{field("annualCommunityBenefits", "Annual community benefits $", 0, 1e12, 10000)}
        {field("environmentalMitigation", "One-time mitigation budget $", 0, 1e12, 10000)}
      </div>
      <div className="grid grid-cols-2 gap-2"><Metric label="Business extra energy/yr" value={fmtUSD(r.businessAnnualExposure)} sub={`Baseline ${fmtUSD(f.businessAnnualEnergy)} + exposure`} provenance="estimated" /><Metric label="School extra energy/yr" value={fmtUSD(r.schoolAnnualExposure)} sub={`Baseline ${fmtUSD(f.schoolAnnualEnergy)} + exposure`} provenance="estimated" /><Metric label="Gross property tax/yr" value={fmtUSD(r.annualPropertyTax)} provenance="assumption" /><Metric label="Municipal public costs/yr" value={fmtUSD(r.annualPublicCost)} provenance="estimated" /><Metric label="Municipal net/yr" value={fmtUSD(r.annualMunicipalNet)} sub="Gross tax + benefits − expenses" provenance="estimated" /><Metric label="Business capex" value={fmtUSD(f.businessCapex)} sub="One-time, separately entered" provenance="assumption" /></div>
      <p className="text-[10px] text-muted">Institutional extra energy spending = allocated annual recovery / affected institutions + their entered baseline energy budget × separate utility-rate sensitivity. Counts sharing costs are assumptions, not the geographic school count. Gross tax = taxable assessment × tax per $1,000 / 1,000 × (1 − abatement). Net fiscal sensitivity = tax + annual benefits − annualized municipal capital − annual services. Public capital is a separate municipal project, not a second allocation of grid upgrades. One-time capex, mitigation and school land opportunity costs are shown separately, not added to annual energy bills. Tax values are hypothetical; university-owned tax status requires separate confirmation. Existing Massachusetts policy analysis remains in the Site tab.</p>
      <p className="text-xs text-muted">School land opportunity-cost assumption: {fmtUSD(f.schoolLandOpportunityCost)}. Mitigation spending: {fmtUSD(f.environmentalMitigation)}; no automatic environmental-score improvement without evidence of mitigation effectiveness.</p>
    </>}
    {section === "scenarios" && <>
      <h3 className="text-xs font-semibold">Engineering and community alternatives</h3>
      <p className="text-[10px] text-muted">Alternatives are derived from your current project; project and finance controls change the comparisons. Green efficiency changes utilization at the same peak rating. Community funding affects household burden, not documented environmental constraints.</p>
      <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={variants}><CartesianGrid stroke="#273349" /><XAxis dataKey="name" tick={{ fontSize: 9, fill: "#8ba0bf" }} /><YAxis yAxisId="energy" tick={{ fontSize: 9, fill: "#8ba0bf" }} /><YAxis yAxisId="money" orientation="right" tick={{ fontSize: 9, fill: "#8ba0bf" }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar yAxisId="energy" dataKey="energy" name="Electricity GWh/yr (left)" fill="#38bdf8" /><Bar yAxisId="money" dataKey="monthly" name="Household change $/mo (right)" fill="#fbbf24" /></BarChart></ResponsiveContainer></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-[10px]"><thead><tr><th>Scenario</th><th>GWh/yr</th><th>Water ML/yr</th><th>Household Δ/mo</th><th>Grid investment</th><th>Tax/yr</th><th>Score</th></tr></thead><tbody>{variants.map(v => <tr key={v.id} className="border-t border-border"><td className="py-2">{v.name}</td><td>{fmt(v.energy, 1)}</td><td>{fmt(v.water, 1)}</td><td>{fmtUSD(v.monthly)}</td><td>{fmtUSD(v.financial.upgradeInvestment)}</td><td>{fmtUSD(v.financial.annualPropertyTax)}</td><td>{fmt(v.modeled.assessment.screeningScore)}</td></tr>)}</tbody></table></div>
      {variants.map(v => <div key={v.id} className="rounded border border-border p-2 text-[11px]"><strong>{v.name}</strong><p className="text-muted">{v.note}</p><p className="text-muted">Developer share {fmtPct(v.project.developerFundedFraction)} · annual water {fmt(v.water)} ML · clean assumption {fmtPct(v.project.cleanEnergyCoverage)} · land constraints unchanged at this site.</p><button className="mt-1 text-accent underline" onClick={() => { updateProject(v.project); updateFinance(v.finance); }}>Apply {v.name}</button></div>)}
    </>}
    {section === "diagram" && <InfrastructureDiagram />}
    {!compact && <Link href="/" className="inline-block text-xs text-accent underline">← Back to map and facility placement</Link>}
  </div>;
}
