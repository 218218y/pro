@echo off
setlocal
cd /d "%~dp0"
title Wardrobe Pro - Main + Site2

echo ==========================================
echo      STARTING BOTH DEVELOPMENT SITES
echo ==========================================
echo.
echo Main:  http://localhost:5173/index_pro.html
echo Site2: http://localhost:5174/index_site2.html
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [CRITICAL ERROR] Node.js is not installed.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

call npm run start:pair
set EXIT_CODE=%ERRORLEVEL%

echo.
echo Both development servers stopped.
pause
exit /b %EXIT_CODE%
