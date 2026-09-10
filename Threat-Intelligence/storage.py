"""MySQL-backed threat-intelligence observation storage."""
import json
import os
from datetime import datetime, timezone

try:
    import pymysql
except ImportError:
    pymysql = None
from urllib.request import Request, urlopen


def conn():
    if pymysql is None:
        raise RuntimeError('PyMySQL is not installed')
    return pymysql.connect(
        host=os.getenv('CYBERSHIELD_DB_HOST', '127.0.0.1'),
        port=int(os.getenv('CYBERSHIELD_DB_PORT', '3306')),
        user=os.getenv('CYBERSHIELD_DB_USER', 'cybershield'),
        password=os.getenv('CYBERSHIELD_DB_PASSWORD', 'cybershield'),
        database=os.getenv('CYBERSHIELD_DB_NAME', 'cybershield'),
        charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor, autocommit=False,
    )


def init_db():
    if pymysql is None:
        return
    with conn() as database:
        with database.cursor() as cursor:
            cursor.execute('''CREATE TABLE IF NOT EXISTS threat_intelligence_observations (
                id INTEGER PRIMARY KEY AUTO_INCREMENT, indicator VARCHAR(2048) NOT NULL,
                indicator_type VARCHAR(50) NOT NULL, risk_score INTEGER NOT NULL,
                verdict VARCHAR(30) NOT NULL, result JSON NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX ix_threat_observation_type (indicator_type),
                INDEX ix_threat_observation_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''')
        database.commit()


def save_observation(result):
    if pymysql is None:
        request = Request(
            os.getenv('CYBERSHIELD_API_URL', 'http://127.0.0.1:8000/api/v1') + '/storage/threat-intelligence',
            data=json.dumps(result).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=10):
            pass
        return
    with conn() as database:
        with database.cursor() as cursor:
            cursor.execute(
                '''INSERT INTO threat_intelligence_observations
                   (indicator, indicator_type, risk_score, verdict, result, created_at)
                   VALUES (%s,%s,%s,%s,%s,%s)''',
                (result['indicator'], result['indicatorType'], result['riskScore'], result['verdict'],
                 json.dumps(result), datetime.now(timezone.utc).replace(tzinfo=None)),
            )
        database.commit()


def recent(limit=50):
    safe_limit = min(max(int(limit), 1), 200)
    if pymysql is None:
        url = os.getenv('CYBERSHIELD_API_URL', 'http://127.0.0.1:8000/api/v1') + f'/storage/threat-intelligence?limit={safe_limit}'
        with urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    with conn() as database:
        with database.cursor() as cursor:
            cursor.execute('SELECT * FROM threat_intelligence_observations ORDER BY id DESC LIMIT %s', (safe_limit,))
            rows = cursor.fetchall()
    observations = []
    for stored in rows:
        value = stored.get('result')
        try:
            result = json.loads(value) if isinstance(value, str) else value
            if not isinstance(result, dict): raise TypeError
        except (TypeError, json.JSONDecodeError):
            result = {
                'indicator': stored.get('indicator', ''), 'indicatorType': stored.get('indicator_type', 'unknown'),
                'riskScore': stored.get('risk_score', 0), 'verdict': stored.get('verdict', 'low'),
                'checkedAt': stored.get('created_at').isoformat() if stored.get('created_at') else '',
                'reasons': [], 'evidence': {}, 'details': {},
                'providerErrors': ['The stored result could not be decoded.'],
                'model': {'loaded': False, 'used': False},
            }
        result['id'] = stored['id']
        observations.append(result)
    return observations
