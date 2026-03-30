"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DEPARTMENT_OPTIONS } from "@/lib/constants";
import { deleteUser, listFacilities, listUsers, saveUser, seedDefaultFacilities } from "@/lib/data-service";
import { AppUser } from "@/lib/types";
import { sortUsersForDisplay } from "@/lib/utils";

type UserDraftMap = Record<string, AppUser>;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeUser(user: AppUser): AppUser {
  return {
    ...user,
    name: normalizeText(user.name),
    email: user.email.trim(),
    department: user.department.trim() || "未設定",
    mobile: user.mobile.trim(),
    sortOrder: Number.isFinite(user.sortOrder) ? user.sortOrder : 99
  };
}

export default function AdminPage() {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [facilityCount, setFacilityCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    department: user?.department ?? "未設定",
    mobile: user?.mobile ?? "",
    color: user?.color ?? "#0b7661"
  });
  const [userDrafts, setUserDrafts] = useState<UserDraftMap>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const orderedUsers = useMemo(() => sortUsersForDisplay(users, user?.id), [users, user?.id]);
  const pendingUsers = useMemo(
    () => orderedUsers.filter((item) => item.department === "未設定" || !item.mobile),
    [orderedUsers]
  );

  async function refresh() {
    const [nextUsers, nextFacilities] = await Promise.all([listUsers(), listFacilities()]);
    setUsers(nextUsers);
    setFacilityCount(nextFacilities.length);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? "",
      department: user?.department ?? "未設定",
      mobile: user?.mobile ?? "",
      color: user?.color ?? "#0b7661"
    });
  }, [user]);

  useEffect(() => {
    setUserDrafts((current) => {
      const next: UserDraftMap = {};
      users.forEach((item) => {
        next[item.id] = current[item.id] ? { ...current[item.id], ...item } : { ...item };
      });
      return next;
    });
  }, [users]);

  if (user?.role !== "admin") {
    return (
      <section className="surface-card">
        <p className="eyebrow">permission</p>
        <h3>管理者のみ利用可能</h3>
        <p className="muted">一般ユーザーは閲覧できません。</p>
      </section>
    );
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setStatusMessage("");
    setErrorMessage("");

    try {
      await saveUser(
        normalizeUser({
          ...user,
          name: profileForm.name,
          department: profileForm.department,
          mobile: profileForm.mobile,
          color: profileForm.color
        })
      );
      await refreshUser();
      await refresh();
      setStatusMessage("自分のプロフィールを更新しました。");
    } catch {
      setErrorMessage("プロフィール更新に失敗しました。Firestore ルールか Firebase 設定を確認してください。");
    }
  }

  async function handleUserSave(userId: string) {
    const draft = userDrafts[userId];
    if (!draft) return;

    setSavingUserId(userId);
    setStatusMessage("");
    setErrorMessage("");

    try {
      await saveUser(normalizeUser(draft));
      if (user?.id === userId) {
        await refreshUser();
      }
      await refresh();
      setStatusMessage("メンバー情報を更新しました。");
    } catch {
      setErrorMessage("メンバー更新に失敗しました。管理者向け Firestore ルールが反映されているか確認してください。");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDelete(userId: string) {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await deleteUser(userId);
      if (user?.id === userId) {
        await refreshUser();
      }
      await refresh();
      setStatusMessage("プロフィールを一覧から削除しました。");
    } catch {
      setErrorMessage("プロフィール削除に失敗しました。Firestore ルールを確認してください。");
    }
  }

  return (
    <div className="page-stack">
      <section className="surface-card">
        <p className="eyebrow">admin note</p>
        <h3>ユーザー管理</h3>
        <p className="muted">
          ログイン用アカウントの作成は Firebase Authentication 側で行い、表示名、部署、携帯番号、権限、色、表示順などの社内プロフィールは
          この ADMIN 画面で統一して管理します。
        </p>
        <div className="info-strip" style={{ marginTop: 12 }}>
          <strong>運用ルール</strong>
          <p>
            Authentication に追加しただけでは一覧に出ません。対象ユーザーが一度ログインすると `Users` にプロフィールが作られ、その後はこの画面から
            管理者がまとめて整えられます。
          </p>
        </div>
        {pendingUsers.length > 0 ? (
          <div className="onboarding-panel">
            <strong>初期設定待ちメンバーがあります</strong>
            <p>{pendingUsers.length} 名が未設定のままです。初回ログイン後に、この画面で表示名や部署をそろえてください。</p>
          </div>
        ) : null}
        {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        <div className="toolbar-group" style={{ marginTop: 12 }}>
          <span className="status-badge">設備 {facilityCount}件</span>
          <button
            className="small-button"
            type="button"
            onClick={async () => {
              setStatusMessage("");
              setErrorMessage("");
              try {
                await seedDefaultFacilities();
                await refresh();
                setStatusMessage("初期設備を投入しました。");
              } catch {
                setErrorMessage("初期設備の投入に失敗しました。Firestore ルールを確認してください。");
              }
            }}
          >
            初期設備を投入
          </button>
        </div>
      </section>

      <section className="surface-card">
        <p className="eyebrow">my profile</p>
        <h3>自分のプロフィール</h3>
        <form className="form-grid" onSubmit={handleProfileSave}>
          <label className="field">
            <span>表示名</span>
            <input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} required />
          </label>
          <label className="field">
            <span>部署</span>
            <select value={profileForm.department} onChange={(event) => setProfileForm({ ...profileForm, department: event.target.value })}>
              {DEPARTMENT_OPTIONS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>携帯番号</span>
            <input value={profileForm.mobile} onChange={(event) => setProfileForm({ ...profileForm, mobile: event.target.value })} />
          </label>
          <label className="field">
            <span>色</span>
            <input type="color" value={profileForm.color} onChange={(event) => setProfileForm({ ...profileForm, color: event.target.value })} />
          </label>
          <div className="full">
            <button className="primary-button" type="submit">
              プロフィール更新
            </button>
          </div>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">member editor</p>
            <h3>登録ユーザーの社内プロフィール編集</h3>
          </div>
          <span className="status-badge">{orderedUsers.length}名</span>
        </div>
        <p className="muted">
          ここで編集できるのは `Users` の表示情報です。並び順は、ログイン中の本人が常に一番上で、その下をこの数値順に表示します。
        </p>
        <div className="editable-user-stack">
          {orderedUsers.map((item) => {
            const draft = userDrafts[item.id] ?? item;

            return (
              <article key={item.id} className="editable-user-card">
                <div className="editable-user-head">
                  <div className="editable-user-title">
                    <strong>{item.name}</strong>
                    <span>{item.email}</span>
                  </div>
                  <div className="toolbar-group">
                    {item.department === "未設定" || !item.mobile ? <span className="warning-badge">初期設定待ち</span> : null}
                    {item.id === user?.id ? <span className="status-badge">ログイン中</span> : null}
                    <button className="small-button" type="button" onClick={() => void handleUserSave(item.id)} disabled={savingUserId === item.id}>
                      {savingUserId === item.id ? "保存中..." : "保存"}
                    </button>
                    {item.id !== user?.id ? (
                      <button className="small-button danger-button" type="button" onClick={() => void handleDelete(item.id)}>
                        一覧から削除
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="form-grid compact-form-grid">
                  <label className="field">
                    <span>表示名</span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setUserDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, name: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>メール</span>
                    <input value={draft.email} readOnly />
                  </label>
                  <label className="field">
                    <span>部署</span>
                    <select
                      value={draft.department}
                      onChange={(event) =>
                        setUserDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, department: event.target.value }
                        }))
                      }
                    >
                      {DEPARTMENT_OPTIONS.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>権限</span>
                    <select
                      value={draft.role}
                      onChange={(event) =>
                        setUserDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, role: event.target.value as AppUser["role"] }
                        }))
                      }
                    >
                      <option value="member">一般ユーザー</option>
                      <option value="admin">管理者</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>表示順</span>
                    <input
                      type="number"
                      min={1}
                      value={draft.sortOrder}
                      onChange={(event) =>
                        setUserDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, sortOrder: Number(event.target.value || 1) }
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>携帯番号</span>
                    <input
                      value={draft.mobile}
                      onChange={(event) =>
                        setUserDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, mobile: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>色</span>
                    <input
                      type="color"
                      value={draft.color}
                      onChange={(event) =>
                        setUserDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, color: event.target.value }
                        }))
                      }
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
