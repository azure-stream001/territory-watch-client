"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { DetectionJob } from "@/types/api";
import type { DetectionResult } from "@/types/api";

interface ScenePreview {
  image_url: string | null;
  bounds: [number, number, number, number] | null;
  tiles_url: string | null;
}

const DetectionResultMap = dynamic(
  () => import("@/components/DetectionResultMap").then((m) => m.default),
  { ssr: false }
);

const statusLabel: Record<string, string> = {
  pending: "待機",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
  cancelled: "キャンセル",
};

const DEFAULT_CENTER: [number, number] = [34.9656, 139.1147];
const DEFAULT_ZOOM = 12;

export default function DetectionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<DetectionJob | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [beforePreview, setBeforePreview] = useState<ScenePreview | null>(null);
  const [afterPreview, setAfterPreview] = useState<ScenePreview | null>(null);
  const [showFootprint, setShowFootprint] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialCenter: [number, number] = useMemo(() => {
    if (!job?.area_detail) return DEFAULT_CENTER;
    const lat = job.area_detail.center_lat ?? DEFAULT_CENTER[0];
    const lon = job.area_detail.center_lon ?? DEFAULT_CENTER[1];
    return [lat, lon];
  }, [job?.area_detail?.center_lat, job?.area_detail?.center_lon]);

  const [viewState, setViewState] = useState<{
    center: [number, number];
    zoom: number;
  }>({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });

  useEffect(() => {
    if (job) {
      setViewState((prev) => ({ ...prev, center: initialCenter }));
    }
  }, [job?.id, initialCenter[0], initialCenter[1]]);

  useEffect(() => {
    apiGet<DetectionJob>(`/api/detection-jobs/${id}/`)
      .then((j) => {
        setJob(j);
        return apiGet<DetectionResult | { result: null; job_status: string; job_error_message: string }>(
          `/api/detection-jobs/${id}/result/`
        ).then((r) => {
          if (r && typeof r === "object" && "result" in r && (r as { result: unknown }).result === null) {
            setResult(null);
          } else {
            setResult(r as DetectionResult);
          }
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const beforeId = result?.before_scene_detail?.id;
    const afterId = result?.after_scene_detail?.id;
    if (!beforeId) setBeforePreview(null);
    else
      apiGet<ScenePreview>(`/api/scenes/${beforeId}/preview/`)
        .then(setBeforePreview)
        .catch(() => setBeforePreview(null));
    if (!afterId) setAfterPreview(null);
    else
      apiGet<ScenePreview>(`/api/scenes/${afterId}/preview/`)
        .then(setAfterPreview)
        .catch(() => setAfterPreview(null));
  }, [result?.before_scene_detail?.id, result?.after_scene_detail?.id]);

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (error || !job) return <p className="text-red-600">エラー: {error || "Not found"}</p>;

  const areaName = job.area_detail?.name ?? `地域 #${job.area}`;
  const footprintWkt = job.area_detail?.footprint_wkt ?? null;
  const requestedBeforeYear = job.before_date_start?.slice(0, 4) ?? "";
  const requestedAfterYear = job.after_date_end?.slice(0, 4) ?? "";
  const usedBeforeYear = result?.before_scene_detail?.scene_date?.slice(0, 4) ?? "";
  const usedAfterYear = result?.after_scene_detail?.scene_date?.slice(0, 4) ?? "";
  const yearsDiffer =
    result &&
    (requestedBeforeYear !== usedBeforeYear || requestedAfterYear !== usedAfterYear);

  const beforeLabel = job.before_date_start
    ? `${requestedBeforeYear}年（開発前）`
    : "開発前";
  const afterLabel = job.after_date_end
    ? `${requestedAfterYear}年（開発後）`
    : "開発後";

  const handleViewChange = (center: [number, number], zoom: number) => {
    setViewState({ center, zoom });
  };

  return (
    <div className="space-y-6">
      <Link href="/detections" className="text-emerald-600 hover:underline text-sm">
        ← 検出一覧
      </Link>
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">
          違法ソーラー開発検出 — 検出結果
        </h2>
        <p className="text-gray-500 mt-1">
          {areaName} · {statusLabel[job.status] ?? job.status}
        </p>
      </div>

      {result ? (
        <>
          {/* 3 maps: Before, After, Result (synced viewport) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">対象地域・検出結果（地図連動）</h3>
              <button
                onClick={() => setShowFootprint((v) => !v)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  showFootprint
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-sm border ${
                    showFootprint ? "border-emerald-500 bg-emerald-500" : "border-gray-400 bg-transparent"
                  }`}
                />
                {showFootprint ? "ポリゴン非表示" : "ポリゴン表示"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              3つの地図は連動しています。ズーム・ドラッグすると同じ範囲で動きます。右端は処理済み衛星画像に伐採候補を赤枠で表示しています。
            </p>
            {yearsDiffer && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                依頼は {requestedBeforeYear}年 vs {requestedAfterYear}年 でしたが、該当期間にシーンがなかったため {usedBeforeYear}年 vs {usedAfterYear}年 で比較しています。厳密に依頼年で比較する場合は、検出期間をその年に合わせて再実行してください。
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600 mb-2">{beforeLabel}</p>
                <DetectionResultMap
                  center={viewState.center}
                  zoom={viewState.zoom}
                  footprintWkt={footprintWkt}
                  imageUrl={beforePreview?.image_url ?? undefined}
                  imageBounds={beforePreview?.bounds ?? undefined}
                  tilesUrl={beforePreview?.tiles_url ?? undefined}
                  showFootprint={showFootprint}
                  onViewChange={handleViewChange}
                  skipFitBounds
                  className="aspect-[1/1] w-full rounded"
                />
                {result.before_scene_detail ? (
                  <p className="text-xs text-gray-500 mt-2">
                    シーン: {result.before_scene_detail.scene_date}
                    {" · "}
                    <Link
                      href={`/scenes/${result.before_scene_detail.id}`}
                      className="text-emerald-600 hover:underline"
                    >
                      シーン詳細 →
                    </Link>
                    {!beforePreview?.image_url && (
                      <span className="block text-amber-600 mt-1">
                        衛星プレビューを読み込めませんでした。シーン詳細で再生成を試せます。
                      </span>
                    )}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600 mb-2">{afterLabel}</p>
                <DetectionResultMap
                  center={viewState.center}
                  zoom={viewState.zoom}
                  footprintWkt={footprintWkt}
                  imageUrl={afterPreview?.image_url ?? undefined}
                  imageBounds={afterPreview?.bounds ?? undefined}
                  tilesUrl={afterPreview?.tiles_url ?? undefined}
                  showFootprint={showFootprint}
                  onViewChange={handleViewChange}
                  skipFitBounds
                  className="aspect-[1/1] w-full rounded"
                />
                {result.after_scene_detail ? (
                  <p className="text-xs text-gray-500 mt-2">
                    シーン: {result.after_scene_detail.scene_date}
                    {" · "}
                    <Link
                      href={`/scenes/${result.after_scene_detail.id}`}
                      className="text-emerald-600 hover:underline"
                    >
                      シーン詳細 →
                    </Link>
                    {!afterPreview?.image_url && (
                      <span className="block text-amber-600 mt-1">
                        衛星プレビューを読み込めませんでした。シーン詳細で再生成を試せます。
                      </span>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-600 mb-2">検出結果（処理済み衛星＋赤枠）</p>
              <DetectionResultMap
                center={viewState.center}
                zoom={viewState.zoom}
                footprintWkt={footprintWkt}
                geojson={result.deforestation_geojson ?? null}
                imageUrl={result.result_map_image_url ?? null}
                imageBounds={result.result_map_bounds ?? null}
                showFootprint={showFootprint}
                onViewChange={handleViewChange}
                skipFitBounds
                className="aspect-video w-full rounded"
              />
              <p className="text-xs text-gray-500 mt-2">
                緑枠: 対象地域。赤枠: 検出された伐採候補。
                {result.result_map_image_url
                  ? " 背景は After シーンの処理済み衛星画像です。"
                  : ""}
              </p>
            </div>
          </section>

          {/* 仕様書: 検出統計 */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">検出統計</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">検出された伐採面積</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {result.metrics?.detected_area_ha != null
                    ? `${result.metrics.detected_area_ha} ha`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">違法分割の可能性</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {result.violations && result.violations.length > 0
                    ? "高"
                    : (result.metrics?.detected_area_ha ?? 0) > 0
                      ? "要確認"
                      : "—"}
                </p>
                {result.violations && result.violations.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {result.violations.length} 件の疑い
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">環境影響評価</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {(result.metrics?.detected_area_ha ?? 0) >= 50
                    ? "要実施規模"
                    : (result.metrics?.detected_area_ha ?? 0) > 0
                      ? "不要"
                      : "—"}
                </p>
              </div>
            </div>
            {result.violations && result.violations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">違反疑いの詳細</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                  {result.violations.map((v, i) => (
                    <li key={i}>{String(v.violation_type ?? JSON.stringify(v))}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-600">
            {job.status === "pending" || job.status === "running"
              ? "処理中です。しばらく待ってから再読み込みしてください。"
              : job.status === "completed" && job.error_message
                ? job.error_message
                : "結果はまだありません。"}
          </p>
          {job.status === "completed" && !result && (
            <p className="text-sm text-gray-500 mt-2">
              {job.error_message?.includes("検出期間")
                ? "新規検出画面で Before/After の日付を設定して再実行してください。"
                : job.error_message &&
                    (job.error_message.includes("取得失敗") ||
                      job.error_message.includes("No product") ||
                      job.error_message.includes("credentials"))
                  ? "先に「衛星シーン」で該当地域・日付のシーンを取得するか、日付を変更して再試行してください。"
                  : "シーンを取得しただけの場合は、再度「検出を開始」で同じ地域・期間を実行すると比較が行われます。"}
            </p>
          )}
          {job.status === "completed" && !result && job.error_message?.includes("取得失敗") && (
            <p className="text-sm mt-2">
              <Link href="/scenes" className="text-emerald-600 hover:underline">
                衛星シーンへ →
              </Link>
              {" · "}
              <span className="text-gray-500">認証設定: docs/SENTINEL_DATA.md</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
