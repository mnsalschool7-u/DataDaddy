/** Verify real, location-specific official GIS feeds (no generated demo fallback). */
import { loadAllLayers } from "../src/lib/data/loader";
import { greenSpaceWithinRadius, schoolProximity, ejOverlap } from "../src/lib/geo/analysis";

async function main() {
  const results = [];
  for (const site of [
    { id: "worcester", name: "Worcester", lat: 42.2626, lng: -71.8023, radiusMiles: 3 as const },
    { id: "lowell", name: "Lowell", lat: 42.6334, lng: -71.3162, radiusMiles: 3 as const },
  ]) {
    const layers = await loadAllLayers(site);
    for (const layer of Object.values(layers)) {
      if (!layer.available) throw new Error(`${site.name} ${layer.id}: ${layer.error}`);
      console.log(`${site.name}: ${layer.id}: ${layer.data?.features.length} official features (${layer.sourceUrl})`);
    }
    const green = greenSpaceWithinRadius(site.lng, site.lat, 3, layers.openspace.data);
    const schools = schoolProximity(site.lng, site.lat, layers.schools.data);
    const ej = ejOverlap(site.lng, site.lat, layers.ej.data);
    const metrics = { municipality: site.name, openSpaceAcres: green.openSpaceAcres,
      openSpacePercent: green.coveragePercent, schoolsWithin1Mile: schools.within1Mile,
      schoolsWithin3Miles: schools.within3Miles, nearestSchool: schools.nearestName,
      nearestMiles: schools.nearestDistanceMiles, ej: ej.overlaps };
    console.log(JSON.stringify(metrics, null, 2));
    results.push(metrics);
  }
  if (results[0].openSpaceAcres === results[1].openSpaceAcres || results[0].nearestSchool === results[1].nearestSchool) {
    throw new Error("Different sites unexpectedly returned identical geographic metrics");
  }
  console.log("Verified: location-specific geographic results differ between Worcester and Lowell.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
