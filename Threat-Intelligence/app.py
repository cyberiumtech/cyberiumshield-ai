import copy
import json
import os
import re
import threading
import time
from datetime import date
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

from intel_engine import detect_indicator, deterministic_risk, resolve_domain, url_features, utc_now
from model import RiskModel
from providers import nvd_cve, threatfox_search
from storage import init_db, recent, save_observation


CISA_KEV_URL = os.getenv(
    'CISA_KEV_URL',
    'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
)
CACHE_TTL_SECONDS = max(60, int(os.getenv('THREAT_INTEL_CACHE_TTL_SECONDS', '900')))
MAX_STALE_SECONDS = max(CACHE_TTL_SECONDS, int(os.getenv('THREAT_INTEL_MAX_STALE_SECONDS', '86400')))
MAX_RESPONSE_BYTES = 16 * 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 20
USER_AGENT = 'CyberShield-AI-Threat-Intelligence/2.0'
CVE_PATTERN = re.compile(r'^CVE-\d{4}-\d{4,}$', re.IGNORECASE)

app = Flask(__name__)
model = RiskModel()
init_db()

_cache_lock = threading.RLock()
_cache = {
    'catalog': None,
    'fetched_monotonic': 0.0,
    'etag': '',
    'last_modified': '',
    'last_error': '',
}
_worker_lock = threading.Lock()
_worker_started = False


class FeedError(Exception):
    pass


def _text(value):
    return value.strip() if isinstance(value, str) else ''


def _iso_date(value):
    candidate = _text(value)
    try:
        date.fromisoformat(candidate)
    except ValueError:
        return ''
    return candidate


def normalize_catalog(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get('vulnerabilities'), list):
        raise FeedError('CISA returned an unexpected catalog format.')

    vulnerabilities = []
    seen = set()
    for raw in payload['vulnerabilities']:
        if not isinstance(raw, dict):
            continue
        cve = _text(raw.get('cveID')).upper()
        date_added = _iso_date(raw.get('dateAdded'))
        if not CVE_PATTERN.fullmatch(cve) or not date_added or cve in seen:
            continue
        seen.add(cve)
        vulnerabilities.append({
            'cveID': cve,
            'vendorProject': _text(raw.get('vendorProject')),
            'product': _text(raw.get('product')),
            'vulnerabilityName': _text(raw.get('vulnerabilityName')),
            'dateAdded': date_added,
            'shortDescription': _text(raw.get('shortDescription')),
            'requiredAction': _text(raw.get('requiredAction')),
            'dueDate': _iso_date(raw.get('dueDate')),
            'knownRansomwareCampaignUse': _text(raw.get('knownRansomwareCampaignUse')),
            'notes': _text(raw.get('notes')),
            'cwes': [item.strip() for item in raw.get('cwes', []) if isinstance(item, str) and item.strip()]
            if isinstance(raw.get('cwes'), list) else [],
        })

    if not vulnerabilities:
        raise FeedError('CISA returned a catalog with no valid vulnerability records.')

    declared_count = payload.get('count')
    if not isinstance(declared_count, int) or isinstance(declared_count, bool):
        declared_count = None
    return {
        'title': _text(payload.get('title')) or 'CISA Known Exploited Vulnerabilities Catalog',
        'catalogVersion': _text(payload.get('catalogVersion')),
        'dateReleased': _text(payload.get('dateReleased')),
        'declaredCount': declared_count,
        'vulnerabilities': vulnerabilities,
    }


