"""Batch persistence for native network observations."""
import json
import os
from datetime import datetime
import pymysql


def save_connections(rows):
    if not rows: return
    database = pymysql.connect(host=os.getenv('CYBERSHIELD_DB_HOST', '127.0.0.1'), port=int(os.getenv('CYBERSHIELD_DB_PORT', '3306')),
        user=os.getenv('CYBERSHIELD_DB_USER', 'cybershield'), password=os.getenv('CYBERSHIELD_DB_PASSWORD', 'cybershield'),
        database=os.getenv('CYBERSHIELD_DB_NAME', 'cybershield'), charset='utf8mb4', autocommit=True)
    values = [(r.get('protocol'), r.get('local_address'), r.get('remote_address'), r.get('status'),
        int(r['pid']) if r.get('pid') else None, r.get('process'), r.get('bytes_sent') or None,
        r.get('bytes_recv') or None, json.dumps(r), datetime.utcnow()) for r in rows]
    try:
        with database.cursor() as cursor:
            cursor.executemany('''INSERT INTO network_monitoring_records
              (protocol,local_address,remote_address,connection_status,process_id,process_name,bytes_sent,bytes_received,payload,observed_at)
              VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''', values)
    finally:
        database.close()
