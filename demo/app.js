/* DataDaddy demo — model math ported verbatim from src/lib/model + src/lib/policy.
   Self-contained: MapLibre + Turf from CDN, GeoJSON from ./data. No build step. */

// ---------- model (mirrors the tested TypeScript engine) ----------
const HOURS = 8760;
const COOLING_WUE = { air: 0.1, "closed-loop-liquid": 0.2, hybrid: 0.5, water: 1.8 };
const COOLING_LABELS = { air: "Air cooled", water: "Water based", hybrid: "Hybrid", "closed-loop-liquid": "Closed-loop liquid cooling" };
const EO658 = 25;

function computeEnergy(p) {
  const facility = p.peakFacilityMW * HOURS * p.utilization;
  const it = facility / p.pue;
  return { facilityMWh: facility, facilityGWh: facility / 1000, itMWh: it, itGWh: it / 1000, overheadMWh: facility - it };
}
function computeClean(e, cov) {
  cov = Math.min(Math.max(cov, 0), 1);
  const supplied = e.facilityMWh * cov, uncovered = Math.max(0, e.facilityMWh - supplied);
  return { requirement: e.facilityMWh, supplied, uncovered, covered: cov };
}
function computeWater(e, wue) {
  const itKWh = e.itMWh * 1000, liters = itKWh * wue;
  return { wue, annualLiters: liters, dailyLiters: liters / 365 };
}
function computeGrid(cap, existing, prior, proposed, diversity) {
  const cumulative = (existing + prior + proposed) * diversity;
  if (cap === null || cap === undefined || cap === "" || isNaN(cap))
    return { known: false, cumulative, remaining: null, shortfall: null, exceeded: false, msg: "Local available capacity unknown" };
  cap = +cap;
  const remaining = cap - cumulative, shortfall = Math.max(0, cumulative - cap), exceeded = cumulative > cap;
  return { known: true, cap, cumulative, remaining, shortfall, exceeded,
    msg: exceeded ? "Capacity exceeded under current scenario assumptions" : "Within modeled scenario capacity" };
}
function exceedsEO658(mw) { return mw > EO658; }
function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

// EO 658 evaluation (threshold logic + categorized findings, mirrors eo658.ts)
function evaluatePolicy(p) {
  const mw = p.peakFacilityMW, exceeds = exceedsEO658(mw), f = [];
  if (exceeds) f.push({ t: "EO 658 large-project scope (>25 MW)", s: "potentially-applicable", b: `Peak ${mw} MW is greater than the 25 MW threshold.` });
  else if (mw === 25) f.push({ t: "EO 658 scope (at 25 MW)", s: "more-info-required", b: "Peak equals 25 MW — NOT greater than the threshold." });
  else f.push({ t: "EO 658 scope (<25 MW)", s: "not-triggered", b: `Peak ${mw} MW is below the 25 MW threshold.` });
  if (p.isExpansion) f.push({ t: "Applicability to expansions", s: "more-info-required", b: "Flagged as an expansion — evaluated under the order's expansion language." });
  if (p.projectType === "university-research") f.push({ t: "Possible university exemption pathway", s: "more-info-required", b: "University research facilities may qualify for exemption when approved under the stated process." });
  const inScope = exceeds, st = inScope ? "potentially-applicable" : "not-triggered";
  [["Community benefits agreement", "Host community engagement"],
   ["Clean-electricity procurement", "RECs alone may not satisfy incremental-generation expectations"],
   ["Water quantity & quality", "Actual water source/withdrawal data"],
   ["Ratepayer protection & cost allocation", "Approved cost-allocation methodology"],
   ["Reporting & disclosure", "Implementation guidance pending"]].forEach(([t]) => f.push({ t, s: st, b: inScope ? "In-scope large project." : "Below scope threshold under current scenario." }));
  f.push({ t: "Implementation rules & guidance", s: "guidance-under-development", b: "Some EO 658 implementation measures are still being developed as of Oct 2026 — not finalized regulation." });
  const summary = exceeds ? `At ${mw} MW the scenario is above EO 658's >25 MW threshold; several requirements are potentially applicable.`
    : mw === 25 ? `At exactly 25 MW the scenario is not automatically within EO 658's >25 MW scope; more information required.`
    : `At ${mw} MW the scenario is below EO 658's >25 MW threshold under current assumptions.`;
  return { exceeds, mw, findings: f, summary };
}