def fetch_upstream_catalog(etag='', last_modified=''):
    headers = {'Accept': 'application/json', 'User-Agent': USER_AGENT}
    if etag:
        headers['If-None-Match'] = etag
    if last_modified:
        headers['If-Modified-Since'] = last_modified
    upstream_request = Request(CISA_KEV_URL, headers=headers, method='GET')
    try:
        response = urlopen(upstream_request, timeout=REQUEST_TIMEOUT_SECONDS)
    except HTTPError as error:
        if error.code == 304:
            return None, etag, last_modified
        raise FeedError(f'CISA KEV returned HTTP {error.code}.') from error
    except (URLError, TimeoutError, OSError) as error:
        reason = getattr(error, 'reason', error)
        raise FeedError(f'CISA KEV could not be reached: {reason}') from error

    with response:
        length = response.headers.get('Content-Length')
        try:
            if length and int(length) > MAX_RESPONSE_BYTES:
                raise FeedError('CISA KEV response exceeded the maximum allowed size.')
        except ValueError as error:
            raise FeedError('CISA returned an invalid Content-Length header.') from error
        body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            raise FeedError('CISA KEV response exceeded the maximum allowed size.')
        try:
            payload = json.loads(body.decode('utf-8-sig'))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise FeedError('CISA returned malformed JSON.') from error
        return (
            normalize_catalog(payload),
            response.headers.get('ETag', ''),
            response.headers.get('Last-Modified', ''),
        )


def get_catalog(force=False):
    with _cache_lock:
        cached = copy.deepcopy(_cache['catalog'])
        age = max(0, int(time.monotonic() - _cache['fetched_monotonic'])) if cached else None
        etag = _cache['etag']
        last_modified = _cache['last_modified']
        if cached and not force and age < CACHE_TTL_SECONDS:
            cached.update(sourceStatus='cache', cacheAgeSeconds=age)
            return cached

    try:
        catalog, new_etag, new_last_modified = fetch_upstream_catalog(etag, last_modified)
        fetched_at = utc_now()
        with _cache_lock:
            if catalog is None:
                if _cache['catalog'] is None:
                    raise FeedError('CISA returned not-modified without a cached catalog.')
                _cache['fetched_monotonic'] = time.monotonic()
                _cache['catalog']['fetchedAt'] = fetched_at
                result = copy.deepcopy(_cache['catalog'])
            else:
                catalog['fetchedAt'] = fetched_at
                _cache.update(
                    catalog=copy.deepcopy(catalog),
                    fetched_monotonic=time.monotonic(),
                    etag=new_etag,
                    last_modified=new_last_modified,
                    last_error='',
                )
                result = copy.deepcopy(catalog)
        result.update(sourceStatus='live', cacheAgeSeconds=0)
        return result
    except FeedError as error:
        with _cache_lock:
            _cache['last_error'] = str(error)
            cached = copy.deepcopy(_cache['catalog'])
            age = max(0, int(time.monotonic() - _cache['fetched_monotonic'])) if cached else None
        if cached and age <= MAX_STALE_SECONDS:
            cached.update(
                sourceStatus='stale',
                cacheAgeSeconds=age,
                warning=f'Live refresh failed; showing last-known-good CISA data. {error}',
            )
            return cached
        raise


def _catalog_entry(cve):
    catalog = get_catalog()
    return next((item for item in catalog['vulnerabilities'] if item['cveID'] == cve), None)


def _refresh_loop():
    while True:
        try:
            get_catalog(force=True)
        except FeedError:
            pass
        time.sleep(CACHE_TTL_SECONDS)


def _start_refresh_worker():
    global _worker_started
    if app.config.get('TESTING') or _worker_started:
        return
    with _worker_lock:
        if not _worker_started:
            threading.Thread(target=_refresh_loop, daemon=True, name='cisa-kev-refresh').start()
            _worker_started = True


@app.before_request
def start_refresh_worker():
    _start_refresh_worker()


@app.after_request
def secure_response(response):
    origin = request.headers.get('Origin')
    allowed = {
        item.strip()
        for item in os.getenv(
            'THREAT_INTEL_CORS_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173',
        ).split(',')
        if item.strip()
    }
    if origin in allowed:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


@app.get('/api/health')
def health():
    with _cache_lock:
        cached = _cache['catalog'] is not None
        age = max(0, int(time.monotonic() - _cache['fetched_monotonic'])) if cached else None
    return jsonify(
        status='ok',
        service='CyberShield AI Threat Intelligence',
        source='CISA KEV',
        cached=cached,
        cache_age_seconds=age,
        time=utc_now(),
        modelLoaded=bool(model.model),
        providers={'NVD': True, 'ThreatFox': bool(os.getenv('THREATFOX_AUTH_KEY'))},
    )


@app.get('/api/kev')
def kev_catalog():
    force = request.args.get('refresh', '').lower() in {'1', 'true', 'yes'}
    try:
        return jsonify(get_catalog(force=force))
    except FeedError as error:
        return jsonify(error=str(error)), 502


