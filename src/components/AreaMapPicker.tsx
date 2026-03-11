"use client";

/**
 * 地図上でポリゴン描画または都道府県選択により範囲を指定するコンポーネント
 * コメント・ドキュメントは日本語
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Polygon,
  GeoJSON,
  useMapEvent,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  PREFECTURES,
  getPrefectureGeoJsonUrl,
  type Prefecture,
} from "@/data/prefectures";
import {
  fetchMunicipalitiesForPrefecture,
  type MunicipalityItem,
} from "@/data/adminAreas";
import {
  fetchSubareasForMunicipality,
  municipalityNameForApi,
  type SubareaItem,
} from "@/data/subareas";
import { fetchSubareaPolygon } from "@/data/subareaPolygon";
import {
  ringToWkt,
  ringCentroid,
  wktToRing,
  type LatLng,
} from "@/lib/geo";

/** 地図の初期中心（日本付近） */
const DEFAULT_CENTER: [number, number] = [36.0, 138.0];
const DEFAULT_ZOOM = 6;

/** 選択結果を親に渡すコールバック */
export interface AreaMapPickerResult {
  footprintWkt: string;
  centerLat: number;
  centerLon: number;
}

export interface AreaMapPickerProps {
  onSelect: (result: AreaMapPickerResult) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  /** When provided, pre-fills the polygon (edit mode). WKT POLYGON. */
  initialFootprintWkt?: string | null;
}

/** 都道府県GeoJSONのFeature型（geometry は Polygon | MultiPolygon） */
interface PrefFeature {
  type: "Feature";
  properties?: { nam_ja?: string; id?: number };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

/** Polygon の外リングを WKT に変換 */
function polygonToWkt(coords: number[][][]): string {
  const ring = coords[0].map((c) => [c[0], c[1]] as LatLng);
  return ringToWkt(ring);
}

/** 1つの Feature の Polygon/MultiPolygon から外リングの配列を収集 */
function collectExteriorRings(g: PrefFeature["geometry"]): number[][][] {
  const rings: number[][][] = [];
  if (g.type === "Polygon") {
    const outer = (g.coordinates as number[][][])[0];
    if (outer?.length) rings.push(outer);
  } else if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates as number[][][][]) {
      const outer = poly[0];
      if (outer?.length) rings.push(outer);
    }
  }
  return rings;
}

/** FeatureCollection 全体を 1 つの WKT にまとめる（全 feature の全ポリゴンを含め面積が正しくなる） */
function featureCollectionToWktAndCentroid(fc: GeoJSON.FeatureCollection): {
  wkt: string;
  lat: number;
  lon: number;
} | null {
  const features = fc.features ?? [];
  if (features.length === 0) return null;

  const allRings: number[][][] = [];
  let firstRingForCentroid: number[][] | null = null;
  for (const f of features) {
    const g = (f as PrefFeature).geometry;
    if (!g) continue;
    const rings = collectExteriorRings(g);
    for (const ring of rings) {
      allRings.push(ring);
      if (!firstRingForCentroid && ring.length >= 3) firstRingForCentroid = ring;
    }
  }
  if (allRings.length === 0 || !firstRingForCentroid) return null;

  const parts = allRings.map(
    (outer) => `((${outer.map((c) => `${c[0]} ${c[1]}`).join(", ")}))`
  );
  const wkt =
    parts.length === 1 ? `POLYGON${parts[0]}` : `MULTIPOLYGON(${parts.join(", ")})`;
  const latLngs = firstRingForCentroid.map((c) => [c[0], c[1]] as LatLng);
  const { lat, lon } = ringCentroid(latLngs);
  return { wkt, lat, lon };
}

