"""One-time, idempotent import of legacy runtime data and ML artifacts into MySQL."""
from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime
from pathlib import Path

import pymysql

ROOT = Path(__file__).resolve().parents[1]


def mysql_connection():
    return pymysql.connect(host='127.0.0.1', port=3306, user='cybershield', password='cybershield',
        database='cybershield', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor, autocommit=False)


def parse_date(value):
    if not value: return None
    if isinstance(value, datetime): return value.replace(tzinfo=None)
    try: return datetime.fromisoformat(str(value).replace('Z', '+00:00')).replace(tzinfo=None)
    except ValueError: return None


def import_threat_intelligence(db):
    path = ROOT / 'Threat-Intelligence' / 'threat_intel.db'
    if not path.exists(): return 0
    source = sqlite3.connect(path); source.row_factory = sqlite3.Row
    rows = source.execute('SELECT * FROM observations ORDER BY id').fetchall(); imported = 0
    with db.cursor() as cursor:
        for row in rows:
            cursor.execute('SELECT id FROM threat_intelligence_observations WHERE indicator=%s AND created_at=%s LIMIT 1',
                (row['indicator'], parse_date(row['created_at'])))
            if cursor.fetchone(): continue
            cursor.execute('''INSERT INTO threat_intelligence_observations(indicator,indicator_type,risk_score,verdict,result,created_at)
                VALUES(%s,%s,%s,%s,%s,%s)''', (row['indicator'], row['indicator_type'], row['score'], row['verdict'],
                row['result_json'], parse_date(row['created_at']) or datetime.utcnow()))
            imported += 1
    source.close(); return imported


def import_vulnerabilities(db):
    path = ROOT / 'Vulnerability-Management' / 'vulnerability_manager.db'
    if not path.exists(): return 0
    source = sqlite3.connect(path); source.row_factory = sqlite3.Row
    total = 0; asset_map = {}; scan_map = {}
    with db.cursor() as cursor:
        for row in source.execute('SELECT * FROM assets ORDER BY id'):
            cursor.execute('SELECT id FROM vulnerability_assets WHERE name=%s AND address=%s LIMIT 1', (row['name'], row['address']))
            found = cursor.fetchone()
            if found: asset_map[row['id']] = found['id']; continue
            cursor.execute('''INSERT INTO vulnerability_assets(name,address,owner,environment,notes,created_at)
                VALUES(%s,%s,%s,%s,%s,%s)''', (row['name'],row['address'],row['owner'],row['environment'],row['notes'],parse_date(row['created_at']) or datetime.utcnow()))
            asset_map[row['id']] = cursor.lastrowid; total += 1
        for row in source.execute('SELECT * FROM scans ORDER BY id'):
            cursor.execute('SELECT id FROM vulnerability_scans WHERE asset_id <=> %s AND started_at <=> %s LIMIT 1',
                (asset_map.get(row['asset_id']), parse_date(row['started_at'])))
            found = cursor.fetchone()
            if found: scan_map[row['id']] = found['id']; continue
            cursor.execute('''INSERT INTO vulnerability_scans(asset_id,started_at,finished_at,status,ports,open_ports)
                VALUES(%s,%s,%s,%s,%s,%s)''', (asset_map.get(row['asset_id']),parse_date(row['started_at']),parse_date(row['finished_at']),row['status'],row['ports'],row['open_ports']))
            scan_map[row['id']] = cursor.lastrowid; total += 1
        for row in source.execute('SELECT * FROM scan_findings ORDER BY id'):
            cursor.execute('''SELECT id FROM vulnerability_scan_findings
                WHERE asset_id <=> %s AND scan_id <=> %s AND port <=> %s AND detected_at <=> %s LIMIT 1''',
                (asset_map.get(row['asset_id']), scan_map.get(row['scan_id']), row['port'], parse_date(row['detected_at'])))
            if cursor.fetchone(): continue
            cursor.execute('''INSERT INTO vulnerability_scan_findings(asset_id,scan_id,port,protocol,service,banner,risk_score,risk_level,detected_at)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)''', (asset_map.get(row['asset_id']),scan_map.get(row['scan_id']),row['port'],row['protocol'],row['service'],row['banner'],row['risk_score'],row['risk_level'],parse_date(row['detected_at']) or datetime.utcnow()))
            total += 1
        for row in source.execute('SELECT * FROM vulnerabilities ORDER BY id'):
            cursor.execute('SELECT id FROM vulnerability_findings WHERE cve=%s AND title=%s AND asset_id <=> %s LIMIT 1', (row['cve'],row['title'],asset_map.get(row['asset_id'])))
            if cursor.fetchone(): continue
            cursor.execute('''INSERT INTO vulnerability_findings(asset_id,cve,title,description,severity,cvss,kev,status,due_date,assigned_to,remediation,notes,source,created_at,updated_at)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''', (asset_map.get(row['asset_id']),row['cve'],row['title'],row['description'],row['severity'],row['cvss'],row['kev'],row['status'],parse_date(row['due_date']),row['assigned_to'],row['remediation'],row['notes'],row['source'],parse_date(row['created_at']),parse_date(row['updated_at'])))
            total += 1
    source.close(); return total


