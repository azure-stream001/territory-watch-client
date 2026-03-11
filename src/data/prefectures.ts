/**
 * 都道府県マスタデータ（47都道府県）
 * 地域選択地図で「都道府県で選択」する際のドロップダウンと中心座標・境界GeoJSON取得に使用する。
 */

export interface Prefecture {
  /** 都道府県コード（01〜47、JIS X 0401） */
  code: string;
  /** 都道府県名（日本語） */
  name: string;
  /** 中心緯度（概算） */
  centerLat: number;
  /** 中心経度（概算） */
  centerLon: number;
}

/** 都道府県境界GeoJSONの取得URL（amay077/JapanPrefGeoJson） */
const PREF_GEOJSON_BASE =
  "https://raw.githubusercontent.com/amay077/JapanPrefGeoJson/master/prefs";

/**
 * 都道府県コードから境界GeoJSONのURLを返す
 */
export function getPrefectureGeoJsonUrl(code: string): string {
  const padded = code.padStart(2, "0");
  return `${PREF_GEOJSON_BASE}/${padded}.geojson`;
}

/** 47都道府県のリスト（コード・名称・中心座標） */
export const PREFECTURES: Prefecture[] = [
  { code: "01", name: "北海道", centerLat: 43.0642, centerLon: 141.3469 },
  { code: "02", name: "青森県", centerLat: 40.8246, centerLon: 140.7406 },
  { code: "03", name: "岩手県", centerLat: 39.7036, centerLon: 141.1528 },
  { code: "04", name: "宮城県", centerLat: 38.2688, centerLon: 140.8721 },
  { code: "05", name: "秋田県", centerLat: 39.7186, centerLon: 140.1024 },
  { code: "06", name: "山形県", centerLat: 38.2554, centerLon: 140.3396 },
  { code: "07", name: "福島県", centerLat: 37.7503, centerLon: 140.4676 },
  { code: "08", name: "茨城県", centerLat: 36.3418, centerLon: 140.4468 },
  { code: "09", name: "栃木県", centerLat: 36.5657, centerLon: 139.8836 },
  { code: "10", name: "群馬県", centerLat: 36.3911, centerLon: 139.0608 },
  { code: "11", name: "埼玉県", centerLat: 35.8574, centerLon: 139.6489 },
  { code: "12", name: "千葉県", centerLat: 35.6052, centerLon: 140.1233 },
  { code: "13", name: "東京都", centerLat: 35.6896, centerLon: 139.6917 },
  { code: "14", name: "神奈川県", centerLat: 35.4478, centerLon: 139.6423 },
  { code: "15", name: "新潟県", centerLat: 37.9024, centerLon: 139.0232 },
  { code: "16", name: "富山県", centerLat: 36.6953, centerLon: 137.2113 },
  { code: "17", name: "石川県", centerLat: 36.5947, centerLon: 136.6256 },
  { code: "18", name: "福井県", centerLat: 36.0652, centerLon: 136.2216 },
  { code: "19", name: "山梨県", centerLat: 35.6642, centerLon: 138.5685 },
  { code: "20", name: "長野県", centerLat: 36.6513, centerLon: 138.1810 },
  { code: "21", name: "岐阜県", centerLat: 35.3912, centerLon: 136.7223 },
  { code: "22", name: "静岡県", centerLat: 34.9756, centerLon: 138.3828 },
  { code: "23", name: "愛知県", centerLat: 35.1802, centerLon: 136.9066 },
  { code: "24", name: "三重県", centerLat: 34.7303, centerLon: 136.5086 },
  { code: "25", name: "滋賀県", centerLat: 35.0045, centerLon: 135.8686 },
  { code: "26", name: "京都府", centerLat: 35.0213, centerLon: 135.7556 },
  { code: "27", name: "大阪府", centerLat: 34.6863, centerLon: 135.5197 },
  { code: "28", name: "兵庫県", centerLat: 34.6913, centerLon: 135.1830 },
  { code: "29", name: "奈良県", centerLat: 34.6851, centerLon: 135.8327 },
  { code: "30", name: "和歌山県", centerLat: 34.2261, centerLon: 135.1675 },
  { code: "31", name: "鳥取県", centerLat: 35.5039, centerLon: 134.2377 },
  { code: "32", name: "島根県", centerLat: 35.4723, centerLon: 133.0505 },
  { code: "33", name: "岡山県", centerLat: 34.6618, centerLon: 133.9344 },
  { code: "34", name: "広島県", centerLat: 34.3966, centerLon: 132.4596 },
  { code: "35", name: "山口県", centerLat: 34.1861, centerLon: 131.4705 },
  { code: "36", name: "徳島県", centerLat: 34.0658, centerLon: 134.5593 },
  { code: "37", name: "香川県", centerLat: 34.3401, centerLon: 134.0433 },
  { code: "38", name: "愛媛県", centerLat: 33.8416, centerLon: 132.7654 },
  { code: "39", name: "高知県", centerLat: 33.5597, centerLon: 133.5311 },
  { code: "40", name: "福岡県", centerLat: 33.6066, centerLon: 130.4183 },
  { code: "41", name: "佐賀県", centerLat: 33.2494, centerLon: 130.2988 },
  { code: "42", name: "長崎県", centerLat: 32.7448, centerLon: 129.8738 },
  { code: "43", name: "熊本県", centerLat: 32.7898, centerLon: 130.7417 },
  { code: "44", name: "大分県", centerLat: 33.2382, centerLon: 131.6126 },
  { code: "45", name: "宮崎県", centerLat: 31.9111, centerLon: 131.4239 },
  { code: "46", name: "鹿児島県", centerLat: 31.5969, centerLon: 130.5571 },
  { code: "47", name: "沖縄県", centerLat: 26.2124, centerLon: 127.6792 },
];
