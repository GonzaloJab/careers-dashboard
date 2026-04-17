param(
  [int]$ApiPort = 8000,
  [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"

# Convenience wrapper so you can run:
#   powershell -File scripts/local_redeploy.ps1
#
# It delegates to the existing "prod-like" local runner.

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$target = Join-Path $repoRoot "scripts\local_deploy_test.ps1"

if (-not (Test-Path $target)) {
  throw "Missing script: $target"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $target -ApiPort $ApiPort -WebPort $WebPort

