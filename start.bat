@echo off
echo Starting Community Intelligence Platform...

:: Check for python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python 3.10+ and try again.
    pause
    exit /b
)


:: Start Backend
echo Starting FastAPI server in the background...
if exist .venv\Scripts\activate.bat (
    start cmd /k "call .venv\Scripts\activate && cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    start cmd /k "call venv\Scripts\activate && cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
)

:: Setup Frontend
echo.
echo ===================================
echo Setting up Frontend Environment...
echo ===================================
cd frontend
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
)

:: Start Frontend
echo Starting Vite server...
npm run dev
