# 担当03：カメラ計測・管理操作・保存

ログイン後の操作、AI人物検出、カメラ停止、手動保存・自動保存の制御を担当します。

このZIPは担当分だけです。全員のファイルがそろった状態でアプリを起動します。
ZIP内の相対パスを変えず、共同リポジトリのルートへ展開してください。
Gitの履歴やリモート設定は含みません。

## 担当ファイル

- `admin.js`
- `test/admin.test.js`
- `docs/roles/03-camera.md`

## 自分のアカウントからアップロードするとき

```sh
git switch -c feature/camera
git add admin.js test/admin.test.js docs/roles/03-camera.md
git commit -m "Add cafeteria 03-camera files"
git push -u origin feature/camera
```

この操作は各担当者が自分のPC・GitHubアカウントで行います。今回の配布準備ではpushしていません。
担当05が最初に土台を作る手順や、共同リポジトリの準備は[引き継ぎ手順](../TEAM-HANDOFF.md)を参照してください。
このリンク先は担当05のZIPに入っています。各担当には外側のTEAM-HANDOFF.mdも一緒に共有してください。

## 確認すること

未認証時に保存されないこと。0人の実測を保存できること。カメラ停止時にメニューを保存しても人数が0に戻らないこと。実測にだけis_measurementを付けること。

全員分を集めた後、`npm test`と`npm run build`を実行します。
ログイン情報の`README-LOGIN-PRIVATE.md`はソースZIPに含めていません。
