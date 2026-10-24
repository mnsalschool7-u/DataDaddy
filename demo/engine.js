/* DataDaddy model engine (mirrors src/lib/model + policy). Drives the screenshot demo.
   Pre-wired to Worcester @ 40 MW so the dashboard opens mid-scenario. */
const HOURS=8760, EO658=25;
const COOLING_WUE={air:.1,"closed-loop-liquid":.2,hybrid:.5,water:1.8};
const project={projectType:"enterprise",isExpansion:false,peakFacilityMW:40,utilization:.85,pue:1.4,cooling:"hybrid",wue:.5,cleanEnergyCoverage:.3};
let gridCap=null, radius=3;
// Worcester geo analysis results (computed by the real Turf pipeline over the bundled layers)
const geo={gs:{ok:true,areaSqMi:28.3,acres:1120,coverage:6.2},sc:{ok:true,w1:2,w3:4,near:0.34,nearName:"Worcester Technical High School (representative)"},ej:{ok:true,overlap:true,name:"Worcester EJ block group (representative)"}};

const fmt=(n,d=0)=>(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const gwh=m=>fmt(m/1000,2)+" GWh";
const liters=l=>l>=1e6?fmt(l/1e6,2)+" million L":fmt(l,0)+" L";
const clamp=(x,lo,hi)=>Math.min(Math.max(x,lo),hi);
const chip=p=>`<span class="chip c-${p}">${({official:"Official source",calculated:"Calculated",assumption:"Scenario assumption",estimated:"Estimated",unknown:"Unknown"})[p]}</span>`;

function energy(p){const f=p.peakFacilityMW*HOURS*p.utilization;const it=f/p.pue;return{f,fg:f/1000,it,itg:it/1000}}
function clean(e,c){c=clamp(c,0,1);const s=e.f*c;return{req:e.f,sup:s,unc:Math.max(0,e.f-s),cov:c}}
function water(e,w){const l=e.it*1000*w;return{l,d:l/365}}
function grid(cap,proposed){if(cap==null)return{known:false,cum:proposed,msg:"Local available capacity unknown"};const cum=proposed;return{known:true,cap,cum,rem:cap-cum,sh:Math.max(0,cum-cap),exc:cum>cap,msg:cum>cap?"Capacity exceeded under current scenario assumptions":"Within modeled scenario capacity"}}
function policy(p){const mw=p.peakFacilityMW,exc=mw>EO658,f=[];
 if(exc)f.push(["EO 658 large-project scope (>25 MW)","potentially-applicable",`Peak ${mw} MW is greater than the 25 MW threshold.`]);
 else if(mw===25)f.push(["EO 658 scope (at 25 MW)","more-info-required","Peak equals 25 MW — NOT greater than the threshold."]);
 else f.push(["EO 658 scope (<25 MW)","not-triggered",`Peak ${mw} MW is below the 25 MW threshold.`]);
 const inScope=exc,st=inScope?"potentially-applicable":"not-triggered";
 [["Community benefits agreement"],["Clean-electricity procurement"],["Water quantity & quality"],["Ratepayer protection & cost allocation"],["Reporting & disclosure"]].forEach(([t])=>f.push([t,st,inScope?"In-scope large project.":"Below scope threshold under current scenario."]));
 f.push(["Implementation rules & guidance","guidance-under-development","Some EO 658 measures are still being developed as of Oct 2026 — not finalized regulation."]);
 const summary=exc?`At ${mw} MW the scenario is above EO 658's >25 MW threshold; several requirements are potentially applicable.`:mw===25?`At exactly 25 MW the scenario is not automatically within EO 658's >25 MW scope; more information required.`:`At ${mw} MW the scenario is below EO 658's >25 MW threshold under current assumptions.`;
 return{exc,mw,f,summary}}
const W={landEnv:.30,infraFit:.25,community:.20,resource:.15,dataReadiness:.10};
function score(g,p){const C=[];let cons=[],adv=[];
 let le=null;if(geo.gs.ok){const c=geo.gs.coverage;le=clamp(100-c*1.5,0,100);(c>25?cons:adv).push(`${c>25?"High":"Modest"} mapped open space (${c.toFixed(1)}%) nearby`)}
 let inf=null;if(g.known){if(g.exc){inf=0;cons.push(`Modeled capacity exceeded by ${g.sh.toFixed(1)} MW`)}else{inf=clamp(g.rem/Math.max(1,g.cap)*100,0,100);adv.push("Within modeled scenario grid capacity")}}
 let com=null;if(geo.sc.ok||geo.ej.ok){let s=100;if(geo.sc.ok){s-=Math.min(40,geo.sc.w1*20+geo.sc.w3*5);if(geo.sc.w1>0)cons.push(`${geo.sc.w1} mapped school(s) within 1 mile`)}if(geo.ej.ok&&geo.ej.overlap){s-=30;cons.push("Within a designated Environmental Justice block group")}com=clamp(s,0,100)}
 const pu=clamp((2-p.pue)/(2-1.1),0,1),res=clamp((pu*.5+p.cleanEnergyCoverage*.5)*100,0,100);if(p.cleanEnergyCoverage>=.6)adv.push("High assumed clean-energy coverage");if(p.pue<=1.3)adv.push("Efficient assumed PUE");
 const sig=[geo.gs.ok,geo.sc.ok,geo.ej.ok,false,g.known],known=sig.filter(Boolean).length,dr=clamp(known/sig.length*100,0,100);if(!g.known)cons.push("Local available grid capacity unknown");
 C.push(["landEnv",le],["infraFit",inf],["community",com],["resource",res],["dataReadiness",dr]);
 const incl=C.filter(([,v])=>v!==null),tot=C.reduce((a,[k])=>a+W[k],0),im=incl.reduce((a,[k])=>a+W[k],0);
 const sc=im>0?clamp(incl.reduce((a,[k,v])=>a+W[k]/im*v,0),0,100):0;
 return{score:sc,cov:tot>0?im/tot:0,cons:cons.slice(0,3),adv:adv.slice(0,3)}}

function metric(lab,num,sub,prov,acc){return`<div class="metric"><div class="lab">${lab}${prov?chip(prov):""}</div><div class="num ${acc}">${num}</div>${sub?`<div class="sub">${sub}</div>`:""}</div>`}

function renderCtl(){document.getElementById("ctl").innerHTML=`
 <label class="ctl"><div class="row"><span>Project type</span></div><select><option>Enterprise data center</option></select></label>
 <label class="ctl"><div class="row"><span>Peak facility demand</span><span class="val">${project.peakFacilityMW} MW</span></div><input type="range" min="5" max="200" value="${project.peakFacilityMW}"></label>
 <label class="ctl"><div class="row"><span>Average utilization</span><span class="val">${Math.round(project.utilization*100)}%</span></div><input type="range" min="30" max="100" value="${project.utilization*100}"></label>
 <label class="ctl"><div class="row"><span>PUE (illustrative 1.4)</span></div><input type="number" value="${project.pue}"></label>
 <label class="ctl"><div class="row"><span>Cooling technology</span></div><select><option>Hybrid</option></select></label>
 <label class="ctl"><div class="row"><span>WUE (L/kWh IT)</span></div><input type="number" value="${project.wue}"></label>
 <label class="ctl"><div class="row"><span>Clean-energy coverage</span><span class="val">${Math.round(project.cleanEnergyCoverage*100)}%</span></div><input type="range" min="0" max="100" value="${project.cleanEnergyCoverage*100}"></label>
 <label class="ctl"><div class="row"><span>Available grid capacity</span></div><input type="number" placeholder="unknown"></label>`}

function render(){
 const e=energy(project),cl=clean(e,project.cleanEnergyCoverage),w=water(e,project.wue),g=grid(gridCap,project.peakFacilityMW),sc=score(g,project),pol=policy(project);
 const lg=document.getElementById("legendgrid");lg.className="banner "+(!g.known?"b-unknown":g.exc?"b-risk":"b-ok");lg.textContent="Grid: "+g.msg;
 const scoreAcc=sc.score>=66?"acc-fav":sc.score>=40?"acc-cau":"acc-risk";
 const findings=pol.f.filter(f=>f[1]!=="not-triggered").map(f=>{const m={"potentially-applicable":["Potentially applicable","c-assumption"],"more-info-required":["More information required","c-calculated"],"guidance-under-development":["Guidance under development","c-unknown"]}[f[1]];return`<div class="finding"><div style="display:flex;justify-content:space-between;gap:8px"><span class="ttl">${f[0]}</span><span class="chip ${m[1]}">${m[0]}</span></div><div class="note" style="margin-top:4px">${f[2]}</div></div>`}).join("");
 document.getElementById("intel").innerHTML=`<div style="display:flex;flex-direction:column;gap:12px">
 <div class="panel"><div class="ph">Site intelligence</div><div class="pb">
  <div style="font-weight:600">Worcester</div><div class="tabular note" style="margin-top:2px">42.2626, -71.8023 · radius ${radius} mi</div>
  <div class="metrics" style="margin-top:8px">${metric("Screening score",fmt(sc.score,0),"Evidence coverage "+fmt(sc.cov*100,0)+"%","estimated",scoreAcc)}${metric("Annual electricity",gwh(e.f),"Total facility demand","calculated","acc-acc")}</div>
  <div class="note" style="margin-top:8px">Screening score is a product-defined preliminary model, not a permitting decision. Missing inputs lower evidence coverage rather than inflating the score.</div></div></div>
 <div class="panel"><div class="ph">Environmental context</div><div class="pb"><div class="metrics">
  ${metric("Open space ("+radius+" mi)",fmt(geo.gs.coverage,1)+"%",fmt(geo.gs.acres,0)+" ac mapped","official","acc-fav")}
  ${metric("Analysis area",fmt(geo.gs.areaSqMi,1)+" mi²",fmt(geo.gs.acres/geo.gs.areaSqMi,0)+" ac/mi²","calculated","acc-acc")}
  ${metric("Schools ≤ 1 mi",fmt(geo.sc.w1,0),fmt(geo.sc.w3,0)+" within 3 mi","official","acc-cau")}
  ${metric("Nearest school",fmt(geo.sc.near,2)+" mi","representative point","calculated","acc-acc")}
  ${metric("Environmental justice","Within EJ",geo.ej.name,"official","acc-cau")}
  ${metric("Flood hazard","Unknown","Layer unavailable","unknown","acc-mut")}</div>
  <div class="note" style="margin-top:8px">Open-space datasets do not include every tree, lawn, or undeveloped parcel. Absence of mapped features is not proof of absence on the ground.</div></div></div>
 <div class="panel"><div class="ph">Energy &amp; water</div><div class="pb"><div class="metrics">
  ${metric("Facility demand",gwh(e.f),fmt(e.f,0)+" MWh/yr","calculated","acc-acc")}
  ${metric("IT demand (via PUE)",gwh(e.it),"Distinct from facility","calculated","acc-acc")}
  ${metric("Clean-energy gap",gwh(cl.unc),fmt(cl.cov*100,0)+"% covered (assumption)","estimated","acc-cau")}
  ${metric("Modeled water use",liters(w.l),liters(w.d)+"/day","estimated","acc-acc")}</div></div></div>
 <div class="panel"><div class="ph">Grid capacity</div><div class="pb"><div class="banner ${!g.known?"b-unknown":g.exc?"b-risk":"b-ok"}">${g.msg}</div>
  <div class="note" style="margin-top:8px">Capacity is a simulated scenario constraint, not verified grid saturation. Enter a value to model headroom.</div></div></div>
 <div class="panel"><div class="ph">Massachusetts Policy Navigator</div><div class="pb"><div class="banner b-unknown" style="color:var(--text)">${pol.summary}</div>${findings}
  <div class="note" style="margin-top:8px">Some EO 658 implementation rules are still under development as of Oct 2026. Pending measures are not finalized regulation.</div></div></div>
 <div class="panel"><div class="ph">DataDaddy Intelligence</div><div class="pb"><div class="note">Grounded analyst: at ${fmt(project.peakFacilityMW,0)} MW this enterprise facility draws ${gwh(e.f)}/yr; modeled water ~${liters(w.l)}. Screening ${fmt(sc.score,0)}/100 at ${fmt(sc.cov*100,0)}% evidence coverage. Biggest levers: peak demand, clean-energy coverage, cooling choice.</div></div></div>
 </div>`}
renderCtl();render();
window.__setMW=mw=>{project.peakFacilityMW=mw;render();renderCtl()};
window.__setCap=c=>{gridCap=c;render()};
