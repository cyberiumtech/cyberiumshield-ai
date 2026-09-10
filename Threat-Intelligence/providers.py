import os, requests
from datetime import datetime, timezone

NVD_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
THREATFOX_URL = 'https://threatfox-api.abuse.ch/api/v1/'


def nvd_cve(cve):
    headers = {'User-Agent':'CyberShield-AI-Threat-Intelligence/2.0'}
    key = os.getenv('NVD_API_KEY','').strip()
    if key: headers['apiKey'] = key
    r = requests.get(NVD_URL, params={'cveId':cve}, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()
    vulns = data.get('vulnerabilities') or []
    if not vulns: return None
    c = vulns[0].get('cve', {})
    metrics = c.get('metrics', {})
    score = None; severity = None; vector = None
    for key in ('cvssMetricV40','cvssMetricV31','cvssMetricV30','cvssMetricV2'):
        arr = metrics.get(key) or []
        if arr:
            cvss = arr[0].get('cvssData', {})
            score = cvss.get('baseScore'); severity = cvss.get('baseSeverity'); vector = cvss.get('vectorString'); break
    desc = next((x.get('value') for x in c.get('descriptions',[]) if x.get('lang')=='en'), '')
    return {'id': c.get('id'), 'published': c.get('published'), 'lastModified': c.get('lastModified'),
            'description': desc, 'cvssScore': score, 'severity': severity, 'vector': vector,
            'references': [x.get('url') for x in c.get('references',[]) if x.get('url')]}


def threatfox_search(ioc):
    key = os.getenv('THREATFOX_AUTH_KEY','').strip()
    if not key: return {'configured':False, 'matches':[]}
    r = requests.post(THREATFOX_URL, headers={'Auth-Key':key, 'User-Agent':'CyberShield-AI-Threat-Intelligence/2.0'},
                      json={'query':'search_ioc','search_term':ioc,'exact_match':True}, timeout=15)
    r.raise_for_status(); data=r.json()
    return {'configured':True, 'matches': data.get('data') or [], 'status':data.get('query_status')}
