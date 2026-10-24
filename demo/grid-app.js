/* DataDaddy interactive grid map. Model math mirrors src/lib/model + policy.
   MapLibre + Turf from CDN; GeoJSON embedded (window.__DD_DATA__) so it runs offline. */

// ---------------- model ----------------
var HOURS = 8760, EO658 = 25;
var COOLING_WUE = { air:.1, "closed-loop-liquid":.2, hybrid:.5, water:1.8 };
var COOLING_LABEL = { air:"Air cooled", water:"Water based", hybrid:"Hybrid", "closed-loop-liquid":"Closed-loop liquid" };
function energy(p){ var f=p.mw*HOURS*p.util, it=f/p.pue; return {f:f,fg:f/1000,it:it,itg:it/1000}; }
function waterOf(e,wue){ return e.it*1000*wue; }
function cleanGap(e,cov){ return e.f*(1-Math.min(Math.max(cov,0),1)); }
function cl(x,a,b){ return Math.min(Math.max(x,a),b); }
function exceeds658(mw){ return mw>EO658; }

// ---------------- formatting ----------------
function f(n,d){ d=d||0; return Number(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}); }
function G(m){ return f(m/1000,2)+" GWh"; }
function L(l){ return l>=1e6 ? f(l/1e6,2)+" million L" : f(l,0)+" L"; }
function chip(p){ var t={o:"Official source",c:"Calculated",a:"Scenario assumption",e:"Estimated",u:"Unknown"}[p], k={o:"co",c:"cc",a:"ca",e:"ca",u:"cu"}[p]; return '<span class="chip '+k+'">'+t+'</span>'; }

// ---------------- state ----------------
var DATA = window.__DD_DATA__ || {};
var template = { projectType:"enterprise", mw:40, util:.85, pue:1.4, cooling:"hybrid", clean:.3 };
var capacity = null;      // modeled regional capacity (MW) or null (unknown)
var existingLoad = 0;     // existing assumed load (MW)
var centers = [];         // placed data centers [{id,name,lng,lat,mw,util,pue,cooling,clean,type,color}]
var placeMode = false;
var selected = null;      // inspected site (click in explore mode) {lng,lat,name}
var markers = [];
var GRID_COLORS = ["#38bdf8","#34d399","#fbbf24","#a3e635","#f472b6","#f87171"];
var nextColor = 0;

// ---------------- geo analysis (Turf) ----------------
function analyze(lng,lat,r){
  r = r||3;
  var os=DATA.openspace, sc=DATA.schools, ej=DATA.ej;
  var circle=turf.circle([lng,lat],r,{units:"miles",steps:48});
  var area=turf.area(circle)/2589988.110336;
  var gsOk=!!(os&&os.features.length), inter=0;
  if(gsOk) os.features.forEach(function(ft){ try{ var c=turf.intersect(turf.featureCollection([circle,ft])); if(c) inter+=turf.area(c);}catch(e){} });
  inter=Math.min(inter,turf.area(circle));
  var gs={ok:gsOk,area:area,acres:inter/4046.8564224,cov:gsOk?cl(inter/turf.area(circle)*100,0,100):0};
  var scOk=!!(sc&&sc.features.length),w1=0,w3=0,near=Infinity,nn=null;
  if(scOk){ var from=turf.point([lng,lat]); sc.features.forEach(function(ft){ var d=turf.distance(from,ft,{units:"miles"}); if(d<=1)w1++; if(d<=3)w3++; if(d<near){near=d;nn=ft.properties.name;} }); }
  var sch={ok:scOk,w1:w1,w3:w3,near:isFinite(near)?near:null,nn:nn};
  var ejOk=!!(ej&&ej.features.length),ov=false,en=null;
  if(ejOk){ var pt=turf.point([lng,lat]); ej.features.forEach(function(ft){ try{ if(turf.booleanPointInPolygon(pt,ft)){ov=true;en=ft.properties.name;}}catch(e){} }); }
  return {gs:gs,sc:sch,ej:{ok:ejOk,ov:ov,name:en},area:area};
}

// ---------------- cumulative / grid ----------------
function cumulativeMW(){ return existingLoad + centers.reduce(function(a,c){return a+c.mw;},0); }
function gridStatus(){
  var cum=cumulativeMW();
  if(capacity===null) return {known:false,cum:cum,msg:"Modeled regional capacity unknown"};
  var rem=capacity-cum, sh=Math.max(0,cum-capacity);
  return {known:true,cap:capacity,cum:cum,rem:rem,sh:sh,exc:cum>capacity,
    msg: cum>capacity ? "Capacity exceeded under current scenario assumptions" : "Within modeled scenario capacity"};
}

