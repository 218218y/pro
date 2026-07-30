@echo off
setlocal
cd /d "%~dp0\.."
where py >nul 2>nul
if errorlevel 1 goto use_python
py -3 tools\bootstrap_offline_prettier.py %*
goto done

:use_python
python tools\bootstrap_offline_prettier.py %*

:done
exit /b %errorlevel%
