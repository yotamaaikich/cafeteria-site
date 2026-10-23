# 食堂アプリ：5人の引き継ぎ手順

## 今回の渡し方

あなたを含む5人で、下の5担当を1人ずつ受け持ちます。ZIPの中身は担当ごとに異なります。
5つを同じプロジェクトのルートに展開すると、動作するアプリ一式になります。
各担当のZIPだけでは単独起動できません。ファイルの担当は重複しません。

最新のソースは追加アップロードしていません。GitHub Pagesの新規公開も保留中です。
以前作成した非公開リポジトリの過去のアップロード分は、そのまま残しています。
このZIPには以前のGit履歴・リモート設定・認証トークンを入れていません。

## 担当表

名前の欄はチームで決めて記入してください。

| 担当 | 名前 | 受け取るZIP | 作業ブランチ |
| --- | --- | --- | --- |
| 01 混雑表示 | 未割り当て | `cafeteria-01-display.zip` | `feature/display` |
| 02 管理画面UI | 未割り当て | `cafeteria-02-admin-ui.zip` | `feature/admin-ui` |
| 03 カメラ・保存 | 未割り当て | `cafeteria-03-camera.zip` | `feature/camera` |
| 04 Supabase・データ | 未割り当て | `cafeteria-04-database.zip` | `feature/database` |
| 05 統合・公開 | 未割り当て | `cafeteria-05-integration.zip` | 最初の`main`、以降`feature/integration` |

ZIPの中にある`docs/roles/`の担当メモにも、ファイル一覧と確認項目があります。
同梱のソースは引き継ぎ時点の完成状態です。追加の開発や修正は担当者が自分のブランチで行います。

## GitHubへ上げる手順

5人が別々の担当分を、各自のアカウントで1つの共同リポジトリに集める手順です。

### 1. 共同リポジトリを用意する

チームが決めた所有者のGitHubで、空の非公開リポジトリを1つ作ります。
README・`.gitignore`・ライセンスの自動生成は選択しません。
所有者は **Settings → Collaborators** から他の4人を招待し、全員が招待を承認します。
今回はここまでの外部操作も、メンバー自身が行います。

### 2. 担当05が土台を上げる

担当05が自分のPCで、共同リポジトリをcloneします。
`OWNER`と`REPOSITORY`は実際の名前に置き換えます。

```sh
git clone https://github.com/OWNER/REPOSITORY.git cafeteria
cd cafeteria
```

`cafeteria-05-integration.zip`の中身を、この`cafeteria`フォルダ直下へ展開します。
`package.json`や`README.md`が直下に置かれる形です。ZIPファイルそのものはGitへ追加しません。

```sh
git add .gitignore .gitattributes .github package.json package-lock.json vite.config.js README.md THIRD_PARTY_NOTICES.md public docs
git commit -m "Add cafeteria build and deployment setup"
git branch -M main
git push -u origin main
```

この時点では他の4人のファイルがないため、ビルドはまだできません。
公開ワークフローは手動実行にしているので、途中のpushで自動公開されません。

### 3. 他の4人が担当分を上げる

各自が自分のGitHubアカウントで共同リポジトリをcloneし、担当ブランチを作ります。
すでにcloneしている場合は、`main`で`git pull`してからブランチを作ります。

```sh
git clone https://github.com/OWNER/REPOSITORY.git cafeteria
cd cafeteria
git switch -c feature/display
```

上のブランチ名は担当01の例です。自分の担当表にある名前に置き換えます。
自分のZIPの中身を、cloneしたフォルダ直下へ展開します。
`git status`で自分の担当ファイルが追加されることを確認し、担当メモにある`git add`を使います。

担当01の例：

```sh
git add index.html viewer.js docs/roles/01-display.md
git commit -m "Add cafeteria display files"
git push -u origin feature/display
```

GitHubで **Compare & pull request** を開き、`main`向けのPull Requestを作ります。
各自のGitHubアカウントでpushしてください。Gitの名前とメールは、各自の通常の設定を使います。

### 4. 4人の変更を集める

担当05またはリポジトリ所有者が、4つのPull Requestを確認して`main`にマージします。
5つのZIPはファイルが重複しない構成なので、そのまま追加する分にはファイルの取り合いが起きません。
全員が最新の`main`を取得します。

```sh
git switch main
git pull
npm ci
npm test
npm run build
npm run dev
```

混雑表示は`http://127.0.0.1:5173/`、管理画面は`http://127.0.0.1:5173/admin.html`です。
準備時点ではJavaScriptの15テストとビルドが成功しています。

## Gitへ上げず、手元だけで5つを合体する場合

5つのZIPを同じ場所へ保存し、空の作業フォルダを用意します。
PowerShellなら次のコマンドで、5つの中身を同じ`cafeteria-complete`フォルダへ展開できます。

```powershell
New-Item -ItemType Directory -Path .\cafeteria-complete
Get-ChildItem -File -Filter 'cafeteria-0*.zip' | ForEach-Object {
    Expand-Archive -LiteralPath $_.FullName -DestinationPath .\cafeteria-complete
}
Set-Location .\cafeteria-complete
npm ci
npm test
npm run dev
```

5つのZIPには共通の外側フォルダを付けていません。すべて同じ展開先を選んでください。

## 管理者とSupabase

共通ログインIDは`cafeteria`です。
パスワードは別ファイル`README-LOGIN-PRIVATE.md`をチーム内で共有します。このファイルはGitへ追加しません。
元の接続先には管理者とDBの設定が済んでいます。5人が同じ設定で動かすと、同じ食堂データを参照・更新します。
本番の自動計測は1台のカメラ端末で行います。
DB・Authの移行や別環境の作成は`README.md`を参照してください。

## .github.ioへの公開を再開するとき

現在は公開保留です。ソースは非公開のまま共同作業できます。

- GitHub Pro等で非公開リポジトリからPagesを使える場合：同梱の`.github/workflows/pages.yml`を手動実行します。設定手順は`README.md`にあります。
- GitHub Freeのままの場合：非公開のソースとは別に配信専用の公開リポジトリを用意し、`npm run build`でできた`dist/`の中身だけを置いて公開します。ソースのREADMEやログイン情報は配信用リポジトリに置きません。

公開URLの例は`https://USERNAME.github.io/REPOSITORY/`、管理画面はその下の`admin.html`です。
いずれの方法でも、閲覧者にはHTML・ビルド済みJavaScript・AIモデルが配信されます。

公式情報：[GitHub Pagesの利用条件とワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 引き継ぎ時の確認

- 現在人数の手入力欄を削除済み
- 定員40人を利用率・混雑度・予測の基準に統一
- 実測履歴から10分後・20分後を予測し、履歴不足や計測停止も表示
- 管理者の判定前やカメラの初回計測前は自動保存しない
- 計測結果が0人でも保存可能
- カメラ停止中のメニュー保存で人数を0人に戻さない
- 混雑表示と管理画面を相互に移動可能
- Supabaseを使用し、AIモデルはアプリに同梱
- GitHubへの追加pushと新しいPages公開は実施せず
