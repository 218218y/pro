@echo off
title WardrobePro - E2E Smoke Tests
echo ==========================================
echo        WardrobePro - E2E Smoke Tests
echo ==========================================

echo.
echo Installing dependencies (npm install)...
call npm install
IF %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)

echo.
echo Running E2E smoke tests...
call npm run e2e:smoke
echo.
echo Done. Press any key to close.
pause
