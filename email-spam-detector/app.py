"""Production-oriented Flask inference API for email spam detection."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
from flask import Flask, jsonify, request

from email_parser import parse_email
from signals import explain_email
from database import save_scan

ROOT = Path(__file__).resolve().parent
MAX_CONTENT_LENGTH = 100_000

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("email-spam-detector")

MODEL = joblib.load(ROOT / "model" / "spam_pipeline.joblib")
METADATA = json.loads((ROOT / "model" / "metadata.json").read_text(encoding="utf-8"))
THRESHOLD = float(METADATA["decision_threshold"])

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 128 * 1024


@app.after_request
def add_security_headers(response):
    origin = request.headers.get("Origin", "")
    configured = os.getenv("EMAIL_SPAM_CORS_ORIGIN", "")
    if configured:
        response.headers["Access-Control-Allow-Origin"] = configured
    elif origin.startswith(("http://localhost:", "http://127.0.0.1:")):
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health():
    result = {
        "status": "ok",
        "model": METADATA["model_name"],
        "model_version": METADATA["model_version"],
        "dataset_size": METADATA["dataset"]["messages"],
        "test_metrics": METADATA["test_metrics"],
    }
    save_scan(result)
    return jsonify(result)


@app.route("/api/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 204
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415
    payload = request.get_json(silent=True) or {}
    sender = payload.get("sender", "")
    subject = payload.get("subject", "")
    content = payload.get("content", "")
    if not all(isinstance(value, str) for value in (sender, subject, content)):
        return jsonify({"error": "sender, subject, and content must be strings."}), 400
    if not content.strip() and not subject.strip():
        return jsonify({"error": "Email content or subject is required."}), 400
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({"error": f"Email content exceeds {MAX_CONTENT_LENGTH} characters."}), 413

    parsed = parse_email(sender, subject, content)
    spam_probability = float(MODEL.predict_proba([parsed["model_text"]])[0][1])
    if spam_probability >= THRESHOLD:
        verdict = "spam"
    elif spam_probability >= max(0.20, THRESHOLD * 0.55):
        verdict = "suspicious"
    else:
        verdict = "legitimate"
    confidence = spam_probability if verdict == "spam" else 1.0 - spam_probability
    signals, link_count = explain_email(parsed)

    logger.info("prediction verdict=%s score=%d", verdict, round(spam_probability * 100))
    return jsonify({
        "verdict": verdict,
        "score": round(spam_probability * 100),
        "spam_probability": round(spam_probability, 6),
        "confidence": round(confidence * 100),
        "sender": parsed["sender"],
        "subject": parsed["subject"],
        "linkCount": link_count,
        "signals": signals,
        "model": METADATA["model_name"],
        "model_version": METADATA["model_version"],
        "scannedAt": datetime.now(timezone.utc).isoformat(),
    })


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "Request body is too large."}), 413


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("EMAIL_SPAM_PORT", "5002")), debug=False)
