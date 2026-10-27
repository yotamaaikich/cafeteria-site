# 担当02：管理画面UI

管理画面のHTML・CSS、ログインIDと認証用メールアドレスの対応を担当します。

このZIPは担当分だけです。全員のファイルがそろった状態でアプリを起動します。
ZIP内の相対パスを変えず、共同リポジトリのルートへ展開してください。
Gitの履歴やリモート設定は含みません。

## 担当ファイル

- `admin.html`
- `login.js`
- `docs/roles/02-admin-ui.md`

## 自分のアカウントからアップロードするとき

```sh
git switch -c feature/admin-ui
git add admin.html login.js docs/roles/02-admin-ui.md
git commit -m "Add cafeteria 02-admin-ui files"
git push -u origin feature/admin-ui
```

この操作は各担当者が自分のPC・GitHubアカウントで行います。今回の配布準備ではpushしていません。
担当05が最初に土台を作る手順や、共同リポジトリの準備は[引き継ぎ手順](../TEAM-HANDOFF.md)を参照してください。
このリンク先は担当05のZIPに入っています。各担当には外側のTEAM-HANDOFF.mdも一緒に共有してください。

## 確認すること

ID cafeteriaでログインできること。手入力の人数欄がなく、定員40人の表示があること。HTMLの要素IDは担当03と共有するため、変更時は相談します。

全員分を集めた後、`npm test`と`npm run build`を実行します。
ログイン情報の`README-LOGIN-PRIVATE.md`はソースZIPに含めていません。
