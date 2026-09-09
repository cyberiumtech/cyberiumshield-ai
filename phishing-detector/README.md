# CyberShield AI — Phishing URL Detection (Fixed v2)

This version fixes the biggest problem in the original detector: the shipped
model was trained on only **200 synthetic URLs**, while the supplied CSV
contains **54,807 phishing URLs**. The old model therefore produced dangerous
false negatives on real-world patterns such as abused free-hosting platforms.

## What changed

- `data/phishing_urls.csv` contains the supplied phishing CSV.
- **All unique phishing URLs from the supplied file are used for training.**
- `data/training_urls.csv` contains the phishing samples plus a balanced benign
  corpus with legitimate login/account URLs, normal cloud/PaaS subdomains and
  normal shortener examples.
- The old RandomForest/XGBoost-only toy model was replaced with a
  **character-level TF-IDF + Logistic Regression + structural URL features**
  model. Character n-grams are much better at learning obfuscation,
  lookalike strings, subdomain patterns and URL-specific spelling.
- URL parsing is defensive: malformed ports, invalid IPv4-looking hosts and
  unusual URL strings no longer crash the scanner.
- Shorteners are treated as **suspicious** rather than automatically proven
  phishing because the destination cannot be known from the short URL alone.
- Abused dynamic hosting (Pages, Web Apps, tunnels, etc.) is not automatically
  considered malicious; it is escalated only when combined with additional
  suspicious URL structure.
- The API now supports three outcomes:
  - `legitimate`
  - `suspicious`
  - `phishing`

## Current validation

The included model was trained on **109,611 unique URL strings** after
deduplication during training:

- Legitimate: 54,807
- Phishing: 54,804
- Held-out accuracy: **99.26%**
- Precision: **99.82%**
- Recall: **98.70%**
- F1: **99.26%**
- ROC-AUC: **99.97%**

These are random held-out metrics from the supplied dataset plus the generated
benign corpus. They should not be interpreted as production-grade real-world
accuracy because URLs from the same source can be correlated.

## Run on Windows / Python 3.13

Open Command Prompt or PowerShell:

```powershell
cd phishing-detector
py -3.13 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://127.0.0.1:5001
```

The port is 5001 by default.

## Retrain after adding more phishing URLs

Put additional labeled phishing URLs into `data/phishing_urls.csv` with the
columns:

```text
url,Type
https://example.com/something,Phishing
```

Then rebuild `data/training_urls.csv` if your dataset changes, and run:

```powershell
python train_model.py
python app.py
```

The training script expects `data/training_urls.csv` to contain:

```text
url,label
...
```

where `1 = phishing` and `0 = legitimate`.

## Important detection limitation

This scanner analyzes the URL string only. It does **not** visit or resolve
the URL. Therefore it cannot prove where a URL shortener redirects, whether a
legitimate site has been compromised, or whether a page's HTML/login form is
malicious.

For a stronger production system, the next layer should combine this model
with safe reputation/redirect intelligence, DNS/domain-age signals, TLS
certificate information and a regularly updated threat feed.
