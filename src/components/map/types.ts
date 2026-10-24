export interface LayerToggles {
  municipalities: boolean;
  openspace: boolean;
  ej: boolean;
  schools: boolean;
  flood: boolean;
  dataCenters: boolean;
  suitability: boolean;
  gridScenario: boolean;
}

export const DEFAULT_TOGGLES: LayerToggles = {
  municipalities: true,
  openspace: true,
  ej: true,
  schools: true,
  flood: false,
  dataCenters: false,
  suitability: false,
  gridScenario: false,
};
