"""
train_model.py
Loads data/urls.csv, extracts features with features.py, trains a
classifier (XGBoost, falling back to RandomForest for comparison),
evaluates on a held-out split, and saves the best model + metadata.
"""

import json
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from xgboost import XGBClassifier

from features import extract_features, FEATURE_NAMES


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    rows = [extract_features(u) for u in df["url"]]
    X = pd.DataFrame(rows, columns=FEATURE_NAMES)
    return X


def evaluate(name, model, X_test, y_test):
    preds = model.predict(X_test)
    metrics = {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds), 4),
        "recall": round(recall_score(y_test, preds), 4),
        "f1": round(f1_score(y_test, preds), 4),
    }
    print(f"{name}: {metrics}")
    return metrics


def main():
    df = pd.read_csv("data/urls.csv")
    X = build_feature_frame(df)
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    rf = RandomForestClassifier(n_estimators=300, max_depth=8, random_state=42)
    rf.fit(X_train, y_train)
    rf_metrics = evaluate("RandomForest", rf, X_test, y_test)

    xgb = XGBClassifier(
        n_estimators=300, max_depth=5, learning_rate=0.1,
        eval_metric="logloss", random_state=42
    )
    xgb.fit(X_train, y_train)
    xgb_metrics = evaluate("XGBoost", xgb, X_test, y_test)

    if xgb_metrics["f1"] >= rf_metrics["f1"]:
        best_name, best_model, best_metrics = "XGBoost", xgb, xgb_metrics
    else:
        best_name, best_model, best_metrics = "RandomForest", rf, rf_metrics

    print(f"\nSelected model: {best_name}")

    joblib.dump(best_model, "model/phishing_model.joblib")
    with open("model/metadata.json", "w") as f:
        json.dump({
            "model_name": best_name,
            "feature_names": FEATURE_NAMES,
            "metrics": best_metrics,
            "rf_metrics": rf_metrics,
            "xgb_metrics": xgb_metrics,
            "train_size": len(X_train),
            "test_size": len(X_test),
            "dataset_size": len(df),
        }, f, indent=2)

    print("Saved model/phishing_model.joblib and model/metadata.json")


if __name__ == "__main__":
    main()
