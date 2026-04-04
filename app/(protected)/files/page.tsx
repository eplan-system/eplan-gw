"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { deleteFileEntry, listFiles, listUsers, saveFileEntry } from "@/lib/data-service";
import { AppUser, FileEntry } from "@/lib/types";
import { formatDateTime, userNameById } from "@/lib/utils";

type FileFormState = {
  id?: string;
  title: string;
  summary: string;
  folder: string;
  fileName: string;
  fileUrl: string;
  version: string;
  tags: string;
};

const initialFileForm: FileFormState = {
  title: "",
  summary: "",
  folder: "",
  fileName: "",
  fileUrl: "",
  version: "",
  tags: ""
};

export default function FilesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [fileForm, setFileForm] = useState<FileFormState>(initialFileForm);

  async function refresh() {
    const [nextUsers, nextEntries] = await Promise.all([listUsers(), listFiles()]);
    const sortedEntries = [...nextEntries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    setUsers(nextUsers);
    setEntries(sortedEntries);
    setSelectedEntryId((current) => current || sortedEntries[0]?.id || "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  const folders = useMemo(() => [...new Set(entries.map((entry) => entry.folder))].sort((left, right) => left.localeCompare(right, "ja")), [entries]);
  const visibleEntries = useMemo(
    () => (selectedFolder === "all" ? entries : entries.filter((entry) => entry.folder === selectedFolder)),
    [entries, selectedFolder]
  );
  const selectedEntry = visibleEntries.find((entry) => entry.id === selectedEntryId) ?? visibleEntries[0] ?? null;

  useEffect(() => {
    if (!visibleEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(visibleEntries[0]?.id ?? "");
    }
  }, [selectedEntryId, visibleEntries]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    await saveFileEntry({
      id: fileForm.id,
      title: fileForm.title.trim(),
      summary: fileForm.summary.trim(),
      folder: fileForm.folder.trim(),
      fileName: fileForm.fileName.trim(),
      fileUrl: fileForm.fileUrl.trim(),
      version: fileForm.version.trim(),
      tags: fileForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      updatedByUserId: user.id
    });

    setFileForm(initialFileForm);
    await refresh();
  }

  function startEdit(entry: FileEntry) {
    setFileForm({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      folder: entry.folder,
      fileName: entry.fileName,
      fileUrl: entry.fileUrl,
      version: entry.version,
      tags: entry.tags.join(", ")
    });
    setSelectedEntryId(entry.id);
  }

  async function handleDelete(entry: FileEntry) {
    if (!user) return;
    if (user.role !== "admin") return;
    if (!window.confirm("このファイル情報を削除しますか？")) return;

    await deleteFileEntry(entry.id);
    setFileForm(initialFileForm);
    if (selectedEntryId === entry.id) {
      setSelectedEntryId("");
    }
    await refresh();
  }

  return (
    <div className="page-stack">
      <section className="surface-card portal-head-card">
        <div>
          <p className="eyebrow">file library</p>
          <h3>ファイル管理</h3>
          <p className="muted">フォルダごとに最新ファイルを管理する入口です。編集者は差し替え情報を登録し、利用者は一覧から必要な資料を探せます。</p>
        </div>
      </section>

      <section className="split-grid files-workspace">
        <aside className="surface-card files-sidebar-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">folders</p>
              <h3>フォルダ</h3>
            </div>
            <span className="status-badge">{visibleEntries.length} 件</span>
          </div>

          <div className="file-folder-list">
            <button type="button" className={selectedFolder === "all" ? "folder-chip active" : "folder-chip"} onClick={() => setSelectedFolder("all")}>
              すべて
            </button>
            {folders.map((folder) => (
              <button
                key={folder}
                type="button"
                className={selectedFolder === folder ? "folder-chip active" : "folder-chip"}
                onClick={() => setSelectedFolder(folder)}
              >
                {folder}
              </button>
            ))}
          </div>

          <div className="board-thread-list">
            {visibleEntries.map((entry) => {
              const isActive = entry.id === selectedEntry?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={isActive ? "board-thread-card active" : "board-thread-card"}
                  onClick={() => setSelectedEntryId(entry.id)}
                >
                  <div className="board-thread-top">
                    <span className="status-badge neutral-badge">{entry.version}</span>
                    <span className="muted">{formatDateTime(entry.updatedAt)}</span>
                  </div>
                  <strong>{entry.title}</strong>
                  <p>{entry.summary}</p>
                  <span className="muted">{entry.folder}</span>
                </button>
              );
            })}
            {visibleEntries.length === 0 ? <p className="muted">このフォルダにはファイルがありません。</p> : null}
          </div>
        </aside>

        <div className="page-stack">
          <section className="surface-card board-detail-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">detail</p>
                <h3>{selectedEntry?.title ?? "ファイルを選択してください"}</h3>
              </div>
              {selectedEntry ? (
                <div className="toolbar-group">
                  <button className="small-button" type="button" onClick={() => startEdit(selectedEntry)}>
                    編集
                  </button>
                  {user?.role === "admin" ? (
                    <button className="small-button danger-button" type="button" onClick={() => handleDelete(selectedEntry)}>
                      削除
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedEntry ? (
              <div className="page-stack">
                <div className="detail-panel">
                  <dl className="detail-list">
                    <div>
                      <dt>フォルダ</dt>
                      <dd>{selectedEntry.folder}</dd>
                    </div>
                    <div>
                      <dt>ファイル名</dt>
                      <dd>{selectedEntry.fileName}</dd>
                    </div>
                    <div>
                      <dt>保存先</dt>
                      <dd className="file-path">{selectedEntry.fileUrl}</dd>
                    </div>
                    <div>
                      <dt>更新版</dt>
                      <dd>{selectedEntry.version}</dd>
                    </div>
                    <div>
                      <dt>更新者</dt>
                      <dd>{userNameById(users, selectedEntry.updatedByUserId)}</dd>
                    </div>
                    <div>
                      <dt>最終更新</dt>
                      <dd>{formatDateTime(selectedEntry.updatedAt)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="board-post-body board-detail-body">{selectedEntry.summary}</div>

                <div className="chip-list">
                  {selectedEntry.tags.map((tag) => (
                    <span key={tag} className="detail-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted">左の一覧からファイルを選ぶと詳細が表示されます。</p>
            )}
          </section>

          <form className="surface-card board-compose-card" onSubmit={handleSubmit}>
            <div className="section-head">
              <div>
                <p className="eyebrow">{fileForm.id ? "edit file" : "new file"}</p>
                <h3>{fileForm.id ? "ファイル情報を編集" : "ファイル情報を登録"}</h3>
              </div>
              {fileForm.id ? (
                <button className="small-button" type="button" onClick={() => setFileForm(initialFileForm)}>
                  編集をやめる
                </button>
              ) : null}
            </div>

            <div className="form-grid">
              <label className="field">
                <span>タイトル</span>
                <input value={fileForm.title} onChange={(event) => setFileForm((current) => ({ ...current, title: event.target.value }))} required />
              </label>
              <label className="field">
                <span>フォルダ</span>
                <input
                  value={fileForm.folder}
                  onChange={(event) => setFileForm((current) => ({ ...current, folder: event.target.value }))}
                  placeholder="例: 情報システム/ネットワーク"
                  required
                />
              </label>
              <label className="field">
                <span>ファイル名</span>
                <input value={fileForm.fileName} onChange={(event) => setFileForm((current) => ({ ...current, fileName: event.target.value }))} required />
              </label>
              <label className="field">
                <span>版</span>
                <input value={fileForm.version} onChange={(event) => setFileForm((current) => ({ ...current, version: event.target.value }))} required />
              </label>
              <label className="field full">
                <span>保存先パス / URL</span>
                <input
                  value={fileForm.fileUrl}
                  onChange={(event) => setFileForm((current) => ({ ...current, fileUrl: event.target.value }))}
                  placeholder="例: \\\\server\\share\\manual.pdf"
                  required
                />
              </label>
              <label className="field full">
                <span>説明</span>
                <textarea rows={5} value={fileForm.summary} onChange={(event) => setFileForm((current) => ({ ...current, summary: event.target.value }))} required />
              </label>
              <label className="field full">
                <span>タグ</span>
                <input
                  value={fileForm.tags}
                  onChange={(event) => setFileForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="例: VPN, 手順書, 最新版"
                />
              </label>
            </div>
            <div className="board-compose-actions">
              <button className="primary-button" type="submit">
                {fileForm.id ? "更新する" : "登録する"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
