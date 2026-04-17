@echo off
setlocal

REM One-click local "prod-like" run (Windows)
REM - Builds frontend
REM - Starts FastAPI backend
REM - Serves frontend/dist

cd /d "%~dp0.."

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local_deploy_test.ps1"

endlocal

