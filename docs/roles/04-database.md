# 担当04：Supabase・データ処理・混雑予測

Supabaseの接続・DB権限・履歴の保存取得、定員40人の共通設定、履歴からの混雑予測を担当します。

このZIPは担当分だけです。全員のファイルがそろった状態でアプリを起動します。
ZIP内の相対パスを変えず、共同リポジトリのルートへ展開してください。
Gitの履歴やリモート設定は含みません。

## 担当ファイル

- `cafeteria.js`
- `config.js`
- `forecast.js`
- `supabase.js`
- `test/cafeteria.test.js`
- `test/forecast.test.js`
- `docs/FORECAST.md`
- `supabase/migrations/20261023035253_unify_cafeteria_supabase.sql`
- `supabase/migrations/20261023072731_add_measurement_forecasting.sql`
- `supabase/tests/cafeteria_permissions.sql`
- `supabase/tests/forecast_context.sql`
- `docs/roles/04-database.md`

## 自分のアカウントからアップロードするとき

```sh
git switch -c feature/database
git add cafeteria.js config.js forecast.js supabase.js supabase test/cafeteria.test.js test/forecast.test.js docs/FORECAST.md docs/roles/04-database.md
git commit -m "Add cafeteria 04-database files"
git push -u origin feature/database
```

この操作は各担当者が自分のPC・GitHubアカウントで行います。今回の配布準備ではpushしていません。
担当05が最初に土台を作る手順や、共同リポジトリの準備は[引き継ぎ手順](../TEAM-HANDOFF.md)を参照してください。
このリンク先は担当05のZIPに入っています。各担当には外側のTEAM-HANDOFF.mdも一緒に共有してください。

## 確認すること

15件のJavaScriptテストが成功すること。新環境では移行SQLを日時順に実行すること。元のSupabaseは適用済みのため再実行しません。DBテストはロールバックされます。

全員分を集めた後、`npm test`と`npm run build`を実行します。
ログイン情報の`README-LOGIN-PRIVATE.md`はソースZIPに含めていません。
