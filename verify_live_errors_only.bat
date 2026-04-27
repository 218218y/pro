@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM verify_live_errors_only_v7.bat
REM
REM Double-click friendly:
REM   - When launched by double-click (or without the __inner flag),
REM     it opens a NEW cmd window with "cmd /k" so it WILL NOT close at the end.
REM
REM What it does:
REM  - Runs checks sequentially and CONTINUES even if one fails
REM  - Shows FULL output LIVE in the SAME console window
REM  - Produces ONE log file that contains ONLY FAILED steps + full output:
REM      logs\verify_errors_YYYYMMDD_HHMMSS.log
REM  - Runs npm install at the start
REM  - If Node/npm missing, attempts to install Node LTS via winget/choco (best effort)
REM
REM Options:
REM   --ci       Skip heavy steps (bundle + release parity)
REM   --nopause  Do not pause at the end
REM ============================================================

REM ---------- Self relaunch into a persistent window (double-click safe) ----------
if /i "%~1"=="__inner" (
  shift
  goto :main
)

REM If you run from a terminal and DON'T want a new window:
REM   run:  verify_live_errors_only_v7.bat __inner
start "Verify (live)" cmd /k ""%~f0" __inner %*"
exit /b 0

:main
cd /d "%~dp0"

echo ============================================================
echo verify_live_errors_only_v7
echo Script: %~f0
echo Folder: %CD%
echo ============================================================
echo.

REM Make console output readable for Node/TS UTF-8 output
chcp 65001 >nul

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "RUNSTAMP=%%i"

set "LOGDIR=%CD%\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>nul

set "ERRORLOG=%LOGDIR%\verify_errors_%RUNSTAMP%.log"
set "TEMPDIR=%TEMP%\verify_tmp_%RUNSTAMP%"
if not exist "%TEMPDIR%" mkdir "%TEMPDIR%" >nul 2>nul

set "PSRUNNER=%TEMPDIR%\run_step.ps1"

REM ------------------------------------------------------------
REM PowerShell runner:
REM  - Runs command via cmd.exe and merges stderr -> stdout inside cmd
REM  - Tees output to a per-step temp log (so we can append ONLY on failure)
REM  - Writes exit code to a .code file (so BAT logic is reliable)
REM ------------------------------------------------------------
>"%PSRUNNER%"  echo $ErrorActionPreference = 'Continue'
>>"%PSRUNNER%" echo try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch {}
>>"%PSRUNNER%" echo try { $OutputEncoding = [Console]::OutputEncoding } catch {}
>>"%PSRUNNER%" echo $cmd = $env:VERIFY_CMD
>>"%PSRUNNER%" echo $log = $env:VERIFY_STEPLOG
>>"%PSRUNNER%" echo $codeFile = $env:VERIFY_CODEFILE
>>"%PSRUNNER%" echo if(-not $cmd) { Write-Host "Missing VERIFY_CMD"; exit 1 }
>>"%PSRUNNER%" echo if(-not $log) { Write-Host "Missing VERIFY_STEPLOG"; exit 1 }
>>"%PSRUNNER%" echo if(-not $codeFile) { Write-Host "Missing VERIFY_CODEFILE"; exit 1 }
>>"%PSRUNNER%" echo cmd.exe /d /s /c "$cmd 2^>^&1" ^| Tee-Object -FilePath $log
>>"%PSRUNNER%" echo $code = $LASTEXITCODE
>>"%PSRUNNER%" echo Set-Content -Path $codeFile -Value $code -NoNewline -Encoding Ascii
>>"%PSRUNNER%" echo exit 0

set "CI=0"
set "NOPAUSE=0"
if /i "%~1"=="--ci" set "CI=1"
if /i "%~1"=="--nopause" set "NOPAUSE=1"
if /i "%~2"=="--ci" set "CI=1"
if /i "%~2"=="--nopause" set "NOPAUSE=1"

set /a FAILCOUNT=0

echo Errors-only log (created ONLY if something fails):
echo   %ERRORLOG%
echo.

REM 0) Ensure Node + npm exist (best-effort auto-install)
call :ensureNode
if errorlevel 1 (
  echo.
  echo Cannot continue without Node.js + npm.
  goto :finish
)

REM 1) Install deps (requested)
call :run "00_npm_install" "npm install"

REM 2) Verify-style checks
call :run "01_check_strict" "npm run check:strict"
call :run "02_format_check" "npm run format:check"
call :run "03_lint" "npm run lint"

REM TypeScript breakdown
call :run "04_typecheck_boot" "npm run typecheck:boot"
call :run "05_typecheck_strict_boot" "node tools/wp_typecheck.js --mode strict-boot"
call :run "06_typecheck_data" "npm run typecheck:data"
call :run "07_typecheck_io" "npm run typecheck:io"
call :run "08_typecheck_services" "npm run typecheck:services"
call :run "09_typecheck_js" "npm run typecheck:js"
call :run "10_typecheck_kernel" "npm run typecheck:kernel"
call :run "11_typecheck_platform" "npm run typecheck:platform"
call :run "12_typecheck_builder" "npm run typecheck:builder"
call :run "13_typecheck_ui" "npm run typecheck:ui"
call :run "14_typecheck_runtime" "npm run typecheck:runtime"
call :run "15_typecheck_adapters_browser" "npm run typecheck:adapters-browser"
call :run "16_typecheck_strictcore" "npm run typecheck:strictcore"
call :run "17_typecheck_strict_runtime" "npm run typecheck:strict-runtime"
call :run "18_typecheck_strict_adapters_browser" "npm run typecheck:strict-adapters-browser"
call :run "19_typecheck_strict_kernel" "npm run typecheck:strict-kernel"
call :run "20_typecheck_strict_services" "npm run typecheck:strict-services"
call :run "21_typecheck_strict_platform" "npm run typecheck:strict-platform"
call :run "22_typecheck_strict_ui" "npm run typecheck:strict-ui"

