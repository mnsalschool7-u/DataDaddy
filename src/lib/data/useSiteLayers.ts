"use client";
import { useEffect, useState } from "react";
import type { Site } from "@/lib/schemas";
import { loadAllLayers, siteKey, unavailableLayers, type AllLayers } from "./loader";

/** A result belongs to its coordinates/radius, never to the last completed request. */
export function useSiteLayers(site: Site | null) {
  const key = siteKey(site);
  const [loaded, setLoaded] = useState<{ key: string; layers: AllLayers } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadAllLayers(site, controller.signal).then(layers => {
        if (!controller.signal.aborted) setLoaded({ key, layers });
      }).catch(error => {
        if (!controller.signal.aborted) setLoaded({ key, layers: unavailableLayers(error instanceof Error ? error.message : "Location data request failed") });
      });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
    // The coordinate/radius key captures every input to the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { layers: loaded?.key === key ? loaded.layers : null, layersLoading: loaded?.key !== key };
}
