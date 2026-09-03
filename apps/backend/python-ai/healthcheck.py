#!/usr/bin/env python3
"""Simple health check script for Docker."""
import sys
import urllib.request

try:
    response = urllib.request.urlopen('http://localhost:8000/health', timeout=5)
    if response.status == 200:
        sys.exit(0)
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
