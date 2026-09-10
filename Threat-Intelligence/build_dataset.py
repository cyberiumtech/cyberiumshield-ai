"""
Build data/url_labels.csv for train_model.py from REAL, live threat-intel
feeds instead of invented labels.

Sources (all free, no auth required for these endpoints):
  Malicious (label=1):
    - URLhaus recent CSV   (malware distribution / hosting URLs)
    - ThreatFox recent CSV, filtered to ioc_type == 'url'  (C2 URLs, malware-tagged)
    - Feodo Tracker IP blocklist (active botnet C2 endpoints; converted to http://ip:port)
  Benign (label=0):
    - Tranco top-sites list (research-grade, citable ranking)

Run:
    pip install requests
    python build_dataset.py --benign 400 --out data/url_labels.csv

This performs a live network fetch. If your machine/network blocks any of
these domains, that source is skipped with a warning and the rest still run.
"""
import argparse
import csv
import io
import os
import random
import sys
import zipfile

import requests

UA = {"User-Agent": "CyberShield-AI-Threat-Intelligence/2.0 (dataset-builder)"}

URLHAUS_RECENT = "https://urlhaus.abuse.ch/downloads/csv_recent/"
THREATFOX_RECENT = "https://threatfox.abuse.ch/export/csv/recent/"
FEODO_IPBLOCKLIST = "https://feodotracker.abuse.ch/downloads/ipblocklist.csv"
TRANCO_TOP1M = "https://tranco-list.eu/top-1m.csv.zip"


def _get(url, timeout=30):
    r = requests.get(url, headers=UA, timeout=timeout)
    r.raise_for_status()
    return r.text


def fetch_urlhaus():
    """URLhaus recent CSV: comment lines start with '#', columns are
    id,dateadded,url,url_status,last_online,threat,tags,urlhaus_link,reporter
    """
    urls = set()
    try:
        text = _get(URLHAUS_RECENT)
        reader = csv.reader(line for line in text.splitlines() if line and not line.startswith("#"))
        for row in reader:
            if len(row) >= 3 and row[2].startswith(("http://", "https://")):
                urls.add(row[2].strip())
    except Exception as e:
        print(f"[warn] URLhaus fetch failed: {e}", file=sys.stderr)
    print(f"URLhaus: {len(urls)} malicious URLs")
    return urls


def fetch_threatfox():
    """ThreatFox recent CSV: comment lines start with '#', columns include
    id,first_seen_utc,ioc,ioc_type,threat_type,fk_malware,malware_printable,...
    We keep only rows where ioc_type == 'url'.
    """
    urls = set()
    try:
        text = _get(THREATFOX_RECENT)
        reader = csv.reader(line for line in text.splitlines() if line and not line.startswith("#"))
        for row in reader:
            if len(row) >= 4:
                ioc, ioc_type = row[2].strip().strip('"'), row[3].strip().strip('"')
                if ioc_type == "url" and ioc.startswith(("http://", "https://")):
                    urls.add(ioc)
    except Exception as e:
        print(f"[warn] ThreatFox fetch failed: {e}", file=sys.stderr)
    print(f"ThreatFox: {len(urls)} malicious URLs")
    return urls


def fetch_feodo():
    """Feodo Tracker publishes C2 IP:port pairs, not URLs. We build
    real-endpoint pseudo-URLs (http://ip:port) since these are genuine
    reported C2 infrastructure, not invented addresses.
    """
    urls = set()
    try:
        text = _get(FEODO_IPBLOCKLIST)
        reader = csv.reader(line for line in text.splitlines() if line and not line.startswith("#"))
        for row in reader:
            if len(row) >= 2:
                ip, port = row[0].strip(), row[1].strip()
                if ip and port.isdigit():
                    urls.add(f"http://{ip}:{port}")
    except Exception as e:
        print(f"[warn] Feodo Tracker fetch failed: {e}", file=sys.stderr)
    print(f"Feodo Tracker: {len(urls)} malicious C2 endpoints")
    return urls


def fetch_tranco(n):
    """Tranco top-1m list, zipped CSV of rank,domain."""
    domains = []
    try:
        r = requests.get(TRANCO_TOP1M, headers=UA, timeout=60)
        r.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            name = z.namelist()[0]
            with z.open(name) as f:
                for i, line in enumerate(io.TextIOWrapper(f, encoding="utf-8")):
                    if i >= n:
                        break
                    parts = line.strip().split(",")
                    if len(parts) == 2:
                        domains.append(f"https://{parts[1]}")
    except Exception as e:
        print(f"[warn] Tranco fetch failed: {e}", file=sys.stderr)
    print(f"Tranco: {len(domains)} benign domains")
    return domains


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--benign", type=int, default=400, help="number of benign URLs to pull from Tranco")
    ap.add_argument("--out", default="data/url_labels.csv")
    args = ap.parse_args()

    malicious = set()
    malicious |= fetch_urlhaus()
    malicious |= fetch_threatfox()
    malicious |= fetch_feodo()

    benign = fetch_tranco(args.benign)

    if not malicious or not benign:
        print("[error] One of the required classes came back empty — check network access "
              "to abuse.ch / tranco-list.eu, or run with a VPN/different network.", file=sys.stderr)

    rows = [(u, 1) for u in malicious] + [(u, 0) for u in benign]
    random.shuffle(rows)

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["url", "label"])
        w.writerows(rows)

    print(f"\nWrote {len(rows)} rows ({len(malicious)} malicious, {len(benign)} benign) to {args.out}")
    if len(malicious) < 50 or len(benign) < 50:
        print("[warn] Class counts are low — train_model.py requires >=100 total rows with both classes present.")


if __name__ == "__main__":
    main()
