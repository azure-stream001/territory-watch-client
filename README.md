# Territory Watch Japan — クライアント

**Territory Watch Japan** のフロントエンドアプリケーションです。  
日本国内の土地利用変化、森林伐採、太陽光発電開発などの監視を、衛星画像を利用して支援するための Next.js ベースの Web アプリケーションです。

バックエンドの `territory-watch-server` が提供する Django REST API と連携して動作します。

## 概要

本クライアントでは、主に以下の操作を行えます。

- 監視エリアの一覧表示・作成・編集
- 地図上での監視エリア選択
- 衛星画像を利用した検知ジョブの作成
- 検知結果の確認
- 検出された変化ポリゴンの地図表示
- 衛星シーンの一覧・詳細・プレビュー表示
- クイック検知
- Leaflet を利用した地理情報の可視化

## 技術スタック

- Next.js 14
- React 18
- TypeScript
- Leaflet / React Leaflet
- Tailwind CSS
- Mapbox Vector Tile
- ESLint

## 必要環境

- Node.js 18 以上を推奨
- npm
- 起動済みの `territory-watch-server`

## セットアップ

依存パッケージをインストールします。

```bash
npm install
```

環境変数ファイルを作成します。

```bash
cp .env.local.example .env.local
```

`.env.local` にバックエンド API の URL を設定します。

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 開発環境での起動

```bash
npm run dev
```

開発サーバーはポート `3333` で起動します。

```text
http://localhost:3333
```

## 本番ビルド

```bash
npm run build
npm start
```

## npm scripts

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバーをポート 3333 で起動 |
| `npm run build` | 本番用ビルドを作成 |
| `npm start` | 本番サーバーを起動 |
| `npm run lint` | ESLint によるコードチェック |

## 環境変数

| 変数 | 必須 | デフォルト | 内容 |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | いいえ | `http://localhost:8000` | Django REST API のベース URL |

`NEXT_PUBLIC_API_URL` の末尾には `/` を付けないことを推奨します。

## 主な画面

| パス | 内容 |
|---|---|
| `/` | ダッシュボード / ホーム |
| `/areas` | 監視エリア一覧 |
| `/areas/new` | 監視エリア作成 |
| `/areas/new-from-map` | 地図から監視エリア作成 |
| `/areas/[id]/edit` | 監視エリア編集 |
| `/detections` | 検知ジョブ・結果一覧 |
| `/detections/new` | 検知作成 |
| `/detections/[id]` | 検知結果詳細 |
| `/detect` | クイック検知 |
| `/scenes` | 衛星シーン一覧 |
| `/scenes/[id]` | 衛星シーン詳細 |

## API クライアント

API 通信は以下に集約されています。

```text
src/lib/api.ts
```

GET / POST / PATCH / DELETE に対応しています。

ブラウザの `localStorage` に `access_token` が保存されている場合、API リクエストには以下の認証ヘッダーが自動的に付与されます。

```text
Authorization: Bearer <access_token>
```

## ディレクトリ構成

```text
src/
├── app/
│   ├── areas/
│   ├── detect/
│   ├── detections/
│   ├── scenes/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AreaMapPicker.tsx
│   └── DetectionResultMap.tsx
├── data/
│   ├── adminAreas.ts
│   ├── prefectures.ts
│   ├── subareaPolygon.ts
│   └── subareas.ts
├── lib/
│   ├── api.ts
│   └── geo.ts
└── types/
    └── api.ts
```

## 地図・地理情報

地図表示には Leaflet を使用しています。

主なコンポーネント：

- `AreaMapPicker` — 監視エリアの選択・編集
- `DetectionResultMap` — 検知結果および変化ポリゴンの表示

バックエンドの地理情報タイル API から行政区域等のベクターデータを取得する構成になっています。

## 認証

バックエンドには JWT 認証用のエンドポイントがあります。

```text
/api/auth/token/
/api/auth/token/refresh/
```

フロントエンドの API クライアントは Bearer Token を利用したリクエストに対応しています。

## クライアントとサーバーの連携

ローカル開発では、通常以下の構成で起動します。

```text
Next.js クライアント
http://localhost:3333
        │
        │ HTTP / REST
        ▼
Django サーバー
http://localhost:8000
        │
        ├── PostgreSQL
        ├── Redis / Celery
        └── Copernicus / Sentinel-2
```

Django 側の CORS 設定で、以下のオリジンを許可してください。

```text
http://localhost:3333
```

## トラブルシューティング

### API に接続できない

Django サーバーがポート `8000` で起動していることを確認してください。

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

環境変数を変更した場合は Next.js を再起動してください。

### 地図が表示されない

Leaflet のアセットが正しく読み込まれていること、またバックエンドの地理情報 API にブラウザからアクセスできることを確認してください。

### 検知結果が表示されない

検知処理は Sentinel-2 衛星画像およびバックエンド側の処理環境に依存します。検知ジョブのステータスとサーバーログを確認してください。

## 関連プロジェクト

バックエンド：

`territory-watch-server`

Django REST API、衛星画像取得、画像処理、変化検知、結果生成を担当します。
