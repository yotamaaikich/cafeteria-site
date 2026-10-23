# 食堂混雑状況確認サイト

食堂の利用人数・混雑度・メニューの販売状況・お知らせを共有するWebアプリです。
データ保存とログインはSupabaseに統一しています。Firebaseは使用しません。

## 5人での担当分担

担当別の5つのZIPを1つのリポジトリに集めると、アプリ一式になります。
ZIPにGitの履歴やリモート設定は含めていません。各自のGitHubアカウントで担当ブランチをpushします。

| 担当 | ZIP | ファイル・機能 |
| --- | --- | --- |
| 01 混雑表示 | `cafeteria-01-display.zip` | `index.html`、`viewer.js`：表示画面と自動更新 |
| 02 管理画面UI | `cafeteria-02-admin-ui.zip` | `admin.html`、`login.js`：管理画面とログインIDの変換 |
| 03 カメラ・保存 | `cafeteria-03-camera.zip` | `admin.js`、管理画面テスト：人物検出・認証後の操作・保存制御 |
| 04 Supabase・データ | `cafeteria-04-database.zip` | DB接続、データ処理、SQL、データ処理テスト |
| 05 統合・公開 | `cafeteria-05-integration.zip` | npm、Vite、AIモデル、README、GitHub Pages設定 |

共同作業の手順は[5人向け引き継ぎ](docs/TEAM-HANDOFF.md)、担当のファイル一覧は`docs/roles/`を参照してください。

## 主な機能

- 利用者画面：現在人数、定員40人に対する利用率、混雑度、10分後・20分後の予測、販売状況、お知らせ、最終更新日時
- 管理者画面：Supabase Authでログインし、カメラで計測した人数・販売状況・お知らせを保存
- 人数計測：COCO-SSDで約3秒ごとに人物を検出。現在人数の手入力欄はありません
- 保存：ボタン操作、またはカメラ計測中に30秒ごとに自動保存
- カメラ停止中：保存済みの人数を保ったまま、販売状況とお知らせを更新可能
- 更新：Supabase Realtimeと15秒ごとのHTTP取得を併用
- 履歴：保存ごとに`cafeteria`へ追加し、利用者画面は最新の1件を表示
- 画面切り替え：両画面の「混雑表示」「管理者画面」で相互に移動

映像は端末内で処理し、画像・動画は送信しません。保存するのは人数などの表示用データです。
10分後・20分後の人数は、実測履歴の増減と過去の同時間帯の傾向から計算します。
人数を検出するAIはCOCO-SSD、混雑予測は履歴を使う統計モデルです。外部の生成AI APIは使用しません。
実装と検証条件は[予測の仕組み](docs/FORECAST.md)を参照してください。

## 定員と予測の準備

定員は`config.js`の`CAPACITY = 40`で統一しています。
混雑度は利用率30%未満で「空いている」、70%未満で「普通」、それ以上で「混雑」です。
実測が40人を超えた場合も実人数を保持し、予測値は0〜40人に収めます。

管理画面でカメラを起動し、自動保存を有効にして約5分間計測すると、短期予測を表示します。
過去28日間の同時間帯の履歴が3日以上そろうと、その傾向も予測に加えます。
履歴が不足していれば「予測データ不足」、最新計測から3分を超えたら「計測待ち」と表示します。
メニュー・お知らせだけの保存や、移行前に保存した計測方法の不明な履歴は予測に使いません。

## ローカルで起動する

5人分のファイルを集め、Node.js 22.12以降を用意します。

```sh
npm ci
npm run dev
```

- 混雑表示：`http://127.0.0.1:5173/`
- 管理画面：`http://127.0.0.1:5173/admin.html`

HTMLをダブルクリックせず、開発サーバー経由で開きます。
カメラにはブラウザの許可が必要です。別の端末から使う場合はHTTPSで配信してください。

## GitHub Pagesで公開する

担当ファイルを統合した後に、メンバー自身が公開します。
このソース一式の準備では、最新変更のpushやPagesの公開は行っていません。

1. 統合先リポジトリの **Settings → Pages → Build and deployment → Source → GitHub Actions** を選択します。
2. **Actions → Deploy cafeteria to GitHub Pages → Run workflow** で`main`ブランチを選んで実行します。
3. 完了後、ワークフローの`github-pages`に表示されるURLを開きます。

URLの形は次のとおりです。`USERNAME`と`REPOSITORY`を実際の所有者とリポジトリ名に置き換えます。