// Scoring (weighted, unknown components excluded → lower evidence coverage)
const WEIGHTS = { landEnv: .30, infraFit: .25, community: .20, resource: .15, dataReadiness: .10 };
function scoreSite(geo, grid, p) {
  const C = [], cons = [], adv = [], miss = [];
  let landEnv = null;
  if (geo.gs.ok) { const cov = geo.gs.coverage; landEnv = clamp(100 - cov * 1.5, 0, 100);
    (cov > 25 ? cons : adv).push(`${cov > 25 ? "High" : "Modest"} mapped open space (${cov.toFixed(1)}%) nearby`); }
  else miss.push("Land-use: open-space layer unavailable");
  let infraFit = null;
  if (grid.known) { if (grid.exceeded) { infraFit = 0; cons.push(`Modeled capacity exceeded by ${grid.shortfall.toFixed(1)} MW`); }
    else { infraFit = clamp(grid.remaining / Math.max(1, grid.cap) * 100, 0, 100); adv.push("Within modeled scenario grid capacity"); } }
  else miss.push("Infrastructure: available capacity unknown (not defaulted)");
  let community = null;
  if (geo.sc.ok || geo.ej.ok) { let s = 100;
    if (geo.sc.ok) { s -= Math.min(40, geo.sc.w1 * 20 + geo.sc.w3 * 5); if (geo.sc.w1 > 0) cons.push(`${geo.sc.w1} mapped school(s) within 1 mile`); }
    if (geo.ej.ok && geo.ej.overlap) { s -= 30; cons.push("Within a designated Environmental Justice block group"); }
    community = clamp(s, 0, 100); } else miss.push("Community: layers unavailable");
  const pueScore = clamp((2 - p.pue) / (2 - 1.1), 0, 1), resource = clamp((pueScore * .5 + p.cleanEnergyCoverage * .5) * 100, 0, 100);
  if (p.cleanEnergyCoverage >= .6) adv.push("High assumed clean-energy coverage");
  if (p.pue <= 1.3) adv.push("Efficient assumed PUE");
  const signals = [geo.gs.ok, geo.sc.ok, geo.ej.ok, false, grid.known], known = signals.filter(Boolean).length;
  const dataReadiness = clamp(known / signals.length * 100, 0, 100);
  if (!grid.known) cons.push("Local available grid capacity unknown");
  C.push(["landEnv", landEnv], ["infraFit", infraFit], ["community", community], ["resource", resource], ["dataReadiness", dataReadiness]);
  const incl = C.filter(([, v]) => v !== null);
  const totalMass = C.reduce((a, [k]) => a + WEIGHTS[k], 0);
  const inclMass = incl.reduce((a, [k]) => a + WEIGHTS[k], 0);
  const score = inclMass > 0 ? clamp(incl.reduce((a, [k, v]) => a + (WEIGHTS[k] / inclMass) * v, 0), 0, 100) : 0;
  return { score, coverage: totalMass > 0 ? inclMass / totalMass : 0, constraints: cons.slice(0, 3), advantages: adv.slice(0, 3), missing: miss };
}

