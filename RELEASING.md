# アプリ更新・リリース手順

## 通常の更新フロー（コード修正 → 新バージョンをリリース）

```bash
# 1. コードを修正・テスト
npm start                 # ローカル確認

# 2. 変更をコミット
git add -A
git commit -m "変更内容の説明"
git push

# 3. バージョンを上げてタグを作る（下記のいずれか）
npm version patch         # バグ修正:     1.0.0 → 1.0.1
npm version minor         # 機能追加:     1.0.1 → 1.1.0
npm version major         # 破壊的変更:   1.1.0 → 2.0.0
# ↑ package.json が更新され、コミットとタグが自動生成される

# 4. コミットとタグを push（GitHub Actions が自動ビルド開始）
git push && git push --tags
```

数分後、`https://github.com/gegege1566/countdown-timer/releases` に
インストーラー (`Countdown.Timer.Setup.x.x.x.exe`) が公開されます。

## 5. リリースノートを追加（自動生成では足りないので手動で上書き）

CI はデフォルトのチェンジログしか書かないため、ユーザー向けの日本語説明を
後から上書きします。

```bash
gh release edit v1.0.x --notes "$(cat <<'EOF'
## Countdown Timer v1.0.x

### 🐛 バグ修正 / ✨ 新機能
- ...

## 📥 ダウンロード

下の **Assets** から `Countdown.Timer.Setup.1.0.x.exe` をダウンロード…

> ⚠️ Windows SmartScreen により「不明な発行元」と表示される場合があります…
EOF
)"
```

テンプレートは `release-notes/` フォルダに保存しておく、または過去リリース
（v1.0.0）からコピーして修正するのが楽。

## ビルド状況の確認

```bash
gh run list --limit 3          # 最近の実行を一覧
gh run watch                   # 実行中のワークフローをリアルタイム監視
gh run view <ID> --log-failed  # 失敗ログを確認
```

所要時間: **約1分半〜2分**（Windows runner での electron-builder ビルド）

## リリースの確認・操作

```bash
gh release list                                   # リリース一覧
gh release view v1.0.1                            # 詳細
gh release view v1.0.1 --json assets -q '.assets[].name'   # アセット一覧
gh release view v1.0.1 --json body -q '.body' > /tmp/body.md  # 本文を保存
gh release delete-asset v1.0.1 <ファイル名> --yes # 余計なアセットを削除
gh release delete v1.0.1 --yes --cleanup-tag      # リリース+タグを削除
```

## 既存リリースをやり直したい場合（v1.0.0 を上書き再ビルド）

⚠️ **リリースを削除するとノート本文も消えます。** 必ず先に保存してから。

```bash
# 1. 既存ノート本文を保存
gh release view v1.0.0 --json body -q '.body' > /tmp/release-body.md

# 2. リリース＆タグ削除
gh release delete v1.0.0 --yes --cleanup-tag
git fetch --tags --prune --prune-tags

# 3. コード修正・コミット
git add -A && git commit -m "修正内容"
git push

# 4. 再タグ付け＆push（CIが再ビルド）
git tag v1.0.0 -m "v1.0.0"
git push origin v1.0.0

# 5. ビルド完了を待つ
gh run list --limit 1   # completed success まで

# 6. ノートを復元
gh release edit v1.0.0 --notes-file /tmp/release-body.md
```

## ローカルビルドだけしたい場合

```bash
npm run build                      # インストーラーを dist/ に生成
# dist/Countdown Timer Setup x.x.x.exe
```

## アイコンを変えたい場合

```bash
# 1. build/icon.svg を編集
# 2. PNG/ICO を再生成
node scripts/make-icon.js
# 3. 通常のリリースフローへ
```

## よくあるトラブル

| 症状 | 対処 |
|------|------|
| `workflow` スコープがないとpushが拒否される | `! gh auth refresh -s workflow -h github.com` |
| electron-builder が `GH_TOKEN` エラーでfail | `package.json` の build スクリプトに `--publish never` が付いているか確認 |
| タスクバーのアイコンが反映されない | `build/icon.png` が `files` に含まれているか確認 |
| リリースに余計なアセット (`.blockmap`/`.yml`) が上がる | `release.yml` の `files:` が `dist/*Setup*.exe` 限定になっているか確認 |
| リリースノートが自動生成の短い文に戻った | `gh release delete --cleanup-tag` した後は再適用が必要 |

## リリース配布ポリシー

- **コード署名なし**: SmartScreen で「不明な発行元」警告が出る。ノートに必ず注意書きを入れる。
- **配布物はインストーラー（NSIS `.exe`）のみ**: portable は廃止済み。
- **対応OS**: Windows 10 / 11 (64-bit)。

## 永続化データのリセット（デバッグ用）

ユーザーのウィンドウサイズ・位置・時間・色設定などをクリアするには：

```
%APPDATA%/countdown-timer/config.json  を削除
```

## ファイル構成メモ

| パス | 用途 |
|------|------|
| `main.js` | Electron main プロセス（ウィンドウ作成・IPC・config永続化） |
| `preload.js` | レンダラに公開する API |
| `src/windows/timer.html/css/js` | タイマー画面 |
| `build/icon.svg` | アイコン ソース（編集したら make-icon.js 再実行） |
| `build/icon.png` `.ico` | 生成物。git には含める |
| `.github/workflows/release.yml` | タグpushでビルド＆リリース公開 |
| `scripts/make-icon.js` | アイコン変換（sharp + png-to-ico） |