```text
混雑表示: https://USERNAME.github.io/REPOSITORY/
管理画面: https://USERNAME.github.io/REPOSITORY/admin.html
```

更新後も同じワークフローを手動実行して再公開します。`/admin.html`まで含めてアクセスしてください。
Viteは相対パスでビルドするため、リポジトリ名のサブディレクトリにも対応します。
GitHub FreeでPagesを使う場合は公開リポジトリが必要です。

公式手順：[Pagesのワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 管理者ログイン

共通IDは`cafeteria`です。パスワードはチーム内で共有する別ファイル`README-LOGIN-PRIVATE.md`を参照してください。
このファイルはソースZIPに含めず、`.gitignore`にも登録しています。
公開画面・配信JavaScript・GitHub Actionsの設定にパスワードは埋め込みません。

既存のSupabaseプロジェクトでは共通管理者を作成済みです。
同じ接続設定を使う限り、URLが異なっても全員で同じ混雑データを参照・更新します。
自動計測するカメラ端末は1台に決めます。複数端末で保存すると、最後に保存した端末の計測値が表示されます。

## Supabaseの設定

### 接続先

`supabase.js`にプロジェクトURLとブラウザ用publishable keyを設定しています。
5人で既存の食堂データを共有する場合はそのまま使用します。
独立した環境にする場合は各自のSupabaseプロジェクトを用意し、この2つを変更します。
publishable keyのアクセス範囲はDBのRLSで制限します。`service_role`やsecret keyはブラウザへ設定しません。

### テーブル・権限

新しいプロジェクトでは、`supabase/migrations/`内の2つのSQLを、ファイル名の日時順にSQL Editorなどで一度ずつ実行します。
既存の接続先には適用済みで、以前の混雑履歴も保持しています。既存環境での再実行は不要です。

- `cafeteria`：人数・混雑度・予測人数・メニュー・お知らせ・更新日時の履歴
- `cafeteria_admins`：書き込みを許可する管理者のユーザーID
- RLS：閲覧は公開、追加は管理者のみ。一般ユーザーの書き込みと管理者への自己昇格を禁止
- サーバー側の更新日時、最新履歴取得用インデックス、Realtimeの有効化
- `is_measurement`：カメラの実測とメニューのみの更新を区別
- `cafeteria_forecast_context()`：直近の1分集計と過去の5分集計を返す、読み取り専用の予測用関数

`predict10`と`predict20`は旧形式との互換性用です。新しい保存ではNULLにし、利用者画面では実測履歴から計算した予測を使います。

### 新しい環境に最初の管理者を作る

ID`cafeteria`は、Supabase Authの`cafeteria@aikichin.example`に対応します。

1. **Authentication → Users → Add user → Create new user** で、このメールアドレスとチームで決めたパスワードを登録し、メール確認済みにします。
2. 作成したユーザーのUUIDを使い、SQL Editorで次を実行します。

```sql
insert into public.cafeteria_admins (user_id)
values ('ここを管理者ユーザーのUUIDに置き換える')
on conflict (user_id) do nothing;
```

3. 管理画面にログインし、カメラで人数を計測して保存します。
4. 混雑表示で、人数・メニュー・お知らせ・更新日時を確認します。

一般利用者はログインせず閲覧できます。管理者権限を外す場合は、`cafeteria_admins`から対象ユーザーの行を削除します。

## 学内ネットでの利用

Supabase・TensorFlow.js・COCO-SSDのJavaScriptはビルド時にアプリへまとめます。
AIモデルも`public/models/coco-ssd/`に同梱し、実行時にFirebaseや外部CDNから取得しません。
モデルの出典とライセンスは[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)を参照してください。

アプリ配信元と接続先の`*.supabase.co`へのHTTPS通信が必要です。
WebSocketが使えない環境でも15秒ごとの取得を続けます。学内ネットでの接続確認は別途必要です。

## ビルド・検証

```sh
npm test
npm run build
npm run preview
```

`dist/`を静的サイトとして配信できます。`index.html`と`admin.html`の両方がビルド対象です。
AIモデルも`dist/models/`へコピーされます。ソースやログイン情報のREADMEは配信対象に含めません。

JavaScriptのテストは混雑度の境界、不正入力、履歴の保存・取得、エラー処理、表示、管理者判定、自動保存を検証します。
`supabase/tests/cafeteria_permissions.sql`と`forecast_context.sql`はDB権限と実測のみの集計を検証し、テスト用データをロールバックします。

## 参考

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [TensorFlow.js COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
