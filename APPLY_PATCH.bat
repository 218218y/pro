@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0APPLY_PATCH.ps1"
if errorlevel 1 (
  echo.
  echo Patch application failed. See the message above.
  exit /b 1
)
echo.
echo Patch application completed successfully.
endlocal
