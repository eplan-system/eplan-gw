import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://eplan-gw.vercel.app"),
  title: "Eプラン社内グループウェア",
  description: "Eプラン社内向けの予定共有グループウェア",
  openGraph: {
    title: "Eプラン社内グループウェア",
    description: "予定共有と確認のための社内グループウェア",
    siteName: "Eプラン社内グループウェア",
    locale: "ja_JP",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Eプラン社内グループウェア",
    description: "予定共有と確認のための社内グループウェア"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
