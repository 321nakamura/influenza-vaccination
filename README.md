# Influenza Vaccination Reservation Form

GitHub Pages で公開できる **インフルエンザ予防接種予約フォーム** 一式です。

## 仕様
- タイトル: **インフルエンザ予防接種予約フォーム**
- 項目:
  1. 社員番号（重複不可／数値＋`/`許可）
  2. 部署名（プルダウン）
  3. お名前
  4. 接種する／しない（プルダウン）
- 注意書き:
  > ※ 一度登録された方で変更がある場合、こちらのフォームでは修正できません。  
  > 恐れ入りますが、管理本部 総務までご連絡をお願いします。

## 動作モード
- 既定：ローカル保存（LocalStorage）。端末単位で重複チェックします。
- 組織一元管理を行う場合：`app.js` の `CONFIG.webhookUrl` に Power Automate / GAS / 任意API を設定してPOST連携してください。

## 公開手順（最短）
1. 本フォルダ内のファイルを GitHub リポジトリ（例：`flu-form`）のルートにアップロード
2. リポジトリの **Settings → Pages** で Source を `Deploy from a branch`、Branch を `main / root` に設定
3. 数分後、`https://<your-account>.github.io/<repo>/` で公開されます

## CSV エクスポートと取り込み
- 画面の **CSVをエクスポート** で端末保存します（列：employee_id, department, full_name, choice, created_at）。
- **既存データの取り込み** で過去CSVを読み込むと、重複チェック対象に加えられます。

## 備考
- 真に重複を排除して全社管理を行うには、SharePoint などサーバー側のデータストアが必要です。
