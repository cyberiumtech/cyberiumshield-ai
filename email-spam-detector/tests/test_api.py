import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import app


class EmailSpamApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_reports_real_dataset(self):
        response = self.client.get("/api/health")
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertGreater(payload["dataset_size"], 1000)

    def test_obvious_spam_is_detected(self):
        response = self.client.post("/api/predict", json={
            "sender": "winner@claim-prize.example",
            "subject": "URGENT: You won a cash prize",
            "content": "Act now! Click http://192.168.1.5/claim and send your bank details.",
        })
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn(payload["verdict"], {"spam", "suspicious"})
        self.assertGreater(payload["score"], 20)

    def test_empty_message_is_rejected(self):
        response = self.client.post("/api/predict", json={"sender": "", "subject": "", "content": ""})
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
