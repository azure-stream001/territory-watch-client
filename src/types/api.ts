/** API types matching Django REST serializers */

export interface Area {
  id: number;
  name: string;
  description: string;
  center_lat: number | null;
  center_lon: number | null;
  footprint_wkt: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export type SatelliteSceneStatus =
  | "pending"
  | "downloading"
  | "downloaded"
  | "failed";

export interface SatelliteScene {
  id: number;
  area: number;
  area_name?: string;
  area_detail?: Area | null;
  scene_date: string;
  product_id: string;
  status: SatelliteSceneStatus;
  file_path: string;
  metadata: Record<string, unknown>;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export type DetectionJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface DetectionJob {
  id: number;
  area: number;
  area_detail?: Area;
  status: DetectionJobStatus;
  params: Record<string, unknown>;
  before_date_start: string | null;
  before_date_end: string | null;
  after_date_start: string | null;
  after_date_end: string | null;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface DetectionResult {
  id: number;
  job: number;
  before_scene: number | null;
  after_scene: number | null;
  before_scene_detail: SatelliteScene | null;
  after_scene_detail: SatelliteScene | null;
  deforestation_geojson: GeoJSON.FeatureCollection | null;
  /** URL of the processed satellite (RGB) map image for overlay. */
  result_map_image_url: string | null;
  /** [south, west, north, east] for Leaflet ImageOverlay. */
  result_map_bounds: [number, number, number, number] | null;
  metrics: {
    detected_area_ha?: number;
    num_patches?: number;
    [key: string]: unknown;
  };
  violations: Array<{ violation_type?: string; [key: string]: unknown }>;
  accuracy: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

declare namespace GeoJSON {
  interface FeatureCollection {
    type: "FeatureCollection";
    features: Feature[];
  }
  interface Feature {
    type: "Feature";
    geometry: unknown;
    properties?: Record<string, unknown>;
  }
}
