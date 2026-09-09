import unittest

from app import app, score_url


class PhishingApiTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.client = app.test_client()

    def test_predict_returns_analysis_for_valid_url(self):
        response = self.client.post(
            "/api/predict", json={"url": "https://example.com/login"}
        )

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result["url"], "https://example.com/login")
        self.assertIn(result["prediction"], {"phishing", "suspicious", "legitimate"})
        self.assertIn("phishing_probability", result)
        self.assertTrue(result["signals"])

    def test_at_symbol_signal_does_not_crash_inference(self):
        result = score_url("https://trusted.example@evil.example/login")

        self.assertGreaterEqual(result["phishing_probability"], 0.70)
        at_signal = next(
            signal for signal in result["signals"] if signal["label"] == "'@' symbol count"
        )
        self.assertTrue(at_signal["flagged"])

    def test_predict_rejects_non_object_json(self):
        response = self.client.post("/api/predict", json=["https://example.com"])

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(), {"error": "Request body must be a JSON object."}
        )

    def test_predict_rejects_non_string_url(self):
        response = self.client.post("/api/predict", json={"url": 123})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(), {"error": "The url field must be a string."}
        )


if __name__ == "__main__":
    unittest.main()
