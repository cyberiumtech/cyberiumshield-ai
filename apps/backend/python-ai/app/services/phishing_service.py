"""
Phishing detection service using trained ML model.
"""
import joblib
from pathlib import Path
from typing import Dict, Optional
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class PhishingDetectionService:
    """Service for detecting phishing URLs using trained model."""

    _instance = None
    _model_loaded = False

    def __new__(cls):
        """Singleton pattern to load model only once."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize service and load model."""
        if not self._model_loaded:
            self._load_model()
            PhishingDetectionService._model_loaded = True

    def _load_model(self):
        """Load trained model from saved file."""
        model_path = Path(__file__).parent.parent / "saved_models" / "phishing_model_latest.pkl"

        if not model_path.exists():
            logger.warning(f"Model not found at {model_path}. Phishing detection will use fallback.")
            self.model_package = None
            return

        try:
            logger.info(f"Loading phishing detection model from {model_path}")
            self.model_package = joblib.load(model_path)

            self.model = self.model_package['model']
            self.scaler = self.model_package.get('scaler')
            self.feature_extractor = self.model_package['feature_extractor']
            self.model_type = self.model_package['model_type']

            logger.info(f"Model loaded successfully: {self.model_type}")
            logger.info(f"Model version: {self.model_package['version']}")

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.model_package = None

    def scan_url(self, url: str) -> Dict:
        """
        Scan a URL for phishing indicators.

        Args:
            url: URL to scan

        Returns:
            Dictionary with:
                - is_phishing: boolean
                - confidence: float (0-1)
                - risk_level: str (low, medium, high, critical)
                - score: int (0-100)
                - details: dict with feature information
        """
        if self.model_package is None:
            # Fallback: basic heuristic if model not loaded
            return self._fallback_scan(url)

        try:
            # Extract features
            features = self.feature_extractor.extract_features(url)
            X = pd.DataFrame([features])

            # Prepare for prediction
            if self.scaler is not None:
                X = self.scaler.transform(X)

            # Predict
            prediction = self.model.predict(X)[0]
            probability = self.model.predict_proba(X)[0]

            # Probability of phishing (class 1)
            phishing_prob = float(probability[1])

            # Determine risk level
            risk_level = self._get_risk_level(phishing_prob)

            # Build response
            result = {
                'is_phishing': bool(prediction == 1),
                'confidence': phishing_prob,
                'score': int(phishing_prob * 100),
                'risk_level': risk_level,
                'model_version': self.model_package['version'],
                'features_analyzed': {
                    'url_length': features['url_length'],
                    'has_https': bool(features['has_https']),
                    'has_suspicious_tld': bool(features['has_suspicious_tld']),
                    'has_ip_address': bool(features['has_ip_address']),
                    'num_suspicious_keywords': features['num_suspicious_keywords'],
                    'has_misleading_domain': bool(features['has_misleading_domain']),
                },
                'warnings': self._get_warnings(features)
            }

            return result

        except Exception as e:
            logger.error(f"Error scanning URL {url}: {e}")
            return {
                'is_phishing': False,
                'confidence': 0.0,
                'score': 0,
                'risk_level': 'unknown',
                'error': str(e)
            }

    def _get_risk_level(self, probability: float) -> str:
        """
        Determine risk level based on probability.

        Args:
            probability: Phishing probability (0-1)

        Returns:
            Risk level string
        """
        if probability >= 0.9:
            return 'critical'
        elif probability >= 0.7:
            return 'high'
        elif probability >= 0.4:
            return 'medium'
        else:
            return 'low'

    def _get_warnings(self, features: Dict) -> list:
        """
        Generate human-readable warnings based on features.

        Args:
            features: Extracted URL features

        Returns:
            List of warning strings
        """
        warnings = []

        if features['has_suspicious_tld']:
            warnings.append("Uses suspicious top-level domain (TLD)")

        if features['has_ip_address']:
            warnings.append("Uses IP address instead of domain name")

        if features['num_suspicious_keywords'] > 2:
            warnings.append(f"Contains {features['num_suspicious_keywords']} suspicious keywords")

        if not features['has_https']:
            warnings.append("Does not use HTTPS encryption")

        if features['has_misleading_domain']:
            warnings.append("Domain structure appears misleading or impersonating")

        if features['url_length'] > 100:
            warnings.append("Unusually long URL")

        if features['subdomain_count'] > 3:
            warnings.append("Excessive number of subdomains")

        return warnings

    def _fallback_scan(self, url: str) -> Dict:
        """
        Fallback basic scan when model is not loaded.

        Args:
            url: URL to scan

        Returns:
            Basic scan result
        """
        logger.warning("Using fallback scan (model not loaded)")

        # Basic heuristics
        url_lower = url.lower()
        is_suspicious = False
        warnings = []

        # Check for suspicious TLDs
        suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.gq']
        if any(tld in url_lower for tld in suspicious_tlds):
            is_suspicious = True
            warnings.append("Uses suspicious top-level domain")

        # Check for IP address
        import re
        if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
            is_suspicious = True
            warnings.append("Uses IP address instead of domain")

        # Check for suspicious keywords
        suspicious_keywords = ['verify', 'account', 'secure', 'login', 'suspended']
        keyword_count = sum(1 for kw in suspicious_keywords if kw in url_lower)
        if keyword_count > 1:
            is_suspicious = True
            warnings.append(f"Contains {keyword_count} suspicious keywords")

        confidence = 0.8 if is_suspicious else 0.2

        return {
            'is_phishing': is_suspicious,
            'confidence': confidence,
            'score': int(confidence * 100),
            'risk_level': 'high' if is_suspicious else 'low',
            'model_version': 'fallback',
            'warnings': warnings,
            'note': 'Using fallback detection (model not loaded)'
        }


# Singleton instance
phishing_service = PhishingDetectionService()
