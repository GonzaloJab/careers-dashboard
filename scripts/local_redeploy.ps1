param(
  [int]$ApiPort = 8000,
  [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

function Import-DotEnvToProcess([string]$path) {
  if (-not (Test-Path $path)) { return }
  $lines = Get-Content $path -ErrorAction Stop
  foreach ($line in $lines) {
    $raw = if ($null -eq $line) { "" } else { [string]$line }
    $t = $raw.Trim()
    if ($t.Length -eq 0) { continue }
    if ($t.StartsWith("#")) { continue }
    $idx = $t.IndexOf("=")
    if ($idx -lt 1) { continue }
    $k = $t.Substring(0, $idx).Trim()
    $v = $t.Substring($idx + 1).Trim()
    if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
      $v = $v.Substring(1, $v.Length - 2)
    }
    if ($k.Length -eq 0) { continue }
    [Environment]::SetEnvironmentVariable($k, $v, "Process")
  }
}

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

function Write-Step($msg) {
  Write-Host ""
  Write-Host "==> $msg"
}

Assert-Command python
Assert-Command npm

$venvDir = Join-Path $repoRoot ".venv"
$venvPy  = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"
$uvicorn = Join-Path $venvDir "Scripts\uvicorn.exe"

Write-Step "Creating venv (if missing)"
if (-not (Test-Path $venvPy)) {
  python -m venv $venvDir | Out-Null
}

Write-Step "Installing backend deps"
& $venvPip install -r (Join-Path $repoRoot "backend\requirements.txt") | Out-Null

Write-Step "Loading .env.local for local run"
$envLocal = Join-Path $repoRoot ".env.local"
if (-not (Test-Path $envLocal)) {
  throw "Missing .env.local. Create it for local runs."
}
Import-DotEnvToProcess $envLocal

Write-Step "Ensuring DB tables exist (import main initializes DB)"
& $venvPy -c "import main; print('DB init ok')" | Out-Null

Write-Step "Seeding local SQLite DB (best-effort)"
try {
  & $venvPy (Join-Path $repoRoot "seed.py") | Out-Null
} catch {
  Write-Host "Seed skipped/failed (non-fatal): $($_.Exception.Message)"
}

Write-Step "Building frontend"
Push-Location (Join-Path $repoRoot "frontend")
if (Test-Path (Join-Path (Get-Location) "dist")) {
  try { Remove-Item -Recurse -Force (Join-Path (Get-Location) "dist") } catch {}
}
npm ci | Out-Null
$env:VITE_API_BASE = "http://127.0.0.1:$ApiPort"
npm run build | Out-Null
Remove-Item Env:\VITE_API_BASE -ErrorAction SilentlyContinue
Pop-Location

Write-Step "Starting API on http://127.0.0.1:$ApiPort"
Write-Host "This opens in a new window. Close that window to stop the API."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile","-ExecutionPolicy","Bypass",
  "-Command", @"
`$ErrorActionPreference = 'Stop'
function Import-DotEnv([string]`$path) {
  if (-not (Test-Path `$path)) { return }
  foreach (`$line in (Get-Content `$path)) {
    `$raw = if (`$null -eq `$line) { '' } else { [string]`$line }
    `$t = `$raw.Trim()
    if (`$t.Length -eq 0) { continue }
    if (`$t.StartsWith('#')) { continue }
    `$idx = `$t.IndexOf('=')
    if (`$idx -lt 1) { continue }
    `$k = `$t.Substring(0, `$idx).Trim()
    `$v = `$t.Substring(`$idx + 1).Trim()
    if ((`$v.StartsWith('\"') -and `$v.EndsWith('\"')) -or (`$v.StartsWith(\"'\") -and `$v.EndsWith(\"'\"))) {
      `$v = `$v.Substring(1, `$v.Length - 2)
    }
    if (`$k.Length -eq 0) { continue }
    [Environment]::SetEnvironmentVariable(`$k, `$v, 'Process')
  }
}
Import-DotEnv `"$envLocal`"
& `"$uvicorn`" main:app --host 127.0.0.1 --port $ApiPort
"@
)

Write-Step "Serving built frontend on http://127.0.0.1:$WebPort"
Write-Host "This opens in a new window. Close that window to stop the web server."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile","-ExecutionPolicy","Bypass",
  "-Command", "cd `"$repoRoot\frontend`"; npx --yes serve -s dist -l $WebPort"
)

Write-Step "Done"
Write-Host "Open: http://127.0.0.1:$WebPort"
Write-Host "API health: http://127.0.0.1:$ApiPort/health"

