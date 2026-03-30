# Office Hub MVP

小規模会社向けの社内グループウェア MVP です。Next.js + Firebase を前提にしつつ、Firebase 環境変数が未設定でもローカルデモとして動くようにしてあります。

## 主な実装内容

- メールアドレス + パスワードのログイン画面
- ログイン必須の保護ルート
- 社員 x 週間のトップ画面
- 予定登録、設備予約、掲示板、ユーザー管理
- スマホでは一覧を担当者カード中心に最適化

## 起動手順

1. `npm install`
2. `.env.example` を `.env.local` にコピーして Firebase 設定を入れる
3. `npm run dev`
4. `http://localhost:3000` を開く

Firebase 未設定でも、デモデータでローカル確認できます。

## まず読む資料

- `docs/firebase-setup.md`
- `docs/startup-checklist.md`
- `docs/rollout-plan.md`
- `docs/free-tier-notes.md`
