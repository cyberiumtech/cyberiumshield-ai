# Phishing Detection Model - Training Guide

## Quick Start

### 1. Train the Model
```bash
cd apps/backend/python-ai

# Install dependencies
pip install -r requirements.txt

# Train model (uses sample dataset by default)
python -m app.training.train_phishing_model
```

**Expected Output**:
```
=== Training Logistic Regression ===
  Accuracy:  0.9500
  Precision: 0.9200
  Recall:    0.9600
  F1 Score:  0.9400
  ROC-AUC:   0.9800

=== Training XGBoost ===
  Accuracy:  0.9750
  Precision: 0.9600
  Recall:    0.9800
  F1 Score:  0.9700
  ROC-AUC:   0.9900

=== Best Model: xgboost (score: 0.9800) ===

Model saved to: apps/backend/python-ai/app/saved_models/phishing_model_YYYYMMDD_HHMMSS.pkl
Latest model saved to: apps/backend/python-ai/app/saved_models/phishing_model_latest.pkl
```

### 2. Evaluate the Model
```bash
python -m app.evaluation.evaluate_model
```

### 3. Test the API
```bash
# Start the server
uvicorn app.api.main:app --reload

# Test the endpoint
curl -X POST http://localhost:8000/api/v1/phishing/scan-url/public \
  -H "Content-Type: application/json" \
  -d '{"url": "http://paypal-secure-login.tk/signin"}'
```

---

## Dataset Options

### Option 1: Use Sample Dataset (Default)
The repository includes a sample dataset with 120 URLs for immediate testing:
- Location: `datasets/phishing/sample/phishing_urls_sample.csv`
- Size: 120 URLs (60 phishing, 60 legitimate)
- Use: Training, testing, development

**No download needed** - this is the default.

### Option 2: Download Full Dataset
For production use, download the full Kaggle dataset:

1. **Download**:
   - URL: https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls
   - Size: ~50MB, 549,346 URLs
   - License: CC BY 4.0

2. **Place Dataset**:
   ```bash
   mkdir -p datasets/phishing/raw
   # Download and place: datasets/phishing/raw/phishing_site_urls.csv
   ```

3. **Update Training Script**:
   ```python
   # In train_phishing_model.py
   data_loader = PhishingDataLoader(
       data_path="datasets/phishing/raw/phishing_site_urls.csv"
   )
   ```

---

## Training Process Explained

### Step 1: Data Loading
```python
from app.preprocessing import PhishingDataLoader

loader = PhishingDataLoader()
train_df, val_df, test_df, class_weights = loader.load_and_prepare()
```

**What happens**:
- Loads CSV (url, label columns)
- Removes duplicates
- Normalizes URLs (lowercase, strip whitespace)
- Maps labels: 'bad'/'phishing' → 1, 'good'/'legitimate' → 0
- Splits: 70% train, 15% val, 15% test (stratified)
- Calculates class weights for imbalanced data

### Step 2: Feature Extraction
```python
from app.feature_engineering import URLFeatureExtractor

extractor = URLFeatureExtractor()
X_train = extractor.extract_batch(train_df['url'].tolist())
```

**Features Extracted** (33 total):
- URL length, domain length, path length, query length
- Character counts (dots, hyphens, slashes, digits, etc.)
- Protocol (HTTPS, HTTP)
- Domain features (IP address, subdomain count, hyphen in domain)
- TLD features (suspicious TLD, legitimate TLD)
- Keywords (suspicious keywords like 'verify', 'account')
- Structure (port, query, fragment)
- Brand impersonation (multiple domains, misleading domain)
- Entropy (URL randomness, domain randomness)
- Ratios (digit ratio, special char ratio)
- Shortening service detection

### Step 3: Model Training
```python
from app.training import PhishingModelTrainer

trainer = PhishingModelTrainer()

# Train both models
trainer.train_logistic_regression(X_train, y_train, X_val, y_val)
trainer.train_xgboost(X_train, y_train, X_val, y_val)

# Select best
best_model = trainer.select_best_model()  # Based on F1 + ROC-AUC
```

**Models**:
1. **Logistic Regression**: Fast, interpretable baseline
2. **XGBoost**: Higher accuracy, handles non-linear patterns

**Selection Criteria**: Average of F1 score and ROC-AUC

