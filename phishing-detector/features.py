"""
features.py
Shared URL feature-extraction logic for CyberShield AI phishing detection.
The SAME function is used to build the training dataset and to score
URLs live in the Flask app, so training/serving never drift apart.
"""

import re
import math
from urllib.parse import urlparse

SUSPICIOUS_WORDS = [
    "login", "verify", "update", "secure", "account", "banking", "confirm",
    "signin", "sign-in", "webscr", "password", "credential", "suspend",
    "unlock", "limited", "recover", "wallet", "invoice", "billing",
    "urgent", "alert", "click", "reward", "gift", "bonus"
]

SHORTENERS = [
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "shorte.st", "rebrand.ly"
]

IP_PATTERN = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")

# Legitimate infrastructure that is nonetheless *frequently abused* for
# phishing because it inherits the provider's trusted TLS/reputation and
# lets anyone spin up a throwaway subdomain in seconds. A hit here doesn't
# mean "phishing" by itself -- lots of real dev traffic uses these too --
# but combined with a random/hyphenated subdomain it's a strong signal.
DYNAMIC_HOSTING_DOMAINS = [
    "trycloudflare.com", "ngrok.io", "ngrok-free.app", "ngrok.app",
    "pages.dev", "workers.dev", "repl.co", "glitch.me", "herokuapp.com",
    "netlify.app", "vercel.app", "surge.sh", "web.app", "firebaseapp.com",
    "000webhostapp.com", "weebly.com", "wixsite.com", "blogspot.com",
    "duckdns.org", "no-ip.org", "ddns.net", "serveo.net", "loca.lt",
]

FEATURE_NAMES = [
    "url_length", "domain_length", "path_length", "num_dots", "num_hyphens",
    "num_underscores", "num_slashes", "num_digits", "num_at", "num_question",
    "num_equal", "num_percent", "num_ampersand", "digit_ratio",
    "num_subdomains", "has_ip", "has_https", "has_port",
    "has_suspicious_word", "suspicious_word_count", "has_shortener",
    "has_double_slash_redirect", "domain_has_hyphen", "shannon_entropy",
    "tld_suspicious", "on_dynamic_hosting", "subdomain_hyphen_count",
    "subdomain_word_count",
]

SUSPICIOUS_TLDS = {"zip", "review", "country", "kim", "cricket", "science",
                    "work", "party", "gq", "link", "top", "xyz"}


def _shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    probs = [s.count(c) / len(s) for c in set(s)]
    return -sum(p * math.log2(p) for p in probs)


def extract_features(raw_url: str) -> dict:
    """Turn a raw URL string into a fixed-order numeric feature dict."""
    url = raw_url.strip()
    if not re.match(r"^[a-zA-Z]+://", url):
        url = "http://" + url  # normalize so urlparse behaves

    parsed = urlparse(url)
    domain = parsed.netloc.split("@")[-1].split(":")[0]
    path = parsed.path or ""

    labels = [p for p in domain.split(".") if p]
    tld = labels[-1].lower() if labels else ""

    subdomain_labels = labels[:-2] if len(labels) > 2 else []
    subdomain_str = ".".join(subdomain_labels)
    domain_lower = domain.lower()
    on_dynamic_hosting = 1 if any(
        domain_lower == d or domain_lower.endswith("." + d)
        for d in DYNAMIC_HOSTING_DOMAINS
    ) else 0

    feats = {
        "url_length": len(url),
        "domain_length": len(domain),
        "path_length": len(path),
        "num_dots": url.count("."),
        "num_hyphens": url.count("-"),
        "num_underscores": url.count("_"),
        "num_slashes": url.count("/"),
        "num_digits": sum(c.isdigit() for c in url),
        "num_at": url.count("@"),
        "num_question": url.count("?"),
        "num_equal": url.count("="),
        "num_percent": url.count("%"),
        "num_ampersand": url.count("&"),
        "digit_ratio": (sum(c.isdigit() for c in url) / len(url)) if url else 0.0,
        "num_subdomains": max(len(labels) - 2, 0),
        "has_ip": 1 if IP_PATTERN.match(domain) else 0,
        "has_https": 1 if parsed.scheme == "https" else 0,
        "has_port": 1 if parsed.port else 0,
        "has_suspicious_word": 0,
        "suspicious_word_count": 0,
        "has_shortener": 1 if any(s in domain for s in SHORTENERS) else 0,
        "has_double_slash_redirect": 1 if url.find("//", url.find("://") + 3) != -1 else 0,
        "domain_has_hyphen": 1 if "-" in domain else 0,
        "shannon_entropy": round(_shannon_entropy(url), 4),
        "tld_suspicious": 1 if tld in SUSPICIOUS_TLDS else 0,
        "on_dynamic_hosting": on_dynamic_hosting,
        "subdomain_hyphen_count": subdomain_str.count("-"),
        "subdomain_word_count": len([w for w in re.split(r"[-.]", subdomain_str) if w]),
    }

    lower_url = url.lower()
    count = sum(1 for w in SUSPICIOUS_WORDS if w in lower_url)
    feats["suspicious_word_count"] = count
    feats["has_suspicious_word"] = 1 if count > 0 else 0

    return feats


def features_to_vector(feats: dict):
    return [feats[name] for name in FEATURE_NAMES]