/** クリックで頂点を追加するための内部コンポーネント（ポリゴン描画モード時） */
function MapClickHandler({
  enabled,
  onAddPoint,
}: {
  enabled: boolean;
  onAddPoint: (lat: number, lng: number) => void;
}) {
  useMapEvent("click", (e) => {
    if (!enabled) return;
    onAddPoint(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

/** ポリゴン頂点があるときに地図の表示範囲をポリゴンに合わせる */
function FitBoundsToPoints({
  points,
  active,
}: {
  points: [number, number][];
  active: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active || points.length < 3) return;
    map.fitBounds(points, { padding: [24, 24], maxZoom: 14 });
  }, [map, active, points.length]);
  return null;
}

/** 町丁目選択時に地図をその代表点にズームする */
function FitSubarea({ subarea }: { subarea: SubareaItem | null }) {
  const map = useMap();
  useEffect(() => {
    if (!subarea) return;
    map.setView([subarea.lat, subarea.lng], 16);
  }, [map, subarea?.lat, subarea?.lng]);
  return null;
}

/** 都道府県選択時に地図をその中心にズームする（市区町村未選択時） */
function FitPrefecture({
  prefecture,
  municipality,
}: {
  prefecture: Prefecture | null;
  municipality: MunicipalityItem | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!prefecture) return;
    if (municipality) {
      const fc = municipality.geojson;
      const f = fc.features?.[0];
      const geom = f?.geometry as { type: string; coordinates: number[][] | number[][][] | number[][][][] } | undefined;
      if (geom?.coordinates) {
        const flatten = (c: number[] | number[][] | number[][][] | number[][][][], lats: number[], lngs: number[]): void => {
          if (c.length === 2 && typeof c[0] === "number" && typeof c[1] === "number") {
            lngs.push(c[0] as number);
            lats.push(c[1] as number);
            return;
          }
          for (const x of c) flatten(x as number[] | number[][][] | number[][][][], lats, lngs);
        };
        const lats: number[] = [];
        const lngs: number[] = [];
        flatten(geom.coordinates, lats, lngs);
        if (lats.length && lngs.length) {
          map.fitBounds(
            [
              [Math.min(...lats), Math.min(...lngs)],
              [Math.max(...lats), Math.max(...lngs)],
            ],
            { padding: [20, 20], maxZoom: 14 }
          );
          return;
        }
      }
    }
    map.setView([prefecture.centerLat, prefecture.centerLon], 8);
  }, [map, prefecture, municipality]);
  return null;
}

/** Convert WKT ring [lon, lat][] to Leaflet [lat, lng][] */
function wktToLeafletPoints(wkt: string): [number, number][] | null {
  const ring = wktToRing(wkt);
  if (!ring || ring.length < 3) return null;
  return ring.map(([lon, lat]) => [lat, lon]);
}