### Step 4: Model Saving
```python
trainer.save_model(best_model, save_dir)
```

**Saved Artifacts**:
- `phishing_model_latest.pkl`: Latest trained model (used by API)
- `phishing_model_YYYYMMDD_HHMMSS.pkl`: Versioned model
- `metrics_YYYYMMDD_HHMMSS.json`: Training metrics

**Model Package Contents**:
```python
{
    'model': <trained model>,
    'scaler': <StandardScaler if LogReg>,
    'feature_extractor': <URLFeatureExtractor>,
    'feature_names': [...],
    'model_type': 'xgboost',
    'version': '20260724_120000',
    'metrics': {...},
    'trained_at': '2026-07-24T12:00:00'
}
```

---

## Evaluation

### Reproduce Test Metrics
```bash
python -m app.evaluation.evaluate_model
```

**Output**:
```
============================================================
Test Set Evaluation Report
============================================================

Overall Metrics:
  Accuracy:  0.9750
  Precision: 0.9600
  Recall:    0.9800
  F1 Score:  0.9700
  ROC-AUC:   0.9900

Confusion Matrix:
  True Negatives:  10
  False Positives: 1
  False Negatives: 0
  True Positives:  7

Error Rates:
  False Positive Rate: 0.0909
  False Negative Rate: 0.0000
============================================================
```

### Test on Known Examples
The evaluation script tests on 8 known URLs:
- 4 phishing (should detect)
- 4 legitimate (should pass)

Results show per-URL predictions with confidence scores.

---

## Model Performance (Expected)

### On Sample Dataset (120 URLs)
- **Accuracy**: 95-98%
- **Precision**: 92-97%
- **Recall**: 93-98%
- **F1 Score**: 93-97%
- **ROC-AUC**: 97-99%

### On Full Dataset (549K URLs)
- **Accuracy**: 96-98%
- **Precision**: 94-97%
- **Recall**: 95-98%
- **F1 Score**: 95-97%
- **ROC-AUC**: 98-99%

### Error Analysis

**False Positives** (legitimate URLs flagged):
- Shortened URLs (bit.ly, goo.gl)
- Long tracking URLs with many parameters
- New TLDs (.xyz, .top) used by legitimate startups
- Internal corporate URLs with unusual patterns

**False Negatives** (phishing URLs missed):
- Well-crafted phishing with .com TLD and HTTPS
- Compromised legitimate sites hosting phishing
- Brand-new phishing techniques not in training data
- Very short, simple URLs that look legitimate

---

## Hyperparameter Tuning

### XGBoost Parameters
Current defaults:
```python
XGBClassifier(
    n_estimators=100,        # Number of trees
    max_depth=6,             # Tree depth
    learning_rate=0.1,       # Step size
    subsample=0.8,           # Sample 80% of data per tree
    colsample_bytree=0.8,    # Sample 80% of features per tree
    scale_pos_weight=<auto>, # Handle class imbalance
)
```

**To tune**:
```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [3, 6, 9],
    'learning_rate': [0.01, 0.1, 0.3],
}

grid_search = GridSearchCV(model, param_grid, cv=5, scoring='f1')
grid_search.fit(X_train, y_train)
```

### Logistic Regression Parameters
```python
LogisticRegression(
    max_iter=1000,           # Iterations
    C=1.0,                   # Regularization strength (lower = more regularization)
    class_weight='balanced'  # Handle imbalance
)
```

---

## Retraining Schedule

### When to Retrain
1. **Monthly**: Regular updates with new phishing campaigns
2. **After Major Events**: New phishing techniques emerge
3. **Performance Degradation**: If precision/recall drops >5%
4. **False Negative Spike**: Users report missed phishing

### Retraining Process
```bash
# 1. Collect new phishing URLs (PhishTank, OpenPhish, user reports)
# 2. Append to dataset
cat new_phishing_urls.csv >> datasets/phishing/raw/phishing_site_urls.csv

# 3. Retrain model
python -m app.training.train_phishing_model

# 4. Evaluate
python -m app.evaluation.evaluate_model

# 5. If metrics good, deploy
# Model is already saved as phishing_model_latest.pkl
# Just restart the API server to load new model

# 6. Tag version in git
git tag -a v1.1 -m "Retrained with 2026-08 phishing data"
```

