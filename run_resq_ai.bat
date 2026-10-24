@echo off
title ResQ AI 3D Simulation Platform
echo ========================================================
echo       Starting ResQ AI 3D Disaster Simulation
echo ========================================================
echo.
cd /d "%~dp0resq-ai\backend"
if not exist "%~dp0.venv\Scripts\python.exe" (
    cd /d "%~dp0..\backend"
)

echo Starting Server on http://127.0.0.1:8000 ...
start "" http://127.0.0.1:8000
"%~dp0..\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
