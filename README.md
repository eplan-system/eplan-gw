# Office Hub MVP

社内向けの小規模グループウェア MVP です。  
`Next.js + Firebase` を前提に、スマホでも見やすい予定確認を重視して作っています。

## 主な機能

- メールアドレス + パスワードでのログイン
- 全体週間表示
- 個人月間 / 個人週間 / 個人日表示
- 予定の作成 / 編集 / 削除
- 繰り返し予定
- 設備予約
- 掲示板
- 管理画面でのプロフィール / 表示順調整

## ローカル起動

1. `npm install`
2. `.env.example` を元に `.env.local` を作成
3. Firebase の設定値を `.env.local` に入力
4. `npm run dev`
5. `http://localhost:3000` を開く

## 本番前の確認

- Firebase Authentication を有効化
- Firestore を作成
- Firestore ルールを反映
- 初期設備を投入
- 管理画面でユーザー表示名 / 部署 / 表示順を調整

## ドキュメント

- `docs/firebase-setup.md`
- `docs/startup-checklist.md`
- `docs/rollout-plan.md`
- `docs/free-tier-notes.md`
