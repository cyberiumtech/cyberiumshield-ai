import json
import os
from datetime import datetime
import pymysql

def save_scan(result):
    database = pymysql.connect(host=os.getenv('CYBERSHIELD_DB_HOST','127.0.0.1'), port=int(os.getenv('CYBERSHIELD_DB_PORT','3306')),
        user=os.getenv('CYBERSHIELD_DB_USER','cybershield'), password=os.getenv('CYBERSHIELD_DB_PASSWORD','cybershield'),
        database=os.getenv('CYBERSHIELD_DB_NAME','cybershield'), charset='utf8mb4', autocommit=True)
    try:
        with database.cursor() as cursor:
            cursor.execute('''INSERT INTO phishing_scans(url,verdict,score,confidence,model_name,model_version,result,scanned_at)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s)''', (result['url'], result['prediction'], result['phishing_probability']*100,
                result['confidence'], result.get('model'), result.get('model_version'), json.dumps(result), datetime.utcnow()))
    finally: database.close()
