# 担当01：混雑表示

混雑表示画面のHTML・CSSと、Supabaseからの自動更新を担当します。

このZIPは担当分だけです。全員のファイルがそろった状態でアプリを起動します。
ZIP内の相対パスを変えず、共同リポジトリのルートへ展開してください。
Gitの履歴やリモート設定は含みません。

## 担当ファイル

- `index.html`
- `viewer.js`
- `docs/roles/01-display.md`

## 自分のアカウントからアップロードするとき

```sh
git switch -c feature/display
git add index.html viewer.js docs/roles/01-display.md
git commit -m "Add cafeteria 01-display files"
git push -u origin feature/display
```

この操作は各担当者が自分のPC・GitHubアカウントで行います。今回の配布準備ではpushしていません。
担当05が最初に土台を作る手順や、共同リポジトリの準備は[引き継ぎ手順](../TEAM-HANDOFF.md)を参照してください。
このリンク先は担当05のZIPに入っています。各担当には外側のTEAM-HANDOFF.mdも一緒に共有してください。

## 確認すること

人数・利用率・販売状況・お知らせ・予測を表示できること。管理画面へ移動し、戻れること。

全員分を集めた後、`npm test`と`npm run build`を実行します。
ログイン情報の`README-LOGIN-PRIVATE.md`はソースZIPに含めていません。
