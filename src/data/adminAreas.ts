/**
 * 行政区画（市区町村）境界データの取得
 * geolonia/japanese-admins（国土数値情報ベース）の GeoJSON を利用する。
 */

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/geolonia/japanese-admins/master/docs";
const GITHUB_API_BASE =
  "https://api.github.com/repos/geolonia/japanese-admins/contents/docs";

/** 市区町村１件（コードと名称、取得済み GeoJSON） */
export interface MunicipalityItem {
  /** 5桁 JIS 市区町村コード（例: 13101） */
  code: string;
  /** 名称（例: 東京都千代田区） */
  name: string;
  /** 取得済み GeoJSON（FeatureCollection） */
  geojson: GeoJSON.FeatureCollection;
}

/** GitHub API のファイル一覧アイテム */
interface GhContentItem {
  name: string;
  type: string;
  download_url: string | null;
}

/**
 * 指定都道府県の市区町村一覧を取得する（GitHub API で一覧 → 各 GeoJSON から名称を取得）
 * 取得した GeoJSON はキャッシュして返すので、「この範囲を採用」時に再取得不要。
 */
export async function fetchMunicipalitiesForPrefecture(
  prefCode: string
): Promise<MunicipalityItem[]> {
  const padded = prefCode.padStart(2, "0");
  const res = await fetch(`${GITHUB_API_BASE}/${padded}`);
  if (!res.ok) throw new Error("市区町村一覧の取得に失敗しました");
  const contents = (await res.json()) as GhContentItem[];
  const jsonFiles = contents.filter(
    (c) => c.type === "file" && c.name.endsWith(".json")
  );
  const items: MunicipalityItem[] = [];
  const urlBase = `${GITHUB_RAW_BASE}/${padded}`;
  for (const f of jsonFiles) {
    const code = f.name.replace(".json", "");
    try {
      const geoRes = await fetch(`${urlBase}/${f.name}`);
      if (!geoRes.ok) continue;
      const geojson = (await geoRes.json()) as GeoJSON.FeatureCollection;
      const name =
        geojson.features?.[0]?.properties?.name ?? code;
      items.push({ code, name: String(name), geojson });
    } catch {
      // 1件失敗しても他を続ける
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return items;
}
