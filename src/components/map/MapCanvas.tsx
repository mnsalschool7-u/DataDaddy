"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MLMap, type GeoJSONSource } from "maplibre-gl";
import * as turf from "@turf/turf";
import { useSimulation } from "@/components/SimulationProvider";
import { MapLegend } from "./MapLegend";
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
  const [ready, setReady] = useState(false);
  const { site, setSite, layers, result } = useSimulation();

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: MA_CENTER,
      zoom: 8,
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

      // click to select a site
      map.on("click", (e) => {
        setSite({
          id: `site-${Date.now()}`,
          name: `Selected location (${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)})`,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          radiusMiles: 3,
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
          .setHTML(`<strong>${name}</strong><br/>${level}`)
          .addTo(map);
      });
      map.on("mouseenter", "schools-circle", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "schools-circle", () => (map.getCanvas().style.cursor = ""));

      setReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setSite]);

  // push loaded layers into sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !layers) return;
    const set = (id: string, data: GeoJSON.FeatureCollection | null) => {
      const src = map.getSource(id) as GeoJSONSource | undefined;
      if (src && data) src.setData(data);
    };
    set("municipalities", layers.municipalities.data);
    set("openspace", layers.openspace.data);
    set("ej", layers.ej.data);
    set("schools", layers.schools.data);
  }, [ready, layers]);

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
  }, [ready, toggles]);

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

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <MapLegend
        gridStatus={result.grid.statusMessage}
        capacityKnown={result.grid.capacityKnown}
      />
    </div>
  );
}
