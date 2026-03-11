"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { SatelliteScene } from "@/types/api";

const DetectionResultMap = dynamic(
  () => import("@/components/DetectionResultMap").then((m) => m.default),
  { ssr: false }
);

const statusLabel: Record<string, string> = {
  pending: "取得待ち",
  downloading: "取得中",
  downloaded: "取得済み",
  failed: "失敗",
};

interface ScenePreview {
  image_url: string | null;
  bounds: [number, number, number, number] | null;
  /** When set, use tile layer for correct imagery on zoom/pan */
  tiles_url: string | null;
}

export default function SceneDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [scene, setScene] = useState<SatelliteScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScenePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<SatelliteScene>(`/api/scenes/${id}/`)
      .then(setScene)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !scene || scene.status !== "downloaded") return;
    setPreviewLoading(true);
    apiGet<ScenePreview>(`/api/scenes/${id}/preview/`)
      .then(setPreview)
      .catch(() => setPreview({ image_url: null, bounds: null, tiles_url: null }))
      .finally(() => setPreviewLoading(false));
  }, [id, scene?.status]);

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (error || !scene) return <p className="text-red-600">エラー: {error || "Not found"}</p>;

  const areaName = scene.area_name ?? `地域 #${scene.area}`;
  const center: [number, number] = [
    scene.area_detail?.center_lat ?? 34.97,
    scene.area_detail?.center_lon ?? 139.11,
  ];
  const footprintWkt = scene.area_detail?.footprint_wkt ?? null;

  return (
    <div className="space-y-6">
      <Link href="/scenes" className="text-emerald-600 hover:underline text-sm">
        ← 衛星シーン一覧
      </Link>

      <div>
        <h2 className="text-2xl font-semibold text-gray-800">衛星シーン詳細</h2>
        <p className="text-gray-500 mt-1">
          {areaName} · {scene.scene_date}
        </p>
      </div>

      {/* ステータス・基本情報 */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-800 mb-4">基本情報</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-gray-500">ID</dt>
            <dd className="font-medium">{scene.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">対象地域</dt>
            <dd className="font-medium">{areaName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">シーン日付</dt>
            <dd className="font-medium">{scene.scene_date}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">ステータス</dt>
            <dd>
              <span
                className={`inline-block rounded px-2 py-0.5 text-sm ${
                  scene.status === "downloaded"
                    ? "bg-emerald-100 text-emerald-800"
                    : scene.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {statusLabel[scene.status] ?? scene.status}
              </span>
            </dd>
          </div>
          {scene.product_id && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-gray-500">Product ID</dt>
              <dd className="mt-0.5 font-mono text-sm text-gray-700 break-all">{scene.product_id}</dd>
            </div>
          )}
          {scene.file_path && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-gray-500">ファイルパス</dt>
              <dd className="mt-0.5 font-mono text-sm text-gray-600 break-all">{scene.file_path}</dd>
            </div>
          )}
          {scene.error_message && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-red-600">エラーメッセージ</dt>
              <dd className="mt-0.5 text-sm text-red-700">{scene.error_message}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-gray-500">作成日時</dt>
            <dd className="text-sm text-gray-600">
              {new Date(scene.created_at).toLocaleString("ja-JP")}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">更新日時</dt>
            <dd className="text-sm text-gray-600">
              {new Date(scene.updated_at).toLocaleString("ja-JP")}
            </dd>
          </div>
        </dl>
        {scene.metadata && Object.keys(scene.metadata).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <dt className="text-sm text-gray-500 mb-1">メタデータ</dt>
            <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-auto max-h-32">
              {JSON.stringify(scene.metadata, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* 対象地域の地図（取得済みの場合はシーン日付の実影像を表示） */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-medium text-gray-800 mb-2">対象地域（地図）</h3>
        <p className="text-xs text-gray-500 mb-2">
          {previewLoading
            ? "Sentinel-2 影像を読み込み中…"
            : preview?.image_url
              ? `${scene.scene_date} の Sentinel-2 実影像です。緑枠が footprint（WKT）です。`
              : scene.status === "downloaded"
                ? "影像の生成に失敗したか、ファイルを確認してください。地図は OSM で表示しています。"
                : "このシーンの対象地域の範囲です。緑枠が footprint（WKT）です。"}
        </p>
        <div className="h-[600px] w-full rounded overflow-hidden border border-gray-200">
          <DetectionResultMap
            key={preview ? `scene-${id}-preview` : `scene-${id}`}
            center={center}
            footprintWkt={footprintWkt}
            zoom={12}
            imageUrl={preview?.image_url ?? undefined}
            imageBounds={preview?.bounds ?? undefined}
            tilesUrl={preview?.tiles_url ?? undefined}
            className="h-full w-full"
          />
        </div>
      </section>
    </div>
  );
}
