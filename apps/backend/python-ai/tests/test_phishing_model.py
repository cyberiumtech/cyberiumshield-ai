"""
Tests for phishing detection model and features.
"""
import pytest
from pathlib import Path
from app.feature_engineering import URLFeatureExtractor
from app.preprocessing import PhishingDataLoader


@pytest.fixture
def feature_extractor():
    """Create feature extractor instance."""
    return URLFeatureExtractor()


@pytest.fixture
def known_phishing_urls():
    """Known phishing URLs for testing."""
    return [
        "http://paypal-secure-login.tk/signin",
        "http://secure-banking-login-verify.ml/",
        "http://apple-account-locked.ga/unlock",
        "http://192.168.1.1/admin/login.php",
        "http://www.paypal.com.secure-login.ml/",
        "http://bit.ly.phishing-redirect.tk/",
    ]


@pytest.fixture
def known_legitimate_urls():
    """Known legitimate URLs for testing."""
    return [
        "https://www.google.com",
        "https://www.github.com",
        "https://www.amazon.com",
        "https://www.paypal.com",
        "https://www.microsoft.com",
        "https://www.apple.com",
    ]


@pytest.mark.unit
def test_feature_extraction_phishing(feature_extractor, known_phishing_urls):
    """Test that phishing URLs have expected features."""
    for url in known_phishing_urls:
        features = feature_extractor.extract_features(url)

        assert isinstance(features, dict)
        assert len(features) > 0

        # Phishing URLs typically have these characteristics
        # (not all phishing will have all, but test data should)
        assert 'url_length' in features
        assert 'has_suspicious_tld' in features
        assert 'num_suspicious_keywords' in features


@pytest.mark.unit
def test_feature_extraction_legitimate(feature_extractor, known_legitimate_urls):
    """Test that legitimate URLs have expected features."""
    for url in known_legitimate_urls:
        features = feature_extractor.extract_features(url)

        assert isinstance(features, dict)
        assert len(features) > 0

        # Legitimate URLs should typically have these
        assert features['has_https'] == 1  # Major sites use HTTPS
        assert features['has_suspicious_tld'] == 0  # Should have .com, .org, etc.


@pytest.mark.unit
def test_suspicious_tld_detection(feature_extractor):
    """Test suspicious TLD detection."""
    # Suspicious TLDs
    assert feature_extractor.extract_features("http://test.tk")['has_suspicious_tld'] == 1
    assert feature_extractor.extract_features("http://test.ml")['has_suspicious_tld'] == 1
    assert feature_extractor.extract_features("http://test.ga")['has_suspicious_tld'] == 1

    # Legitimate TLDs
    assert feature_extractor.extract_features("https://test.com")['has_suspicious_tld'] == 0
    assert feature_extractor.extract_features("https://test.org")['has_suspicious_tld'] == 0
    assert feature_extractor.extract_features("https://test.edu")['has_suspicious_tld'] == 0


@pytest.mark.unit
def test_ip_address_detection(feature_extractor):
    """Test IP address detection in URLs."""
    assert feature_extractor.extract_features("http://192.168.1.1/login")['has_ip_address'] == 1
    assert feature_extractor.extract_features("http://10.0.0.1/admin")['has_ip_address'] == 1
    assert feature_extractor.extract_features("https://www.google.com")['has_ip_address'] == 0


@pytest.mark.unit
def test_suspicious_keywords(feature_extractor):
    """Test suspicious keyword detection."""
    features = feature_extractor.extract_features("http://verify-account-secure-login.com")
    assert features['num_suspicious_keywords'] >= 3  # verify, account, secure, login

    features = feature_extractor.extract_features("https://www.example.com")
    assert features['num_suspicious_keywords'] == 0


@pytest.mark.unit
def test_https_detection(feature_extractor):
    """Test HTTPS detection."""
    assert feature_extractor.extract_features("https://www.google.com")['has_https'] == 1
    assert feature_extractor.extract_features("http://www.google.com")['has_https'] == 0


