# デプロイ手順

## Vercel

1. Git リポジトリへ push
2. Vercel に import
3. `.env.example` に沿って環境変数を設定
4. `npm run build`
5. Deploy

## Firebase Hosting

1. Firebase プロジェクト作成
2. `firebase init hosting`
3. Next.js 対応構成を選択
4. 環境変数を設定
5. `npm run build` 後に deploy