// ---------- formatting ----------
const fmt = (n, d = 0) => (n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const gwh = m => fmt(m / 1000, 2) + " GWh";
const liters = l => l >= 1e6 ? fmt(l / 1e6, 2) + " million L" : fmt(l, 0) + " L";
const chip = p => `<span class="chip c-${p}">${({ official: "Official source", calculated: "Calculated", assumption: "Scenario assumption", estimated: "Estimated", unknown: "Unknown" })[p]}</span>`;

// ---------- state ----------
const MUNI = [
  ["Worcester", "Worcester", 42.2626, -71.8023], ["Lowell", "Middlesex", 42.6334, -71.3162],
  ["Boston", "Suffolk", 42.3601, -71.0589], ["Springfield", "Hampden", 42.1015, -72.5898],
  ["Cambridge", "Middlesex", 42.3736, -71.1097], ["Lawrence", "Essex", 42.707, -71.1631],
  ["Framingham", "Middlesex", 42.2793, -71.4162], ["Fitchburg", "Worcester", 42.5834, -71.8023],
  ["Leominster", "Worcester", 42.525, -71.7598], ["Pittsfield", "Berkshire", 42.4501, -73.2454],
];
let layersData = {}, site = null;
const project = { projectType: "enterprise", isExpansion: false, peakFacilityMW: 40, utilization: .85, pue: 1.4, cooling: "hybrid", wue: .5, cleanEnergyCoverage: .3 };
let gridCap = null;
const toggles = { municipalities: true, openspace: true, ej: true, schools: true };

// ---------- geo analysis (Turf) ----------
function analyze() {
  if (!site) return null;
  const os = layersData.openspace, sc = layersData.schools, ej = layersData.ej;
  const circle = turf.circle([site.lng, site.lat], site.r, { units: "miles", steps: 64 });
  const areaSqMi = turf.area(circle) / 2589988.110336;
  // green space
  let gsOk = !!(os && os.features.length), inter = 0;
  if (gsOk) for (const f of os.features) { try { const c = turf.intersect(turf.featureCollection([circle, f])); if (c) inter += turf.area(c); } catch {} }
  inter = Math.min(inter, turf.area(circle));
  const gs = { ok: gsOk, areaSqMi, acres: inter / 4046.8564224, coverage: gsOk ? clamp(inter / turf.area(circle) * 100, 0, 100) : 0 };
  // schools
  let scOk = !!(sc && sc.features.length), w1 = 0, w3 = 0, near = Infinity, nearName = null;
  if (scOk) { const from = turf.point([site.lng, site.lat]);
    for (const f of sc.features) { const d = turf.distance(from, f, { units: "miles" }); if (d <= 1) w1++; if (d <= 3) w3++; if (d < near) { near = d; nearName = f.properties.name; } } }
  const scR = { ok: scOk, w1, w3, near: isFinite(near) ? near : null, nearName };
  // ej
  let ejOk = !!(ej && ej.features.length), overlap = false, ejName = null;
  if (ejOk) { const pt = turf.point([site.lng, site.lat]);
    for (const f of ej.features) { try { if (turf.booleanPointInPolygon(pt, f)) { overlap = true; ejName = f.properties.name; } } catch {} } }
  return { gs, sc: scR, ej: { ok: ejOk, overlap, name: ejName } };
}

// ---------- render right panel ----------
function render() {
  const legendGrid = document.getElementById("legendgrid");
  const e = computeEnergy(project), cl = computeClean(e, project.cleanEnergyCoverage), w = computeWater(e, project.wue);
  const g = computeGrid(gridCap, 0, 0, project.peakFacilityMW, 1);
  legendGrid.className = "banner " + (!g.known ? "b-unknown" : g.exceeded ? "b-risk" : "b-ok");
  legendGrid.textContent = "Grid: " + g.msg;

  if (!site) { document.getElementById("empty").style.display = ""; document.getElementById("intel").style.display = "none"; return; }
  document.getElementById("empty").style.display = "none";
  const box = document.getElementById("intel"); box.style.display = "flex";
  const geo = analyze(), sc = scoreSite(geo, g, project), pol = evaluatePolicy(project);
  const scoreAcc = sc.score >= 66 ? "acc-fav" : sc.score >= 40 ? "acc-cau" : "acc-risk";

  const findingsHtml = pol.findings.filter(f => f.s !== "not-triggered").map(f => {
    const st = { "potentially-applicable": ["Potentially applicable", "acc-cau"], "more-info-required": ["More information required", "acc-acc"], "guidance-under-development": ["Guidance under development", "acc-mut"] }[f.s];
    return `<div class="finding"><div style="display:flex;justify-content:space-between;gap:8px"><span class="ttl">${f.t}</span><span class="chip ${st[1] === 'acc-cau' ? 'c-assumption' : st[1] === 'acc-acc' ? 'c-calculated' : 'c-unknown'}">${st[0]}</span></div><div class="note" style="margin-top:4px">${f.b}</div></div>`;
  }).join("");

  box.innerHTML = `
  <div class="panel"><div class="ph">Site intelligence</div><div class="pb">
    <div style="font-weight:600">${site.name}</div>
    <div class="tabular note" style="margin-top:2px">${site.lat.toFixed(4)}, ${site.lng.toFixed(4)} · radius ${site.r} mi</div>
    <div class="metrics" style="margin-top:8px">
      ${metric("Screening score", fmt(sc.score, 0), "Evidence coverage " + fmt(sc.coverage * 100, 0) + "%", "estimated", scoreAcc)}
      ${metric("Annual electricity", gwh(e.facilityMWh), "Total facility demand", "calculated", "acc-acc")}
    </div>
    <div class="note" style="margin-top:8px">Screening score is a product-defined preliminary model, not a permitting decision. Missing inputs lower evidence coverage rather than inflating the score.</div>
  </div></div>

  <div class="panel"><div class="ph">Environmental context</div><div class="pb"><div class="metrics">
    ${metric(`Open space (${site.r} mi)`, geo.gs.ok ? fmt(geo.gs.coverage, 1) + "%" : "Unknown", geo.gs.ok ? fmt(geo.gs.acres, 0) + " ac mapped" : "Layer unavailable", geo.gs.ok ? "official" : "unknown", geo.gs.ok ? "acc-fav" : "acc-mut")}
    ${metric("Analysis area", fmt(geo.gs.areaSqMi, 1) + " mi²", geo.gs.ok ? fmt(geo.gs.acres / geo.gs.areaSqMi, 0) + " ac/mi²" : "", "calculated", "acc-acc")}
    ${metric("Schools ≤ 1 mi", geo.sc.ok ? fmt(geo.sc.w1, 0) : "Unknown", geo.sc.ok ? fmt(geo.sc.w3, 0) + " within 3 mi" : "Layer unavailable", geo.sc.ok ? "official" : "unknown", geo.sc.ok && geo.sc.w1 > 0 ? "acc-cau" : "acc-mut")}
    ${metric("Nearest school", geo.sc.near != null ? fmt(geo.sc.near, 2) + " mi" : "Unknown", geo.sc.nearName || "", geo.sc.ok ? "calculated" : "unknown", "acc-acc")}
    ${metric("Environmental justice", geo.ej.ok ? (geo.ej.overlap ? "Within EJ" : "No overlap") : "Unknown", geo.ej.overlap ? geo.ej.name : (geo.ej.ok ? "In mapped subset" : "Layer unavailable"), geo.ej.ok ? "official" : "unknown", geo.ej.overlap ? "acc-cau" : "acc-mut")}
    ${metric("Flood hazard", "Unknown", "Layer unavailable", "unknown", "acc-mut")}
  </div><div class="note" style="margin-top:8px">Open-space datasets do not include every tree, lawn, or undeveloped parcel. Absence of mapped features is not proof of absence on the ground.</div></div></div>

  <div class="panel"><div class="ph">Energy &amp; water</div><div class="pb"><div class="metrics">
    ${metric("Facility demand", gwh(e.facilityMWh), fmt(e.facilityMWh, 0) + " MWh/yr", "calculated", "acc-acc")}
    ${metric("IT demand (via PUE)", gwh(e.itMWh), "Distinct from facility", "calculated", "acc-acc")}
    ${metric("Clean-energy gap", gwh(cl.uncovered), fmt(cl.covered * 100, 0) + "% covered (assumption)", "estimated", "acc-cau")}
    ${metric("Modeled water use", liters(w.annualLiters), liters(w.dailyLiters) + "/day", "estimated", "acc-acc")}
  </div></div></div>

  <div class="panel"><div class="ph">Grid capacity</div><div class="pb">
    <div class="banner ${!g.known ? "b-unknown" : g.exceeded ? "b-risk" : "b-ok"}">${g.msg}</div>
    ${g.known ? `<div class="metrics" style="margin-top:8px">${metric("Cumulative demand", fmt(g.cumulative, 1) + " MW", "", "assumption", "acc-cau")}${metric(g.exceeded ? "Shortfall" : "Remaining", fmt(g.exceeded ? g.shortfall : g.remaining, 1) + " MW", "", "calculated", g.exceeded ? "acc-risk" : "acc-fav")}</div>` : ""}
    <div class="note" style="margin-top:8px">Capacity is a simulated scenario constraint, not verified grid saturation.</div>
  </div></div>

  <div class="panel"><div class="ph">Massachusetts Policy Navigator</div><div class="pb">
    <div class="banner b-unknown" style="color:var(--text)">${pol.summary}</div>
    ${findingsHtml}
    <div class="note" style="margin-top:8px">Some EO 658 implementation rules are still under development as of Oct 2026. Pending measures are not finalized regulation.</div>
  </div></div>

  <div class="panel"><div class="ph">DataDaddy Intelligence</div><div class="pb">
    <div class="note">Grounded analyst (deterministic): at ${fmt(project.peakFacilityMW, 0)} MW this ${project.projectType} draws ${gwh(e.facilityMWh)}/yr; modeled water ~${liters(w.annualLiters)}. Screening ${fmt(sc.score, 0)}/100 at ${fmt(sc.coverage * 100, 0)}% evidence coverage. Biggest levers: peak demand, clean-energy coverage, cooling choice.</div>
  </div></div>`;
}
function metric(lab, num, sub, prov, acc) {
  return `<div class="metric"><div class="lab">${lab}${prov ? chip(prov) : ""}</div><div class="num ${acc}">${num}</div>${sub ? `<div class="sub">${sub}</div>` : ""}</div>`;
}

// ---------- map ----------
const map = new maplibregl.Map({
  container: "map",
  style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
  center: [-71.8, 42.3], zoom: 8,
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

async function loadLayers() {
  const ids = ["municipalities", "openspace", "ej", "schools"];
  await Promise.all(ids.map(async id => { try { const r = await fetch(`./data/${id}.geojson`); if (r.ok) layersData[id] = await r.json(); } catch {} }));
}

map.on("load", async () => {
  await loadLayers();
  const empty = { type: "FeatureCollection", features: [] };
  ["municipalities", "openspace", "ej", "schools", "radius", "selection"].forEach(s => map.addSource(s, { type: "geojson", data: layersData[s] || empty }));
  map.addLayer({ id: "municipalities-line", type: "line", source: "municipalities", paint: { "line-color": "#8ba0bf", "line-width": 1.2, "line-opacity": .8 } });
  map.addLayer({ id: "openspace-fill", type: "fill", source: "openspace", paint: { "fill-color": "#34d399", "fill-opacity": .28 } });
  map.addLayer({ id: "openspace-line", type: "line", source: "openspace", paint: { "line-color": "#34d399", "line-width": .8 } });
  map.addLayer({ id: "ej-fill", type: "fill", source: "ej", paint: { "fill-color": "#a3e635", "fill-opacity": .18 } });
  map.addLayer({ id: "ej-line", type: "line", source: "ej", paint: { "line-color": "#a3e635", "line-width": .8, "line-dasharray": [2, 2] } });
  map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#38bdf8", "fill-opacity": .08 } });
  map.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": "#38bdf8", "line-width": 1.5, "line-dasharray": [3, 2] } });
  map.addLayer({ id: "schools-circle", type: "circle", source: "schools", paint: { "circle-radius": 4, "circle-color": "#fbbf24", "circle-stroke-color": "#0a0f1a", "circle-stroke-width": 1 } });
  map.addLayer({ id: "selection-circle", type: "circle", source: "selection", paint: { "circle-radius": 7, "circle-color": "#38bdf8", "circle-stroke-color": "#e5ecf5", "circle-stroke-width": 2 } });
  map.on("click", e => selectSite(`Selected location (${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)})`, e.lngLat.lat, e.lngLat.lng));
  render();
});

function updateSelection() {
  if (!map.getSource("selection")) return;
  if (!site) { map.getSource("selection").setData({ type: "FeatureCollection", features: [] }); map.getSource("radius").setData({ type: "FeatureCollection", features: [] }); return; }
  map.getSource("selection").setData(turf.point([site.lng, site.lat]));
  map.getSource("radius").setData(turf.circle([site.lng, site.lat], site.r, { units: "miles", steps: 64 }));
  map.easeTo({ center: [site.lng, site.lat], zoom: Math.max(map.getZoom(), 11), duration: 600 });
}
function selectSite(name, lat, lng) { site = { name, lat, lng, r: site ? site.r : 3 }; updateSelection(); render(); }

// ---------- controls wiring ----------
const $ = id => document.getElementById(id);
$("mw").oninput = e => { project.peakFacilityMW = +e.target.value; $("mwv").textContent = e.target.value; render(); };
$("util").oninput = e => { project.utilization = +e.target.value / 100; $("utilv").textContent = e.target.value; render(); };
$("pue").oninput = e => { project.pue = +e.target.value || 1.4; render(); };
$("cool").onchange = e => { project.cooling = e.target.value; project.wue = COOLING_WUE[e.target.value]; $("wue").value = project.wue; render(); };
$("wue").oninput = e => { project.wue = +e.target.value || 0; render(); };
$("clean").oninput = e => { project.cleanEnergyCoverage = +e.target.value / 100; $("cleanv").textContent = e.target.value; render(); };
$("ptype").onchange = e => { project.projectType = e.target.value; render(); };
$("cap").oninput = e => { gridCap = e.target.value === "" ? null : +e.target.value; render(); };
$("expansion").onclick = function () { project.isExpansion = !project.isExpansion; this.classList.toggle("on", project.isExpansion); render(); };
document.querySelectorAll("#radii button").forEach(b => b.onclick = () => {
  document.querySelectorAll("#radii button").forEach(x => x.classList.remove("on")); b.classList.add("on");
  if (site) { site.r = +b.dataset.r; updateSelection(); render(); }
});
document.querySelectorAll("#layers .toggle").forEach(t => t.onclick = () => {
  const l = t.dataset.layer; toggles[l] = !toggles[l]; t.classList.toggle("on", toggles[l]);
  const vis = toggles[l] ? "visible" : "none";
  ({ municipalities: ["municipalities-line"], openspace: ["openspace-fill", "openspace-line"], ej: ["ej-fill", "ej-line"], schools: ["schools-circle"] })[l]
    .forEach(id => map.getLayer(id) && map.setLayoutProperty(id, "visibility", vis));
});
$("search").oninput = e => {
  const q = e.target.value.trim().toLowerCase(), box = $("results");
  if (!q) { box.innerHTML = ""; return; }
  const r = MUNI.filter(m => m[0].toLowerCase().includes(q) || m[1].toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = r.map(m => `<div class="toggle" style="cursor:pointer" data-lat="${m[2]}" data-lng="${m[3]}" data-n="${m[0]}"><span>${m[0]}</span><span class="note">${m[1]} Co.</span></div>`).join("");
  box.querySelectorAll(".toggle").forEach(el => el.onclick = () => { selectSite(el.dataset.n, +el.dataset.lat, +el.dataset.lng); $("search").value = ""; box.innerHTML = ""; });
};
