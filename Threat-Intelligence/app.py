import copy
import json
import os
import re
import threading
import time
from datetime import date, datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request


CISA_KEV_URL = os.getenv(
    'CISA_KEV_URL',
    'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
)
CACHE_TTL_SECONDS = max(60, int(os.getenv('THREAT_INTEL_CACHE_TTL_SECONDS', '900')))
MAX_STALE_SECONDS = max(CACHE_TTL_SECONDS, int(os.getenv('THREAT_INTEL_MAX_STALE_SECONDS', '86400')))
MAX_RESPONSE_BYTES = 16 * 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 15
USER_AGENT = 'CyberShield-AI-Threat-Intelligence/1.0'
CVE_PATTERN = re.compile(r'^CVE-\d{4}-\d{4,}$', re.IGNORECASE)

app = Flask(__name__)
_cache_lock = threading.Lock()
_cache = {
    'catalog': None,
    'fetched_monotonic': 0.0,
    'etag': '',
    'last_modified': '',
}


class FeedError(Exception):
    pass


def utc_now():
    return datetime.now(timezone.utc).isoformat()


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
        if not CVE_PATTERN.fullmatch(cve) or not date_added:
            continue
        if cve in seen:
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
                )
                result = copy.deepcopy(catalog)
        result.update(sourceStatus='live', cacheAgeSeconds=0)
        return result
    except FeedError as error:
        with _cache_lock:
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
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


@app.route('/api/health')
def health():
    with _cache_lock:
        cached = _cache['catalog'] is not None
        age = max(0, int(time.monotonic() - _cache['fetched_monotonic'])) if cached else None
    return jsonify(status='ok', source='CISA KEV', cached=cached, cache_age_seconds=age, time=utc_now())


@app.route('/api/kev')
def kev_catalog():
    force = request.args.get('refresh', '').lower() in {'1', 'true', 'yes'}
    try:
        return jsonify(get_catalog(force=force))
    except FeedError as error:
        return jsonify(error=str(error)), 502


if __name__ == '__main__':
    app.run(
        host=os.getenv('THREAT_INTEL_HOST', '127.0.0.1'),
        port=int(os.getenv('THREAT_INTEL_PORT', '5005')),
        debug=False,
    )
