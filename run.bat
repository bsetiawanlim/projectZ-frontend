@echo off
setlocal enabledelayedexpansion
title Project Z - Dev Servers (Backend :3000 + Frontend :3001)

cd /d "%~dp0"

echo ==============================================================
echo             PROJECT Z - FULLSTACK DEV SERVERS
echo ==============================================================
echo   * Backend API    : http://localhost:3000
echo   * Swagger Docs   : http://localhost:3000/documentation
echo   * Web App Client : http://localhost:3001
echo   * Table Ordering : http://localhost:3001/order/table
echo ==============================================================
echo.

where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] pnpm was not found in your PATH. Please install or add pnpm to your system PATH.
    pause
    exit /b 1
)

if "%1"=="--split" goto :SPLIT
if "%1"=="-s" goto :SPLIT

if exist "%~dp0run.exe" (
    "%~dp0run.exe" %*
    goto :eof
)

echo Starting unified servers watcher... (Press Ctrl+C to stop all)
pnpm --dir backend run servers
goto :eof

:SPLIT
echo Spawning separate server windows...
start "Project Z - Backend (:3000)" cmd /k "cd /d %~dp0backend && pnpm run dev"
start "Project Z - Web Frontend (:3001)" cmd /k "cd /d %~dp0frontend && pnpm dev"
echo Both servers have been launched in separate windows.
