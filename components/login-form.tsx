"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signIn(email, password);
    } catch {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">e-plan internal</p>
        <h1>Eプラン社内グループウェア</h1>
        <p className="muted">社内アカウントでログインしてください。</p>
      </div>

      <label className="field">
        <span>メールアドレス</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="name@example.com"
          required
        />
      </label>

      <label className="field">
        <span>パスワード</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="パスワードを入力"
          required
        />
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "ログイン中..." : "ログイン"}
      </button>

      <div className="hint-box">
        <strong>ご利用案内</strong>
        <p>発行済みのメールアドレスとパスワードでログインしてください。</p>
      </div>
    </form>
  );
}
