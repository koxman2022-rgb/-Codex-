# Codex Project Sync Setup

Use this folder to connect another Windows computer to the same Codex project.

## What This Syncs

- Project files
- `AGENTS.md`
- `.codex/config.toml`
- Project documentation and test files

## What This Does Not Sync

- Codex login state
- Codex threads and sessions
- Codex worktrees
- Local logs, caches, tokens, cookies, or `.env` files

Each computer should sign in to Codex separately. The project itself syncs through GitHub.

## Quick Setup On Another Windows PC

1. Copy this project folder or just this `codex-sync` folder to the other PC.
2. Open PowerShell.
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\codex-sync\setup-other-windows.ps1
```

The script will:

- Install Git with `winget` if Git is missing.
- Clone this repo from GitHub if the project folder is missing.
- Pull the latest changes if the project folder already exists.
- Configure Git to display Chinese file paths correctly.

Default target folder:

```text
%USERPROFILE%\Documents\急診病摘優化外掛
```

Default repo:

```text
https://github.com/koxman2022-rgb/-Codex-.git
```

## Custom Target Folder

```powershell
.\codex-sync\setup-other-windows.ps1 -TargetDir "D:\Projects\急診病摘優化外掛"
```

## Optional Git Identity

If you want the script to set Git author identity for this repo:

```powershell
.\codex-sync\setup-other-windows.ps1 -GitUserName "Your Name" -GitUserEmail "you@example.com"
```

## Daily Use

Before working:

```powershell
git pull
```

After changes:

```powershell
git add .
git commit -m "Describe your change"
git push
```

## Open In Codex

After setup, open Codex and choose this project folder:

```text
%USERPROFILE%\Documents\急診病摘優化外掛
```

