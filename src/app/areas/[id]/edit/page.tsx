"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api";
import type { Area } from "@/types/api";
import type { AreaMapPickerResult } from "@/components/AreaMapPicker";

const AreaMapPicker = dynamic(
  () => import("@/components/AreaMapPicker").then((m) => m.AreaMapPicker),
  { ssr: false }
);

export default function EditAreaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [area, setArea] = useState<Area | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLon, setCenterLon] = useState("");
  const [footprintWkt, setFootprintWkt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<Area>(`/api/areas/${id}/`)
      .then((a) => {
        setArea(a);
        setName(a.name);
        setDescription(a.description ?? "");
        setCenterLat(a.center_lat != null ? String(a.center_lat) : "");
        setCenterLon(a.center_lon != null ? String(a.center_lon) : "");
        setFootprintWkt(a.footprint_wkt ?? "");
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const handleMapSelect = (r: AreaMapPickerResult) => {
    setFootprintWkt(r.footprintWkt);
    setCenterLat(String(r.centerLat));
    setCenterLon(String(r.centerLon));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setLoading(true);
    apiPatch<Area>(`/api/areas/${id}/`, {
      name: name.trim() || area?.name,
      description: description.trim() ?? "",
      center_lat: centerLat ? Number(centerLat) : null,
      center_lon: centerLon ? Number(centerLon) : null,
      footprint_wkt: footprintWkt.trim() ?? "",
    })
      .then(() => router.push("/areas"))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  if (error && !area) return <p className="text-red-600">エラー: {error}</p>;
  if (!area) return <p className="text-gray-500">読み込み中...</p>;

  const initialCenter: [number, number] = [
    area.center_lat ?? 34.9656,
    area.center_lon ?? 139.1147,
  ];

  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/areas" className="text-emerald-600 hover:underline text-sm">
        ← 対象地域一覧
      </Link>
      <h2 className="text-2xl font-semibold text-gray-800">対象地域を編集</h2>
      <p className="text-sm text-gray-600">
        地図でポリゴンを描くか、行政区画で範囲を選んで更新できます。確定すると中心・範囲がフォームに反映されます。
      </p>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-2">範囲の編集（地図）</h3>
        <AreaMapPicker
          key={id}
          onSelect={handleMapSelect}
          initialCenter={initialCenter}
          initialZoom={12}
          initialFootprintWkt={area.footprint_wkt || null}
        />
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">地域名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">中心緯度</label>
            <input
              type="number"
              step="any"
              value={centerLat}
              onChange={(e) => setCenterLat(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">中心経度</label>
            <input
              type="number"
              step="any"
              value={centerLon}
              onChange={(e) => setCenterLon(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">範囲（WKT POLYGON）</label>
          <textarea
            value={footprintWkt}
            onChange={(e) => setFootprintWkt(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
            rows={2}
          />
          <p className="mt-1 text-xs text-gray-500">
            範囲を変更して保存すると、面積（ha）が自動で再計算されます。
          </p>
          {area.metadata && typeof area.metadata === "object" && "area_ha" in area.metadata && (
            <p className="mt-1 text-sm text-gray-600">
              現在の面積: 約{(area.metadata as { area_ha?: number }).area_ha} ha
            </p>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