REM Misc verify steps
call :run "23_pdf_template_check" "node tools/wp_pdf_template_check.js"
call :run "24_cycles_esm" "node tools/wp_cycles.js esm"
call :run "25_build_dist_no_assets" "node tools/wp_build_dist.js --no-assets"
call :run "26_esm_check" "node tools/wp_esm_check.js"
call :run "27_three_vendor_contract" "node tools/wp_three_vendor_contract.js"

call :run "28_ui_contract" "npm run ui:contract"
call :run "29_contract_layers" "npm run contract:layers"
call :run "30_contract_api" "npm run contract:api"
call :run "31_wiring_guard" "npm run wiring:guard"
call :run "32_ui_dom_guard" "npm run ui:dom-guard"
call :run "33_ui_bindkey_guard" "npm run ui:bindkey-guard"

call :run "34_test" "npm run test"

if "%CI%"=="0" (
  call :run "35_bundle" "npm run bundle"
  call :run "36_release_parity" "node tools/wp_release_parity.js --require-dist --require-release --artifacts-only"
) else (
  echo ============================================================
  echo Skipping heavy steps (bundle + release parity) due to --ci
  echo ============================================================
  echo.
)

:finish
echo ============================================================
echo DONE. Failed steps: %FAILCOUNT%
echo ============================================================
echo.

if %FAILCOUNT% EQU 0 (
  echo All steps passed.
  if exist "%ERRORLOG%" del "%ERRORLOG%" >nul 2>nul
) else (
  echo Some steps failed.
  echo Errors-only log:
  echo   %ERRORLOG%
)

REM Cleanup temp files
rmdir /s /q "%TEMPDIR%" >nul 2>nul

if "%NOPAUSE%"=="0" (
  echo.
  echo Window will stay open. Press any key to close...
  pause
)

REM IMPORTANT: do NOT use "exit" here (would close the /k window in some setups)
REM Just return control to cmd prompt.
endlocal
goto :eof


REM ============================================================
REM Functions
REM ============================================================

:ensureNode
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 goto :ensureNpm

echo Node.js is not installed (node not found).
echo Attempting to install Node.js LTS automatically (best effort)...

where winget >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Using winget...
  winget install -e --id OpenJS.NodeJS.LTS --source winget --accept-package-agreements --accept-source-agreements
) else (
  where choco >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo Using Chocolatey...
    choco install nodejs-lts -y
  ) else (
    echo Automatic install not available (winget/choco not found).
    echo Please install Node.js LTS manually, then rerun this script.
    exit /b 1
  )
)

REM Try to make node available in this session (common install path)
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Node.js install attempt finished, but 'node' is still not on PATH.
  echo Close this window, open a new terminal, then rerun the script.
  exit /b 1
)

:ensureNpm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo npm was not found even though node exists. Please reinstall Node.js.
  exit /b 1
)

echo Node + npm are available.
exit /b 0


:run
set "STEP=%~1"
set "CMDLINE=%~2"
set "STEPLOG=%TEMPDIR%\%STEP%.log"
set "CODEFILE=%TEMPDIR%\%STEP%.code"

echo ============================================================
echo Running %STEP%
echo   %CMDLINE%
echo ============================================================

set "VERIFY_CMD=%CMDLINE%"
set "VERIFY_STEPLOG=%STEPLOG%"
set "VERIFY_CODEFILE=%CODEFILE%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%PSRUNNER%"

set "CODE=1"
if exist "%CODEFILE%" (
  for /f "usebackq delims=" %%c in ("%CODEFILE%") do set "CODE=%%c"
)

del /q "%CODEFILE%" >nul 2>nul

REM Normalize (trim spaces)
for /f "tokens=* delims= " %%x in ("%CODE%") do set "CODE=%%x"

if not "%CODE%"=="0" (
  set /a FAILCOUNT+=1
  echo.
  echo FAILED %STEP% (exit %CODE%)
  echo.
  call :appendFail "%STEP%" "%CODE%" "%CMDLINE%" "%STEPLOG%"
) else (
  echo.
  echo OK %STEP%
  echo.
)

REM Delete per-step temp output immediately (we keep ONLY the single error log)
del /q "%STEPLOG%" >nul 2>nul

exit /b 0


:appendFail
set "A_STEP=%~1"
set "A_CODE=%~2"
set "A_CMD=%~3"
set "A_LOG=%~4"

REM Safety: never append if code is 0
if "%A_CODE%"=="0" exit /b 0

if not exist "%ERRORLOG%" (
  >"%ERRORLOG%"  echo Verify errors-only log (FAILED STEPS ONLY)
  >>"%ERRORLOG%" echo Run: %RUNSTAMP%
  >>"%ERRORLOG%" echo Script: %~f0
  >>"%ERRORLOG%" echo Project: %CD%
  >>"%ERRORLOG%" echo.
)

>>"%ERRORLOG%" echo ============================================================
>>"%ERRORLOG%" echo STEP: %A_STEP%
>>"%ERRORLOG%" echo EXIT: %A_CODE%
>>"%ERRORLOG%" echo CMD : %A_CMD%
>>"%ERRORLOG%" echo ------------------------------------------------------------
type "%A_LOG%" >> "%ERRORLOG%"
>>"%ERRORLOG%" echo.
>>"%ERRORLOG%" echo.

exit /b 0
