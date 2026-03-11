"use client";

/**
 * 地図から範囲を指定して対象地域を新規作成するページ
 * ポリゴン描画または都道府県選択で footprint_wkt と中心座標を取得し、API で登録する
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import type { Area } from "@/types/api";
import type { AreaMapPickerResult } from "@/components/AreaMapPicker";

/** Leaflet は window 依存のため SSR を無効にして読み込む */
const AreaMapPicker = dynamic(
  () =>
    import("@/components/AreaMapPicker").then((m) => m.AreaMapPicker),
  { ssr: false }
);

export default function NewAreaFromMapPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AreaMapPickerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (r: AreaMapPickerResult) => {
    setResult(r);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) {
      setError("地図で範囲を指定してください。");
      return;
    }
    setError(null);
    setLoading(true);
    apiPost<Area>("/api/areas/", {
      name: name.trim() || "地図から作成した地域",
      description: description.trim() || "",
      center_lat: result.centerLat,
      center_lon: result.centerLon,
      footprint_wkt: result.footprintWkt,
      metadata: {},
    })
      .then(() => router.push("/areas"))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/areas" className="text-emerald-600 hover:underline text-sm">
        ← 対象地域一覧
      </Link>
      <h2 className="text-2xl font-semibold text-gray-800">
        地図から対象地域を追加
      </h2>
      <p className="text-sm text-gray-600">
        地図上でポリゴンを描くか、都道府県を選んで範囲を指定し、地域名と説明を入力して作成します。
      </p>

      <AreaMapPicker onSelect={handleSelect} />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            地域名 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            placeholder={result ? "例: 東京都 〇〇区" : "範囲を指定後に入力"}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            rows={2}
            placeholder="任意"
          />
        </div>
        {result && (
          <p className="text-sm text-gray-500">
            範囲を指定済み（中心: {result.centerLat.toFixed(4)}°
            N, {result.centerLon.toFixed(4)}° E）。登録時に面積（ha）を自動計算して保存します。
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !result}
            className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "作成中..." : "地域を登録"}
          </button>
          <Link
            href="/areas/new"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            フォームで入力して作成
          </Link>
        </div>
      </form>
    </div>
  );
}
