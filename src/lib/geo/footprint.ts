import { destination, point, polygon } from "@turf/turf";
/** Square conceptual site boundary; acres are land footprint, not a surveyed parcel. */
export function facilityFootprint(lng: number, lat: number, acres: number) {
  const center = point([lng, lat]);
  const halfDiagonalKm = Math.sqrt(acres * 4046.8564224) / Math.sqrt(2) / 1000;
  const corners = [45, 135, 225, 315].map(b => destination(center, halfDiagonalKm, b).geometry.coordinates);
  return polygon([[...corners, corners[0]]]);
}
