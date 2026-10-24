/**
 * Source registry: every dataset and official reference used by DataDaddy.
 * Each record carries publisher, URL, dates, coverage, and known limitations.
 * This backs the provenance chips and the Data & Methodology page.
 */

export interface DataSource {
  id: string;
  name: string;
  publisher: string;
  url: string;
  /** Publication or last-update date of the upstream source, if known. */
  publishedDate?: string;
  /** Date DataDaddy retrieved / referenced the source. */
  retrievedDate: string;
  geographicCoverage: string;
  processingNotes: string;
  reliabilityLimitations: string;
  /** Whether the app integrates a queryable official service; request failures are shown in the dashboard. */
  status: "loaded" | "reference-only" | "unavailable";
}

const RETRIEVED = "2026-10-24";

export const DATA_SOURCES: DataSource[] = [
  {
    id: "massgis-census-housing", name: "2020 Census town population, housing units and land area",
    publisher: "U.S. Census Bureau via MassGIS", publishedDate: "2020", retrievedDate: RETRIEVED,
    url: "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/Census2020_Towns/FeatureServer/2",
    geographicCoverage: "Massachusetts municipalities", status: "loaded",
    processingNotes: "Point-in-town query returns HOUSING20 and ALAND20; town housing density is units divided by land square miles. Runtime retrieval date appears in the financial housing panel.",
    reliabilityLimitations: "2020 snapshot and town-level density, not current housing availability or site-radius density. No rent observation is inferred from housing counts.",
  },
  {
    id: "massgis-landuse2016", name: "MassGIS Land Cover / Land Use (2016)",
    publisher: "MassGIS, Commonwealth of Massachusetts", publishedDate: "2016", retrievedDate: RETRIEVED,
    url: "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/LandCoverLandUse2016/FeatureServer/0",
    geographicCoverage: "Massachusetts; queried near conceptual footprint", status: "loaded",
    processingNotes: "Residential, commercial and mixed-use polygons returned in WGS84 with complete pagination; footprint intersections calculated with Turf.",
    reliabilityLimitations: "Historical land-use classification, not current occupied homes, business locations, zoning or legal parcel availability. No displacement count is inferred.",
  },
  {
    id: "acs-housing-optional", name: "ACS median gross rent and household income (optional)",
    publisher: "U.S. Census Bureau, republished by Census Reporter", retrievedDate: RETRIEVED,
    url: "https://github.com/censusreporter/census-api/blob/master/API.md", geographicCoverage: "Supported Census county subdivisions", status: "loaded",
    processingNotes: "Requests B25064 and B19013 for the Census town GEOID; successful observations show the returned release and source. Explicit button can copy published rent into household assumptions.",
    reliabilityLimitations: "Browser verification returned Lowell ACS 2024 1-year estimates; service availability varies and the returned release can differ by geography. ACS estimates carry sampling uncertainty. Household baselines remain user assumptions unless a benchmark is explicitly selected.",
  },
  {
    id: "massgis-municipalities",
    name: "MassGIS Data: Municipalities",
    publisher: "MassGIS (Bureau of Geographic Information), Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-municipalities",

    retrievedDate: RETRIEVED,
    geographicCoverage: "All 351 Massachusetts cities and towns",
    processingNotes:
      "Official MassGIS hosted municipality polygons queried directly as WGS84 GeoJSON. The selected point is resolved against town boundaries; population is the official POP2020 attribute.",
    reliabilityLimitations:
      "Coastline and polygon coordinates are generalized for display; population is the 2020 Census, not a current-year estimate.",
    status: "loaded",
  },
  {
    id: "massgis-openspace",
    name: "MassGIS Data: Protected and Recreational Open Space",
    publisher: "MassGIS, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-protected-and-recreational-openspace",

    retrievedDate: RETRIEVED,
    geographicCoverage: "Statewide protected and recreational open space parcels",
    processingNotes:
      "Official EEA/MassGIS polygon service queried for the selected analysis radius with complete pagination. Turf intersects returned polygons with the analysis circle.",
    reliabilityLimitations:
      "Mapped protected and recreational parcels do not include every tree, lawn, or undeveloped parcel. Live service outages produce unavailable values, never zero-filled demo data.",
    status: "loaded",
  },
  {
    id: "massgis-schools",
    name: "MassGIS Data: Massachusetts Schools (Pre-K through High School)",
    publisher: "MassGIS, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-massachusetts-schools-pre-k-through-high-school",

    retrievedDate: RETRIEVED,
    geographicCoverage: "Statewide public and many non-public schools",
    processingNotes:
      "Official statewide MassGIS school service queried with complete pagination; distances and 1/3-mile counts recomputed from the selected coordinates.",
    reliabilityLimitations:
      "Counts reflect the published school roster and its update schedule; they are not a real-time enrollment inventory.",
    status: "loaded",
  },
  {
    id: "massgis-ej",
    name: "MassGIS Data: 2020 Environmental Justice Populations",
    publisher: "MassGIS, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-2020-environmental-justice-populations",
    publishedDate: "2022",
    retrievedDate: RETRIEVED,
    geographicCoverage: "Designated EJ block groups statewide",
    processingNotes:
      "Official MassGIS EJ2020 service queried around each site, restricted to EJ = Yes. The selected point is checked against the returned designated block groups.",
    reliabilityLimitations:
      "Designation uses the published 2020 EJ dataset, not a current demographic estimate. An empty successful query means no designated overlap; failed requests remain unknown.",
    status: "loaded",
  },
  {
    id: "massgis-layers",
    name: "MassGIS Data Layers (catalog incl. flood hazard, land use)",
    publisher: "MassGIS, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-layers",
    retrievedDate: RETRIEVED,
    geographicCoverage: "Statewide catalog of GIS layers",
    processingNotes:
      "Referenced for flood hazard and land-use layers. Flood layer is not integrated.",
    reliabilityLimitations:
      "Flood hazard shown as 'data unavailable' where not bundled; do not infer zero flood risk.",
    status: "reference-only",
  },
  {
    id: "iso-ne-rsp",
    name: "ISO New England Regional System Plan (RSP)",
    publisher: "ISO New England Inc.",
    url: "https://www.iso-ne.com/system-planning/system-plans-studies/rsp",
    retrievedDate: RETRIEVED,
    geographicCoverage: "ISO-NE control area (six New England states)",
    processingNotes:
      "Regional planning context only. Provides system-level framing; does not provide local distribution headroom.",
    reliabilityLimitations:
      "Does not establish site-level available grid capacity. Local capacity remains unknown absent utility data.",
    status: "reference-only",
  },
  {
    id: "eo-658",
    name: "Massachusetts Executive Order No. 658",
    publisher: "Office of the Governor, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/executive-orders/no-658-establishing-requirements-for-responsible-data-center-development-and-operations-in-massachusetts-to-protect-and-support-ratepayers-communities-and-the-environment",
    publishedDate: "2026-09-08",
    retrievedDate: RETRIEVED,
    geographicCoverage: "Commonwealth of Massachusetts",
    processingNotes:
      "Primary regulatory source for the Policy Navigator. Scope summarized; some implementation guidance scheduled for future development as of Oct 2026.",
    reliabilityLimitations:
      "Pending implementation rules are not finalized regulation and are labeled as such.",
    status: "reference-only",
  },
  {
    id: "soe-2026",
    name: "Statement of Expectations for Responsible Data Center Development",
    publisher: "Healey-Driscoll Administration, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/healey-driscoll-administration-statement-of-expectations-for-responsible-data-center-development-and-operations-in-massachusetts",
    publishedDate: "2026-06-25",
    retrievedDate: RETRIEVED,
    geographicCoverage: "Commonwealth of Massachusetts",
    processingNotes: "Supplementary policy context preceding EO 658.",
    reliabilityLimitations: "Statement of expectations, not binding regulation.",
    status: "reference-only",
  },
  {
    id: "qdc-tax-exemption",
    name: "Massachusetts Qualified Data Center Sales and Use Tax Exemption",
    publisher: "Massachusetts Department of Revenue / Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massachusetts-qualified-data-center-sales-and-use-tax-exemption",
    publishedDate: "2026",
    retrievedDate: RETRIEVED,
    geographicCoverage: "Commonwealth of Massachusetts",
    processingNotes:
      "Separate tax-incentive framework. Eligibility is independent of the EO 658 MW threshold.",
    reliabilityLimitations:
      "Informational only; eligibility determinations are made by the Commonwealth, not by DataDaddy.",
    status: "reference-only",
  },
];

export function getSource(id: string): DataSource | undefined {
  return DATA_SOURCES.find((s) => s.id === id);
}
