import os, sqlite3, json
from datetime import datetime, timezone

DB = os.getenv('THREAT_INTEL_DB', 'threat_intel.db')

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with conn() as c:
        c.execute('''CREATE TABLE IF NOT EXISTS observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            indicator TEXT NOT NULL,
            indicator_type TEXT NOT NULL,
            score INTEGER NOT NULL,
            verdict TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )''')
        c.execute('CREATE INDEX IF NOT EXISTS idx_obs_indicator ON observations(indicator)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_obs_created ON observations(created_at)')

def save_observation(result):
    with conn() as c:
        c.execute('INSERT INTO observations(indicator, indicator_type, score, verdict, result_json, created_at) VALUES (?,?,?,?,?,?)',
                  (result['indicator'], result['indicatorType'], result['riskScore'], result['verdict'], json.dumps(result), datetime.now(timezone.utc).isoformat()))

def recent(limit=50):
    with conn() as c:
        rows = c.execute('SELECT * FROM observations ORDER BY id DESC LIMIT ?', (min(max(int(limit),1),200),)).fetchall()
        return [dict(r) for r in rows]
