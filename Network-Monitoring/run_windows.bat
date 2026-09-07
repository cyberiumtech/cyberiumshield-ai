@echo off
if not exist ".venv\Scripts\python.exe" (
  echo Virtual environment not found. Run setup_windows_py313.bat first.
  pause
  exit /b 1
)
.venv\Scripts\python.exe app.py
