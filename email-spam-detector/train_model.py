"""Train and evaluate the production email spam classification pipeline."""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "emails.csv"
SOURCE_METADATA = ROOT / "data" / "source_metadata.json"
MODEL_DIR = ROOT / "model"
MODEL_FILE = MODEL_DIR / "spam_pipeline.joblib"
METADATA_FILE = MODEL_DIR / "metadata.json"

csv.field_size_limit(10_000_000)


def load_dataset() -> tuple[list[str], np.ndarray]:
    texts, labels = [], []
    with DATA_FILE.open(encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            texts.append(row["text"])
            labels.append(int(row["label"]))
    if len(texts) < 1_000 or len(set(labels)) != 2:
        raise ValueError("Dataset must contain at least 1,000 real messages across both classes")
    return texts, np.asarray(labels)


def build_pipeline() -> Pipeline:
    features = FeatureUnion([
        ("words", TfidfVectorizer(lowercase=True, strip_accents="unicode", ngram_range=(1, 2), min_df=2, max_df=0.995, max_features=80_000, sublinear_tf=True)),
        ("characters", TfidfVectorizer(lowercase=True, analyzer="char_wb", ngram_range=(3, 5), min_df=3, max_features=80_000, sublinear_tf=True)),
    ])
    classifier = LogisticRegression(max_iter=1_000, C=4.0, solver="liblinear", random_state=42)
    return Pipeline([("features", features), ("classifier", classifier)])


def choose_threshold(labels: np.ndarray, probabilities: np.ndarray) -> float:
    candidates = []
    # False positives are more costly than missed spam. Restrict the operating
    # point to a conservative range and require at least 99% validation precision.
    for threshold in np.arange(0.65, 0.91, 0.01):
        predictions = (probabilities >= threshold).astype(int)
        precision = precision_score(labels, predictions, zero_division=0)
        recall = recall_score(labels, predictions, zero_division=0)
        f1 = f1_score(labels, predictions, zero_division=0)
        if precision >= 0.99:
            candidates.append((f1, recall, float(threshold)))
    return max(candidates, default=(0, 0, 0.75))[2]


def metrics(labels: np.ndarray, probabilities: np.ndarray, threshold: float) -> dict:
    predictions = (probabilities >= threshold).astype(int)
    return {
        "accuracy": round(float(accuracy_score(labels, predictions)), 4),
        "precision": round(float(precision_score(labels, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(labels, predictions, zero_division=0)), 4),
        "f1": round(float(f1_score(labels, predictions, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(labels, probabilities)), 4),
        "confusion_matrix": confusion_matrix(labels, predictions).tolist(),
    }


def main() -> None:
    texts, labels = load_dataset()
    train_texts, remainder_texts, train_labels, remainder_labels = train_test_split(texts, labels, test_size=0.30, random_state=42, stratify=labels)
    validation_texts, test_texts, validation_labels, test_labels = train_test_split(remainder_texts, remainder_labels, test_size=0.50, random_state=42, stratify=remainder_labels)

    pipeline = build_pipeline()
    pipeline.fit(train_texts, train_labels)
    validation_probabilities = pipeline.predict_proba(validation_texts)[:, 1]
    threshold = choose_threshold(validation_labels, validation_probabilities)
    test_probabilities = pipeline.predict_proba(test_texts)[:, 1]

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_FILE, compress=3)
    source_metadata = json.loads(SOURCE_METADATA.read_text(encoding="utf-8"))
    metadata = {
        "model_name": "Word + character TF-IDF Logistic Regression",
        "model_version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "decision_threshold": round(threshold, 2),
        "dataset": source_metadata,
        "splits": {"train": len(train_texts), "validation": len(validation_texts), "test": len(test_texts)},
        "validation_metrics": metrics(validation_labels, validation_probabilities, threshold),
        "test_metrics": metrics(test_labels, test_probabilities, threshold),
    }
    METADATA_FILE.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    print(f"Saved {MODEL_FILE}")


if __name__ == "__main__":
    main()