@app.get('/api/history')
def history():
    raw_limit = request.args.get('limit', '50')
    try:
        limit = min(max(int(raw_limit), 1), 200)
    except (TypeError, ValueError):
        return jsonify(error='limit must be an integer between 1 and 200'), 400
    return jsonify(observations=recent(limit))


@app.post('/api/indicator/check')
def check_indicator():
    body = request.get_json(silent=True) or {}
    raw = str(body.get('indicator', '')).strip()
    if not raw:
        return jsonify(error='indicator is required'), 400
    if len(raw) > 4096:
        return jsonify(error='indicator is too long'), 400
    indicator_type, indicator = detect_indicator(raw)
    if indicator_type == 'unknown':
        return jsonify(error='Unsupported indicator. Use CVE, IPv4/IPv6, domain, URL, MD5, SHA1 or SHA256.'), 400

    evidence = {}
    provider_errors = []
    details = {}
    if indicator_type == 'cve':
        try:
            nvd = nvd_cve(indicator)
            details['nvd'] = nvd
            if nvd:
                evidence['cvss_score'] = nvd.get('cvssScore')
        except Exception as error:
            provider_errors.append(f'NVD: {error}')
        try:
            kev = _catalog_entry(indicator)
            if kev:
                evidence['cisa_kev'] = True
                evidence['ransomware_use'] = (
                    kev.get('knownRansomwareCampaignUse', '').lower() == 'known'
                )
                details['cisaKEV'] = kev
        except FeedError as error:
            provider_errors.append(f'CISA KEV: {error}')
    if indicator_type in {'ip', 'domain', 'url', 'hash'}:
        try:
            threat_fox = threatfox_search(indicator)
            details['threatFox'] = threat_fox
            evidence['threatfox_matches'] = len(threat_fox.get('matches', []))
        except Exception as error:
            provider_errors.append(f'ThreatFox: {error}')
    if indicator_type == 'domain':
        addresses = resolve_domain(indicator)
        details['dns'] = {'resolves': bool(addresses), 'addresses': addresses}
        evidence['dns_resolves'] = bool(addresses)
    if indicator_type == 'url':
        features = url_features(indicator)
        details['urlFeatures'] = features
        details['mlProbability'] = model.score_url(features)
        if details['mlProbability'] is not None and details['mlProbability'] >= .8:
            evidence['ml_high_risk'] = True

    score, verdict, reasons = deterministic_risk(indicator_type, indicator, evidence)
    if evidence.get('ml_high_risk'):
        score = min(100, score + 10)
        reasons.append(
            f"The trained URL model estimated {details['mlProbability'] * 100:.1f}% malicious probability."
        )
    result = {
        'indicator': indicator,
        'indicatorType': indicator_type,
        'riskScore': score,
        'verdict': verdict,
        'reasons': reasons,
        'checkedAt': utc_now(),
        'evidence': evidence,
        'details': details,
        'providerErrors': provider_errors,
        'model': {'loaded': bool(model.model), 'used': details.get('mlProbability') is not None},
    }
    save_observation(result)
    return jsonify(result)


@app.get('/api/feeds')
def feeds():
    with _cache_lock:
        catalog = _cache['catalog']
        fetched_at = catalog.get('fetchedAt') if catalog else None
        count = len(catalog['vulnerabilities']) if catalog else 0
        last_error = _cache['last_error']
    cisa = {
        'status': 'error' if last_error and not catalog else 'live' if catalog else 'not_loaded',
        'count': count,
        'fetchedAt': fetched_at,
        'lastKnownGood': bool(catalog),
    }
    if last_error:
        cisa['error'] = last_error
    return jsonify(
        cisaKEV=cisa,
        nvd={'configured': True},
        threatFox={'configured': bool(os.getenv('THREATFOX_AUTH_KEY'))},
    )


if __name__ == '__main__':
    from waitress import serve

    serve(
        app,
        host=os.getenv('THREAT_INTEL_HOST', '127.0.0.1'),
        port=int(os.getenv('THREAT_INTEL_PORT', '5005')),
    )
