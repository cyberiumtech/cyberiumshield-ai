import os, threading, time
from flask import Flask, jsonify, request
from dotenv import load_dotenv
load_dotenv()
from intel_engine import detect_indicator, deterministic_risk, url_features, resolve_domain, utc_now
from providers import nvd_cve, threatfox_search
from model import RiskModel
from storage import init_db, save_observation, recent

app=Flask(__name__)
model=RiskModel()
init_db()

CORS=set(x.strip() for x in os.getenv('THREAT_INTEL_CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(',') if x.strip())

def cors(resp):
    origin=request.headers.get('Origin')
    if origin in CORS:
        resp.headers['Access-Control-Allow-Origin']=origin; resp.headers['Vary']='Origin'
        resp.headers['Access-Control-Allow-Headers']='Content-Type'; resp.headers['Access-Control-Allow-Methods']='GET,POST,OPTIONS'
    resp.headers['Cache-Control']='no-store'; resp.headers['X-Content-Type-Options']='nosniff'; return resp
app.after_request(cors)

@app.get('/api/health')
def health():
    return jsonify(status='ok', service='CyberShield AI Threat Intelligence', time=utc_now(), modelLoaded=bool(model.model), providers={'NVD':True,'ThreatFox':bool(os.getenv('THREATFOX_AUTH_KEY'))})

@app.get('/api/history')
def history(): return jsonify(observations=recent(request.args.get('limit',50)))

@app.post('/api/indicator/check')
def check_indicator():
    body=request.get_json(silent=True) or {}
    raw=str(body.get('indicator','')).strip()
    if not raw: return jsonify(error='indicator is required'),400
    typ, indicator=detect_indicator(raw)
    if typ=='unknown': return jsonify(error='Unsupported indicator. Use CVE, IPv4/IPv6, domain, URL, MD5, SHA1 or SHA256.'),400
    evidence={}; provider_errors=[]; details={}
    if typ=='cve':
        try:
            nvd=nvd_cve(indicator); details['nvd']=nvd
            if nvd: evidence['cvss_score']=nvd.get('cvssScore')
        except Exception as e: provider_errors.append(f'NVD: {e}')
        # KEV lookup is done against a small live catalog cache in this service.
        kev=KEV.get(indicator)
        if kev:
            evidence['cisa_kev']=True; evidence['ransomware_use']=str(kev.get('knownRansomwareCampaignUse','')).lower()=='known'; details['cisaKEV']=kev
    if typ in {'ip','domain','url','hash'}:
        try:
            tf=threatfox_search(indicator); details['threatFox']=tf; evidence['threatfox_matches']=len(tf.get('matches',[]))
        except Exception as e: provider_errors.append(f'ThreatFox: {e}')
    if typ=='domain':
        ips=resolve_domain(indicator); details['dns']={'resolves':bool(ips),'addresses':ips}; evidence['dns_resolves']=bool(ips)
    if typ=='url':
        f=url_features(indicator); details['urlFeatures']=f; details['mlProbability']=model.score_url(f)
        if details['mlProbability'] is not None and details['mlProbability']>=.8:
            evidence['ml_high_risk']=True
    score, verdict, reasons=deterministic_risk(typ,indicator,evidence)
    if evidence.get('ml_high_risk'):
        score=min(100,score+10); reasons.append(f"The trained URL model estimated {details['mlProbability']*100:.1f}% malicious probability.")
    result={'indicator':indicator,'indicatorType':typ,'riskScore':score,'verdict':verdict,'reasons':reasons,
            'checkedAt':utc_now(),'evidence':evidence,'details':details,'providerErrors':provider_errors,
            'model':{'loaded':bool(model.model),'used':details.get('mlProbability') is not None}}
    save_observation(result)
    return jsonify(result)

# KEV is loaded at startup and refreshed in the background. The app remains useful if CISA is temporarily down.
KEV={}; KEV_META={'status':'not_loaded'}
CISA_URL=os.getenv('CISA_KEV_URL','https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json')

def refresh_kev():
    import requests
    global KEV, KEV_META
    try:
        r=requests.get(CISA_URL,headers={'User-Agent':'CyberShield-AI-Threat-Intelligence/2.0'},timeout=20); r.raise_for_status(); data=r.json()
        items=data.get('vulnerabilities',[]); KEV={x.get('cveID','').upper():x for x in items if x.get('cveID')}
        KEV_META={'status':'live','count':len(KEV),'fetchedAt':utc_now(),'catalogVersion':data.get('catalogVersion')}
    except Exception as e:
        KEV_META={'status':'error','count':len(KEV),'error':str(e),'lastKnownGood':bool(KEV)}

def loop():
    while True:
        refresh_kev(); time.sleep(max(300,int(os.getenv('THREAT_INTEL_CACHE_TTL_SECONDS','900'))))
threading.Thread(target=loop,daemon=True).start()

@app.get('/api/feeds')
def feeds(): return jsonify(cisaKEV=KEV_META, nvd={'configured':True}, threatFox={'configured':bool(os.getenv('THREATFOX_AUTH_KEY'))})

if __name__=='__main__':
    from waitress import serve
    serve(app, host=os.getenv('THREAT_INTEL_HOST','127.0.0.1'), port=int(os.getenv('THREAT_INTEL_PORT','5005')))
