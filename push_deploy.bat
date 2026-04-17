@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Usage:
REM   push_deploy.bat "your commit message"

cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=chore: deploy"

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\push_deploy.ps1" -Message "%MSG%"

endlocal

