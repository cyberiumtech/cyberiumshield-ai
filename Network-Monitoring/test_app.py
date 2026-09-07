import unittest
from unittest.mock import patch

import app as network_app


SAMPLE = {
    "monitoring": True,
    "uptime_seconds": 12,
    "connection_count": 1,
    "tcp": 1,
    "udp": 0,
    "established": 1,
    "upload_bps": 128,
    "download_bps": 512,
    "interfaces": [{"name": "Ethernet", "bytes_sent": 20, "bytes_recv": 40, "is_up": True}],
    "connections": [{
        "timestamp": "2026-09-07 12:00:00",
        "protocol": "TCP",
        "local_address": "127.0.0.1:5003",
        "remote_address": "127.0.0.1:54000",
        "status": "ESTABLISHED",
        "pid": 42,
        "process": "python.exe",
        "bytes_sent": "",
        "bytes_recv": "",
    }],
    "updated": "12:00:00",
}


class NetworkApiTests(unittest.TestCase):
    def setUp(self):
        network_app.app.config.update(TESTING=True)
        self.client = network_app.app.test_client()

    def test_status_returns_snapshot_and_no_store_headers(self):
        with patch.object(network_app.monitor, "snapshot", return_value=SAMPLE):
            response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["connection_count"], 1)
        self.assertIn("no-store", response.headers["Cache-Control"])

    def test_start_and_stop_return_monitor_state(self):
        def mark_started():
            network_app.monitor.running = True

        def mark_stopped():
            network_app.monitor.running = False

        with patch.object(network_app.monitor, "start", side_effect=mark_started):
            self.assertTrue(self.client.post("/api/start").get_json()["monitoring"])
        with patch.object(network_app.monitor, "stop", side_effect=mark_stopped):
            self.assertFalse(self.client.post("/api/stop").get_json()["monitoring"])

    def test_export_is_a_real_csv_download(self):
        with patch.object(network_app.monitor, "connections", return_value=SAMPLE["connections"]):
            response = self.client.get("/api/export")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "text/csv")
        self.assertIn("attachment", response.headers["Content-Disposition"])
        self.assertIn("python.exe", response.get_data(as_text=True))

    def test_access_denied_is_returned_as_safe_json(self):
        with patch.object(network_app.monitor, "snapshot", side_effect=PermissionError("secret path")):
            response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("secret path", response.get_data(as_text=True))
        self.assertIn("could not read", response.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
