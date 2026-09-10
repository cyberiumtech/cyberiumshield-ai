import os, sqlite3, json
from datetime import datetime, timezone

DB = os.getenv('THREAT_INTEL_DB', 'threat_intel.db')

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = conn()
    try:
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
        c.commit()
    finally:
        c.close()

def save_observation(result):
    c = conn()
    try:
        c.execute('INSERT INTO observations(indicator, indicator_type, score, verdict, result_json, created_at) VALUES (?,?,?,?,?,?)',
                  (result['indicator'], result['indicatorType'], result['riskScore'], result['verdict'], json.dumps(result), datetime.now(timezone.utc).isoformat()))
        c.commit()
    finally:
        c.close()

def recent(limit=50):
    c = conn()
    try:
        rows = c.execute('SELECT * FROM observations ORDER BY id DESC LIMIT ?', (min(max(int(limit),1),200),)).fetchall()
        observations = []
        for row in rows:
            stored = dict(row)
            try:
                result = json.loads(stored['result_json'])
                if not isinstance(result, dict):
                    raise TypeError('stored result is not an object')
            except (KeyError, TypeError, json.JSONDecodeError):
                result = {
                    'indicator': stored.get('indicator', ''),
                    'indicatorType': stored.get('indicator_type', 'unknown'),
                    'riskScore': stored.get('score', 0),
                    'verdict': stored.get('verdict', 'low'),
                    'checkedAt': stored.get('created_at', ''),
                    'reasons': [],
                    'evidence': {},
                    'details': {},
                    'providerErrors': ['The stored result could not be decoded.'],
                    'model': {'loaded': False, 'used': False},
                }
            result['id'] = stored['id']
            observations.append(result)
        return observations
    finally:
        c.close()