// ---------------- policy ----------------
function policy(mw,type){
  var exc=exceeds658(mw), out=[];
  if(exc) out.push(["EO 658 large-project scope (>25 MW)","pa","Peak "+mw+" MW is greater than the 25 MW threshold."]);
  else if(mw===25) out.push(["EO 658 scope (at 25 MW)","mi","Peak equals 25 MW — not greater than the threshold."]);
  else out.push(["EO 658 scope (<25 MW)","nt","Peak "+mw+" MW is below the 25 MW threshold."]);
  if(type==="university-research") out.push(["University exemption pathway","mi","May qualify for exemption when approved under the stated process."]);
  var st=exc?"pa":"nt";
  [["Community benefits agreement"],["Clean-electricity procurement"],["Water quantity & quality"],["Ratepayer protection & cost allocation"],["Reporting & disclosure"]]
    .forEach(function(x){ out.push([x[0],st, exc?"In-scope large project.":"Below scope threshold under current scenario."]); });
  out.push(["Implementation rules & guidance","gd","Some EO 658 measures remain under development as of Oct 2026 — not finalized regulation."]);
  var summary = exc ? "At "+mw+" MW this is above EO 658's >25 MW threshold; several requirements are potentially applicable."
    : mw===25 ? "At exactly 25 MW, EO 658's >25 MW scope is not automatically met; more information required."
    : "At "+mw+" MW this is below EO 658's >25 MW threshold under current assumptions.";
  return {exc:exc,summary:summary,findings:out};
}

// ---------------- map ----------------
var map = new maplibregl.Map({
  container:"map",
  style:{version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:"© OpenStreetMap contributors"}},layers:[{id:"osm",type:"raster",source:"osm"}]},
  center:[-71.8,42.3], zoom:8
});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
map.addControl(new maplibregl.ScaleControl({unit:"imperial"}),"bottom-left");

var ready=false;
map.on("load", function(){
  var empty={type:"FeatureCollection",features:[]};
  map.addSource("municipalities",{type:"geojson",data:DATA.municipalities||empty});
  map.addSource("openspace",{type:"geojson",data:DATA.openspace||empty});
  map.addSource("ej",{type:"geojson",data:DATA.ej||empty});
  map.addSource("schools",{type:"geojson",data:DATA.schools||empty});
  map.addSource("gridcells",{type:"geojson",data:empty});
  map.addSource("radius",{type:"geojson",data:empty});

  map.addLayer({id:"gridcells-fill",type:"fill",source:"gridcells",paint:{"fill-color":["get","color"],"fill-opacity":["get","op"]},layout:{visibility:"none"}});
  map.addLayer({id:"gridcells-line",type:"line",source:"gridcells",paint:{"line-color":"#38bdf8","line-width":.4,"line-opacity":.4},layout:{visibility:"none"}});
  map.addLayer({id:"municipalities-line",type:"line",source:"municipalities",paint:{"line-color":"#8ba0bf","line-width":1.2,"line-opacity":.8}});
  map.addLayer({id:"openspace-fill",type:"fill",source:"openspace",paint:{"fill-color":"#34d399","fill-opacity":.28}});
  map.addLayer({id:"openspace-line",type:"line",source:"openspace",paint:{"line-color":"#34d399","line-width":.8}});
  map.addLayer({id:"ej-fill",type:"fill",source:"ej",paint:{"fill-color":"#a3e635","fill-opacity":.16}});
  map.addLayer({id:"ej-line",type:"line",source:"ej",paint:{"line-color":"#a3e635","line-width":.8,"line-dasharray":[2,2]}});
  map.addLayer({id:"schools-circle",type:"circle",source:"schools",paint:{"circle-radius":4,"circle-color":"#fbbf24","circle-stroke-color":"#0a0f1a","circle-stroke-width":1}});
  map.addLayer({id:"radius-fill",type:"fill",source:"radius",paint:{"fill-color":"#38bdf8","fill-opacity":.07}});
  map.addLayer({id:"radius-line",type:"line",source:"radius",paint:{"line-color":"#38bdf8","line-width":1.4,"line-dasharray":[3,2]}});

  map.on("click", function(e){
    if(placeMode) placeCenter(e.lngLat.lng, e.lngLat.lat);
    else inspect(e.lngLat.lng, e.lngLat.lat);
  });
  map.on("click","schools-circle", function(e){
    var ft=e.features[0]; if(!ft) return;
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML("<strong>"+(ft.properties.name||"School")+"</strong><br>"+(ft.properties.level||"")).addTo(map);
  });
  ready=true;
  render();
});

