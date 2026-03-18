"use client";

/**
 * 統合型クイック検出ページ
 *
 * 1. 地図でエリアを選択（AreaMapPicker）
 * 2. 比較前 / 比較後 の日付・パラメータを設定
 * 3. 「検出」ボタンで POST /api/quick-detect/
 * 4. 結果を 3パネル静止画像（Deforestation-Detection と同じ形式）で表示
 *    + 植生変化の統計カードを表示
 *
 * Deforestation-Detection プロジェクトの出力形式を参考に、
 * Sentinel-2 実データ（NDVI）を用いた変化検出を行う。
 */

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import type { AreaMapPickerResult } from "@/components/AreaMapPicker";

const AreaMapPicker = dynamic(
  () => import("@/components/AreaMapPicker").then((mod) => mod.AreaMapPicker),
  { ssr: false, loading: () => <div className="h-full bg-gray-100 animate-pulse rounded-lg" /> }
);

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────

interface DetectResult {
  status: "success" | "failed" | "error";
  image_url?: string;
  before_scene_date?: string;
  after_scene_date?: string;
  percent_deforested?: number;
  percent_regrowth?: number;
  vegetation_lost_ha?: number;
  vegetation_gained_ha?: number;
  before_vegetation_ha?: number;
  message?: string;
  error?: string;
  area_id?: number;
}

