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
set "WRANGLER_BIN=%~dp0node_modules\.bin\wrangler.cmd"

echo ==========================================
echo  Bargig - build and deploy to Cloudflare
echo ==========================================
echo.
echo  Wrangler CLI: local project dependency ^(pinned by package.json + package-lock.json^)
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

if not exist "package.json" (
  echo [ERROR] package.json was not found. Run this file from the project root folder.
  goto fail
)

if not exist "%WRANGLER_BIN%" (
  echo [ERROR] Local Wrangler was not found: %WRANGLER_BIN%
  echo         Run npm install first. The project intentionally does not download Wrangler during deploy.
  goto fail
)

node -e "const p=require('./package.json'); const w=require('./node_modules/wrangler/package.json'); if (p.devDependencies.wrangler !== w.version) { console.error('[ERROR] Wrangler version mismatch: package.json=' + p.devDependencies.wrangler + ' installed=' + w.version); process.exit(1); } console.log(' Installed Wrangler: ' + w.version);"
if errorlevel 1 goto fail

echo.

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
call "%WRANGLER_BIN%" pages deploy "%MAIN_RELEASE_DIR%" --project-name "%MAIN_CLOUDFLARE_PROJECT%" --branch main
if errorlevel 1 goto fail

echo.
echo [4/4] Deploying customer site to Cloudflare Pages: %SITE2_CLOUDFLARE_PROJECT%
echo ------------------------------------------
call "%WRANGLER_BIN%" pages deploy "%SITE2_RELEASE_DIR%" --project-name "%SITE2_CLOUDFLARE_PROJECT%" --branch main
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
