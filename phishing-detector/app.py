"""
app.py
CyberShield AI — Phishing URL Detection
Flask backend: loads the trained model once at startup and serves
a prediction API plus the single-page frontend.
"""

import json
import joblib
import pandas as pd
from flask import Flask, request, jsonify, render_template

from features import extract_features, features_to_vector, FEATURE_NAMES

app = Flask(__name__)

MODEL = joblib.load("model/phishing_model.joblib")
with open("model/metadata.json") as f:
    METADATA = json.load(f)

# Human-readable labels for the top signals shown in the UI
FEATURE_LABELS = {
    "url_length": "URL length",
    "domain_length": "Domain length",
    "path_length": "Path length",
    "num_dots": "Number of dots",
    "num_hyphens": "Number of hyphens",
    "num_underscores": "Number of underscores",
    "num_slashes": "Number of slashes",
    "num_digits": "Digit count",
    "num_at": "'@' symbol count",
    "num_question": "'?' count",
    "num_equal": "'=' count",
    "num_percent": "'%' count",
    "num_ampersand": "'&' count",
    "digit_ratio": "Digit ratio",
    "num_subdomains": "Subdomain count",
    "has_ip": "Uses raw IP address",
    "has_https": "Uses HTTPS",
    "has_port": "Has explicit port",
    "has_suspicious_word": "Contains suspicious keyword",
    "suspicious_word_count": "Suspicious keyword count",
    "has_shortener": "Uses a link shortener",
    "has_double_slash_redirect": "Double-slash redirect trick",
    "domain_has_hyphen": "Hyphen in domain",
    "shannon_entropy": "URL randomness (entropy)",
    "tld_suspicious": "Suspicious top-level domain",
    "on_dynamic_hosting": "Hosted on abuse-prone free/tunnel infra",
    "subdomain_hyphen_count": "Hyphens in subdomain",
    "subdomain_word_count": "Words chained in subdomain",
}

RISK_FEATURES = [
    "has_ip", "has_suspicious_word", "has_shortener", "domain_has_hyphen",
    "tld_suspicious", "num_at", "has_double_slash_redirect", "num_subdomains",
    "shannon_entropy", "has_https", "on_dynamic_hosting",
    "subdomain_hyphen_count", "subdomain_word_count",
]


@app.route("/")
def index():
    return render_template("index.html", metadata=METADATA)


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()

    if not url:
        return jsonify({"error": "Please provide a URL to scan."}), 400
    if len(url) > 2048:
        return jsonify({"error": "URL is too long (max 2048 characters)."}), 400

    feats = extract_features(url)
    vector = pd.DataFrame([features_to_vector(feats)], columns=FEATURE_NAMES)

    proba = MODEL.predict_proba(vector)[0]
    phishing_prob = float(proba[1])
    prediction = "phishing" if phishing_prob >= 0.5 else "legitimate"
    confidence = phishing_prob if prediction == "phishing" else (1 - phishing_prob)

    if phishing_prob >= 0.85:
        risk_level = "critical"
    elif phishing_prob >= 0.5:
        risk_level = "high"
    elif phishing_prob >= 0.2:
        risk_level = "low"
    else:
        risk_level = "minimal"

    signals = []
    for key in RISK_FEATURES:
        val = feats[key]
        flagged = bool(val) if key != "has_https" else (val == 0)
        if key in ("num_at", "num_subdomains") and val > 0:
            flagged = True
        if key == "shannon_entropy":
            flagged = val > 4.2
        if key == "subdomain_hyphen_count":
            flagged = val >= 2
        if key == "subdomain_word_count":
            flagged = val >= 3
        signals.append({
            "label": FEATURE_LABELS[key],
            "value": val,
            "flagged": flagged,
        })

    return jsonify({
        "url": url,
        "prediction": prediction,
        "phishing_probability": round(phishing_prob, 4),
        "confidence": round(confidence, 4),
        "risk_level": risk_level,
        "signals": signals,
        "model": METADATA["model_name"],
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "model": METADATA["model_name"],
        "dataset_size": METADATA["dataset_size"],
        "metrics": METADATA["metrics"],
    })


if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.getenv("PHISHING_PORT", "5001")), debug=False)
