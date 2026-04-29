@echo off
cd /d "C:\Users\Free user\yunix"
python scripts\filter_user_export.py
echo Exit code: %ERRORLEVEL%
pause
