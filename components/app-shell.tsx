"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { RuntimeBadge } from "@/components/runtime-badge";

const navItems = [
  { href: "/dashboard", label: "トップ", icon: "TOP" },
  { href: "/schedules", label: "予定", icon: "SCH" },
  { href: "/facilities", label: "設備", icon: "FAC" },
  { href: "/board", label: "掲示板", icon: "BBS" },
  { href: "/admin", label: "管理", icon: "ADM" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <div className="main-area full-width">
        <header className="topbar compact-topbar">
          <div className="topbar-title">
            <p className="eyebrow">office hub</p>
            <h2>社内グループウェア</h2>
          </div>
          <nav className="icon-nav">
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
              <strong>{user?.name ?? "未設定"}</strong>
              <span>{user?.department ?? "未設定"}</span>
            </div>
            <button className="ghost-button compact-logout" onClick={() => signOut()} aria-label="ログアウト">
              退出
            </button>
          </div>
        </header>
        <main>{children}</main>
        <nav className="mobile-bottom-nav" aria-label="スマホメニュー">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "mobile-bottom-item active" : "mobile-bottom-item"}>
              <span className="mobile-bottom-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mobile-bottom-spacer" />
      </div>
    </div>
  );
}
