# CyberShield AI — Phishing URL Detection Module

A full-stack phishing URL detector: a 200-sample labeled dataset, a trained
gradient-boosted classifier, a Flask API, and a single-page scanner UI.

## What's included

```
phishing-detector/
├── data/
│   └── urls.csv              200 labeled URLs (100 legitimate, 100 phishing-pattern)
├── model/
│   ├── phishing_model.joblib the trained classifier (created by train_model.py)
│   └── metadata.json         metrics + feature list (created by train_model.py)
├── templates/
│   └── index.html            scanner UI
├── static/
│   ├── style.css
│   └── app.js
├── features.py                shared feature extraction (used by training AND serving)
├── generate_dataset.py        builds data/urls.csv
├── train_model.py             trains + evaluates the model, saves it to model/
├── app.py                     Flask app (UI + JSON API)
└── requirements.txt
```

## How it works

1. **`features.py`** turns any URL into 25 numeric features: length stats,
   punctuation counts, IP-as-host detection, suspicious keywords
   (`login`, `verify`, `secure`, …), link-shortener detection, subdomain
   depth, Shannon entropy of the string, and suspicious TLDs. This exact
   function is used both to build the training set and to score URLs live,
   so there's no train/serve mismatch.
2. **`generate_dataset.py`** builds `data/urls.csv`: 100 legitimate URLs
   (real, well-known root domains with ordinary paths) and 100
   phishing-pattern URLs synthesized from well-documented phishing
   techniques (lookalike hyphenated domains, raw IPs, suspicious TLDs,
   credential-harvesting keywords). No real malicious sites are included.
3. **`train_model.py`** extracts features for all 200 rows, does an 80/20
   stratified split, trains both a Random Forest and an XGBoost classifier,
   and keeps whichever scores higher on F1. Metrics are saved to
   `model/metadata.json`.
4. **`app.py`** loads the saved model once at startup and exposes:
   - `GET /` — the scanner UI
   - `POST /api/predict` — `{"url": "..."}` → prediction, probability, risk
     level, and a breakdown of which signals fired
   - `GET /api/health` — model name, dataset size, held-out metrics

The scanner **never fetches the submitted URL** — it only analyzes the
string structure, so it's safe to paste a suspicious link straight in.

## Running it

```bash
pip install -r requirements.txt
python3 generate_dataset.py   # writes data/urls.csv (200 rows)
python3 train_model.py        # trains + saves model/phishing_model.joblib
python3 app.py                # serves http://localhost:5000
```

Re-run `generate_dataset.py` + `train_model.py` any time you want to expand
past 200 rows — just add more URLs to `data/urls.csv` (or extend
`generate_dataset.py`) and retrain; nothing else needs to change.

## Notes on the "200 datasets" scope

200 labeled URLs is enough for the classifier to learn the structural
patterns cleanly (100% held-out accuracy on this synthetic set, per
`model/metadata.json`) and is well suited to a student project. For a
production deployment you'd want a much larger, continuously updated
dataset (e.g. PhishTank, OpenPhish feeds) — the code here is already
structured so that swapping in a bigger `data/urls.csv` requires no other
changes.
