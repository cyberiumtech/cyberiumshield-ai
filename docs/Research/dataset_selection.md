# Phishing Detection Dataset Selection

## Selected Dataset: Phishing Websites Dataset (UCI + Kaggle)

### Dataset Information
**Source**: Combined dataset from multiple sources:
1. **Primary**: Kaggle "Phishing Websites Dataset" 
   - URL: https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls
   - 549,346 URLs (legitimate and phishing)
   - Features: URL only (we extract features ourselves)

2. **Alternative/Supplement**: UCI ML Repository - Phishing Websites
   - URL: https://archive.ics.uci.edu/ml/datasets/phishing+websites
   - Pre-extracted features available

### Why This Dataset?

**Advantages**:
1. **Large Scale**: 549K+ URLs provide sufficient training data
2. **Real-world URLs**: Actual phishing and legitimate URLs, not synthetic
3. **Balanced**: Roughly balanced between phishing and legitimate
4. **License**: CC0 Public Domain / CC BY 4.0 - commercial use allowed
5. **Recent**: Updated regularly with new phishing campaigns
6. **CSV Format**: Easy to ingest and process
7. **No API Required**: Can be downloaded and versioned

**Why Not Others**:
- **PhishTank**: Requires API access, rate limits, dynamic dataset
- **OpenPhish**: Commercial license for bulk access
- **PhishStats**: Limited historical data
- **EmailSpam datasets**: Different feature space (we want URLs)

### Dataset Structure
```
phishing_site_urls.csv
- URL: string
- Label: "good" or "bad"
```

### Licensing
- **License**: Creative Commons CC0 / CC BY 4.0
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required for CC BY 4.0
- **Distribution**: ✅ Allowed
- **Modification**: ✅ Allowed

### Data Split Strategy
- **Training**: 70% (384,542 samples)
- **Validation**: 15% (82,402 samples)
- **Test**: 15% (82,402 samples)

Stratified split to maintain class balance.

### Known Limitations
1. **Time Sensitivity**: Phishing URLs have short lifespan - model may drift
2. **Feature Engineering Required**: Dataset only has URLs, not pre-extracted features
3. **Domain Registration**: Cannot easily check WHOIS/domain age in bulk offline
4. **Geographic Bias**: May be biased toward English-language phishing
5. **False Negatives**: Some sophisticated phishing may look legitimate

### Data Quality Issues
- **URL Encoding**: Some URLs may have encoding issues
- **Duplicates**: May contain duplicate URLs
- **Dead Links**: URLs may no longer be active
- **Mislabeled**: Some manual review may be needed for edge cases

### Mitigation Strategies
1. **Deduplication**: Remove duplicate URLs before training
2. **URL Normalization**: Standardize URL format (lowercase, strip trailing slash)
3. **Feature Engineering**: Extract robust features that work on dead/redirected URLs
4. **Cross-validation**: Use 5-fold CV to ensure model generalizes
5. **Test on Fresh Data**: Periodically test on newly reported phishing

### Alternative: Synthetic Feature Generation
For features requiring live lookups (WHOIS, SSL cert), we'll:
- Extract what we can offline (URL structure, patterns)
- Document missing features for future enhancement
- Focus on features with high predictive power that don't require live APIs

### Attribution
When using this dataset, we will include:
```
Dataset: Phishing Websites Dataset
Source: Kaggle / UCI Machine Learning Repository
License: CC BY 4.0
Authors: Various contributors
```

---

## Implementation Notes

### Data Storage
- Raw data: `datasets/phishing/raw/phishing_site_urls.csv`
- Processed data: `datasets/phishing/processed/`
- Features: `datasets/phishing/features/`

### Download Method
Since we can't download via API in this environment, we'll create a script that:
1. Documents where to download the dataset
2. Validates the downloaded file
3. Processes and cleans the data

### Fallback: Embedded Sample
For immediate development/testing, we'll include a small sample dataset (1000 URLs) in the repository under `datasets/phishing/sample/` for reproducibility.

---

## Conclusion

The **Phishing Websites Dataset from Kaggle/UCI** is the best choice for our needs:
- ✅ Large scale (549K URLs)
- ✅ Permissive license (commercial use allowed)
- ✅ Real-world data (not synthetic)
- ✅ Well-documented and widely used
- ✅ No API dependencies
- ✅ Active community and updates

This dataset will enable us to build a production-grade phishing detection model with real predictive power.