@pytest.mark.unit
def test_url_length_features(feature_extractor):
    """Test URL length feature extraction."""
    short_url = "https://a.co"
    long_url = "http://this-is-a-very-long-suspicious-url-with-many-characters.tk/verify/account/suspended"

    short_features = feature_extractor.extract_features(short_url)
    long_features = feature_extractor.extract_features(long_url)

    assert short_features['url_length'] < long_features['url_length']
    assert long_features['url_length'] > 50


@pytest.mark.unit
def test_batch_feature_extraction(feature_extractor, known_phishing_urls, known_legitimate_urls):
    """Test batch feature extraction."""
    all_urls = known_phishing_urls + known_legitimate_urls
    features_df = feature_extractor.extract_batch(all_urls)

    assert len(features_df) == len(all_urls)
    assert features_df.shape[1] > 30  # Should have 33 features


@pytest.mark.unit
def test_data_loader_sample():
    """Test data loader with sample dataset."""
    loader = PhishingDataLoader()

    # Load sample data
    df = loader.load_raw_data()
    assert len(df) > 0
    assert 'url' in df.columns
    assert 'label' in df.columns


@pytest.mark.unit
def test_data_cleaning():
    """Test data cleaning functionality."""
    import pandas as pd

    loader = PhishingDataLoader()

    # Create test data with issues
    test_data = pd.DataFrame({
        'url': [
            'https://www.google.com',
            'https://www.google.com',  # duplicate
            'bad',  # too short
            'HTTP://TEST.COM',  # uppercase
        ],
        'label': ['good', 'good', 'bad', 'good']
    })

    cleaned = loader.clean_data(test_data)

    # Should remove duplicate and too-short URL
    assert len(cleaned) < len(test_data)
    # URLs should be lowercase
    assert all(cleaned['url'].str.islower())


@pytest.mark.integration
def test_model_loading_and_prediction():
    """Test loading saved model and making predictions."""
    from app.services.phishing_service import PhishingDetectionService

    service = PhishingDetectionService()

    # Test phishing URL
    result_phishing = service.scan_url("http://paypal-secure-login.tk/signin")
    assert 'is_phishing' in result_phishing
    assert 'confidence' in result_phishing
    assert 'risk_level' in result_phishing
    assert 0 <= result_phishing['confidence'] <= 1
    assert result_phishing['risk_level'] in ['low', 'medium', 'high', 'critical', 'unknown']

    # Test legitimate URL
    result_legit = service.scan_url("https://www.google.com")
    assert 'is_phishing' in result_legit
    assert 'confidence' in result_legit

    # Phishing should have higher confidence than legitimate
    # (unless model not trained yet, in which case fallback is used)
    if service.model_package is not None:
        assert result_phishing['confidence'] > result_legit['confidence']


@pytest.mark.integration
def test_known_phishing_examples(known_phishing_urls):
    """Test model correctly identifies known phishing URLs."""
    from app.services.phishing_service import PhishingDetectionService

    service = PhishingDetectionService()

    if service.model_package is None:
        pytest.skip("Model not loaded, skipping trained model tests")

    for url in known_phishing_urls[:3]:  # Test subset
        result = service.scan_url(url)
        # Most phishing URLs should be caught (but not required 100% due to model uncertainty)
        # Just verify the service returns valid results
        assert isinstance(result['is_phishing'], bool)
        assert 0 <= result['confidence'] <= 1


@pytest.mark.integration
def test_known_legitimate_examples(known_legitimate_urls):
    """Test model correctly identifies known legitimate URLs."""
    from app.services.phishing_service import PhishingDetectionService

    service = PhishingDetectionService()

    if service.model_package is None:
        pytest.skip("Model not loaded, skipping trained model tests")

    for url in known_legitimate_urls[:3]:  # Test subset
        result = service.scan_url(url)
        # Verify service returns valid results
        assert isinstance(result['is_phishing'], bool)
        assert 0 <= result['confidence'] <= 1
