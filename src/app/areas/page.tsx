"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiDelete } from "@/lib/api";
import type { Area, PaginatedResponse } from "@/types/api";

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = () => {
    apiGet<PaginatedResponse<Area>>("/api/areas/")
      .then((data) => setAreas(data.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`「${name}」を削除してよろしいですか？`)) return;
    apiDelete(`/api/areas/${id}/`)
      .then(() => fetchAreas())
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (error) return <p className="text-red-600">エラー: {error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">検証対象地域</h2>
          <p className="text-sm text-gray-600 mt-1">
            森林伐採・違法ソーラー開発の検出対象エリアです。
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/areas/new-from-map"
            className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 whitespace-nowrap"
          >
            地図で作成
          </Link>
          <Link
            href="/areas/new"
            className="rounded border border-emerald-600 px-4 py-2 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
          >
            フォームで作成
          </Link>
        </div>
      </div>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
        {areas.length === 0 ? (
          <li className="px-4 py-6 text-gray-500">
            地域が登録されていません。「新規作成」から追加するか、バックエンドで{" "}
            <code className="bg-gray-100 px-1 rounded">python manage.py seed_ito_area</code>{" "}
            を実行してください。
          </li>
        ) : (
          areas.map((area) => (
            <li key={area.id} className="px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">{area.name}</h3>
                {area.description && (
                  <p className="text-sm text-gray-500 mt-1">{area.description}</p>
                )}
                {(area.center_lat != null && area.center_lon != null) && (
                  <p className="text-xs text-gray-400 mt-1">
                    座標: {area.center_lat}° N, {area.center_lon}° E
                  </p>
                )}
                {area.metadata && typeof area.metadata === "object" && "area_ha" in area.metadata && (
                  <p className="text-xs text-gray-400">
                    面積: 約{(area.metadata as { area_ha?: number }).area_ha} ha
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/areas/${area.id}/edit`}
                  className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  編集
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(area.id, area.name)}
                  className="rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
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
