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
  /** Whether a usable local layer was obtained for the demo. */
  status: "loaded" | "reference-only" | "unavailable";
}

const RETRIEVED = "2026-10-24";

export const DATA_SOURCES: DataSource[] = [
  {
    id: "massgis-municipalities",
    name: "MassGIS Data: Municipalities",
    publisher: "MassGIS (Bureau of Geographic Information), Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-municipalities",
    publishedDate: "2024",
    retrievedDate: RETRIEVED,
    geographicCoverage: "All 351 Massachusetts cities and towns",
    processingNotes:
      "Official layer referenced. A curated, generalized subset of representative municipality centroids/boundaries ships locally for a reliable offline demo; run scripts/fetch-data.ts to process the full official layer.",
    reliabilityLimitations:
      "Bundled demo subset is generalized and does not include all 351 municipalities at full polygon resolution.",
    status: "loaded",
  },
  {
    id: "massgis-openspace",
    name: "MassGIS Data: Protected and Recreational Open Space",
    publisher: "MassGIS, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-protected-and-recreational-openspace",
    publishedDate: "2024",
    retrievedDate: RETRIEVED,
    geographicCoverage: "Statewide protected and recreational open space parcels",
    processingNotes:
      "Official layer referenced. Curated representative open-space polygons bundled for demo radius analysis; full layer processed via fetch-data.ts.",
    reliabilityLimitations:
      "Open-space datasets do NOT include every tree, lawn, or undeveloped parcel. Bundled subset covers selected areas only.",
    status: "loaded",
  },
  {
    id: "massgis-schools",
    name: "MassGIS Data: Massachusetts Schools (Pre-K through High School)",
    publisher: "MassGIS, Commonwealth of Massachusetts",
    url: "https://www.mass.gov/info-details/massgis-data-massachusetts-schools-pre-k-through-high-school",
    publishedDate: "2024",
    retrievedDate: RETRIEVED,
    geographicCoverage: "Statewide public and many non-public schools",
    processingNotes:
      "Official layer referenced. Curated representative school points bundled for proximity analysis in demo areas.",
    reliabilityLimitations:
      "Bundled subset is not the complete statewide school roster; proximity counts reflect mapped points only.",
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
      "Official layer referenced. Curated representative EJ block-group polygons bundled for overlap checks in demo areas.",
    reliabilityLimitations:
      "Bundled subset covers selected block groups; absence of overlap in the subset does not prove absence of EJ designation.",
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
      "Referenced for flood hazard and land-use layers. Flood layer not bundled in the demo subset.",
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
