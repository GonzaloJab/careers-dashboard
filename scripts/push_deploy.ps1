param(
  [string]$Message = "chore: deploy",
  [string]$EnvPath = "",
  [switch]$UpdateEnvSecret
)

$ErrorActionPreference = "Stop"

function Assert-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

Assert-Command git

if ($UpdateEnvSecret) {
  if (-not $EnvPath) {
    $EnvPath = (Join-Path $repoRoot ".env")
  }
  $envFile = (Resolve-Path $EnvPath -ErrorAction Stop).Path

  Write-Step "Encoding .env to base64"
  $raw = Get-Content $envFile -Raw -ErrorAction Stop
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($raw))

  if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Step "Updating GitHub secret CAREERS_ENV_B64 (requires gh auth)"
    # Note: this requires `gh auth login` once.
    & gh secret set CAREERS_ENV_B64 -b $b64 | Out-Host
  } else {
    Write-Step "GitHub CLI (gh) not found"
    Write-Host "Copy/paste this into GitHub Secrets as CAREERS_ENV_B64:"
    Write-Host $b64
  }
}

Write-Step "Committing local changes (if any)"
$dirty = (git status --porcelain)
if ($dirty) {
  git add -A
  git commit -m $Message
} else {
  Write-Host "Working tree clean. No commit created."
}

Write-Step "Pushing main"
git push origin main

Write-Step "Updating deploy branch (push main -> deploy)"
git push origin main:deploy

Write-Step "Done"
Write-Host "If GitHub Actions is enabled, pushing to deploy triggers the server deploy."

