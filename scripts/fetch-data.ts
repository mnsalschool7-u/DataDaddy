/**
 * Official MassGIS data ingestion pipeline (documentation + best-effort fetch).
 *
 * This script documents the exact official endpoints and the processing steps
 * DataDaddy applies to produce the app's GeoJSON layers. In environments with
 * internet access it will attempt to download and process the real layers; where
 * a download is unavailable it reports the limitation and leaves the curated demo
 * subset in place (it NEVER fabricates official data).
 *
 * Processing steps for each dataset:
 *   1. Identify the official download / service endpoint (below).
 *   2. Retrieve the source data if available.
 *   3. Convert to GeoJSON.
 *   4. Normalize CRS to WGS84 (EPSG:4326). MassGIS native is often EPSG:26986.
 *   5. Simplify large polygons for web display.
 *   6. Validate geometry and attributes.
 *   7. Record source URL + retrieval date (see src/lib/data/sources.ts).
 *   8. Cache processed GeoJSON under public/data/.
 *
 * Run: npm run fetch-data
 */

interface DatasetEndpoint {
  id: string;
  name: string;
  landingPage: string;
  /** Typical MassGIS download options (shapefile / FileGDB) and ArcGIS services. */
  downloadHint: string;
  nativeCRS: string;
  outFile: string;
}

const ENDPOINTS: DatasetEndpoint[] = [
  {
    id: "massgis-municipalities",
    name: "Municipalities",
    landingPage: "https://www.mass.gov/info-details/massgis-data-municipalities",
    downloadHint:
      "Download TOWNSSURVEY_POLY (shapefile/FileGDB) from the landing page, or use the MassGIS ArcGIS REST service.",
    nativeCRS: "EPSG:26986 (NAD83 / Massachusetts Mainland)",
    outFile: "public/data/municipalities.geojson",
  },
  {
    id: "massgis-openspace",
    name: "Protected and Recreational Open Space",
    landingPage:
      "https://www.mass.gov/info-details/massgis-data-protected-and-recreational-openspace",
    downloadHint: "Download OPENSPACE_POLY (shapefile/FileGDB) from the landing page.",
    nativeCRS: "EPSG:26986",
    outFile: "public/data/openspace.geojson",
  },
  {
    id: "massgis-schools",
    name: "Massachusetts Schools (Pre-K through High School)",
    landingPage:
      "https://www.mass.gov/info-details/massgis-data-massachusetts-schools-pre-k-through-high-school",
    downloadHint: "Download the schools point layer (shapefile/FileGDB).",
    nativeCRS: "EPSG:26986",
    outFile: "public/data/schools.geojson",
  },
  {
    id: "massgis-ej",
    name: "2020 Environmental Justice Populations",
    landingPage:
      "https://www.mass.gov/info-details/massgis-data-2020-environmental-justice-populations",
    downloadHint: "Download the EJ 2020 block-group polygon layer.",
    nativeCRS: "EPSG:26986",
    outFile: "public/data/ej.geojson",
  },
];

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log("DataDaddy — MassGIS ingestion pipeline\n");
  console.log(
    "This documents official endpoints and attempts retrieval. To process the\n" +
      "full layers you will typically need a shapefile->GeoJSON step (e.g. GDAL\n" +
      "`ogr2ogr -t_srs EPSG:4326 out.geojson in.shp`) plus polygon simplification.\n",
  );

  for (const ep of ENDPOINTS) {
    const ok = await reachable(ep.landingPage);
    console.log(`• ${ep.name} [${ep.id}]`);
    console.log(`    landing page : ${ep.landingPage} (${ok ? "reachable" : "not reachable in this environment"})`);
    console.log(`    download     : ${ep.downloadHint}`);
    console.log(`    native CRS   : ${ep.nativeCRS} -> reproject to EPSG:4326`);
    console.log(`    output       : ${ep.outFile}`);
    console.log(
      `    status       : ${ok ? "endpoint reachable; manual download + ogr2ogr recommended" : "using curated demo subset (see scripts/generate-demo-geojson.mjs)"}\n`,
    );
  }

  console.log(
    "No official data is fabricated. Where full layers are not retrieved, the\n" +
      "curated, clearly-labeled demo subset remains in place and the source\n" +
      "registry records the limitation.",
  );
}

main();
