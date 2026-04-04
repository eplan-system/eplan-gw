"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { listFiles, listPosts } from "@/lib/data-service";
import { BoardPost, FileEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    async function load() {
      const [nextPosts, nextFiles] = await Promise.all([listPosts(), listFiles()]);
      setPosts(
        [...nextPosts]
          .sort((left, right) => {
            if (left.pinned !== right.pinned) return Number(right.pinned) - Number(left.pinned);
            return right.updatedAt.localeCompare(left.updatedAt);
          })
          .slice(0, 4)
      );
      setFiles([...nextFiles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 4));
    }

    void load();
  }, []);

  return (
    <div className="page-stack">
      <section className="surface-card portal-hero-card">
        <p className="eyebrow">portal home</p>
        <h3>{user?.name ? `${user.name} さんの社内ポータル` : "社内ポータル"}</h3>
        <p className="muted">入口を「掲示板」と「ファイル管理」に分けています。普段の運用は各画面からそのまま進められます。</p>
        <div className="portal-entry-grid">
          <Link href="/board" className="portal-entry-card">
            <span className="icon-badge">BBS</span>
            <strong>掲示板</strong>
            <p>スレッド一覧から内容確認。本人は自分の投稿を編集・削除できます。</p>
          </Link>
          <Link href="/files" className="portal-entry-card">
            <span className="icon-badge">FIL</span>
            <strong>ファイル管理</strong>
            <p>フォルダ別に最新版を管理。差し替え時も情報を残せます。</p>
          </Link>
        </div>
      </section>

      <section className="split-grid">
        <div className="surface-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">latest board</p>
              <h3>新着掲示板</h3>
            </div>
            <Link href="/board" className="small-button">
              一覧へ
            </Link>
          </div>
          <div className="list-stack">
            {posts.map((post) => (
              <div key={post.id} className="list-row">
                <strong>{post.title}</strong>
                <p>{post.body}</p>
                <span className="muted">{formatDateTime(post.updatedAt)}</span>
              </div>
            ))}
            {posts.length === 0 ? <p className="muted">まだ投稿がありません。</p> : null}
          </div>
        </div>

        <div className="surface-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">latest files</p>
              <h3>最近更新されたファイル</h3>
            </div>
            <Link href="/files" className="small-button">
              一覧へ
            </Link>
          </div>
          <div className="list-stack">
            {files.map((entry) => (
              <div key={entry.id} className="list-row">
                <strong>{entry.title}</strong>
                <p>{entry.summary}</p>
                <span className="muted">
                  {entry.folder} | {entry.version} | {formatDateTime(entry.updatedAt)}
                </span>
              </div>
            ))}
            {files.length === 0 ? <p className="muted">まだファイル登録がありません。</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
