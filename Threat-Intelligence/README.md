# Threat Intelligence Service

Defensive CISA Known Exploited Vulnerabilities (KEV) feed service for CyberShield AI.

The service validates and normalizes upstream records, caches successful responses for 15 minutes,
uses conditional requests, and serves last-known-good data for up to 24 hours when CISA is temporarily
unavailable. It never fabricates threat records.

## Run locally

```powershell
python -m pip install -r requirements.txt
python app.py
```

The service listens on `http://127.0.0.1:5005` by default.

For a production-style local process, run
`waitress-serve --listen=127.0.0.1:5005 app:app`. The Docker configuration uses Waitress rather
than Flask's development server.

- `GET /api/health` — local service and cache status
- `GET /api/kev` — cached normalized CISA KEV catalog
- `GET /api/kev?refresh=1` — force an upstream refresh

Environment variables: `THREAT_INTEL_HOST`, `THREAT_INTEL_PORT`,
`THREAT_INTEL_CACHE_TTL_SECONDS`, `THREAT_INTEL_MAX_STALE_SECONDS`,
`THREAT_INTEL_CORS_ORIGINS`, and `CISA_KEV_URL`.
