# Prompt To Use On Another Computer

Paste this into Codex on the other Windows computer:

```text
請幫我設定這台 Windows 電腦同步我的 Codex 專案。

如果目前資料夾裡有 codex-sync/setup-other-windows.ps1，請執行：

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\codex-sync\setup-other-windows.ps1

如果腳本不在目前資料夾，請建立或使用以下設定：

- Repo URL: https://github.com/koxman2022-rgb/-Codex-.git
- Target folder: %USERPROFILE%\Documents\急診病摘優化外掛
- 若 Git 未安裝，使用 winget 安裝 Git.Git
- 若 target folder 不存在，git clone repo 到 target folder
- 若 target folder 已存在且是 Git repo，執行 git pull --ff-only
- 設定該 repo 的 core.quotepath=false，讓中文路徑正常顯示

完成後請告訴我專案位置、目前 branch、是否已追蹤 origin/main。
```

