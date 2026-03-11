"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import type { Area } from "@/types/api";

export default function NewAreaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLon, setCenterLon] = useState("");
  const [footprintWkt, setFootprintWkt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    apiPost<Area>("/api/areas/", {
      name: name.trim() || "新規地域",
      description: description.trim() || "",
      center_lat: centerLat ? Number(centerLat) : null,
      center_lon: centerLon ? Number(centerLon) : null,
      footprint_wkt: footprintWkt.trim() || "",
      metadata: {},
    })
      .then(() => router.push("/areas"))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/areas" className="text-emerald-600 hover:underline text-sm">
          ← 対象地域一覧
        </Link>
        <span className="text-gray-400">|</span>
        <Link href="/areas/new-from-map" className="text-emerald-600 hover:underline text-sm">
          地図で範囲を指定して作成
        </Link>
      </div>
      <h2 className="text-2xl font-semibold text-gray-800">対象地域を新規作成</h2>
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
              placeholder="34.9656"
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
              placeholder="139.1147"
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
            placeholder="POLYGON((139.10 34.94, ...))"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "作成中..." : "作成"}
        </button>
      </form>
    </div>
  );
}
