/**
 * Representative Massachusetts municipalities for search + focus.
 * Coordinates are real city/town centroids (WGS84). This is a curated subset
 * of the official MassGIS municipalities layer (see sources: massgis-municipalities),
 * generalized for a reliable offline demo — NOT the full 351-municipality layer.
 */
export interface Municipality {
  name: string;
  county: string;
  lat: number;
  lng: number;
  /** Approximate population (US Census context). */
  population: number;
}

export const MUNICIPALITIES: Municipality[] = [
  { name: "Worcester", county: "Worcester", lat: 42.2626, lng: -71.8023, population: 206518 },
  { name: "Lowell", county: "Middlesex", lat: 42.6334, lng: -71.3162, population: 115554 },
  { name: "Boston", county: "Suffolk", lat: 42.3601, lng: -71.0589, population: 650706 },
  { name: "Springfield", county: "Hampden", lat: 42.1015, lng: -72.5898, population: 155929 },
  { name: "Cambridge", county: "Middlesex", lat: 42.3736, lng: -71.1097, population: 118403 },
  { name: "Lawrence", county: "Essex", lat: 42.707, lng: -71.1631, population: 89143 },
  { name: "Framingham", county: "Middlesex", lat: 42.2793, lng: -71.4162, population: 72362 },
  { name: "Fitchburg", county: "Worcester", lat: 42.5834, lng: -71.8023, population: 41946 },
  { name: "Leominster", county: "Worcester", lat: 42.525, lng: -71.7598, population: 43782 },
  { name: "Haverhill", county: "Essex", lat: 42.7762, lng: -71.0773, population: 67787 },
  { name: "Pittsfield", county: "Berkshire", lat: 42.4501, lng: -73.2454, population: 43927 },
  { name: "Lynn", county: "Essex", lat: 42.4668, lng: -70.9495, population: 101253 },
  { name: "Brockton", county: "Plymouth", lat: 42.0834, lng: -71.0184, population: 105643 },
  { name: "Quincy", county: "Norfolk", lat: 42.2529, lng: -71.0023, population: 101636 },
  { name: "Westborough", county: "Worcester", lat: 42.2695, lng: -71.6162, population: 21567 },
  { name: "Marlborough", county: "Middlesex", lat: 42.3459, lng: -71.5523, population: 41793 },
  { name: "Chelmsford", county: "Middlesex", lat: 42.5998, lng: -71.3673, population: 36379 },
  { name: "Billerica", county: "Middlesex", lat: 42.5584, lng: -71.2689, population: 42670 },
  { name: "Holyoke", county: "Hampden", lat: 42.2043, lng: -72.6162, population: 38238 },
  { name: "Taunton", county: "Bristol", lat: 41.9001, lng: -71.0898, population: 59408 },
];

export function searchMunicipalities(query: string): Municipality[] {
  const q = query.trim().toLowerCase();
  if (!q) return MUNICIPALITIES.slice(0, 8);
  return MUNICIPALITIES.filter(
    (m) =>
      m.name.toLowerCase().includes(q) || m.county.toLowerCase().includes(q),
  ).slice(0, 10);
}
