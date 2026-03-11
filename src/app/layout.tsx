import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Territory Watch Japan",
  description: "静岡県伊東市八幡野地区の森林伐採を衛星画像解析で検出するPoC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-gray-50">
        <header className="bg-emerald-800 text-white shadow">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">
                  <Link href="/" className="hover:underline">
                    Territory Watch Japan
                  </Link>
                </h1>
              </div>
              <nav className="flex gap-4 text-sm">
                <Link href="/" className="text-emerald-100 hover:text-white">
                  ホーム
                </Link>
                <Link href="/areas" className="text-emerald-100 hover:text-white">
                  対象地域
                </Link>
                <Link href="/detections" className="text-emerald-100 hover:text-white">
                  検出
                </Link>
                <Link href="/scenes" className="text-emerald-100 hover:text-white">
                  衛星シーン
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
