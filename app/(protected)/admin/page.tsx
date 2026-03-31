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

function buildProfileForm(user?: AppUser | null) {
  return {
    name: user?.name ?? "",
    department: user?.department ?? "未設定",
    mobile: user?.mobile ?? "",
    color: user?.color ?? "#0b7661"
  };
}

export default function AdminPage() {
  const { user, refreshUser, changePassword } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<AppUser[]>([]);
  const [facilityCount, setFacilityCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [profileForm, setProfileForm] = useState(buildProfileForm(user));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: ""
  });
  const [userDrafts, setUserDrafts] = useState<UserDraftMap>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const orderedUsers = useMemo(() => sortUsersForDisplay(users, user?.id), [users, user?.id]);
  const pendingUsers = useMemo(() => orderedUsers.filter((item) => item.department === "未設定" || !item.mobile), [orderedUsers]);

  async function refresh() {
    const [nextUsers, nextFacilities] = await Promise.all([listUsers(), listFacilities()]);
    setUsers(nextUsers);
    setFacilityCount(nextFacilities.length);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setProfileForm(buildProfileForm(user));
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
      setStatusMessage("プロフィールを更新しました。");
    } catch {
      setErrorMessage("プロフィールの更新に失敗しました。Firestore ルールと Firebase 設定を確認してください。");
    }
  }

  async function handlePasswordSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    if (passwordForm.nextPassword.length < 8) {
      setErrorMessage("新しいパスワードは8文字以上で入力してください。");
      return;
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setErrorMessage("新しいパスワードと確認用パスワードが一致していません。");
      return;
    }

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.nextPassword);
      setPasswordForm({
        currentPassword: "",
        nextPassword: "",
        confirmPassword: ""
      });
      setStatusMessage("パスワードを変更しました。次回から新しいパスワードでログインできます。");
    } catch {
      setErrorMessage("パスワードの変更に失敗しました。現在のパスワードを確認してください。");
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
      setErrorMessage("メンバー情報の更新に失敗しました。Firestore ルールを確認してください。");
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
      <section className="surface-card settings-card">
        <p className="eyebrow">display settings</p>
        <h3>{isAdmin ? "表示設定" : "個人設定"}</h3>
        <p className="muted">
          {isAdmin
            ? "表示名、部署、並び順など、画面上の見え方をここで整えられます。ログイン用メールアドレスとパスワード本体は Firebase Authentication で管理されます。"
            : "この画面では自分の表示名、部署、携帯番号、色、パスワードを変更できます。"}
        </p>
        {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>

      <section className="surface-card settings-card">
        <p className="eyebrow">my profile</p>
        <h3>プロフィール変更</h3>
        <div className="settings-form-wrap">
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
                プロフィールを保存
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="surface-card settings-card">
        <p className="eyebrow">security</p>
        <h3>パスワード変更</h3>
        <p className="muted">変更後は Firebase Authentication のログイン用パスワードも更新されます。</p>
        <div className="settings-form-wrap">
          <form className="form-grid compact-form-grid" onSubmit={handlePasswordSave}>
            <label className="field">
              <span>現在のパスワード</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>新しいパスワード</span>
              <input
                type="password"
                value={passwordForm.nextPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, nextPassword: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>新しいパスワード確認</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                required
              />
            </label>
            <div className="full">
              <button className="primary-button" type="submit">
                パスワードを変更
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="surface-card settings-card">
        <p className="eyebrow">external calendar</p>
        <h3>外部カレンダー連携</h3>
        <div className="settings-form-wrap">
          <p className="muted">
            Google カレンダーなどへの一方向同期は、この設定画面で管理する想定です。現在は準備中で、向こう3か月分などの予定を外部カレンダーへ同期する機能をここに追加していきます。
          </p>
          <div className="info-strip" style={{ marginTop: 12 }}>
            <strong>現在の状態</strong>
            <p>予定画面にあった一時的な追加ボタンは廃止しました。今後の同期設定はこの画面にまとめていきます。</p>
          </div>
        </div>
      </section>

      {isAdmin ? (
        <>
          <section className="surface-card">
            <p className="eyebrow">admin tools</p>
            <h3>管理者向け設定</h3>
            <p className="muted">初期設備の反映やメンバーの表示調整は、管理者だけが利用できます。</p>
            <div className="info-strip" style={{ marginTop: 12 }}>
              <strong>初回ログインの流れ</strong>
              <p>Authentication に追加しただけでは一覧に出ません。一度ログインすると Users にプロフィールが作られ、その後ここで表示名や部署を整えられます。</p>
            </div>
            {pendingUsers.length > 0 ? (
              <div className="onboarding-panel">
                <strong>初期設定待ちのメンバーがあります</strong>
                <p>{pendingUsers.length}名が部署または携帯番号未設定です。運用開始前にここで整えてください。</p>
              </div>
            ) : null}
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
                    setStatusMessage("初期設備を反映しました。");
                  } catch {
                    setErrorMessage("初期設備の反映に失敗しました。Firestore ルールを確認してください。");
                  }
                }}
              >
                初期設備を反映
              </button>
            </div>
          </section>

          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">member editor</p>
                <h3>メンバー表示設定</h3>
              </div>
              <span className="status-badge">{orderedUsers.length}名</span>
            </div>
            <p className="muted">表示名、部署、権限、表示順、色をここで揃えると、週表示や月表示が見やすくなります。</p>
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
        </>
      ) : null}
    </div>
  );
}
