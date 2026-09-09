"""
Shared URL feature extraction for training and live prediction.
Designed to be defensive: malformed ports/IPs and unusual schemes must
not crash the API.
"""
import re, math, ipaddress
from urllib.parse import urlparse

SUSPICIOUS_WORDS = [
    "login","verify","update","secure","account","banking","confirm","signin",
    "sign-in","webscr","password","credential","suspend","unlock","limited",
    "recover","wallet","invoice","billing","urgent","alert","click","reward",
    "gift","bonus","authenticate","session","payment"
]
SHORTENERS = [
    "bit.ly","tinyurl.com","goo.gl","t.co","ow.ly","is.gd","buff.ly","adf.ly",
    "shorte.st","rebrand.ly","t.ly","shorturl.at","cutt.ly"
]
DYNAMIC_HOSTING_DOMAINS = [
    "trycloudflare.com","ngrok.io","ngrok-free.app","ngrok.app","pages.dev",
    "workers.dev","repl.co","replit.dev","replit.app","glitch.me","herokuapp.com",
    "netlify.app","vercel.app","surge.sh","web.app","firebaseapp.com",
    "000webhostapp.com","weebly.com","weeblysite.com","wixsite.com","webwave.dev",
    "blogspot.com","duckdns.org","no-ip.org","ddns.net","serveo.net","loca.lt",
]
SUSPICIOUS_TLDS = {"zip","review","country","kim","cricket","science","work",
                  "party","gq","link","top","xyz","click","download","win"}
FEATURE_NAMES = [
    "url_length","domain_length","path_length","num_dots","num_hyphens",
    "num_underscores","num_slashes","num_digits","num_at","num_question",
    "num_equal","num_percent","num_ampersand","digit_ratio","num_subdomains",
    "has_ip","has_https","has_port","has_suspicious_word","suspicious_word_count",
    "has_shortener","has_double_slash_redirect","domain_has_hyphen",
    "shannon_entropy","tld_suspicious","on_dynamic_hosting",
    "subdomain_hyphen_count","subdomain_word_count"
]
IPV4_RE = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")

def _shannon_entropy(s):
    if not s: return 0.0
    return -sum((s.count(c)/len(s))*math.log2(s.count(c)/len(s)) for c in set(s))

def _valid_ipv4(s):
    if not IPV4_RE.match(s): return False
    try:
        ipaddress.ip_address(s); return True
    except ValueError:
        return False

def extract_features(raw_url):
    url = str(raw_url or "").strip()
    normalized = url if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url) else "http://" + url
    try:
        parsed = urlparse(normalized)
        netloc = parsed.netloc
        domain = netloc.rsplit("@",1)[-1].split(":",1)[0].lower()
        path = parsed.path or ""
        try:
            has_port = 1 if parsed.port else 0
        except ValueError:
            has_port = 1
    except ValueError:
        domain, path, has_port = "", "", 1

    labels = [p for p in domain.split(".") if p]
    tld = labels[-1] if labels else ""
    sublabels = labels[:-2] if len(labels)>2 else []
    subdomain_str = ".".join(sublabels)
    dynamic = int(any(domain == d or domain.endswith("."+d) for d in DYNAMIC_HOSTING_DOMAINS))
    lower = normalized.lower()
    sw_count = sum(1 for w in SUSPICIOUS_WORDS if w in lower)
    has_at = normalized.count("@")
    # // after the authority is a classic redirect/obfuscation pattern.
    rest_start = normalized.find("://")
    has_double = int(rest_start >= 0 and "//" in normalized[rest_start+3:])

    feats = {
        "url_length": len(normalized), "domain_length": len(domain),
        "path_length": len(path), "num_dots": normalized.count("."),
        "num_hyphens": normalized.count("-"), "num_underscores": normalized.count("_"),
        "num_slashes": normalized.count("/"), "num_digits": sum(c.isdigit() for c in normalized),
        "num_at": has_at, "num_question": normalized.count("?"),
        "num_equal": normalized.count("="), "num_percent": normalized.count("%"),
        "num_ampersand": normalized.count("&"),
        "digit_ratio": sum(c.isdigit() for c in normalized)/len(normalized) if normalized else 0,
        "num_subdomains": max(len(labels)-2,0),
        "has_ip": int(_valid_ipv4(domain)), "has_https": int(parsed.scheme.lower()=="https"),
        "has_port": has_port, "has_suspicious_word": int(sw_count>0),
        "suspicious_word_count": sw_count,
        "has_shortener": int(any(s in domain for s in SHORTENERS)),
        "has_double_slash_redirect": has_double,
        "domain_has_hyphen": int("-" in domain),
        "shannon_entropy": round(_shannon_entropy(normalized),4),
        "tld_suspicious": int(tld in SUSPICIOUS_TLDS),
        "on_dynamic_hosting": dynamic,
        "subdomain_hyphen_count": subdomain_str.count("-"),
        "subdomain_word_count": len([w for w in re.split(r"[-.]",subdomain_str) if w]),
    }
    return feats

def features_to_vector(feats):
    return [feats[n] for n in FEATURE_NAMES]
