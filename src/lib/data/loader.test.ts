import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
const school = (id: number) => ({ type: "Feature", geometry: { type: "Point", coordinates: [-71.8, 42.26] }, properties: { OBJECTID: id, NAME: `School ${id}` } });
const response = (features: unknown[], more = false) => new Response(JSON.stringify({ type: "FeatureCollection", features, properties: { exceededTransferLimit: more } }));

describe("official GIS queries", () => {
  it("fetches all pages, normalizes names and caches only complete results", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response([school(1)], true)).mockResolvedValueOnce(response([school(2)]));
    vi.stubGlobal("fetch", fetcher);
    const { queryLayer } = await import("./loader");
    const layer = await queryLayer("schools");
    expect(layer.available).toBe(true);
    expect(layer.data?.features.map(f => f.properties?.name)).toEqual(["School 1", "School 2"]);
    expect(String(fetcher.mock.calls[1][0])).toContain("resultOffset=1");
    await queryLayer("schools");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not label an ArcGIS HTTP-200 error as an empty official layer and retries failures", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Service unavailable" } }))).mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetcher);
    const { queryLayer } = await import("./loader");
    const failed = await queryLayer("openspace");
    expect(failed.available).toBe(false);
    expect(failed.data).toBeNull();
    expect(failed.error).toContain("Service unavailable");
    expect((await queryLayer("openspace")).available).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("keeps different location queries separate and restricts EJ to designated groups", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response([])));
    vi.stubGlobal("fetch", fetcher);
    const { queryLayer } = await import("./loader");
    await queryLayer("ej", { geometry: "area-a" });
    await queryLayer("ej", { geometry: "area-b" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const url = new URL(fetcher.mock.calls[1][0]);
    expect(url.searchParams.get("geometry")).toBe("area-b");
    expect(url.searchParams.get("where")).toBe("EJ = 'Yes'");
  });
  it("rejects incomplete pagination instead of silently undercounting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([], true)));
    const { queryLayer } = await import("./loader");
    expect((await queryLayer("schools")).available).toBe(false);
  });
  it("keys results by coordinates and radius rather than selection labels", async () => {
    const { siteKey } = await import("./loader");
    const a = { id: "site", name: "Selected", lat: 42.26, lng: -71.8, radiusMiles: 3 as const };
    expect(siteKey(a)).not.toBe(siteKey({ ...a, lat: 42.63 }));
    expect(siteKey(a)).not.toBe(siteKey({ ...a, radiusMiles: 5 }));
  });
});
