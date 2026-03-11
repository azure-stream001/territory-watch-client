/**
 * 地図・ジオメトリ用ユーティリティ
 * WKT（Well-Known Text）と GeoJSON / 座標配列の変換、ポリゴン重心の算出を行う。
 */

/** 経度・緯度のペア */
export type LatLng = [number, number];

/**
 * 座標配列を WKT POLYGON 文字列に変換する
 * @param ring - 閉じたリング（先頭と末尾が同じでも可。末尾が省略されていれば先頭で閉じる）
 * @returns 例: "POLYGON((139.1 35.6, 139.2 35.6, ...))"
 */
export function ringToWkt(ring: LatLng[]): string {
  if (ring.length < 3) return "";
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring
    : [...ring, ring[0]];
  const points = closed.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `POLYGON((${points}))`;
}

/**
 * GeoJSON Polygon の coordinates[0]（外リング）を WKT に変換する
 */
export function geoJsonPolygonToWkt(coordinates: number[][][]): string {
  const ring = coordinates[0].map((c) => [c[0], c[1]] as LatLng);
  return ringToWkt(ring);
}

/**
 * ポリゴンリングの重心（単純平均）を返す
 */
export function ringCentroid(ring: LatLng[]): { lat: number; lon: number } {
  if (ring.length === 0) return { lat: 0, lon: 0 };
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  let sumLat = 0;
  let sumLon = 0;
  for (const [lon, lat] of closed) {
    sumLat += lat;
    sumLon += lon;
  }
  const n = closed.length;
  return { lat: sumLat / n, lon: sumLon / n };
}

/**
 * WKT POLYGON をパースして外リングの座標配列を返す。パース失敗時は null
 */
export function wktToRing(wkt: string): LatLng[] | null {
  const rings = wktToRings(wkt);
  if (!rings || rings.length === 0) return null;
  return rings[0];
}

/**
 * WKT POLYGON または MULTIPOLYGON をパースして外リングの配列を返す。
 * POLYGON の場合は [ring]、MULTIPOLYGON の場合は [ring1, ring2, ...]。パース失敗時は null。
 */
export function wktToRings(wkt: string): LatLng[][] | null {
  const s = wkt.trim();
  const polyMatch = /POLYGON\s*\(\s*\(\s*([\s\S]+?)\s*\)\s*\)/.exec(s);
  if (polyMatch) {
    const points = polyMatch[1].split(",").map((t) => t.trim().split(/\s+/).map(Number));
    if (points.some((p) => p.length < 2)) return null;
    return [points.map((p) => [p[0], p[1]] as LatLng)];
  }
  const multiMatch = /MULTIPOLYGON\s*\(\s*\(([\s\S]+)\)\s*\)/.exec(s);
  if (multiMatch) {
    const inner = multiMatch[1];
    const rings: LatLng[][] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === "(") {
        if (depth === 0) start = i + 1;
        depth++;
      } else if (inner[i] === ")") {
        depth--;
        if (depth === 0) {
          const part = inner.slice(start, i).trim();
          const points = part.split(",").map((t) => t.trim().split(/\s+/).map(Number));
          if (points.length >= 3 && !points.some((p) => p.length < 2)) {
            rings.push(points.map((p) => [p[0], p[1]] as LatLng));
          }
        }
      }
    }
    return rings.length > 0 ? rings : null;
  }
  return null;
}
