"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MLMap, type GeoJSONSource } from "maplibre-gl";
import * as turf from "@turf/turf";
import { useSimulation } from "@/components/SimulationProvider";
import { facilityFootprint } from "@/lib/geo/footprint";
import { assessZone, OVERLAYS, ZONE_COLORS, type OverlayMode } from "@/lib/model/zones";
import type { LayerToggles } from "./types";

const MA_CENTER: [number, number] = [-71.8, 42.3];

// A minimal OSM raster style with required attribution — no API key needed.
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function MapCanvas({ toggles }: { toggles: LayerToggles }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const facilityMarker = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const sim = useSimulation();
  const { site, setSite, layers, result, project, finance, financialResult, overlay, setOverlay, layersLoading } = sim;
  const latest = useRef(sim);
  latest.current = sim;
  const [placing, setPlacing] = useState(false);
  const [details, setDetails] = useState(false);
  const zone = assessZone(overlay, result, sim.geo, financialResult, finance, layersLoading);
  const color = ZONE_COLORS[zone.category];

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: MA_CENTER,
      zoom: 8,
      pitch: 35,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

    map.on("load", () => {
      // empty sources; populated by effects below
      const empty = { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;
      map.addSource("municipalities", { type: "geojson", data: empty });
      map.addSource("openspace", { type: "geojson", data: empty });
      map.addSource("ej", { type: "geojson", data: empty });
      map.addSource("schools", { type: "geojson", data: empty });
      map.addSource("radius", { type: "geojson", data: empty });
      map.addSource("selection", { type: "geojson", data: empty });
      map.addSource("gridscenario", { type: "geojson", data: empty });
      map.addSource("facility", { type: "geojson", data: empty });
      map.addSource("impact-zone", { type: "geojson", data: empty });
      map.addSource("unknown-zones", { type: "geojson", data: empty });
      map.addSource("landuse", { type: "geojson", data: empty });
      const hatch = new Uint8Array(8 * 8 * 4);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const i = (y * 8 + x) * 4; const line = (x + y) % 8 < 2;
        hatch[i] = 100; hatch[i+1] = 116; hatch[i+2] = 139; hatch[i+3] = line ? 130 : 15;
      }
      map.addImage("missing-hatch", { width: 8, height: 8, data: hatch });
      map.addLayer({ id: "unknown-zones", type: "fill", source: "unknown-zones", paint: { "fill-pattern": "missing-hatch" } });
      map.addLayer({ id: "impact-zone", type: "fill", source: "impact-zone", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.28 } });
      map.addLayer({ id: "landuse-fill", type: "fill", source: "landuse", paint: {
        "fill-color": ["case", ["in", "Residential", ["get", "USEGENNAME"]], "#a78bfa", "#fb923c"], "fill-opacity": 0.30,
      } });

      map.addLayer({
        id: "municipalities-line",
        type: "line",
        source: "municipalities",
        paint: { "line-color": "#8ba0bf", "line-width": 1.2, "line-opacity": 0.8 },
      });
      map.addLayer({
        id: "openspace-fill",
        type: "fill",
        source: "openspace",
        paint: { "fill-color": "#34d399", "fill-opacity": 0.28 },
      });
      map.addLayer({
        id: "openspace-line",
        type: "line",
        source: "openspace",
        paint: { "line-color": "#34d399", "line-width": 0.8 },
      });
      map.addLayer({
        id: "ej-fill",
        type: "fill",
        source: "ej",
        paint: { "fill-color": "#a3e635", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "ej-line",
        type: "line",
        source: "ej",
        paint: { "line-color": "#a3e635", "line-width": 0.8, "line-dasharray": [2, 2] },
      });
      // Grid-scenario greyout: shaded when modeled capacity is exceeded (§5.2/§7).
      map.addLayer({
        id: "gridscenario-fill",
        type: "fill",
        source: "gridscenario",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.35,
          "fill-outline-color": "#f87171",
        },
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": "#38bdf8", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": "#38bdf8", "line-width": 1.5, "line-dasharray": [3, 2] },
      });
      map.addLayer({
        id: "schools-circle",
        type: "circle",
        source: "schools",
        paint: {
          "circle-radius": 4,
          "circle-color": "#fbbf24",
          "circle-stroke-color": "#0a0f1a",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "selection-circle",
        type: "circle",
        source: "selection",
        paint: {
          "circle-radius": 7,
          "circle-color": "#38bdf8",
          "circle-stroke-color": "#e5ecf5",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({ id: "facility-block", type: "fill-extrusion", source: "facility", paint: {
        "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": 35, "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.95,
      } });

      // click to select a site
      map.on("click", (e) => {
        setPlacing(false);
        setDetails(!!latest.current.site && map.queryRenderedFeatures(e.point, { layers: ["impact-zone"] }).length > 0);
        setSite({
          id: `site-${Date.now()}`,
          name: `Selected location (${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)})`,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          radiusMiles: latest.current.site?.radiusMiles ?? 3,
        });
      });

      // school popups
      map.on("click", "schools-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const name = (f.properties?.name as string) ?? "School";
        const level = (f.properties?.level as string) ?? "";
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setText(`${name} — ${level}`)
          .addTo(map);
      });
      map.on("mouseenter", "schools-circle", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "schools-circle", () => (map.getCanvas().style.cursor = ""));

      setReady(true);
    });

    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      facilityMarker.current?.remove();
      facilityMarker.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [setSite]);

  // push loaded layers into sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const set = (id: string, data: GeoJSON.FeatureCollection | null) => {
      const src = map.getSource(id) as GeoJSONSource | undefined;
      if (src) src.setData(data ?? { type: "FeatureCollection", features: [] });
    };
    set("municipalities", layers?.municipalities.data ?? null);
    set("openspace", layers?.openspace.data ?? null);
    set("ej", layers?.ej.data ?? null);
    set("schools", layers?.schools.data ?? null);
    set("landuse", sim.landUse);
  }, [ready, layers, sim.landUse]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
    const update = (name: string, data: GeoJSON.GeoJSON) => (map.getSource(name) as GeoJSONSource)?.setData(data);
    if (!site) { update("facility", empty); update("impact-zone", empty); update("unknown-zones", layers?.municipalities.data ?? empty); return; }
    const footprint = facilityFootprint(site.lng, site.lat, project.footprintAcres);
    footprint.properties = { color };
    update("facility", project.footprintAcres > 0 ? footprint : empty);
    const circle = turf.circle([site.lng, site.lat], site.radiusMiles, { units: "miles", steps: 64 });
    const municipality = layers?.municipalities.data?.features.find(f => turf.booleanPointInPolygon(turf.point([site.lng, site.lat]), f));
    const selected = zone.unit === "municipality" ? municipality : circle;
    update("impact-zone", selected && zone.category !== "unknown" ? { ...selected, properties: { color } } : empty);
    const unknown = zone.unit === "municipality" ? layers?.municipalities.data?.features.filter(f => f !== municipality || zone.category === "unknown") ?? [] : zone.category === "unknown" ? [circle] : [];
    update("unknown-zones", { type: "FeatureCollection", features: unknown });
  }, [site, ready, project.footprintAcres, color, zone.unit, zone.category, layers]);

  // layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = (id: string, on: boolean) =>
      map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    vis("municipalities-line", toggles.municipalities);
    vis("openspace-fill", toggles.openspace);
    vis("openspace-line", toggles.openspace);
    vis("ej-fill", toggles.ej);
    vis("ej-line", toggles.ej);
    vis("schools-circle", toggles.schools);
    vis("gridscenario-fill", toggles.gridScenario);
  }, [ready, toggles]);

  // Grid-scenario greyout zone around the site (only when capacity is exceeded).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("gridscenario") as GeoJSONSource | undefined;
    if (!src) return;
    if (!site || !result.grid.capacityKnown || !result.grid.exceeded) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const zone = turf.circle([site.lng, site.lat], site.radiusMiles, {
      units: "miles",
      steps: 64,
    }) as GeoJSON.Feature;
    zone.properties = { color: "#f87171" };
    src.setData(zone);
  }, [ready, site, result.grid.capacityKnown, result.grid.exceeded]);

  // selection marker + radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const selSrc = map.getSource("selection") as GeoJSONSource | undefined;
    const radSrc = map.getSource("radius") as GeoJSONSource | undefined;
    if (!site) {
      selSrc?.setData({ type: "FeatureCollection", features: [] });
      radSrc?.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    selSrc?.setData(turf.point([site.lng, site.lat]) as GeoJSON.Feature);
    radSrc?.setData(
      turf.circle([site.lng, site.lat], site.radiusMiles, { units: "miles", steps: 64 }) as GeoJSON.Feature,
    );
    map.easeTo({ center: [site.lng, site.lat], zoom: Math.max(map.getZoom(), 11), duration: 600 });
  }, [ready, site]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!site) { facilityMarker.current?.remove(); facilityMarker.current = null; return; }
    if (!facilityMarker.current) {
      const element = document.createElement("button");
      element.className = "facility-token rounded border border-accent bg-panel px-2 py-1 text-xs text-accent";
      element.title = "Drag to relocate proposed facility";
      element.addEventListener("click", event => event.stopPropagation());
      const marker = new maplibregl.Marker({ element, draggable: true, anchor: "bottom" });
      marker.on("dragend", () => {
        const coordinates = marker.getLngLat();
        latest.current.setSite({ id: `facility-${Date.now()}`, name: "Relocated proposed facility", lat: coordinates.lat,
          lng: coordinates.lng, radiusMiles: latest.current.site?.radiusMiles ?? 3 });
      });
      facilityMarker.current = marker;
      marker.setLngLat([site.lng, site.lat]).addTo(map);
    }
    facilityMarker.current.setLngLat([site.lng, site.lat]);
    facilityMarker.current.getElement().textContent = `▥ ${project.peakFacilityMW} MW`;
    facilityMarker.current.getElement().setAttribute("aria-label", "Drag placed facility to relocate");
  }, [ready, site, project.peakFacilityMW]);

  function dropFacility(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.getData("application/x-datadaddy-facility") !== "facility") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !mapRef.current) return;
    const coords = mapRef.current.unproject([event.clientX - rect.left, event.clientY - rect.top]);
    setSite({ id: `facility-${Date.now()}`, name: "Proposed facility", lng: coords.lng, lat: coords.lat, radiusMiles: site?.radiusMiles ?? 3 });
    setPlacing(false); setDetails(false);
  }

  return (
    <div className="relative h-full w-full" onDragOver={e => { if (e.dataTransfer.types.includes("application/x-datadaddy-facility")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }} onDrop={dropFacility}>
      <div ref={containerRef} className="h-full w-full" style={{ cursor: placing ? "crosshair" : undefined }} />
      <div className="absolute left-3 top-3 z-10 space-y-2 rounded-lg border border-border bg-panel/95 p-3 shadow-xl" style={{ width: "min(340px, calc(100% - 72px))" }}>
        <div className="flex items-center gap-3">
          <button draggable onDragStart={e => { e.dataTransfer.setData("application/x-datadaddy-facility", "facility"); e.dataTransfer.effectAllowed = "copy"; }}
            onClick={() => setPlacing(!placing)} aria-pressed={placing} aria-label="Place data center on map"
            className="facility-token cursor-grab rounded border border-accent bg-accent/20 px-3 py-2 text-accent active:cursor-grabbing">▥ {project.peakFacilityMW} MW</button>
          <p className="text-[10px] text-muted">Drag facility onto map.<br/>Or activate, then click map. Click elsewhere to move.</p>
        </div>
        <label className="block text-[10px] text-muted">Map analysis layer
          <select aria-label="Map analysis layer" value={overlay} onChange={e => setOverlay(e.target.value as OverlayMode)} className="mt-1 w-full rounded border border-border bg-panel-2 p-1 text-xs text-content">
            {Object.entries(OVERLAYS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        {site && <><button onClick={() => setDetails(!details)} className="text-left text-xs font-semibold" style={{ color }}>{zone.label} · {zone.unit} ▾</button>
          {details && <div className="max-h-36 overflow-y-auto text-[10px] text-muted" aria-live="polite">
            {zone.reasons.map((reason, i) => <p key={i} className="mb-1">{reason}</p>)}
            <p>{zone.legend}</p>
          </div>}
        </>}
        {!site && <button onClick={() => setDetails(!details)} className="text-[10px] text-accent">Legend &amp; model thresholds ▾</button>}
        {details && <p className="text-[9px] text-muted">Green favorable · yellow moderate · red significant modeled risk.<br/>Grey reserved for documented exclusions · hatching insufficient data.<br/>Purple residential · orange commercial/mixed land use (2016, near footprint).<br/>No development approval; financial layers cover only the selected town using shared scenario assumptions.</p>}
      </div>
      {placing && <div role="status" className="pointer-events-none absolute bottom-8 left-3 rounded bg-accent p-2 text-xs text-bg">Click map to place the facility</div>}
    </div>
  );
}
