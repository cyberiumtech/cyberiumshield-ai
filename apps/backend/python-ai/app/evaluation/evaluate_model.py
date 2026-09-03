"""
Model evaluation script for phishing detection.

Reproduces metrics on held-out test set and generates evaluation report.
"""
import joblib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix,
    roc_curve
)
import logging

from app.preprocessing import PhishingDataLoader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Evaluate trained phishing detection models."""

    def __init__(self, model_path: str):
        """
        Initialize evaluator.

        Args:
            model_path: Path to saved model file
        """
        logger.info(f"Loading model from {model_path}")
        self.model_package = joblib.load(model_path)

        self.model = self.model_package['model']
        self.scaler = self.model_package.get('scaler')
        self.feature_extractor = self.model_package['feature_extractor']
        self.model_type = self.model_package['model_type']

        logger.info(f"Loaded {self.model_type} model")
        logger.info(f"Version: {self.model_package['version']}")

    def evaluate(self, X: pd.DataFrame, y: np.ndarray) -> dict:
        """
        Evaluate model on given data.

        Args:
            X: Features
            y: True labels

        Returns:
            Dictionary of metrics
        """
        # Prepare features
        if self.scaler is not None:
            X = self.scaler.transform(X)

        # Predictions
        y_pred = self.model.predict(X)
        y_pred_proba = self.model.predict_proba(X)[:, 1]

        # Calculate metrics
        metrics = {
            'accuracy': accuracy_score(y, y_pred),
            'precision': precision_score(y, y_pred, zero_division=0),
            'recall': recall_score(y, y_pred, zero_division=0),
            'f1': f1_score(y, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y, y_pred_proba),
        }

        # Confusion matrix
        cm = confusion_matrix(y, y_pred)
        tn, fp, fn, tp = cm.ravel()

        metrics['true_negatives'] = int(tn)
        metrics['false_positives'] = int(fp)
        metrics['false_negatives'] = int(fn)
        metrics['true_positives'] = int(tp)

        metrics['false_positive_rate'] = fp / (fp + tn) if (fp + tn) > 0 else 0
        metrics['false_negative_rate'] = fn / (fn + tp) if (fn + tp) > 0 else 0

        return metrics

    def print_report(self, metrics: dict, dataset_name: str = "Test"):
        """Print evaluation report."""
        logger.info(f"\n{'='*60}")
        logger.info(f"{dataset_name} Set Evaluation Report")
        logger.info(f"{'='*60}")
        logger.info(f"\nOverall Metrics:")
        logger.info(f"  Accuracy:  {metrics['accuracy']:.4f}")
        logger.info(f"  Precision: {metrics['precision']:.4f}")
        logger.info(f"  Recall:    {metrics['recall']:.4f}")
        logger.info(f"  F1 Score:  {metrics['f1']:.4f}")
        logger.info(f"  ROC-AUC:   {metrics['roc_auc']:.4f}")

        logger.info(f"\nConfusion Matrix:")
        logger.info(f"  True Negatives:  {metrics['true_negatives']}")
        logger.info(f"  False Positives: {metrics['false_positives']}")
        logger.info(f"  False Negatives: {metrics['false_negatives']}")
        logger.info(f"  True Positives:  {metrics['true_positives']}")

        logger.info(f"\nError Rates:")
        logger.info(f"  False Positive Rate: {metrics['false_positive_rate']:.4f}")
        logger.info(f"  False Negative Rate: {metrics['false_negative_rate']:.4f}")

        logger.info(f"{'='*60}\n")

    def test_on_examples(self, examples: list):
        """
        Test model on specific example URLs.

        Args:
            examples: List of tuples (url, expected_label, description)
        """
        logger.info("\n=== Testing on Specific Examples ===\n")

        for url, expected_label, description in examples:
            # Extract features
            features = self.feature_extractor.extract_features(url)
            X = pd.DataFrame([features])

            # Prepare for prediction
            if self.scaler is not None:
                X = self.scaler.transform(X)

            # Predict
            prediction = self.model.predict(X)[0]
            probability = self.model.predict_proba(X)[0, 1]

            result = "✓" if prediction == expected_label else "✗"
            label_name = "PHISHING" if prediction == 1 else "LEGITIMATE"

            logger.info(f"{result} {description}")
            logger.info(f"  URL: {url}")
            logger.info(f"  Prediction: {label_name} (confidence: {probability:.2%})")
            logger.info(f"  Expected: {'PHISHING' if expected_label == 1 else 'LEGITIMATE'}")
            logger.info("")


def main():
    """Main evaluation pipeline."""
    # Load latest model
    model_path = Path(__file__).parent.parent / "saved_models" / "phishing_model_latest.pkl"

    if not model_path.exists():
        logger.error(f"Model not found at {model_path}")
        logger.error("Please train the model first by running: python -m app.training.train_phishing_model")
        return

    evaluator = ModelEvaluator(str(model_path))

    # Load test data
    logger.info("Loading test data...")
    data_loader = PhishingDataLoader()
    _, _, test_df, _ = data_loader.load_and_prepare()

    # Extract features
    logger.info("Extracting features...")
    X_test = evaluator.feature_extractor.extract_batch(test_df['url'].tolist())
    y_test = test_df['label'].values

    # Evaluate
    metrics = evaluator.evaluate(X_test, y_test)
    evaluator.print_report(metrics, "Test")

    # Test on known examples
    test_examples = [
        # Phishing examples
        ("http://paypal-secure-login.tk/signin", 1, "Phishing: Fake PayPal with suspicious TLD"),
        ("http://secure-banking-login-verify.ml/", 1, "Phishing: Fake banking with suspicious TLD"),
        ("http://apple-account-locked.ga/unlock", 1, "Phishing: Fake Apple with suspicious TLD"),
        ("http://192.168.1.1/admin/login.php", 1, "Phishing: IP address in URL"),

        # Legitimate examples
        ("https://www.google.com", 0, "Legitimate: Google"),
        ("https://www.github.com", 0, "Legitimate: GitHub"),
        ("https://www.amazon.com", 0, "Legitimate: Amazon"),
        ("https://www.paypal.com", 0, "Legitimate: Real PayPal"),
    ]

    evaluator.test_on_examples(test_examples)

    # Save evaluation report
    report_path = model_path.parent / "evaluation_report.json"
    with open(report_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Evaluation report saved to: {report_path}")


if __name__ == "__main__":
    main()