def import_security_logs(db):
    imported = 0
    with db.cursor() as cursor:
        for path in (ROOT / 'malware-detector' / 'logs').glob('security_log_*.json'):
            try: rows = json.loads(path.read_text(encoding='utf-8'))
            except (OSError, json.JSONDecodeError): continue
            for row in rows if isinstance(rows, list) else []:
                occurred = parse_date(row.get('timestamp')) or datetime.utcnow()
                title = f"{row.get('event_type', 'EVENT')}: {row.get('file_name', 'unknown')}"
                cursor.execute('SELECT id FROM security_events WHERE title=%s AND occurred_at=%s LIMIT 1', (title, occurred))
                if cursor.fetchone(): continue
                score = float(row.get('threat_score') or 0)
                severity = 'critical' if score >= 90 else 'high' if score >= 70 else 'medium' if score >= 50 else 'info'
                cursor.execute('''INSERT INTO security_events(event_type,source,severity,title,payload,occurred_at,created_at)
                    VALUES(%s,'malware-detector',%s,%s,%s,%s,%s)''', (row.get('event_type','EVENT'),severity,title,json.dumps(row),occurred,occurred))
                imported += 1
    return imported


def import_models(db):
    artifacts = [
        ('malware-detection', ROOT/'malware-detector/models/android_rf.joblib'),
        ('phishing-detection', ROOT/'phishing-detector/model/phishing_model.joblib'),
        ('email-spam-detection', ROOT/'email-spam-detector/model/spam_pipeline.joblib'),
        ('threat-intelligence', ROOT/'Threat-Intelligence/models/risk_model.joblib'),
        ('vulnerability-management', ROOT/'Vulnerability-Management/models/risk_model.pkl'),
    ]
    imported = 0
    with db.cursor() as cursor:
        for domain, path in artifacts:
            if not path.exists(): continue
            content = path.read_bytes(); checksum = hashlib.sha256(content).hexdigest()
            cursor.execute('SELECT id FROM model_artifacts WHERE checksum_sha256=%s', (checksum,))
            if cursor.fetchone(): continue
            cursor.execute('''INSERT INTO model_artifacts(domain,name,version,framework,checksum_sha256,content_type,size_bytes,artifact,metadata_json,is_active,created_at)
                VALUES(%s,%s,'1','joblib',%s,'application/octet-stream',%s,%s,%s,1,%s)''',
                (domain,path.name,checksum,len(content),content,json.dumps({'original_path': str(path.relative_to(ROOT))}),datetime.utcnow()))
            imported += 1
    return imported


def main():
    db = mysql_connection()
    try:
        counts = {'threat_observations': import_threat_intelligence(db), 'vulnerability_rows': import_vulnerabilities(db),
            'security_events': import_security_logs(db), 'model_artifacts': import_models(db)}
        db.commit()
        print(json.dumps(counts, indent=2))
    except Exception:
        db.rollback(); raise
    finally: db.close()


if __name__ == '__main__': main()
