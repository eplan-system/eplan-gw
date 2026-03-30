# Firebase 初期設定

## まず作るもの

1. Firebase プロジェクトを 1 つ作成
2. Authentication を有効化
3. Firestore Database を作成
4. Web App を登録
5. `.env.local` に接続情報を設定

## Authentication

- `Email/Password` を有効化
- 最初の管理者ユーザーは Firebase Console から手動作成
- 例: `admin@your-company.jp`
- 最初にログインしたユーザーは、`Users` コレクションに自動作成されます
- `Users` が空なら最初の 1 名は自動で `admin` になります

## Firestore

- リージョンは日本で始めるなら `asia-northeast1` を優先
- `Spark` で開始
- ルールは [firestore.rules](C:\Users\e-pla\OneDrive\デスクトップ\伊藤\Codex\groupware-next\firestore.rules) をベースに適用
- インデックスは [firestore.indexes.json](C:\Users\e-pla\OneDrive\デスクトップ\伊藤\Codex\groupware-next\firestore.indexes.json) をベースに追加

## 環境変数

`.env.local`

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 最初の確認

1. `npm run dev`
2. ログイン画面を開く
3. 管理者ユーザーでログイン
4. 管理画面で `初期設備を投入` を押す
5. 予定作成ができるか確認
6. 別ユーザーで閲覧確認
