@echo off
echo Starting Problem Solver Project...

:: Start Backend
echo Starting Backend (Python/FastAPI)...
start "Backend Server" cmd /k "cd /d c:\Balaji\Career\ProblemSolver && call .venv\Scripts\activate && cd backend && python main.py"

:: Start Frontend
echo Starting Frontend (React/Vite)...
start "Frontend Client" cmd /k "cd /d c:\Balaji\Career\ProblemSolver\frontend && npm run dev"

echo.
echo ========================================================
echo Backend and Frontend are launching in separate windows.
echo Please do not close those windows.
echo ========================================================
pause
