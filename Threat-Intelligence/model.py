import os
try:
    import joblib
except Exception:
    joblib = None

MODEL_PATH = os.getenv('MODEL_PATH', 'models/risk_model.joblib')

class RiskModel:
    def __init__(self):
        self.model = None
        if joblib and os.path.exists(MODEL_PATH):
            try: self.model = joblib.load(MODEL_PATH)
            except Exception: self.model = None

    def score_url(self, features):
        if not self.model: return None
        names = ['length','host_length','path_length','query_length','subdomain_depth','digit_ratio','hyphen_count','at_symbol','ip_host','punycode','https','suspicious_word_count','entropy']
        x = [[features[n] for n in names]]
        try:
            if hasattr(self.model, 'predict_proba'):
                return float(self.model.predict_proba(x)[0][1])
            return float(self.model.predict(x)[0])
        except Exception:
            return None
