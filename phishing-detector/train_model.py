"""
train_model.py - production-oriented phishing URL training.

Uses EVERY URL from data/phishing_urls.csv as a phishing sample and a
balanced benign corpus generated from known legitimate domains plus
legitimate authentication/cloud-hosting URL patterns.

The model combines:
  * character TF-IDF (captures lookalikes, obfuscation, URL token patterns)
  * the handcrafted structural features from features.py

This avoids the old 200-row synthetic-only model and also avoids the
"perfect 100%" metric trap caused by a tiny toy dataset.
"""
import json, os, joblib, numpy as np, pandas as pd
import sklearn
from scipy.sparse import hstack, csr_matrix
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

from features import extract_features, features_to_vector, FEATURE_NAMES

def main():
    df = pd.read_csv("data/training_urls.csv")
    df = df.dropna(subset=["url"]).copy()
    df["url"] = df["url"].astype(str).str.strip()
    df = df[df["url"].str.len() > 0].drop_duplicates("url")
    if set(df["label"].unique()) != {0, 1}:
        raise ValueError("Training data must contain both label 0 and label 1.")

    urls = df["url"].tolist()
    y = df["label"].astype(int).to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(
        urls, y, test_size=0.20, random_state=42, stratify=y
    )

    vectorizer = TfidfVectorizer(
        analyzer="char",
        ngram_range=(3, 5),
        min_df=2,
        max_features=180000,
        sublinear_tf=True,
        dtype=np.float32,
    )
    Xtr_text = vectorizer.fit_transform(X_train)
    Xte_text = vectorizer.transform(X_test)

    scaler = StandardScaler()
    Xtr_num = scaler.fit_transform(
        np.asarray([features_to_vector(extract_features(u)) for u in X_train], dtype=np.float32)
    )
    Xte_num = scaler.transform(
        np.asarray([features_to_vector(extract_features(u)) for u in X_test], dtype=np.float32)
    )

    Xtr = hstack([Xtr_text, csr_matrix(Xtr_num)], format="csr")
    Xte = hstack([Xte_text, csr_matrix(Xte_num)], format="csr")

    model = LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        C=2.0,
        solver="liblinear",
    )
    model.fit(Xtr, y_train)

    prob = model.predict_proba(Xte)[:, 1]
    pred = (prob >= 0.50).astype(int)

    metrics = {
        "accuracy": round(accuracy_score(y_test, pred), 4),
        "precision": round(precision_score(y_test, pred), 4),
        "recall": round(recall_score(y_test, pred), 4),
        "f1": round(f1_score(y_test, pred), 4),
        "roc_auc": round(roc_auc_score(y_test, prob), 4),
    }

    os.makedirs("model", exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "vectorizer": vectorizer,
            "scaler": scaler,
            "feature_names": FEATURE_NAMES,
        },
        "model/phishing_model.joblib",
        compress=3,
    )

    metadata = {
        "model_name": "Character TF-IDF + Logistic Regression + URL structural features",
        "version": "2.0",
        "scikit_learn_version": sklearn.__version__,
        "feature_names": FEATURE_NAMES,
        "metrics": metrics,
        "train_size": len(X_train),
        "test_size": len(X_test),
        "dataset_size": len(df),
        "class_counts": {
            "legitimate": int((y == 0).sum()),
            "phishing": int((y == 1).sum()),
        },
        "thresholds": {
            "phishing": 0.75,
            "suspicious": 0.35,
            "note": "Shorteners and abused cloud-hosting URLs can be suspicious without proving destination intent."
        },
        "training_notes": [
            "All URLs from the supplied phishing CSV are included as positive samples.",
            "Negative samples include legitimate authentication URLs, cloud-hosting subdomains and normal shortener URLs.",
            "Random train/test metrics can still be optimistic because URLs from the same source may be correlated."
        ],
    }
    with open("model/metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(json.dumps(metadata, indent=2))

if __name__ == "__main__":
    main()
