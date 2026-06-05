param(
    [string]$RepoUrl = "https://github.com/koxman2022-rgb/-Codex-.git",
    [string]$TargetDir = "$HOME\Documents\急診病摘優化外掛",
    [string]$GitUserName = "",
    [string]$GitUserEmail = "",
    [switch]$SkipGitInstall
)

$ErrorActionPreference = "Stop"

function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Refresh-Path

if (-not (Test-Command "git")) {
    if ($SkipGitInstall) {
        throw "Git is not installed or not in PATH. Install Git first, then rerun this script."
    }

    if (-not (Test-Command "winget")) {
        throw "Git is missing and winget is not available. Install Git for Windows manually, then rerun this script."
    }

    Write-Host "Git not found. Installing Git for Windows..."
    winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
    Refresh-Path
}

if (-not (Test-Command "git")) {
    throw "Git installation finished, but git is still not available in PATH. Open a new PowerShell window and rerun this script."
}

$targetParent = Split-Path -Parent $TargetDir
if (-not (Test-Path -LiteralPath $targetParent)) {
    New-Item -ItemType Directory -Force -Path $targetParent | Out-Null
}

if (Test-Path -LiteralPath (Join-Path $TargetDir ".git")) {
    Write-Host "Existing Git repo found. Pulling latest changes..."
    git -C $TargetDir pull --ff-only
}
elseif (Test-Path -LiteralPath $TargetDir) {
    $existingItems = Get-ChildItem -LiteralPath $TargetDir -Force
    if ($existingItems.Count -gt 0) {
        throw "Target folder exists but is not an empty Git repo: $TargetDir"
    }

    Write-Host "Empty target folder found. Cloning project..."
    git clone $RepoUrl $TargetDir
}
else {
    Write-Host "Cloning project..."
    git clone $RepoUrl $TargetDir
}

git -C $TargetDir config core.quotepath false

if ($GitUserName.Trim() -ne "") {
    git -C $TargetDir config user.name $GitUserName
}

if ($GitUserEmail.Trim() -ne "") {
    git -C $TargetDir config user.email $GitUserEmail
}

$branch = git -C $TargetDir branch --show-current
$status = git -C $TargetDir status --short --branch

Write-Host ""
Write-Host "Codex project sync is ready."
Write-Host "Project folder: $TargetDir"
Write-Host "Current branch: $branch"
Write-Host ""
Write-Host $status
Write-Host ""
Write-Host "Open this folder in Codex:"
Write-Host $TargetDir
