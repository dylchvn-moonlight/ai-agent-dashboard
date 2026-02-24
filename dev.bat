@echo off
title AI Agent Dashboard - Dev Server
echo.
echo  AI Agent Dashboard - Starting Dev Server...
echo  ============================================
echo.
cd /d "%~dp0"
npx concurrently "npx vite" "npx wait-on http://localhost:5173 && npx electron ."