// ── Helper: stat card ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string;
  value: string;
  sub?: string;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: "rgb(50,185,80)",   label: "植生維持（緑）" },
    { color: "rgb(220,50,50)",   label: "植生消失 / 伐採（赤）" },
    { color: "rgb(65,168,255)",  label: "植生増加（青）" },
    { color: "rgb(220,220,220)", label: "植生なし（灰）", border: true },
  ] as const;
  return (
    <div className="flex flex-wrap gap-4 text-sm text-gray-700">
      {items.map(({ color, label, border }: { color: string; label: string; border?: boolean }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className={`inline-block w-4 h-4 rounded flex-shrink-0 ${border ? "border border-gray-400" : ""}`}
            style={{ background: color }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function QuickDetectPage() {
  // Area selection
  const [selected, setSelected] = useState<AreaMapPickerResult | null>(null);

  // Params
  const today = new Date();
  const yyyyMmDd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const defaultAfter = yyyyMmDd(today);
  const defaultBefore = (() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 6);
    return yyyyMmDd(d);
  })();

  const [beforeDate,   setBeforeDate]   = useState(defaultBefore);
  const [afterDate,    setAfterDate]    = useState(defaultAfter);
  const [vegThreshold,  setVegThreshold]  = useState(0.3);
  const [maxCloud,      setMaxCloud]      = useState(30);

  // State
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<DetectResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleSelect = useCallback((r: AreaMapPickerResult) => {
    setSelected(r);
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!selected) {
      setError("まず地図でエリアを選択してください。");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const token =
        typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(`${API_BASE}/api/quick-detect/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          footprint_wkt:      selected.footprintWkt,
          center_lat:         selected.centerLat,
          center_lon:         selected.centerLon,
          before_date:        beforeDate,
          after_date:         afterDate,
          veg_threshold:      vegThreshold,
          max_cloud_coverage: maxCloud,
        }),
      });

      const data: DetectResult = await resp.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "検出に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // ── image URL (prepend API_BASE when needed) ─────────────────────────────────
  const imgSrc = result?.image_url
    ? result.image_url.startsWith("http")
      ? result.image_url
      : `${API_BASE}${result.image_url}`
    : null;

  const isSuccess = result?.status === "success";
  const isFailure = result && !isSuccess;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">

      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">
          🌍 森林変化クイック検出
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          地図でエリアを描画 → 比較日付を設定 → 検出ボタンで
          Sentinel-2 実データによる 比較前 / 比較後 / 変化マップを生成します。
        </p>
      </div>

      {/* ── Step 1 + 2: Map & Settings ── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Map (3/5 width on large screens) */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700">
            ① 地図でエリアを選択（ポリゴン描画）
          </p>
          {selected ? (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ 選択済み — 重心 北緯 {selected.centerLat.toFixed(4)}°, 東経{" "}
              {selected.centerLon.toFixed(4)}°
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              地図をクリックしてポリゴンを描画し、ダブルクリックで確定します。
            </p>
          )}
          <div
            className="flex-1 rounded-xl border border-gray-300 overflow-hidden shadow-sm"
            style={{ minHeight: "420px" }}
          >
            <AreaMapPicker
              onSelect={handleSelect}
              initialCenter={[35.0, 138.5]}
              initialZoom={8}
            />
          </div>
        </div>

        {/* Settings (2/5 width) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <p className="text-sm font-medium text-gray-700">
            ② 検出パラメータを設定
          </p>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5 shadow-sm">

            {/* Year range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  比較前 日付（開発前）
                </label>
                <input
                  type="date"
                  value={beforeDate}
                  onChange={(e) => setBeforeDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  比較後 日付（開発後）
                </label>
                <input
                  type="date"
                  value={afterDate}
                  onChange={(e) => setAfterDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>
            </div>

            {/* Vegetation NDVI threshold */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                植生判定 NDVI 閾値: <strong>{vegThreshold}</strong>
              </label>
              <input
                type="range"
                min={0.1}
                max={0.6}
                step={0.05}
                value={vegThreshold}
                onChange={(e) => setVegThreshold(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                NDVI がこの値を超える画素を「植生あり」と判定します
              </p>
            </div>

            {/* Cloud cover */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                雲量上限: <strong>{maxCloud}%</strong>
              </label>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={maxCloud}
                onChange={(e) => setMaxCloud(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                雲量がこの値以下のシーンを優先して取得します
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !selected}
              className="w-full rounded-xl bg-emerald-600 py-3 text-white font-semibold text-sm
                         hover:bg-emerald-700 active:scale-[0.98] transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "解析中..." : "森林変化を検出"}
            </button>

            {loading && (
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                </div>
                <p className="text-xs text-gray-500">
                  Sentinel-2 シーンを取得・解析しています。初回は数分かかることがあります。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Step 3: Result ── */}

      {/* Error / failure message */}
      {isFailure && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>検出失敗:</strong> {result.message || result.error || "不明なエラー"}
        </div>
      )}

      {/* Success result */}
      {isSuccess && (
        <div className="space-y-5">

          {/* Title row */}
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">📊 検出結果</h3>
            {result.before_scene_date && result.after_scene_date && (
              <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                比較前: {result.before_scene_date} → 比較後: {result.after_scene_date}
              </span>
            )}
          </div>

          {/* 3-panel comparison image */}
          {imgSrc && (
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md">
              {/* Panel headers (match backend label positions) */}
              <img
                src={imgSrc}
                alt="比較前・比較後・変化マップ"
                className="w-full block"
              />
            </div>
          )}

          {/* Legend */}
          <Legend />

          {/* Stats cards */}
          {result.percent_deforested !== undefined && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="植生消失率"
                value={`${result.percent_deforested}%`}
                sub="比較前の植生に対して"
                colorClass="bg-red-50 border-red-200 text-red-700"
              />
              <StatCard
                label="植生消失面積"
                value={`${result.vegetation_lost_ha} ha`}
                colorClass="bg-red-50 border-red-200 text-red-700"
              />
              <StatCard
                label="植生増加率"
                value={`${result.percent_regrowth}%`}
                sub="表示エリア全体に対して"
                colorClass="bg-blue-50 border-blue-200 text-blue-700"
              />
              <StatCard
                label="比較前の植生面積"
                value={`${result.before_vegetation_ha} ha`}
                colorClass="bg-emerald-50 border-emerald-200 text-emerald-700"
              />
            </div>
          )}

          {/* 注記: EIA 等の固定閾値警告は選択範囲に依存するため表示しない */}
        </div>
      )}
    </div>
  );
}
