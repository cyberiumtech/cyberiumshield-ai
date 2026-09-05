"""
generate_dataset.py
Builds data/urls.csv: 200 labeled rows (100 legitimate, 100 phishing-pattern)
for training the CyberShield AI phishing classifier.

Legitimate rows use real, well-known root domains with ordinary paths.
Phishing rows are SYNTHETIC illustrations of well-documented phishing
techniques (lookalike subdomains, IP hosts, brand-name hyphenation,
suspicious TLDs, credential-harvesting keywords) -- not links to any
live malicious infrastructure.
"""

import csv
import random

random.seed(42)

LEGIT_DOMAINS = [
    "google.com", "github.com", "wikipedia.org", "amazon.com", "microsoft.com",
    "apple.com", "stackoverflow.com", "nytimes.com", "bbc.com", "linkedin.com",
    "python.org", "mozilla.org", "cloudflare.com", "npmjs.com", "reddit.com",
    "dropbox.com", "spotify.com", "adobe.com", "salesforce.com", "shopify.com",
    "nasa.gov", "who.int", "un.org", "harvard.edu", "mit.edu",
    "cyberiumtech.com", "gov.np", "nepalbank.com.np", "ntc.net.np", "ekantipur.com",
]

LEGIT_PATHS = [
    "/", "/about", "/products", "/docs/getting-started", "/blog/2026/09/update",
    "/user/settings", "/search?q=weather", "/login", "/help/contact",
    "/pricing", "/careers", "/news/latest", "/account/profile",
    "/support/faq", "/download", "/api/v2/status", "/en/home",
    "/articles/technology", "/store/checkout", "/dashboard",
]

BRAND_SEEDS = ["paypal", "amazon", "apple", "microsoft", "netflix", "facebook",
               "chase", "wellsfargo", "instagram", "google", "outlook", "ebay",
               "nepalbank", "esewa", "khalti"]

DYNAMIC_HOSTS = ["trycloudflare.com", "ngrok-free.app", "pages.dev",
                  "repl.co", "glitch.me", "herokuapp.com", "netlify.app",
                  "duckdns.org", "serveo.net", "000webhostapp.com"]

RANDOM_WORDS = ["floyd", "viewers", "manuals", "animal", "cedar", "portal",
                "harbor", "quiet", "matrix", "lantern", "cargo", "signal",
                "willow", "delta", "cipher", "hollow", "orbit", "relay",
                "cinder", "meadow", "static", "vault", "beacon", "drift"]

SUSPICIOUS_TLDS = ["zip", "review", "country", "kim", "cricket", "science",
                   "work", "party", "gq", "link", "top", "xyz"]

SUSPICIOUS_WORDS = ["login", "verify", "update", "secure", "account", "confirm",
                    "signin", "webscr", "password", "suspend", "unlock",
                    "recover", "wallet", "invoice", "billing", "urgent", "alert"]


def random_ip():
    return ".".join(str(random.randint(1, 254)) for _ in range(4))


def random_token(n=8):
    chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(random.choice(chars) for _ in range(n))


def gen_legit(i):
    # Occasionally show dynamic-hosting infra used the normal, low-risk way:
    # a short, single-purpose subdomain with no word-chain and no keywords.
    if random.random() < 0.08:
        host = random.choice(DYNAMIC_HOSTS)
        name = random.choice(["portfolio-site", "my-demo", "class-project",
                               "team-standup", "docs-preview"])
        return f"https://{name}.{host}/"

    domain = random.choice(LEGIT_DOMAINS)
    path = random.choice(LEGIT_PATHS)
    scheme = "https"
    if random.random() < 0.15:
        sub = random.choice(["www", "docs", "mail", "support", "api"])
        domain = f"{sub}.{domain}"
    url = f"{scheme}://{domain}{path}"
    if random.random() < 0.2:
        url += f"&ref=newsletter" if "?" in url else f"?id={random.randint(100,999)}"
    return url


def gen_phish(i):
    style = random.choice(["ip", "hyphen-brand", "suspicious-tld", "long-subdomain",
                            "keyword-path", "at-symbol", "shortener-like",
                            "dynamic-hosting-chain"])
    brand = random.choice(BRAND_SEEDS)
    word = random.choice(SUSPICIOUS_WORDS)

    if style == "ip":
        url = f"http://{random_ip()}/{brand}/{word}.php?session={random_token(12)}"
    elif style == "hyphen-brand":
        url = f"http://{brand}-{word}-{random_token(4)}.com/{word}"
    elif style == "suspicious-tld":
        tld = random.choice(SUSPICIOUS_TLDS)
        url = f"http://{brand}{random_token(3)}.{tld}/{word}.html"
    elif style == "long-subdomain":
        url = f"http://{brand}.{word}.{random_token(6)}-{random_token(5)}.com/{word}"
    elif style == "keyword-path":
        url = f"http://secure-{brand}.com/{word}/{word}-account.php?user={random_token(6)}&token={random_token(10)}"
    elif style == "at-symbol":
        url = f"http://{brand}.com@{random_token(6)}.{random.choice(SUSPICIOUS_TLDS)}/{word}"
    elif style == "dynamic-hosting-chain":
        # Abuse of legitimate tunnel/PaaS infra: a long chain of unrelated
        # dictionary words as the subdomain, no brand name needed -- the
        # trusted parent domain does the social-engineering for you.
        host = random.choice(DYNAMIC_HOSTS)
        chain = "-".join(random.sample(RANDOM_WORDS, random.randint(3, 5)))
        url = f"https://{chain}.{host}/"
    else:  # shortener-like
        url = f"http://{random_token(3)}.{random.choice(['tk','ml','cf'])}/{random_token(6)}"
    return url


def main():
    rows = []
    for i in range(100):
        rows.append((gen_legit(i), 0))
    for i in range(100):
        rows.append((gen_phish(i), 1))

    random.shuffle(rows)

    with open("data/urls.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["url", "label"])  # label: 0 = legitimate, 1 = phishing
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to data/urls.csv")


if __name__ == "__main__":
    main()
