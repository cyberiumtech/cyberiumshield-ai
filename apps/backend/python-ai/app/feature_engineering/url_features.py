"""
Feature extraction for phishing URL detection.

Extracts various features from URLs that are indicative of phishing attempts.
"""
import re
import tldextract
from urllib.parse import urlparse, parse_qs
import pandas as pd
import numpy as np
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class URLFeatureExtractor:
    """Extract features from URLs for phishing detection."""

    # Suspicious keywords commonly found in phishing URLs
    SUSPICIOUS_KEYWORDS = [
        'verify', 'account', 'update', 'secure', 'banking', 'confirm',
        'login', 'signin', 'password', 'suspended', 'locked', 'unusual',
        'click', 'here', 'now', 'paypal', 'ebay', 'amazon', 'apple',
        'microsoft', 'google', 'facebook', 'netflix', 'alert', 'warning',
        'urgent', 'expire', 'renew', 'billing', 'payment', 'refund'
    ]

    # Legitimate TLDs
    LEGITIMATE_TLDS = [
        'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'co', 'io'
    ]

    # Suspicious TLDs often used in phishing
    SUSPICIOUS_TLDS = [
        'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'work', 'click'
    ]

    def extract_features(self, url: str) -> Dict[str, float]:
        """
        Extract all features from a single URL.

        Args:
            url: URL string to analyze

        Returns:
            Dictionary of feature names to values
        """
        features = {}

        # Parse URL
        try:
            parsed = urlparse(url)
            ext = tldextract.extract(url)
        except Exception as e:
            logger.warning(f"Error parsing URL {url}: {e}")
            return self._get_default_features()

        # Basic URL features
        features['url_length'] = len(url)
        features['domain_length'] = len(ext.domain) if ext.domain else 0
        features['path_length'] = len(parsed.path)
        features['query_length'] = len(parsed.query) if parsed.query else 0

        # Character count features
        features['num_dots'] = url.count('.')
        features['num_hyphens'] = url.count('-')
        features['num_underscores'] = url.count('_')
        features['num_slashes'] = url.count('/')
        features['num_question_marks'] = url.count('?')
        features['num_equal_signs'] = url.count('=')
        features['num_at_symbols'] = url.count('@')
        features['num_ampersands'] = url.count('&')
        features['num_exclamation_marks'] = url.count('!')
        features['num_percent_signs'] = url.count('%')
        features['num_digits'] = sum(c.isdigit() for c in url)

        # Protocol features
        features['has_https'] = 1 if parsed.scheme == 'https' else 0
        features['has_http'] = 1 if parsed.scheme == 'http' else 0

        # Domain features
        features['has_ip_address'] = 1 if self._has_ip_address(parsed.netloc) else 0
        features['domain_has_hyphen'] = 1 if '-' in ext.domain else 0
        features['subdomain_count'] = len(ext.subdomain.split('.')) if ext.subdomain else 0

        # TLD features
        features['has_suspicious_tld'] = 1 if ext.suffix in self.SUSPICIOUS_TLDS else 0
        features['has_legitimate_tld'] = 1 if ext.suffix in self.LEGITIMATE_TLDS else 0

        # Suspicious keyword features
        url_lower = url.lower()
        features['num_suspicious_keywords'] = sum(
            1 for keyword in self.SUSPICIOUS_KEYWORDS if keyword in url_lower
        )
        features['has_suspicious_keyword'] = 1 if features['num_suspicious_keywords'] > 0 else 0

        # URL structure features
        features['has_port'] = 1 if parsed.port is not None else 0
        features['has_query'] = 1 if parsed.query else 0
        features['has_fragment'] = 1 if parsed.fragment else 0

        # Brand impersonation features
        features['has_multiple_domains'] = self._has_multiple_domains(url)
        features['has_misleading_domain'] = self._has_misleading_domain(url)

        # Entropy features (measure randomness)
        features['url_entropy'] = self._calculate_entropy(url)
        features['domain_entropy'] = self._calculate_entropy(ext.domain) if ext.domain else 0

        # Ratio features
        features['digit_ratio'] = features['num_digits'] / features['url_length'] if features['url_length'] > 0 else 0
        features['special_char_ratio'] = (
            features['num_dots'] + features['num_hyphens'] + features['num_underscores']
        ) / features['url_length'] if features['url_length'] > 0 else 0

        # Shortening service detection
        features['is_shortened_url'] = self._is_shortened_url(ext.domain)

        return features

    def extract_batch(self, urls: List[str]) -> pd.DataFrame:
        """
        Extract features from multiple URLs.

        Args:
            urls: List of URL strings

        Returns:
            DataFrame with features for each URL
        """
        logger.info(f"Extracting features from {len(urls)} URLs...")

        features_list = []
        for url in urls:
            features = self.extract_features(url)
            features_list.append(features)

        df = pd.DataFrame(features_list)
        logger.info(f"Extracted {len(df.columns)} features")

        return df

    def _has_ip_address(self, netloc: str) -> bool:
        """Check if URL uses IP address instead of domain name."""
        # IPv4 pattern
        ipv4_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        # IPv6 pattern (simplified)
        ipv6_pattern = r'\[?([0-9a-fA-F:]+)\]?'

        return bool(re.search(ipv4_pattern, netloc) or re.search(ipv6_pattern, netloc))

    def _has_multiple_domains(self, url: str) -> int:
        """Check if URL contains multiple domain-like patterns (common in phishing)."""
        # Pattern: domain.com.otherdomain.com
        domain_pattern = r'[a-z0-9-]+\.(com|net|org|info)'
        matches = re.findall(domain_pattern, url.lower())
        return 1 if len(matches) > 1 else 0

    def _has_misleading_domain(self, url: str) -> int:
        """Check for misleading domain patterns like paypal.com.phishing.tk."""
        url_lower = url.lower()
        # Check if legitimate brand names appear before the actual domain
        brands = ['paypal', 'amazon', 'apple', 'google', 'microsoft', 'facebook', 'netflix']
        for brand in brands:
            if brand in url_lower:
                # Check if brand appears in path or subdomain rather than main domain
                pattern = f'{brand}\\.com\\.[a-z]+'
                if re.search(pattern, url_lower):
                    return 1
        return 0

    def _calculate_entropy(self, text: str) -> float:
        """Calculate Shannon entropy of text (measure of randomness)."""
        if not text:
            return 0.0

        # Calculate character probabilities
        char_counts = {}
        for char in text:
            char_counts[char] = char_counts.get(char, 0) + 1

        text_len = len(text)
        entropy = 0.0

        for count in char_counts.values():
            probability = count / text_len
            if probability > 0:
                entropy -= probability * np.log2(probability)

        return entropy

    def _is_shortened_url(self, domain: str) -> int:
        """Check if domain is from a URL shortening service."""
        if not domain:
            return 0

        shortening_services = [
            'bit.ly', 'goo.gl', 't.co', 'tinyurl', 'ow.ly', 'is.gd',
            'buff.ly', 'adf.ly', 'bl.ink', 'lnkd.in', 'shorte.st'
        ]

        return 1 if any(service in domain.lower() for service in shortening_services) else 0

    def _get_default_features(self) -> Dict[str, float]:
        """Return default feature values when URL parsing fails."""
        return {
            'url_length': 0, 'domain_length': 0, 'path_length': 0, 'query_length': 0,
            'num_dots': 0, 'num_hyphens': 0, 'num_underscores': 0, 'num_slashes': 0,
            'num_question_marks': 0, 'num_equal_signs': 0, 'num_at_symbols': 0,
            'num_ampersands': 0, 'num_exclamation_marks': 0, 'num_percent_signs': 0,
            'num_digits': 0, 'has_https': 0, 'has_http': 0, 'has_ip_address': 0,
            'domain_has_hyphen': 0, 'subdomain_count': 0, 'has_suspicious_tld': 0,
            'has_legitimate_tld': 0, 'num_suspicious_keywords': 0,
            'has_suspicious_keyword': 0, 'has_port': 0, 'has_query': 0,
            'has_fragment': 0, 'has_multiple_domains': 0, 'has_misleading_domain': 0,
            'url_entropy': 0, 'domain_entropy': 0, 'digit_ratio': 0,
            'special_char_ratio': 0, 'is_shortened_url': 0
        }

    def get_feature_names(self) -> List[str]:
        """Get list of all feature names."""
        return list(self._get_default_features().keys())


def main():
    """Example usage."""
    logging.basicConfig(level=logging.INFO)

    extractor = URLFeatureExtractor()

    # Test URLs
    test_urls = [
        'http://paypal-secure-login.tk/signin',
        'https://www.google.com',
        'http://secure-banking-login-verify.ml/',
        'https://www.github.com'
    ]

    # Extract features
    features_df = extractor.extract_batch(test_urls)

    print("\n=== Feature Extraction Examples ===")
    print(features_df.T)  # Transpose for better readability


if __name__ == "__main__":
    main()
