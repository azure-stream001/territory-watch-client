"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiDelete } from "@/lib/api";
import type { DetectionJob, PaginatedResponse } from "@/types/api";

export default function DetectionsPage() {
  const [jobs, setJobs] = useState<DetectionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = () => {
    apiGet<PaginatedResponse<DetectionJob>>("/api/detection-jobs/")
      .then((data) => setJobs(data.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = (id: number) => {
    if (!confirm("この検出ジョブを削除してよろしいですか？")) return;
    apiDelete(`/api/detection-jobs/${id}/`)
      .then(() => fetchJobs())
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (error) return <p className="text-red-600">エラー: {error}</p>;

  const statusLabel: Record<string, string> = {
    pending: "待機",
    running: "実行中",
    completed: "完了",
    failed: "失敗",
    cancelled: "キャンセル",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            違法ソーラー開発検出
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            森林伐採の変化検出ジョブ一覧。新規検出で対象地域・期間・パラメータを設定し、Sentinel-2 実データで実行できます。
          </p>
        </div>
        <Link
          href="/detections/new"
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 whitespace-nowrap"
        >
          検出を開始
        </Link>
      </div>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
        {jobs.length === 0 ? (
          <li className="px-4 py-6 text-gray-500">
            ジョブがありません。「検出を開始」から検出パラメータを設定して実行してください。
          </li>
        ) : (
          jobs.map((job) => (
            <li key={job.id} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">ジョブ #{job.id}</span>
                  {job.area_detail && (
                    <span className="ml-2 text-gray-500">
                      {job.area_detail.name}
                    </span>
                  )}
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-sm ${
                    job.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : job.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusLabel[job.status] ?? job.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(job.created_at).toLocaleString("ja-JP")}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {job.status === "completed" && (
                  <Link
                    href={`/detections/${job.id}`}
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    検出結果を見る →
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(job.id)}
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
