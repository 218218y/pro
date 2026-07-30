@echo off
setlocal
cd /d "%~dp0\.."
python tools\bootstrap_offline_tsx.py %*
exit /b %errorlevel%
