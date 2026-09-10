import hashlib
import ipaddress
import math
import os
import re
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse

CVE_RE = re.compile(r"^CVE-\d{4}-\d{4,}$", re.I)
SHA256_RE = re.compile(r"^[a-fA-F0-9]{64}$")
SHA1_RE = re.compile(r"^[a-fA-F0-9]{40}$")
MD5_RE = re.compile(r"^[a-fA-F0-9]{32}$")
DOMAIN_RE = re.compile(r"^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,63}$")


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def detect_indicator(value: str):
    value = (value or '').strip()
    if CVE_RE.fullmatch(value):
        return 'cve', value.upper()
    if MD5_RE.fullmatch(value):
        return 'hash', value.lower()
    if SHA1_RE.fullmatch(value):
        return 'hash', value.lower()
    if SHA256_RE.fullmatch(value):
        return 'hash', value.lower()
    try:
        ipaddress.ip_address(value)
        return 'ip', value
    except ValueError:
        pass
    if DOMAIN_RE.fullmatch(value.lower()):
        return 'domain', value.lower()
    parsed = urlparse(value)
    if '://' in value and parsed.hostname and parsed.scheme in {'http', 'https'}:
        return 'url', value
    return 'unknown', value


def url_features(url):
    p = urlparse(url if '://' in url else 'https://' + url)
    host = p.hostname or ''
    path = p.path or ''
    query = p.query or ''
    suspicious_words = ('login','verify','update','secure','account','password','signin','wallet','invoice','payment','confirm')
    return {
        'length': len(url),
        'host_length': len(host),
        'path_length': len(path),
        'query_length': len(query),
        'subdomain_depth': max(0, host.count('.') - 1),
        'digit_ratio': sum(c.isdigit() for c in url) / max(1, len(url)),
        'hyphen_count': url.count('-'),
        'at_symbol': int('@' in url),
        'ip_host': int(_is_ip(host)),
        'punycode': int('xn--' in host.lower()),
        'https': int(p.scheme == 'https'),
        'suspicious_word_count': sum(w in url.lower() for w in suspicious_words),
        'entropy': shannon_entropy(url),
    }


def _is_ip(host):
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def shannon_entropy(s):
    if not s:
        return 0.0
    counts = {}
    for c in s:
        counts[c] = counts.get(c, 0) + 1
    n = len(s)
    return -sum((v/n) * math.log2(v/n) for v in counts.values())


def deterministic_risk(indicator_type, indicator, evidence):
    score = 0
    reasons = []
    if evidence.get('cisa_kev'):
        score += 65; reasons.append('CISA lists this CVE as a Known Exploited Vulnerability.')
    if evidence.get('ransomware_use'):
        score += 15; reasons.append('CISA indicates known ransomware campaign use.')
    cvss = evidence.get('cvss_score')
    if isinstance(cvss, (int, float)):
        score += min(20, max(0, float(cvss) * 2))
        if cvss >= 9: reasons.append(f'Critical CVSS score: {cvss:.1f}.')
        elif cvss >= 7: reasons.append(f'High CVSS score: {cvss:.1f}.')
    if evidence.get('threatfox_matches'):
        score += min(55, 25 + 5 * min(6, evidence['threatfox_matches']))
        reasons.append(f"ThreatFox returned {evidence['threatfox_matches']} matching IOC record(s).")
    if evidence.get('urlhaus_match'):
        score += 70; reasons.append('URLhaus identifies this URL as malicious/malware-related.')
    if evidence.get('dns_resolves') is False and indicator_type == 'domain':
        reasons.append('Domain currently does not resolve from this server.')
    if indicator_type == 'url':
        f = url_features(indicator)
        if f['punycode']: score += 10; reasons.append('URL uses punycode, which can be used for lookalike domains.')
        if f['at_symbol']: score += 12; reasons.append('URL contains @, an uncommon phishing-style construction.')
        if f['ip_host']: score += 10; reasons.append('URL uses a raw IP address as the host.')
        if f['suspicious_word_count'] >= 2: score += 8; reasons.append('URL contains multiple account/security themed keywords.')
        if f['entropy'] > 4.3 and f['length'] > 70: score += 7; reasons.append('URL has unusually high character entropy and length.')
    score = int(min(100, round(score)))
    verdict = 'critical' if score >= 85 else 'high' if score >= 65 else 'medium' if score >= 35 else 'low'
    return score, verdict, reasons


def resolve_domain(domain):
    try:
        answers = socket.getaddrinfo(domain, 443, type=socket.SOCK_STREAM)
        ips = sorted({a[4][0] for a in answers})
        return ips
    except OSError:
        return []