function buildGridCells(){
  // A coarse hex/square grid over the MA demo area, coloured by modeled capacity status.
  if(!ready) return;
  var bbox=[-73.5,41.2,-69.9,42.9];
  var cells=turf.squareGrid(bbox,6,{units:"miles"});
  var g=gridStatus();
  cells.features.forEach(function(c){
    // demand "felt" by a cell = sum of center MW weighted by proximity (within ~12 mi)
    var cen=turf.centroid(c);
    var local=existingLoad*0.0; // existing load is regional, not per-cell
    centers.forEach(function(dc){
      var d=turf.distance(cen,turf.point([dc.lng,dc.lat]),{units:"miles"});
      if(d<12) local += dc.mw*(1-d/12);
    });
    var color="#38bdf8", op=0.0;
    if(capacity!==null){
      var perCell=capacity/ (cells.features.length/8); // rough per-cell share for visualization
      if(local>0){ op=0.22; color = local>perCell ? "#f87171" : "#38bdf8"; if(local>perCell) op=0.4; }
    } else if(local>0){ op=0.18; color="#64748b"; }
    c.properties={color:color,op:op};
  });
  map.getSource("gridcells").setData(cells);
}

function refreshMarkers(){
  markers.forEach(function(m){m.remove();}); markers=[];
  centers.forEach(function(dc){
    var el=document.createElement("div");
    el.className="dc-marker"; el.style.background=dc.color; el.title=dc.name;
    el.textContent=dc.mw;
    el.onclick=function(ev){ ev.stopPropagation(); new maplibregl.Popup().setLngLat([dc.lng,dc.lat])
      .setHTML("<strong>"+dc.name+"</strong><br>"+dc.mw+" MW "+dc.type+"<br>"+G(energy(dc).f)+"/yr").addTo(map); };
    var m=new maplibregl.Marker({element:el}).setLngLat([dc.lng,dc.lat]).addTo(map);
    markers.push(m);
  });
}

function placeCenter(lng,lat){
  var color=GRID_COLORS[nextColor++ % GRID_COLORS.length];
  var dc={ id:"dc"+Date.now(), name:"DC "+(centers.length+1), lng:lng, lat:lat,
    mw:template.mw, util:template.util, pue:template.pue, cooling:template.cooling, clean:template.clean, type:template.projectType, color:color };
  centers.push(dc);
  refreshMarkers(); buildGridCells(); render();
}
function removeCenter(id){ centers=centers.filter(function(c){return c.id!==id;}); refreshMarkers(); buildGridCells(); render(); }

function inspect(lng,lat){
  selected={lng:lng,lat:lat,name:"Selected ("+lat.toFixed(4)+", "+lng.toFixed(4)+")"};
  map.getSource("radius").setData(turf.circle([lng,lat],3,{units:"miles",steps:48}));
  render();
}

// ---------------- right panel ----------------
function metric(lab,num,sub,prov,acc){ return '<div class="metric"><div class="lab">'+lab+(prov?chip(prov):"")+'</div><div class="num '+(acc||"ac")+'">'+num+'</div>'+(sub?'<div class="sub">'+sub+'</div>':"")+'</div>'; }

