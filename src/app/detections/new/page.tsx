"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import type { Area } from "@/types/api";
import type { PaginatedResponse } from "@/types/api";
import type { DetectionJob } from "@/types/api";

const NDVI_MIN = -0.5;
const NDVI_MAX = 0;
const NDVI_DEFAULT = -0.3;
const AREA_MIN = 0.1;
const AREA_MAX = 10;
const AREA_DEFAULT = 1;
const CLOUD_COVER_MIN = 0;
const CLOUD_COVER_MAX = 100;
const CLOUD_COVER_DEFAULT = 10;

/** Format date as YYYY-MM-DD for API */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today in local time as YYYY-MM-DD */
function todayISO(): string {
  const d = new Date();
  return toISODate(d);
}

export default function NewDetectionPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<string>("");
  const [ndviThreshold, setNdviThreshold] = useState(NDVI_DEFAULT);
  const [minAreaHa, setMinAreaHa] = useState(AREA_DEFAULT);
  const [maxCloudCoverage, setMaxCloudCoverage] = useState(CLOUD_COVER_DEFAULT);
  const [beforeDateStart, setBeforeDateStart] = useState("2017-01-01");
  const [afterDateEnd, setAfterDateEnd] = useState(() => todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PaginatedResponse<Area>>("/api/areas/")
      .then((data) => {
        setAreas(data.results);
        if (data.results.length > 0 && !areaId) setAreaId(String(data.results[0].id));
      })
      .catch((e) => setError(e.message));
  }, [areaId]);

  /** Send full-year ranges so backend compares the intended years (e.g. 2018 vs 2026). */
  const beforeYear = beforeDateStart.slice(0, 4);
  const afterYear = afterDateEnd.slice(0, 4);
  const beforeDateEnd = `${beforeYear}-12-31`;
  const afterDateStart = `${afterYear}-01-01`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    apiPost<DetectionJob>("/api/detection-jobs/", {
      area: Number(areaId),
      params: {
        ndvi_threshold: ndviThreshold,
        min_area_ha: minAreaHa,
        max_cloud_coverage: maxCloudCoverage,
      },
      before_date_start: beforeDateStart,
      before_date_end: beforeDateEnd,
      after_date_start: afterDateStart,
      after_date_end: afterDateEnd,
    })
      .then((job) => router.push(`/detections/${job.id}`))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/detections" className="text-emerald-600 hover:underline text-sm">
        ← 検出一覧
      </Link>
      <h2 className="text-2xl font-semibold text-gray-800">
        違法ソーラー開発検出 — 新規検出
      </h2>
      <p className="text-sm text-gray-600">
        Sentinel-2 実データで対象地域の Before/After を比較し、森林伐採候補を検出します。初回はシーン取得のため数分かかることがあります。
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">対象地域</label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            required
          >
            <option value="">選択してください</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <section aria-label="検出パラメータ">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">検出パラメータ</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                NDVI変化閾値: <strong>{ndviThreshold}</strong>
              </label>
              <input
                type="range"
                min={NDVI_MIN}
                max={NDVI_MAX}
                step={0.05}
                value={ndviThreshold}
                onChange={(e) => setNdviThreshold(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-emerald-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                {NDVI_MIN} ～ {NDVI_MAX}（森林減少でNDVIがこの値以上低下した領域を検出）
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                最小検出面積 (ha): <strong>{minAreaHa}</strong>
              </label>
              <input
                type="range"
                min={AREA_MIN}
                max={AREA_MAX}
                step={0.1}
                value={minAreaHa}
                onChange={(e) => setMinAreaHa(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-emerald-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                {AREA_MIN} ～ {AREA_MAX} ha
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                雲量上限: <strong>{maxCloudCoverage}%</strong>
              </label>
              <input
                type="range"
                min={CLOUD_COVER_MIN}
                max={CLOUD_COVER_MAX}
                step={5}
                value={maxCloudCoverage}
                onChange={(e) => setMaxCloudCoverage(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-emerald-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                選択日付に近いシーンのうち、雲量がこの値以下のものを検索します（小さいほど鮮明、大きいほど取得しやすい）。
              </p>
            </div>
          </div>
        </section>

        <section aria-label="検出期間">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">検出期間</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Before（開発前）開始日</label>
              <input
                type="date"
                value={beforeDateStart}
                onChange={(e) => setBeforeDateStart(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Before 年（開発前）のシーンを検索します</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">After（開発後）年（既定: 今年）</label>
              <input
                type="date"
                value={afterDateEnd}
                onChange={(e) => setAfterDateEnd(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">After 年（開発後）のシーンを検索します</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Before 年（1月～12月）と After 年（1月～12月）のシーンを比較します。該当年のデータが無い場合は自動でダウンロードを試みます。
          </p>
        </section>

        <div className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <strong>送信後</strong> バックエンドでジョブが同期的に実行されます。該当期間のシーンが未取得の場合は自動で取得してから比較します（初回は数分かかることがあります）。
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "送信中..." : "検出を開始"}
        </button>
      </form>
    </div>
  );
}
