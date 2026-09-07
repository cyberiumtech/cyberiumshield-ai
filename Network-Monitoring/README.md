# Standalone Network Monitoring

A lightweight Windows network monitoring dashboard for Python 3.13.

## Features
- Live TCP/UDP connection list
- Local/remote addresses and ports
- Connection state
- PID and process name
- Upload/download rates
- Network interface status
- Search/filter
- CSV export
- Start/stop monitoring
- No malware classification, ML, quarantine, or automatic blocking

## Windows + Python 3.13

Extract the project, open PowerShell in the project folder, and run:

```powershell
.\setup_windows_py313.bat
```

Then:

```powershell
.\.venv\Scripts\python.exe app.py
```

Open `http://127.0.0.1:5000`.

Some process names/PIDs may show as access denied unless the terminal is run with appropriate Windows permissions. The monitor is read-only and does not modify or block network traffic.