function render(){
  var right=document.getElementById("right");
  var g=gridStatus();
  var totalMW=centers.reduce(function(a,c){return a+c.mw;},0);
  var totalEnergy=centers.reduce(function(a,c){return a+energy(c).f;},0);
  var totalWater=centers.reduce(function(a,c){return a+waterOf(energy(c),COOLING_WUE[c.cooling]);},0);
  var maxMW=centers.reduce(function(a,c){return Math.max(a,c.mw);},0);

  var html="";

  // Portfolio / cumulative development
  html += '<div class="panel"><div class="ph"><span>Envisioned development</span><span class="am" style="font-size:11px">'+centers.length+' facilities</span></div><div class="pb">';
  if(centers.length===0){
    html += '<div class="note" style="margin:0">No data centers placed yet. Click <b>Place data centers on the grid</b>, set the facility template, then click the map to envision one. Place several to model cumulative development pressure.</div>';
  } else {
    centers.forEach(function(dc){
      html += '<div class="dc-item"><span><span class="dot" style="background:'+dc.color+'"></span>'+dc.name+' · '+dc.mw+' MW · '+dc.type+'</span><span class="x" onclick="removeCenter(\''+dc.id+'\')">&times;</span></div>';
    });
    html += '<div class="metrics" style="margin-top:8px">'+
      metric("Cumulative peak", f(totalMW,0)+" MW", centers.length+" facilities", "a","aw")+
      metric("Combined energy", G(totalEnergy), "per year", "c","ac")+
      metric("Combined water", L(totalWater), "modeled estimate", "e","ac")+
      metric("Largest facility", f(maxMW,0)+" MW", exceeds658(maxMW)?"above EO 658 >25 MW":"at/below 25 MW", "c", exceeds658(maxMW)?"aw":"am")+
      '</div>';
  }
  html += '</div></div>';

  // Grid capacity
  html += '<div class="panel"><div class="ph">Grid capacity scenario</div><div class="pb">';
  html += '<div class="banner '+(!g.known?"bu":g.exc?"br":"bo")+'">'+g.msg+'</div>';
  if(g.known){
    html += '<div class="metrics" style="margin-top:8px">'+
      metric("Modeled capacity", f(g.cap,0)+" MW","user-entered scenario","a","ac")+
      metric("Cumulative demand", f(g.cum,0)+" MW","existing + placed DCs","a","aw")+
      metric(g.exc?"Shortfall":"Remaining", f(g.exc?g.sh:g.rem,0)+" MW", g.exc?"capacity exceeded":"headroom", "c", g.exc?"ar":"af")+
      metric("Utilization", g.cap>0?f(g.cum/g.cap*100,0)+"%":"—","of modeled capacity","c", g.cum/g.cap>0.9?"ar":"ac")+
      '</div>';
  }
  html += '<div class="note">Enable the <b>Grid-capacity overlay</b> layer to see which modeled cells exceed capacity. Simulated scenario constraint, not verified grid saturation.</div></div></div>';

  // Inspected site intelligence
  if(selected){
    var a=analyze(selected.lng,selected.lat,3);
    var tmplEnergy=energy(template), gap=cleanGap(tmplEnergy,template.clean), water=waterOf(tmplEnergy,COOLING_WUE[template.cooling]);
    var le=cl(100-a.gs.cov*1.5,0,100), com=cl(100-(a.sc.w1*20+a.sc.w3*5)-(a.ej.ov?30:0),0,100);
    var pu=cl((2-template.pue)/0.9,0,1), res=cl((pu*.5+template.clean*.5)*100,0,100);
    var comps=[[.30,le],[.25,g.known?(g.exc?0:cl(g.rem/Math.max(1,g.cap)*100,0,100)):null],[.20,com],[.15,res],[.10, g.known?80:60]];
    var incl=comps.filter(function(c){return c[1]!==null;});
    var im=incl.reduce(function(s,c){return s+c[0];},0), tot=comps.reduce(function(s,c){return s+c[0];},0);
    var score=im>0?cl(incl.reduce(function(s,c){return s+c[0]/im*c[1];},0),0,100):0, cov=im/tot;
    var pol=policy(template.mw,template.projectType);

    html += '<div class="panel"><div class="ph">Site intelligence (template applied)</div><div class="pb">'+
      '<div style="font-weight:600">'+selected.name+'</div><div class="note tabular" style="margin-top:2px">radius 3 mi</div>'+
      '<div class="metrics" style="margin-top:8px">'+
      metric("Screening score", f(score,0), "Evidence coverage "+f(cov*100,0)+"%", "e", score>=66?"af":score>=40?"aw":"ar")+
      metric("Facility demand", G(tmplEnergy.f), "Total", "c","ac")+
      metric("Open space (3 mi)", a.gs.ok?f(a.gs.cov,1)+"%":"Unknown", a.gs.ok?f(a.gs.acres,0)+" ac":"layer unavailable", a.gs.ok?"o":"u", a.gs.ok?"af":"am")+
      metric("Schools ≤ 1 mi", a.sc.ok?f(a.sc.w1,0):"Unknown", a.sc.ok?f(a.sc.w3,0)+" within 3 mi":"", a.sc.ok?"o":"u","aw")+
      metric("Nearest school", a.sc.near!=null?f(a.sc.near,2)+" mi":"Unknown", a.sc.nn||"", a.sc.ok?"c":"u","ac")+
      metric("Environmental justice", a.ej.ok?(a.ej.ov?"Within EJ":"No overlap"):"Unknown", a.ej.ov?a.ej.name:"", a.ej.ok?"o":"u", a.ej.ov?"aw":"am")+
      metric("Clean-energy gap", G(gap), f(template.clean*100,0)+"% covered (assumption)", "e","aw")+
      metric("Modeled water", L(water), COOLING_LABEL[template.cooling], "e","ac")+
      '</div>'+
      '<div class="note">Open-space data excludes many trees/lawns/parcels. Absence of mapped features is not proof of absence.</div>'+
      '</div></div>';

    html += '<div class="panel"><div class="ph">Massachusetts Policy Navigator</div><div class="pb">'+
      '<div class="banner bu" style="color:var(--text)">'+pol.summary+'</div>';
    pol.findings.filter(function(x){return x[1]!=="nt";}).forEach(function(x){
      var m={pa:["Potentially applicable","ca"],mi:["More information required","cc"],gd:["Guidance under development","cu"]}[x[1]];
      html += '<div class="finding"><div style="display:flex;justify-content:space-between;gap:8px"><span class="ttl">'+x[0]+'</span><span class="chip '+m[1]+'">'+m[0]+'</span></div><div class="note" style="margin-top:4px">'+x[2]+'</div></div>';
    });
    html += '<div class="note">Pending EO 658 measures are not finalized regulation.</div></div></div>';
  } else {
    html += '<div class="panel"><div class="pb" style="text-align:center;padding:24px 14px"><div style="font-weight:600">Inspect a location</div><div class="note">Switch to Explore mode and click the map to see green space, schools, EJ overlap, and EO 658 findings for that spot.</div></div></div>';
  }

  right.innerHTML=html;
}
window.removeCenter=removeCenter;

