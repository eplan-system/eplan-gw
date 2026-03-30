# システム構成案

- フロントエンド: Next.js App Router
- 認証: Firebase Authentication
- DB: Firestore
- 配信: Vercel または Firebase Hosting
- 通信: HTTPS

## 方針

- MVP はクライアント中心で軽量に構築
- Firebase 設定がないローカル環境でもデモ動作可能
- データアクセスを `lib/data-service.ts` に集約し、将来的な Cloud Functions 拡張をしやすくする
- スマホでは縦カード、PC では一覧グリッドに切り替える
