import type {
  FeatureCollection,
  Point,
  Polygon,
  MultiPolygon,
} from "geojson";
import { asset } from "@/lib/basePath";

/**
 * Client-side dataset loader. Fetches cached GeoJSON from /data and degrades
 * gracefully: a failed load yields a null layer flagged unavailable, never
 * fabricated data.
 */

export type LayerId = "openspace" | "schools" | "ej" | "municipalities";

export interface LoadedLayer<T extends FeatureCollection> {
  id: LayerId;
  data: T | null;
  available: boolean;
  error?: string;
}

async function loadOne<T extends FeatureCollection>(
  id: LayerId,
): Promise<LoadedLayer<T>> {
  try {
    const res = await fetch(asset(`/data/${id}.geojson`), { cache: "force-cache" });
    if (!res.ok) {
      return { id, data: null, available: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as T;
    return { id, data, available: true };
  } catch (e) {
    return {
      id,
      data: null,
      available: false,
      error: e instanceof Error ? e.message : "load failed",
    };
  }
}

export interface AllLayers {
  openspace: LoadedLayer<FeatureCollection<Polygon | MultiPolygon>>;
  schools: LoadedLayer<FeatureCollection<Point>>;
  ej: LoadedLayer<FeatureCollection<Polygon | MultiPolygon>>;
  municipalities: LoadedLayer<FeatureCollection<Polygon | MultiPolygon>>;
}

export async function loadAllLayers(): Promise<AllLayers> {
  const [openspace, schools, ej, municipalities] = await Promise.all([
    loadOne<FeatureCollection<Polygon | MultiPolygon>>("openspace"),
    loadOne<FeatureCollection<Point>>("schools"),
    loadOne<FeatureCollection<Polygon | MultiPolygon>>("ej"),
    loadOne<FeatureCollection<Polygon | MultiPolygon>>("municipalities"),
  ]);
  return { openspace, schools, ej, municipalities };
}