export function AreaMapPicker({
  onSelect,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  initialFootprintWkt,
}: AreaMapPickerProps) {
  const [mode, setMode] = useState<"polygon" | "prefecture">("polygon");
  const [points, setPoints] = useState<[number, number][]>(() => {
    const parsed = initialFootprintWkt ? wktToLeafletPoints(initialFootprintWkt) : null;
    return parsed ?? [];
  });
  const [prefecture, setPrefecture] = useState<Prefecture | null>(null);
  const [prefGeoJson, setPrefGeoJson] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<MunicipalityItem[]>([]);
  const [municipality, setMunicipality] = useState<MunicipalityItem | null>(null);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);
  const [municipalitiesError, setMunicipalitiesError] = useState<string | null>(null);
  const [subareas, setSubareas] = useState<SubareaItem[]>([]);
  const [subarea, setSubarea] = useState<SubareaItem | null>(null);
  const [subareasLoading, setSubareasLoading] = useState(false);
  const [subareasError, setSubareasError] = useState<string | null>(null);
  /** 町丁目の実境界ポリゴン（Geoshape タイルから取得）。null のときは代表点の矩形で代用 */
  const [subareaPolygon, setSubareaPolygon] = useState<{
    wkt: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [subareaPolygonLoading, setSubareaPolygonLoading] = useState(false);

  const addPoint = useCallback((lat: number, lng: number) => {
    setPoints((prev) => [...prev, [lat, lng]]);
  }, []);

  const confirmPolygon = useCallback(() => {
    if (points.length < 3) return;
    const ring: LatLng[] = points.map(([lat, lng]) => [lng, lat]);
    const wkt = ringToWkt(ring);
    const { lat, lon } = ringCentroid(ring);
    onSelect({ footprintWkt: wkt, centerLat: lat, centerLon: lon });
  }, [points, onSelect]);

  const clearPolygon = useCallback(() => {
    setPoints([]);
  }, []);

  /** 都道府県を選択したときに GeoJSON を取得 */
  useEffect(() => {
    if (mode !== "prefecture" || !prefecture) {
      setPrefGeoJson(null);
      setPrefError(null);
      setMunicipalities([]);
      setMunicipality(null);
      return;
    }
    setPrefLoading(true);
    setPrefError(null);
    setMunicipality(null);
    fetch(getPrefectureGeoJsonUrl(prefecture.code))
      .then((r) => r.json())
      .then((data) => {
        setPrefGeoJson(data as GeoJSON.FeatureCollection);
      })
      .catch(() => {
        setPrefError("境界データの取得に失敗しました");
        setPrefGeoJson(null);
      })
      .finally(() => setPrefLoading(false));
  }, [mode, prefecture]);

  /** 都道府県選択後に市区町村一覧を取得（geolonia/japanese-admins） */
  useEffect(() => {
    if (mode !== "prefecture" || !prefecture || !prefGeoJson) {
      setMunicipalities([]);
      setMunicipalitiesLoading(false);
      setMunicipalitiesError(null);
      return;
    }
    setMunicipalitiesLoading(true);
    setMunicipalitiesError(null);
    fetchMunicipalitiesForPrefecture(prefecture.code)
      .then(setMunicipalities)
      .catch(() => {
        setMunicipalitiesError("市区町村一覧の取得に失敗しました");
        setMunicipalities([]);
      })
      .finally(() => setMunicipalitiesLoading(false));
  }, [mode, prefecture, prefGeoJson]);

  /** 市区町村選択後に町丁目一覧を取得（geolonia/japanese-addresses） */
  useEffect(() => {
    if (mode !== "prefecture" || !prefecture || !municipality) {
      setSubareas([]);
      setSubarea(null);
      setSubareasLoading(false);
      setSubareasError(null);
      return;
    }
    const muniName = municipalityNameForApi(municipality.name, prefecture.name);
    setSubareasLoading(true);
    setSubareasError(null);
    setSubarea(null);
    fetchSubareasForMunicipality(prefecture.name, muniName)
      .then((list) => {
        setSubareas(list);
      })
      .catch(() => {
        setSubareasError("町丁目一覧の取得に失敗しました");
        setSubareas([]);
      })
      .finally(() => setSubareasLoading(false));
  }, [mode, prefecture, municipality]);

  /** 町丁目選択後に実境界ポリゴンを取得（Geoshape ベクトルタイル） */
  useEffect(() => {
    if (!subarea) {
      setSubareaPolygon(null);
      return;
    }
    setSubareaPolygonLoading(true);
    setSubareaPolygon(null);
    fetchSubareaPolygon(subarea.lat, subarea.lng, subarea.town)
      .then((result) => setSubareaPolygon(result))
      .catch(() => setSubareaPolygon(null))
      .finally(() => setSubareaPolygonLoading(false));
  }, [subarea?.lat, subarea?.lng, subarea?.town]);

  /** 表示中の行政区画 GeoJSON（都道府県全体 or 市区町村） */
  const adminGeoJson: GeoJSON.FeatureCollection | null =
    municipality?.geojson ?? prefGeoJson;

  /** 町丁目: 実ポリゴンがあればそれ、なければ代表点の矩形 */
  const subareaBoxSizeDeg = 0.0045;
  const subareaWktAndCenter = useMemo(() => {
    if (!subarea) return null;
    if (subareaPolygon) return subareaPolygon;
    const h = subareaBoxSizeDeg / 2;
    const ring: LatLng[] = [
      [subarea.lng - h, subarea.lat - h],
      [subarea.lng + h, subarea.lat - h],
      [subarea.lng + h, subarea.lat + h],
      [subarea.lng - h, subarea.lat + h],
      [subarea.lng - h, subarea.lat - h],
    ];
    return { wkt: ringToWkt(ring), lat: subarea.lat, lon: subarea.lng };
  }, [subarea, subareaPolygon]);

  const subareaBoxPositions = useMemo(
    () => (subareaWktAndCenter ? wktToLeafletPoints(subareaWktAndCenter.wkt) : null),
    [subareaWktAndCenter]
  );

  /** クリック時に現在の選択（町丁目 or 市区町村 or 都道府県）を採用する */
  const adoptAdminArea = useCallback(() => {
    if (subarea && subareaWktAndCenter) {
      onSelect({
        footprintWkt: subareaWktAndCenter.wkt,
        centerLat: subareaWktAndCenter.lat,
        centerLon: subareaWktAndCenter.lon,
      });
      return;
    }
    const fc = municipality?.geojson ?? prefGeoJson;
    if (!fc || fc.type !== "FeatureCollection") return;
    const r = featureCollectionToWktAndCentroid(fc);
    if (r) onSelect({ footprintWkt: r.wkt, centerLat: r.lat, centerLon: r.lon });
  }, [municipality, prefGeoJson, subarea, subareaWktAndCenter, onSelect]);

  /** ポリゴン用の Leaflet 座標（緯度・経度の配列） */
  const latLngsPolygon = points.length >= 3 ? [...points, points[0]] : points;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">範囲の指定方法:</span>
        <button
          type="button"
          onClick={() => {
            setMode("polygon");
            setPoints([]);
            setPrefecture(null);
            setPrefGeoJson(null);
          }}
          className={`rounded px-3 py-1.5 text-sm ${
            mode === "polygon"
              ? "bg-emerald-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          ポリゴンで描く
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("prefecture");
            setPoints([]);
          }}
          className={`rounded px-3 py-1.5 text-sm ${
            mode === "prefecture"
              ? "bg-emerald-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          行政区画で選択
        </button>
      </div>

      {mode === "prefecture" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600">都道府県:</label>
            <select
              value={prefecture?.code ?? ""}
              onChange={(e) => {
                const code = e.target.value;
                setPrefecture(
                  code ? PREFECTURES.find((p) => p.code === code) ?? null : null
                );
              }}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {prefecture && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-gray-600">市区町村:</label>
              <select
                value={municipality?.code ?? ""}
                onChange={(e) => {
                  const code = e.target.value;
                  setMunicipality(
                    code
                      ? municipalities.find((m) => m.code === code) ?? null
                      : null
                  );
                  setSubarea(null);
                }}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[180px]"
                disabled={municipalitiesLoading}
              >
                <option value="">都道府県全体</option>
                {municipalities.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
              {municipalitiesLoading && (
                <span className="text-sm text-gray-500">市区町村を読み込み中...</span>
              )}
            </div>
          )}
          {prefLoading && (
            <span className="text-sm text-gray-500">都道府県を読み込み中...</span>
          )}
          {prefError && (
            <span className="text-sm text-red-600">{prefError}</span>
          )}
          {municipalitiesError && (
            <span className="text-sm text-amber-600">{municipalitiesError}</span>
          )}
          {municipality && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-gray-600">町丁目:</label>
              <select
                value={subarea ? `${subarea.town}|${subarea.lat}|${subarea.lng}` : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setSubarea(null);
                    return;
                  }
                  const found = subareas.find(
                    (s) => `${s.town}|${s.lat}|${s.lng}` === v
                  );
                  setSubarea(found ?? null);
                }}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[200px]"
                disabled={subareasLoading}
              >
                <option value="">市区町村全体</option>
                {subareas.map((s) => (
                  <option
                    key={`${s.town}-${s.lat}-${s.lng}`}
                    value={`${s.town}|${s.lat}|${s.lng}`}
                  >
                    {s.town}
                  </option>
                ))}
              </select>
              {subareasLoading && (
                <span className="text-sm text-gray-500">町丁目を読み込み中...</span>
              )}
              {subarea && subareaPolygonLoading && (
                <span className="text-sm text-gray-500">境界ポリゴンを取得中...</span>
              )}
            </div>
          )}
          {subareasError && (
            <span className="text-sm text-amber-600">{subareasError}</span>
          )}
          {prefecture && adminGeoJson && (
            <button
              type="button"
              onClick={adoptAdminArea}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
            >
              この範囲を採用
            </button>
          )}
        </div>
      )}

      {mode === "polygon" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>
            地図をクリックして頂点を追加。3点以上で「範囲を確定」を押してください。
          </span>
          {points.length >= 3 && (
            <>
              <button
                type="button"
                onClick={confirmPolygon}
                className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
              >
                範囲を確定
              </button>
              <button
                type="button"
                onClick={clearPolygon}
                className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                やり直す
              </button>
            </>
          )}
        </div>
      )}

      <div className="h-[400px] w-full overflow-hidden rounded-lg border border-gray-300">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBoundsToPoints points={points} active={mode === "polygon" && points.length >= 3} />
          <FitPrefecture
            prefecture={mode === "prefecture" ? prefecture : null}
            municipality={mode === "prefecture" && !subarea ? municipality : null}
          />
          <FitSubarea subarea={mode === "prefecture" ? subarea : null} />
          <MapClickHandler
            enabled={mode === "polygon"}
            onAddPoint={addPoint}
          />
          {mode === "polygon" && latLngsPolygon.length >= 2 && (
            <Polygon
              positions={latLngsPolygon}
              pathOptions={{ color: "#059669", weight: 2, fillOpacity: 0.3 }}
            />
          )}
          {mode === "prefecture" && adminGeoJson && !subarea && (
            <GeoJSON
              key={municipality ? `municipality-${municipality.code}` : "prefecture"}
              data={adminGeoJson}
              style={{ color: "#059669", weight: 2, fillOpacity: 0.2 }}
            />
          )}
          {mode === "prefecture" && subareaBoxPositions && (
            <Polygon
              positions={subareaBoxPositions}
              pathOptions={{ color: "#059669", weight: 2, fillOpacity: 0.35 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
