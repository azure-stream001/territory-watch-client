"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type {
  Area,
  SatelliteScene,
  PaginatedResponse,
} from "@/types/api";

const statusLabel: Record<string, string> = {
  pending: "取得待ち",
  downloading: "取得中",
  downloaded: "取得済み",
  failed: "失敗",
};

export default function ScenesPage() {
  const [scenes, setScenes] = useState<SatelliteScene[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchAreaId, setFetchAreaId] = useState("");
  const [fetchDate, setFetchDate] = useState("");
  const [maxCloudCoverage, setMaxCloudCoverage] = useState(10);
  const [fetching, setFetching] = useState(false);

  const loadScenes = () => {
    apiGet<PaginatedResponse<SatelliteScene>>("/api/scenes/")
      .then((data) => setScenes(data.results))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    Promise.all([
      apiGet<PaginatedResponse<SatelliteScene>>("/api/scenes/"),
      apiGet<PaginatedResponse<Area>>("/api/areas/"),
    ])
      .then(([s, a]) => {
        setScenes(s.results);
        setAreas(a.results);
        if (a.results.length > 0 && !fetchAreaId)
          setFetchAreaId(String(a.results[0].id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleFetch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fetchAreaId || !fetchDate) {
      setError("地域と日付を選択してください。");
      return;
    }
    setError(null);
    setFetching(true);
    apiPost<SatelliteScene>("/api/scenes/", {
      area: Number(fetchAreaId),
      scene_date: fetchDate,
      max_cloud_coverage: maxCloudCoverage,
    })
      .then(() => {
        loadScenes();
        setFetchDate("");
      })
      .catch((e) => {
        setError(e.message);
        loadScenes();
      })
      .finally(() => setFetching(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm("このシーンを削除してよろしいですか？")) return;
    apiDelete(`/api/scenes/${id}/`)
      .then(() => loadScenes())
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-gray-500">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">衛星シーン</h2>
      <p className="text-sm text-gray-600">
        Sentinel-2 L2A のシーンを地域・日付で取得し、比較用に保存します。Before/After 両方揃うと検出ジョブで比較が実行されます。
      </p>

      <form
        onSubmit={handleFetch}
        className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">地域</label>
          <select
            value={fetchAreaId}
            onChange={(e) => setFetchAreaId(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">選択</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">シーン日付</label>
          <input
            type="date"
            value={fetchDate}
            onChange={(e) => setFetchDate(e.target.value)}
            className="mt-1 block rounded border border-gray-300 px-3 py-2"
            required
          />
          <p className="mt-0.5 text-xs text-gray-500">
            指定日またはそれより前で、取得可能な最も近い日のシーンを取得します（最大90日前まで検索）。
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">雲量（%以下）</label>
          <input
            type="number"
            min={0}
            max={100}
            value={maxCloudCoverage}
            onChange={(e) => setMaxCloudCoverage(Number(e.target.value) || 0)}
            className="mt-1 block w-24 rounded border border-gray-300 px-3 py-2"
          />
          <p className="mt-0.5 text-xs text-gray-500">
            この雲量以下のシーンのみ対象。指定日に近い日で条件を満たすものを取得します。
          </p>
        </div>
        <button
          type="submit"
          disabled={fetching}
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {fetching ? "取得中..." : "シーンを取得"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
        {scenes.length === 0 ? (
          <li className="px-4 py-6 text-gray-500">
            シーンがありません。上で地域とシーン日付を選んで「シーンを取得」を実行してください。Copernicus Data Space の認証（.env の CDSE_CLIENT_ID / CDSE_CLIENT_SECRET）が必要です。
          </li>
        ) : (
          scenes.map((scene) => (
            <li key={scene.id} className="px-4 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/scenes/${scene.id}`}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {scene.area_name ?? `地域 #${scene.area}`}
                </Link>
                <span className="text-gray-500 ml-2">{scene.scene_date}</span>
                <span
                  className={`ml-2 rounded px-2 py-0.5 text-sm ${
                    scene.status === "downloaded"
                      ? "bg-emerald-100 text-emerald-800"
                      : scene.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusLabel[scene.status] ?? scene.status}
                </span>
                {scene.status === "downloaded" && scene.product_id && (
                  <p className="text-xs text-gray-500 mt-1 truncate" title={scene.product_id}>
                    {scene.product_id}
                  </p>
                )}
                {scene.error_message && (
                  <p className="text-xs text-red-600 mt-1">{scene.error_message}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/scenes/${scene.id}`}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  詳細
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(scene.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  削除
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
