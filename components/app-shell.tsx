"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { RuntimeBadge } from "@/components/runtime-badge";

const navItems = [
  { href: "/dashboard", label: "トップ", icon: "TOP" },
  { href: "/schedules", label: "スケジュール", icon: "SCH" },
  { href: "/board", label: "掲示板", icon: "BBS" },
  { href: "/admin", label: "表示設定", icon: "ADM" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <div className="main-area full-width">
        <header className="topbar compact-topbar">
          <div className="topbar-title brand-block">
            <Image src="/e-plan-logo.jpg" alt="e-PLAN" width={180} height={48} className="brand-logo" priority />
            <h2>社内グループウェア</h2>
          </div>

          <nav className="icon-nav header-nav" aria-label="主メニュー">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={pathname === item.href ? "icon-nav-item active" : "icon-nav-item"}>
                <span className="icon-badge">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="topbar-actions">
            <RuntimeBadge />
            <div className="session-chip">
              <span>{user?.department ?? "未設定"}</span>
              <strong>{user?.name ?? "未設定"}</strong>
            </div>
            <button className="ghost-button compact-logout" onClick={() => signOut()} aria-label="ログアウト">
              ログアウト
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
