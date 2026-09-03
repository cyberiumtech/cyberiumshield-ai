"""
Train phishing detection models.

Trains Logistic Regression and XGBoost models, compares them,
and saves the best model with preprocessing pipeline.
"""
import joblib
import json
from pathlib import Path
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix
)
from xgboost import XGBClassifier
import logging

from app.preprocessing import PhishingDataLoader
from app.feature_engineering import URLFeatureExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PhishingModelTrainer:
    """Train and evaluate phishing detection models."""

    def __init__(self, random_state: int = 42):
        """Initialize trainer."""
        self.random_state = random_state
        self.feature_extractor = URLFeatureExtractor()
        self.scaler = StandardScaler()
        self.models = {}
        self.results = {}

    def prepare_features(self, df: pd.DataFrame) -> tuple:
        """
        Extract features from URLs and prepare X, y.

        Args:
            df: DataFrame with 'url' and 'label' columns

        Returns:
            Tuple of (X, y)
        """
        logger.info("Extracting features...")
        X = self.feature_extractor.extract_batch(df['url'].tolist())
        y = df['label'].values

        logger.info(f"Feature shape: {X.shape}")
        logger.info(f"Features: {list(X.columns)}")

        return X, y

    def train_logistic_regression(
        self,
        X_train: pd.DataFrame,
        y_train: np.ndarray,
        X_val: pd.DataFrame,
        y_val: np.ndarray
    ) -> dict:
        """
        Train Logistic Regression model.

        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels

        Returns:
            Dictionary of metrics
        """
        logger.info("\n=== Training Logistic Regression ===")

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)

        # Train model
        model = LogisticRegression(
            max_iter=1000,
            random_state=self.random_state,
            class_weight='balanced'
        )
        model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = model.predict(X_val_scaled)
        y_pred_proba = model.predict_proba(X_val_scaled)[:, 1]

        metrics = self._calculate_metrics(y_val, y_pred, y_pred_proba, "Logistic Regression")

        self.models['logistic_regression'] = model
        self.results['logistic_regression'] = metrics

        return metrics

    def train_xgboost(
        self,
        X_train: pd.DataFrame,
        y_train: np.ndarray,
        X_val: pd.DataFrame,
        y_val: np.ndarray
    ) -> dict:
        """
        Train XGBoost model.

        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels

        Returns:
            Dictionary of metrics
        """
        logger.info("\n=== Training XGBoost ===")

        # Calculate scale_pos_weight for class imbalance
        scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

        # Train model
        model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            random_state=self.random_state,
            eval_metric='logloss',
            use_label_encoder=False
        )

        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False
        )

        # Evaluate
        y_pred = model.predict(X_val)
        y_pred_proba = model.predict_proba(X_val)[:, 1]

        metrics = self._calculate_metrics(y_val, y_pred, y_pred_proba, "XGBoost")

        self.models['xgboost'] = model
        self.results['xgboost'] = metrics

        return metrics

    def _calculate_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_pred_proba: np.ndarray,
        model_name: str
    ) -> dict:
        """Calculate and log evaluation metrics."""
        metrics = {
            'accuracy': accuracy_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred),
            'recall': recall_score(y_true, y_pred),
            'f1': f1_score(y_true, y_pred),
            'roc_auc': roc_auc_score(y_true, y_pred_proba),
        }

        logger.info(f"\n{model_name} Metrics:")
        logger.info(f"  Accuracy:  {metrics['accuracy']:.4f}")
        logger.info(f"  Precision: {metrics['precision']:.4f}")
        logger.info(f"  Recall:    {metrics['recall']:.4f}")
        logger.info(f"  F1 Score:  {metrics['f1']:.4f}")
        logger.info(f"  ROC-AUC:   {metrics['roc_auc']:.4f}")

        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        logger.info(f"\nConfusion Matrix:\n{cm}")

        return metrics

    def select_best_model(self) -> str:
        """
        Select best model based on F1 score and ROC-AUC.

        Returns:
            Name of best model
        """
        best_model = None
        best_score = 0

        for model_name, metrics in self.results.items():
            # Combine F1 and ROC-AUC for selection
            score = (metrics['f1'] + metrics['roc_auc']) / 2

            if score > best_score:
                best_score = score
                best_model = model_name

        logger.info(f"\n=== Best Model: {best_model} (score: {best_score:.4f}) ===")
        return best_model

    def save_model(
        self,
        model_name: str,
        save_dir: Path,
        version: str = None
    ):
        """
        Save model, scaler, and feature extractor.

        Args:
            model_name: Name of model to save
            save_dir: Directory to save to
            version: Version tag (defaults to timestamp)
        """
        if version is None:
            version = datetime.now().strftime("%Y%m%d_%H%M%S")

        save_dir = Path(save_dir)
        save_dir.mkdir(parents=True, exist_ok=True)

        # Prepare model package
        model_package = {
            'model': self.models[model_name],
            'scaler': self.scaler if model_name == 'logistic_regression' else None,
            'feature_extractor': self.feature_extractor,
            'feature_names': self.feature_extractor.get_feature_names(),
            'model_type': model_name,
            'version': version,
            'metrics': self.results[model_name],
            'trained_at': datetime.now().isoformat()
        }

        # Save model
        model_path = save_dir / f"phishing_model_{version}.pkl"
        joblib.dump(model_package, model_path)
        logger.info(f"Model saved to: {model_path}")

        # Save metrics separately
        metrics_path = save_dir / f"metrics_{version}.json"
        with open(metrics_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        logger.info(f"Metrics saved to: {metrics_path}")

        # Save as latest
        latest_path = save_dir / "phishing_model_latest.pkl"
        joblib.dump(model_package, latest_path)
        logger.info(f"Latest model saved to: {latest_path}")

        return model_path


def main():
    """Main training pipeline."""
    logger.info("=" * 60)
    logger.info("Starting Phishing Detection Model Training")
    logger.info("=" * 60)

    # Initialize
    trainer = PhishingModelTrainer(random_state=42)

    # Load data
    logger.info("\n=== Loading Data ===")
    data_loader = PhishingDataLoader()
    train_df, val_df, test_df, class_weights = data_loader.load_and_prepare()

    # Prepare features
    logger.info("\n=== Preparing Features ===")
    X_train, y_train = trainer.prepare_features(train_df)
    X_val, y_val = trainer.prepare_features(val_df)
    X_test, y_test = trainer.prepare_features(test_df)

    # Train models
    trainer.train_logistic_regression(X_train, y_train, X_val, y_val)
    trainer.train_xgboost(X_train, y_train, X_val, y_val)

    # Select best model
    best_model = trainer.select_best_model()

    # Final evaluation on test set
    logger.info("\n=== Final Evaluation on Test Set ===")
    if best_model == 'logistic_regression':
        X_test_scaled = trainer.scaler.transform(X_test)
        y_pred = trainer.models[best_model].predict(X_test_scaled)
        y_pred_proba = trainer.models[best_model].predict_proba(X_test_scaled)[:, 1]
    else:
        y_pred = trainer.models[best_model].predict(X_test)
        y_pred_proba = trainer.models[best_model].predict_proba(X_test)[:, 1]

    test_metrics = trainer._calculate_metrics(y_test, y_pred, y_pred_proba, "Test Set")

    # Save model
    logger.info("\n=== Saving Model ===")
    save_dir = Path(__file__).parent.parent / "saved_models"
    model_path = trainer.save_model(best_model, save_dir)

    logger.info("\n" + "=" * 60)
    logger.info("Training Complete!")
    logger.info(f"Best Model: {best_model}")
    logger.info(f"Test F1 Score: {test_metrics['f1']:.4f}")
    logger.info(f"Test ROC-AUC: {test_metrics['roc_auc']:.4f}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
