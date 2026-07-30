@echo off
setlocal
python "%~dp0bootstrap_offline_typescript.py" %*
exit /b %errorlevel%
