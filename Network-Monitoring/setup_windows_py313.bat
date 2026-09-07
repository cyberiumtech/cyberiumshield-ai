@echo off
setlocal
echo ========================================
echo Network Monitor - Windows Python 3.13
echo ========================================
where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher was not found.
  echo Install Python 3.13 from python.org and enable "Add Python to PATH".
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  py -3.13 -m venv .venv
  if errorlevel 1 (
    echo Could not create a Python 3.13 environment.
    pause
    exit /b 1
  )
)
echo Upgrading pip...
.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
echo Installing dependencies...
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)
echo.
echo Setup complete.
echo Run: .venv\Scripts\python.exe app.py
echo Then open: http://127.0.0.1:5000
pause
