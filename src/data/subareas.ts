/**
 * 町丁目（小地域）データの取得
 * geolonia/japanese-addresses API を利用（代表点の緯度経度）。
 * 境界ポリゴンは提供されないため、代表点を中心とした範囲で利用する。
 */

const JAPANESE_ADDRESSES_BASE =
  "https://geolonia.github.io/japanese-addresses/api/ja";

export interface SubareaItem {
  /** 町丁目名（大字・町丁目） */
  town: string;
  /** 小字（空のことが多い） */
  koaza: string;
  /** 代表点 緯度 */
  lat: number;
  /** 代表点 経度 */
  lng: number;
}

/**
 * 市区町村名から API 用の市区町村名を取得（都道府県名を除く）
 * 例: "東京都千代田区" + "東京都" → "千代田区"
 */
export function municipalityNameForApi(
  fullName: string,
  prefectureName: string
): string {
  const trimmed = fullName.trim();
  if (prefectureName && trimmed.startsWith(prefectureName)) {
    return trimmed.slice(prefectureName.length).trim() || trimmed;
  }
  return trimmed;
}

/**
 * 指定都道府県・市区町村の町丁目一覧を取得する
 */
export async function fetchSubareasForMunicipality(
  prefectureName: string,
  municipalityNameForApi: string
): Promise<SubareaItem[]> {
  const url = `${JAPANESE_ADDRESSES_BASE}/${encodeURIComponent(prefectureName)}/${encodeURIComponent(municipalityNameForApi)}.json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as SubareaItem[];
  if (!Array.isArray(data)) return [];
  return data.filter((s) => s.town && typeof s.lat === "number" && typeof s.lng === "number");
}
