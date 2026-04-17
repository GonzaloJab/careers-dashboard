@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Usage:
REM   deploy.bat "your commit message"

cd /d "%~dp0" || exit /b 1

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo Not inside a git repo.
  exit /b 1
)

set "MSG=%~1"
if "%MSG%"=="" set "MSG=Auto-deploy: update deploy branch"

for /f %%A in ('git status --porcelain') do set "DIRTY=1"

if not defined DIRTY (
  echo Working tree clean. Nothing to commit.
) else (
  echo.
  echo ^>^> git add -A
  git add -A
  if errorlevel 1 exit /b 1

  echo.
  echo ^>^> git commit -m "%MSG%"
  git commit -m "%MSG%"
  if errorlevel 1 exit /b 1
)

echo.
echo ^>^> git push origin main
git push origin main
if errorlevel 1 exit /b 1

echo.
echo ^>^> git fetch origin --prune
git fetch origin --prune
if errorlevel 1 exit /b 1

echo.
echo ^>^> git push origin main:deploy
git push origin main:deploy
if errorlevel 1 exit /b 1

echo.
echo Done. Pushed main and updated deploy (GitHub Actions should auto-deploy).
