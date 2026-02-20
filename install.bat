@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

echo ================================================================
echo   Resolution Center - Dependency Installer
echo ================================================================
echo.

:: ---------------------------------------------------------------
:: 1. Check Python
:: ---------------------------------------------------------------
echo [1/4] Checking Python...
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo   ERROR: Python not found. Install from https://www.python.org/downloads/
    pause
    exit /b 1
)
FOR /F "tokens=*" %%i IN ('python --version') DO echo   Found: %%i

:: ---------------------------------------------------------------
:: 2. Install Python dependencies
:: ---------------------------------------------------------------
echo.
echo [2/4] Installing Python dependencies from backend\requirements.txt...
pip install -r backend\requirements.txt
IF %ERRORLEVEL% NEQ 0 (
    echo   ERROR: pip install failed. Make sure pip is available.
    pause
    exit /b 1
)
echo   Python dependencies installed successfully.

:: ---------------------------------------------------------------
:: 3. Check Node.js and install frontend packages
:: ---------------------------------------------------------------
echo.
echo [3/4] Checking Node.js...
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo   ERROR: Node.js not found. Install from https://nodejs.org/en/download/
    pause
    exit /b 1
)
FOR /F "tokens=*" %%i IN ('node --version') DO echo   Found Node: %%i

echo   Installing frontend dependencies...
cd frontend
npm install
IF %ERRORLEVEL% NEQ 0 (
    echo   ERROR: npm install failed.
    cd ..
    pause
    exit /b 1
)
cd ..
echo   Frontend dependencies installed successfully.

:: ---------------------------------------------------------------
:: 4. Check Ollama and pull model
:: ---------------------------------------------------------------
echo.
echo [4/4] Checking Ollama and pulling model (llama3.2)...
ollama --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo   WARNING: Ollama not found. Install from https://ollama.com/download
    echo   After installing, run:  ollama pull llama3.2
) ELSE (
    FOR /F "tokens=*" %%i IN ('ollama --version') DO echo   Found: %%i
    echo   Pulling llama3.2 model (this may take a few minutes on first run)...
    ollama pull llama3.2
    IF %ERRORLEVEL% NEQ 0 (
        echo   WARNING: Could not pull llama3.2. Run manually: ollama pull llama3.2
    ) ELSE (
        echo   Model ready.
    )
)

:: ---------------------------------------------------------------
:: Done
:: ---------------------------------------------------------------
echo.
echo ================================================================
echo   All dependencies installed successfully!
echo.
echo   To start the application:
echo     Backend : cd backend  ^&^&  uvicorn main:app --port 8000
echo     Frontend: cd frontend ^&^&  npm run dev
echo ================================================================
echo.
pause
