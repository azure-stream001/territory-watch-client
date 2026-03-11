/**
 * 町丁目境界ポリゴンの取得（Geoshape ベクトルタイル）
 * 代表点 (lat, lng) を含むタイルを取得し、該当するポリゴンを返す。
 * タイルは CORS 回避のためバックエンド経由で取得する。
 */

import Pbf from "pbf";
import { VectorTile } from "@mapbox/vector-tile";
import type { Feature } from "geojson";
import { API_BASE } from "@/lib/api";
import { ringToWkt, ringCentroid, type LatLng } from "@/lib/geo";

const TILE_ZOOM = 15;

/** (lat, lng) を Web Mercator タイル座標 (x, y) に変換 */
function latLngToTileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/** 点がポリゴン（外環のみ）の内側にあるか（ray casting） */
function pointInPolygon(lon: number, lat: number, ring: number[][]): boolean {
  const n = ring.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** GeoJSON Polygon の外環で point-in-polygon */
function pointInGeoJsonPolygon(lon: number, lat: number, coordinates: number[][][]): boolean {
  const outer = coordinates[0];
  if (!outer || outer.length < 3) return false;
  return pointInPolygon(lon, lat, outer);
}

/** GeoJSON MultiPolygon のいずれかの外環で point-in-polygon */
function pointInGeoJsonMultiPolygon(
  lon: number,
  lat: number,
  coordinates: number[][][][]
): boolean {
  for (const polygon of coordinates) {
    if (pointInGeoJsonPolygon(lon, lat, polygon)) return true;
  }
  return false;
}

function pointInGeometry(lon: number, lat: number, geom: Feature["geometry"]): boolean {
  if (!geom || geom.type === "Point") return false;
  if (geom.type === "Polygon") return pointInGeoJsonPolygon(lon, lat, geom.coordinates);
  if (geom.type === "MultiPolygon")
    return pointInGeoJsonMultiPolygon(lon, lat, geom.coordinates);
  return false;
}

/** ポリゴン外環を WKT に */
function polygonToWkt(coordinates: number[][][]): string {
  const outer = coordinates[0];
  if (!outer || outer.length < 3) return "";
  const ring: LatLng[] = outer.map((c) => [c[0], c[1]]);
  return ringToWkt(ring);
}

function multiPolygonToWkt(coordinates: number[][][][]): string {
  const first = coordinates[0]?.[0];
  if (!first || first.length < 3) return "";
  const ring: LatLng[] = first.map((c) => [c[0], c[1]]);
  return ringToWkt(ring);
}

function featureToWkt(geom: Feature["geometry"]): string | null {
  if (!geom) return null;
  if (geom.type === "Polygon") return polygonToWkt(geom.coordinates);
  if (geom.type === "MultiPolygon") return multiPolygonToWkt(geom.coordinates);
  return null;
}

function featureToCentroid(geom: Feature["geometry"]): { lat: number; lon: number } | null {
  if (!geom) return null;
  let ring: number[][];
  if (geom.type === "Polygon") ring = geom.coordinates[0];
  else if (geom.type === "MultiPolygon") ring = geom.coordinates[0]?.[0] ?? [];
  else return null;
  if (ring.length < 3) return null;
  const latLngs: LatLng[] = ring.map((c) => [c[0], c[1]]);
  return ringCentroid(latLngs);
}

export interface SubareaPolygonResult {
  wkt: string;
  lat: number;
  lon: number;
}

/**
 * 代表点 (lat, lng) を含む町丁目ポリゴンを Geoshape ベクトルタイルから取得する。
 * 失敗時は null（フォールバックで矩形を使用）。
 */
export async function fetchSubareaPolygon(
  lat: number,
  lng: number,
  _townName?: string
): Promise<SubareaPolygonResult | null> {
  const { x: tileX, y: tileY } = latLngToTileXY(lat, lng, TILE_ZOOM);
  const url = `${API_BASE}/api/geoshape-tile/${TILE_ZOOM}/${tileX}/${tileY}.pbf`;

  let buffer: ArrayBuffer;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    buffer = await res.arrayBuffer();
  } catch {
    return null;
  }

  let tile: InstanceType<typeof VectorTile>;
  try {
    const pbf = new Pbf(new Uint8Array(buffer));
    tile = new VectorTile(pbf);
  } catch {
    return null;
  }

  const layerNames = Object.keys(tile.layers);
  for (const layerName of layerNames) {
    const layer = tile.layers[layerName];
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      if (feature.type !== 3) continue; // 3 = Polygon
      const geojson = feature.toGeoJSON(tileX, tileY, TILE_ZOOM);
      if (!pointInGeometry(lng, lat, geojson.geometry)) continue;
      const wkt = featureToWkt(geojson.geometry);
      const center = featureToCentroid(geojson.geometry);
      if (wkt && center) return { wkt, lat: center.lat, lon: center.lon };
    }
  }
  return null;
}
