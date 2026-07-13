@echo off
setlocal EnableExtensions

title Bargig - Build and Deploy All Cloudflare Pages
cd /d "%~dp0"

set "MAIN_BUILD_SCRIPT=release:bargig:main"
set "SITE2_BUILD_SCRIPT=release:bargig:site2"
set "MAIN_RELEASE_DIR=dist\sites\bargig\main\release"
set "SITE2_RELEASE_DIR=dist\sites\bargig\site2\release"
set "MAIN_CLOUDFLARE_PROJECT=bargig-pro"
set "SITE2_CLOUDFLARE_PROJECT=bargig-pro2"

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

echo [1/4] Building main site: npm run %MAIN_BUILD_SCRIPT%
echo ------------------------------------------
call npm run %MAIN_BUILD_SCRIPT%
if errorlevel 1 goto fail

echo.
echo [2/4] Building customer site: npm run %SITE2_BUILD_SCRIPT%
echo ------------------------------------------
call npm run %SITE2_BUILD_SCRIPT%
if errorlevel 1 goto fail

if not exist "%MAIN_RELEASE_DIR%" (
  echo [ERROR] Main release folder was not created: %MAIN_RELEASE_DIR%
  goto fail
)

if not exist "%SITE2_RELEASE_DIR%" (
  echo [ERROR] Customer release folder was not created: %SITE2_RELEASE_DIR%
  goto fail
)

echo.
echo [3/4] Deploying main site to Cloudflare Pages: %MAIN_CLOUDFLARE_PROJECT%
echo ------------------------------------------
call npx --yes wrangler pages deploy "%MAIN_RELEASE_DIR%" --project-name %MAIN_CLOUDFLARE_PROJECT% --branch main
if errorlevel 1 goto fail

echo.
echo [4/4] Deploying customer site to Cloudflare Pages: %SITE2_CLOUDFLARE_PROJECT%
echo ------------------------------------------
call npx --yes wrangler pages deploy "%SITE2_RELEASE_DIR%" --project-name %SITE2_CLOUDFLARE_PROJECT% --branch main
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
