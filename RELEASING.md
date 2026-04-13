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

# 4. タグを push（これで GitHub Actions が自動ビルド）
git push && git push --tags
```

数分後、`https://github.com/gegege1566/countdown-timer/releases` に
インストーラー (`Countdown.Timer.Setup.x.x.x.exe`) が公開されます。

## ビルド状況の確認

```bash
gh run list --limit 3          # 最近の実行を一覧
gh run watch                   # 実行中のワークフローをリアルタイム監視
gh run view <ID> --log-failed  # 失敗ログを確認
```

## リリースの確認・操作

```bash
gh release list                                   # リリース一覧
gh release view v1.0.1                            # 詳細
gh release view v1.0.1 --json assets -q '.assets[].name'   # アセット一覧
gh release delete-asset v1.0.1 <ファイル名> --yes # 余計なアセットを削除
gh release delete v1.0.1 --yes --cleanup-tag      # リリース+タグを削除
```

## 既存リリースをやり直したい場合

```bash
# 1. 既存のリリースとタグを削除
gh release delete v1.0.1 --yes --cleanup-tag
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1

# 2. コード修正＆コミット
git add -A && git commit -m "修正内容"
git push

# 3. 再タグ付け＆push
git tag v1.0.1 -m "v1.0.1"
git push origin v1.0.1
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

## 永続化データのリセット（デバッグ用）

ユーザーのウィンドウサイズ・位置・時間・色設定などをクリアするには：

```
%APPDATA%/countdown-timer/config.json  を削除
```
