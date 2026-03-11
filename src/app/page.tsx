import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* エグゼクティブサマリー（仕様書 1.） */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          1. エグゼクティブサマリー
        </h2>
        <p className="text-gray-600">
          本プロトタイプは、静岡県伊東市八幡野地区で2018年に発生した大規模森林伐採（メガソーラー開発）を、
          衛星画像解析により自動検出するPoCシステムです。
        </p>
      </section>

      {/* 検証ゴール（仕様書） */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          検証ゴール
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>2017年→2019年の森林被覆変化を<strong>95%以上の精度</strong>で検出</li>
          <li>違法な分割申請パターンの識別（50ha未満への分割など）</li>
          <li>リアルタイムに近い変化検出の実現可能性確認</li>
        </ol>
      </section>

      {/* 検証対象地域（仕様書） */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          検証対象地域（実例）
        </h2>
        <p className="font-medium text-gray-800">静岡県伊東市八幡野地区</p>
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          <li>座標: 34.9656° N, 139.1147° E</li>
          <li>面積: 約105ヘクタール</li>
          <li>特徴: 環境アセスメントを回避するため複数の事業者名で分割申請</li>
        </ul>
        <Link
          href="/areas"
          className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-medium"
        >
          対象地域一覧 →
        </Link>
      </section>

      {/* デモ・検出への導線 */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/areas"
          className="block p-5 rounded-lg border border-gray-200 bg-white hover:border-emerald-500 hover:shadow-md transition"
        >
          <h3 className="font-semibold text-emerald-800">対象地域</h3>
          <p className="text-sm text-gray-500 mt-1">
            伊東市八幡野など検証対象エリアの一覧
          </p>
        </Link>
        <Link
          href="/detections"
          className="block p-5 rounded-lg border border-gray-200 bg-white hover:border-emerald-500 hover:shadow-md transition"
        >
          <h3 className="font-semibold text-emerald-800">違法ソーラー開発検出</h3>
          <p className="text-sm text-gray-500 mt-1">
            Sentinel-2 実データによる変化検出の実行・結果確認
          </p>
        </Link>
      </section>
    </div>
  );
}
