# 担当05：統合・ビルド・公開設定・AIモデル

npmとViteの設定、モデル配信、README、5人の変更の統合、公開の準備を担当します。

このZIPは担当分だけです。全員のファイルがそろった状態でアプリを起動します。
ZIP内の相対パスを変えず、共同リポジトリのルートへ展開してください。
Gitの履歴やリモート設定は含みません。

## 担当ファイル

- `.gitignore`
- `.gitattributes`
- `.github/workflows/pages.yml`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `README.md`
- `THIRD_PARTY_NOTICES.md`
- `docs/TEAM-HANDOFF.md`
- `docs/VERIFICATION.md`
- `public/models/coco-ssd/LICENSE`
- `public/models/coco-ssd/group1-shard1of5`
- `public/models/coco-ssd/group1-shard2of5`
- `public/models/coco-ssd/group1-shard3of5`
- `public/models/coco-ssd/group1-shard4of5`
- `public/models/coco-ssd/group1-shard5of5`
- `public/models/coco-ssd/model.json`
- `docs/roles/05-integration.md`

## 自分のアカウントからアップロードするとき

```sh
git switch -c feature/integration
git add .gitignore .gitattributes .github package.json package-lock.json vite.config.js README.md THIRD_PARTY_NOTICES.md public docs/TEAM-HANDOFF.md docs/VERIFICATION.md docs/roles/05-integration.md
git commit -m "Add cafeteria 05-integration files"
git push -u origin feature/integration
```

この操作は各担当者が自分のPC・GitHubアカウントで行います。今回の配布準備ではpushしていません。
担当05が最初に土台を作る手順や、共同リポジトリの準備は[引き継ぎ手順](../TEAM-HANDOFF.md)を参照してください。
このリンク先は担当05のZIPに入っています。各担当には外側のTEAM-HANDOFF.mdも一緒に共有してください。

## 確認すること

全員のファイルがmainにそろってからnpm ci、npm test、npm run buildを実行すること。GitHubへのアップロードとPages公開は現在保留です。公開を再開する際はREADMEの条件を確認します。

全員分を集めた後、`npm test`と`npm run build`を実行します。
ログイン情報の`README-LOGIN-PRIVATE.md`はソースZIPに含めていません。