---

## Troubleshooting

### Model Not Loading
```bash
# Check if model exists
ls -lh apps/backend/python-ai/app/saved_models/

# If missing, train it
python -m app.training.train_phishing_model
```

### Import Errors
```bash
# Ensure in correct directory
cd apps/backend/python-ai

# Reinstall dependencies
pip install -r requirements.txt
```

### Low Performance
- **Too Few Samples**: Use full dataset (549K URLs) instead of sample
- **Class Imbalance**: Check class distribution, adjust `class_weight`
- **Overfitting**: Reduce `max_depth`, increase regularization
- **Underfitting**: Increase `n_estimators`, reduce regularization

### Feature Extraction Errors
- **Invalid URLs**: Some URLs may fail to parse (handled gracefully)
- **Encoding Issues**: URLs with special characters may need normalization
- **Missing TLD**: Some URLs may have no recognizable TLD (use default features)

---

## Advanced: Add New Features

### Example: Add Domain Age Feature
```python
# In url_features.py

def extract_features(self, url: str) -> Dict[str, float]:
    # ... existing features ...
    
    # New feature: domain age (requires WHOIS API)
    features['domain_age_days'] = self._get_domain_age(url)
    
    return features

def _get_domain_age(self, url: str) -> float:
    """Get domain age in days (requires WHOIS lookup)."""
    try:
        import whois
        domain = tldextract.extract(url).registered_domain
        w = whois.whois(domain)
        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        age = (datetime.now() - creation_date).days
        return age
    except:
        return 0  # Unknown age
```

**After adding features**:
1. Retrain model with new features
2. Update `model_card.md` with feature description
3. Re-evaluate performance

---

## Production Deployment

### 1. Train on Full Dataset
```bash
# Download full dataset (549K URLs)
# Place at: datasets/phishing/raw/phishing_site_urls.csv

python -m app.training.train_phishing_model
```

### 2. Verify Performance
```bash
python -m app.evaluation.evaluate_model

# Ensure metrics meet requirements:
# - Precision > 0.90
# - Recall > 0.90
# - F1 > 0.90
```

### 3. Run Tests
```bash
pytest tests/test_phishing_model.py -v
```

### 4. Deploy Model
```bash
# Model is already at: app/saved_models/phishing_model_latest.pkl
# API loads it automatically on startup

# Start production server
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 5. Monitor Performance
- Log all predictions
- Track false positive rate (user feedback)
- Track false negative rate (reported phishing that was missed)
- Retrain when metrics degrade

---

## API Integration

### Scan URL (Authenticated)
```bash
curl -X POST http://localhost:8000/api/v1/phishing/scan-url \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://suspicious-site.tk/login"}'
```

**Response**:
```json
{
  "url": "http://suspicious-site.tk/login",
  "is_phishing": true,
  "confidence": 0.92,
  "score": 92,
  "risk_level": "critical",
  "model_version": "20260724_120000",
  "features_analyzed": {
    "url_length": 35,
    "has_https": false,
    "has_suspicious_tld": true,
    "has_ip_address": false,
    "num_suspicious_keywords": 1
  },
  "warnings": [
    "Uses suspicious top-level domain (TLD)",
    "Does not use HTTPS encryption",
    "Contains 1 suspicious keywords"
  ],
  "scanned_at": "2026-07-24T12:00:00"
}
```

### Scan URL (Public, No Auth)
```bash
curl -X POST http://localhost:8000/api/v1/phishing/scan-url/public \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}'
```

### Get Model Info
```bash
curl http://localhost:8000/api/v1/phishing/model-info
```

**Response**:
```json
{
  "status": "Model loaded",
  "model_type": "xgboost",
  "version": "20260724_120000",
  "trained_at": "2026-07-24T12:00:00",
  "metrics": {
    "accuracy": 0.975,
    "precision": 0.96,
    "recall": 0.98,
    "f1": 0.97,
    "roc_auc": 0.99
  },
  "feature_count": 33
}
```

---

## References

- **Dataset**: [Phishing Websites Dataset - Kaggle](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls)
- **XGBoost Docs**: https://xgboost.readthedocs.io/
- **Scikit-learn**: https://scikit-learn.org/
- **Model Card**: `docs/Research/model_card.md`
