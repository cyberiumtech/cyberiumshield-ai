"""
CyberShield AI — Phishing URL Detection
Loads the v2 character/numeric model and never requests the submitted URL.
"""
import json
import logging
from pathlib import Path

import joblib
import numpy as np
from scipy.sparse import hstack, csr_matrix
from flask import Flask, request, jsonify, render_template
from features import extract_features, features_to_vector
from database import save_scan

app = Flask(__name__)
LOGGER = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parent

BUNDLE = joblib.load(BASE_DIR / "model" / "phishing_model.joblib")
MODEL = BUNDLE["model"]
VECTORIZER = BUNDLE["vectorizer"]
SCALER = BUNDLE["scaler"]

with (BASE_DIR / "model" / "metadata.json").open(encoding="utf-8") as f:
    METADATA = json.load(f)

FEATURE_LABELS = {
    "url_length":"URL length","domain_length":"Domain length","path_length":"Path length",
    "num_dots":"Number of dots","num_hyphens":"Number of hyphens",
    "num_underscores":"Number of underscores","num_slashes":"Number of slashes",
    "num_digits":"Digit count","num_at":"'@' symbol count","num_question":"'?' count",
    "num_equal":"'=' count","num_percent":"'%' count","num_ampersand":"'&' count",
    "digit_ratio":"Digit ratio","num_subdomains":"Subdomain count","has_ip":"Uses raw IP address",
    "has_https":"Uses HTTPS","has_port":"Has explicit port",
    "has_suspicious_word":"Contains suspicious keyword",
    "suspicious_word_count":"Suspicious keyword count","has_shortener":"Uses a link shortener",
    "has_double_slash_redirect":"Double-slash redirect trick",
    "domain_has_hyphen":"Hyphen in domain","shannon_entropy":"URL randomness (entropy)",
    "tld_suspicious":"Suspicious top-level domain",
    "on_dynamic_hosting":"Hosted on frequently abused free/tunnel infrastructure",
    "subdomain_hyphen_count":"Hyphens in subdomain",
    "subdomain_word_count":"Words chained in subdomain",
}
RISK_FEATURES = [
    "has_ip","has_suspicious_word","has_shortener","domain_has_hyphen",
    "tld_suspicious","num_at","has_double_slash_redirect","num_subdomains",
    "shannon_entropy","has_https","on_dynamic_hosting",
    "subdomain_hyphen_count","subdomain_word_count"
]

def score_url(url):
    feats = extract_features(url)
    numeric = np.asarray([features_to_vector(feats)], dtype=np.float32)
    X = hstack([
        VECTORIZER.transform([url]),
        csr_matrix(SCALER.transform(numeric))
    ], format="csr")
    p = float(MODEL.predict_proba(X)[0,1])

    # A shortener's destination is unknowable from the short URL alone.
    # Keep it in the suspicious band rather than pretending the destination
    # has been verified.
    if feats["has_shortener"]:
        p = max(p, 0.35)

    # Dynamic hosting is common for both legitimate development and abuse.
    # Escalate only when there are additional suspicious structural signals.
    dynamic_combo = (
        feats["on_dynamic_hosting"] and
        (feats["subdomain_hyphen_count"] >= 2 or
         feats["subdomain_word_count"] >= 4 or
         feats["has_suspicious_word"] or
         feats["domain_has_hyphen"])
    )
    if dynamic_combo:
        p = max(p, 0.55)

    # Malformed/obfuscated authority is a strong signal.
    if feats["num_at"] or feats["has_double_slash_redirect"]:
        p = max(p, 0.70)

    if p >= 0.75:
        verdict, risk = "phishing", "critical"
    elif p >= 0.50:
        verdict, risk = "suspicious", "high"
    elif p >= 0.35:
        verdict, risk = "suspicious", "low"
    else:
        verdict, risk = "legitimate", "minimal"

    signals=[]
    for key in RISK_FEATURES:
        val=feats[key]
        if key=="has_https": flagged=(val==0)
        elif key in ("num_at","num_subdomains"): flagged=val>0
        elif key=="shannon_entropy": flagged=val>4.2
        elif key=="subdomain_hyphen_count": flagged=val>=2
        elif key=="subdomain_word_count": flagged=val>=4
        else: flagged=bool(val)
        signals.append({"label":FEATURE_LABELS[key],"value":val,"flagged":flagged})

    return {
        "url": url, "prediction": verdict, "phishing_probability": round(p,4),
        "confidence": round(max(p,1-p),4), "risk_level": risk,
        "signals": signals, "model": METADATA["model_name"],
    }

@app.route("/")
def index():
    return render_template("index.html", metadata=METADATA)

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error":"Request body must be a JSON object."}),400

    raw_url = data.get("url")
    if not isinstance(raw_url, str):
        return jsonify({"error":"The url field must be a string."}),400

    url=raw_url.strip()
    if not url:
        return jsonify({"error":"Please provide a URL to scan."}),400
    if len(url)>2048:
        return jsonify({"error":"URL is too long (max 2048 characters)."}),400
    try:
        result = score_url(url)
        save_scan(result)
        return jsonify(result)
    except (TypeError, ValueError):
        return jsonify({"error":"The URL format could not be parsed safely."}),400
    except Exception:
        LOGGER.exception("Phishing model inference failed")
        return jsonify({"error":"The phishing detector could not complete the scan."}),500

@app.route("/api/health")
def health():
    return jsonify({
        "status":"ok","model":METADATA["model_name"],
        "dataset_size":METADATA["dataset_size"],
        "metrics":METADATA["metrics"],
        "class_counts":METADATA["class_counts"]
    })

if __name__=="__main__":
    import os
    app.run(host="0.0.0.0",port=int(os.getenv("PHISHING_PORT","5001")),debug=False)