// ---------------- controls ----------------
function $(id){return document.getElementById(id);}
$("placeBtn").onclick=function(){
  placeMode=!placeMode;
  this.textContent = placeMode ? "✓ Placing… (click map). Click to stop" : "+ Place data centers on the grid";
  this.classList.toggle("ghost", placeMode);
  $("placehint").classList.toggle("show", placeMode);
  $("placenote").innerHTML = placeMode ? "<b style='color:#fbbf24'>Place mode</b> — each map click drops a data center using the template below." : "Explore mode active. Click the map to inspect a location.";
  $("modehint").innerHTML = placeMode ? "<b>Place mode</b> — click the map to drop data centers. Toggle the grid overlay to see capacity stress." : "<b>Explore mode</b> — click the map to inspect a site. Switch to <b>Place mode</b> to envision data centers.";
};
$("mw").oninput=function(e){template.mw=+e.target.value;$("mwv").textContent=e.target.value;render();};
$("util").oninput=function(e){template.util=+e.target.value/100;$("utilv").textContent=e.target.value;render();};
$("pue").oninput=function(e){template.pue=+e.target.value||1.4;render();};
$("cool").onchange=function(e){template.cooling=e.target.value;render();};
$("clean").oninput=function(e){template.clean=+e.target.value/100;$("cleanv").textContent=e.target.value;render();};
$("ptype").onchange=function(e){template.projectType=e.target.value;render();};
$("cap").oninput=function(e){capacity=e.target.value===""?null:+e.target.value;buildGridCells();render();};
$("exist").oninput=function(e){existingLoad=+e.target.value;$("existv").textContent=e.target.value;buildGridCells();render();};
document.querySelectorAll("#layers .toggle").forEach(function(t){
  t.onclick=function(){
    var l=t.dataset.layer, on=!t.classList.contains("on"); t.classList.toggle("on",on);
    var vis=on?"visible":"none";
    ({municipalities:["municipalities-line"],openspace:["openspace-fill","openspace-line"],ej:["ej-fill","ej-line"],schools:["schools-circle"],gridcells:["gridcells-fill","gridcells-line"]})[l]
      .forEach(function(id){ if(map.getLayer(id)) map.setLayoutProperty(id,"visibility",vis); });
    if(l==="gridcells"&&on) buildGridCells();
  };
});
