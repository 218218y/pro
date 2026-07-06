@echo off
setlocal EnableExtensions

title Bargig - Build and Deploy All Cloudflare Pages
cd /d "%~dp0"

echo ==========================================
echo  Bargig - build and deploy to Cloudflare
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js and try again.
  goto fail
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js/npm and try again.
  goto fail
)

where npx >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npx was not found. Install Node.js/npm and try again.
  goto fail
)

if not exist "package.json" (
  echo [ERROR] package.json was not found. Run this file from the project root folder.
  goto fail
)

echo [1/4] Building main site: npm run bundle
echo ------------------------------------------
call npm run bundle
if errorlevel 1 goto fail

echo.
echo [2/4] Building customer site: npm run bundle:site2
echo ------------------------------------------
call npm run bundle:site2
if errorlevel 1 goto fail

if not exist "dist\release" (
  echo [ERROR] Main release folder was not created: dist\release
  goto fail
)

if not exist "dist\site2\release" (
  echo [ERROR] Customer release folder was not created: dist\site2\release
  goto fail
)

echo.
echo [3/4] Deploying main site to Cloudflare Pages: bargig-pro
echo ------------------------------------------
call npx --yes wrangler pages deploy "dist\release" --project-name bargig-pro --branch main
if errorlevel 1 goto fail

echo.
echo [4/4] Deploying customer site to Cloudflare Pages: bargig-pro2
echo ------------------------------------------
call npx --yes wrangler pages deploy "dist\site2\release" --project-name bargig-pro2 --branch main
if errorlevel 1 goto fail

echo.
echo ==========================================
echo  Done. Both sites were built and deployed.
echo ==========================================
pause
exit /b 0

:fail
echo.
echo ==========================================
echo  FAILED. The process stopped at the first error.
echo  Read the error above, fix it, and run again.
echo ==========================================
pause
exit /b 1
