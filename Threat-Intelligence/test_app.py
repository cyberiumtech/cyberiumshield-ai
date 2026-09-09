import unittest
from unittest.mock import patch

import app as threat_app


RECORD = {
    'cveID': 'cve-2026-12345',
    'vendorProject': ' Example Vendor ',
    'product': 'Gateway',
    'vulnerabilityName': 'Example vulnerability',
    'dateAdded': '2026-09-01',
    'shortDescription': 'Description',
    'requiredAction': 'Apply vendor mitigations.',
    'dueDate': '2026-09-22',
    'knownRansomwareCampaignUse': 'Known',
    'notes': 'https://example.gov/advisory',
    'cwes': ['CWE-79', '', 123],
}


class ThreatIntelligenceTests(unittest.TestCase):
    def setUp(self):
        threat_app.app.config.update(TESTING=True)
        self.client = threat_app.app.test_client()
        with threat_app._cache_lock:
            threat_app._cache.update(catalog=None, fetched_monotonic=0.0, etag='', last_modified='')

    def test_normalize_catalog_validates_deduplicates_and_cleans_records(self):
        catalog = threat_app.normalize_catalog({
            'title': 'CISA KEV',
            'count': 3,
            'vulnerabilities': [RECORD, RECORD, {'cveID': 'not-a-cve'}],
        })
        self.assertEqual(len(catalog['vulnerabilities']), 1)
        self.assertEqual(catalog['vulnerabilities'][0]['cveID'], 'CVE-2026-12345')
        self.assertEqual(catalog['vulnerabilities'][0]['vendorProject'], 'Example Vendor')
        self.assertEqual(catalog['vulnerabilities'][0]['cwes'], ['CWE-79'])

    @patch('app.fetch_upstream_catalog')
    def test_api_fetches_then_uses_cache(self, fetch):
        fetch.return_value = (
            threat_app.normalize_catalog({'count': 1, 'vulnerabilities': [RECORD]}),
            '"etag-value"',
            'Tue, 01 Sep 2026 00:00:00 GMT',
        )
        first = self.client.get('/api/kev')
        second = self.client.get('/api/kev')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.get_json()['sourceStatus'], 'live')
        self.assertEqual(second.get_json()['sourceStatus'], 'cache')
        self.assertEqual(fetch.call_count, 1)

    @patch('app.fetch_upstream_catalog')
    def test_forced_refresh_serves_stale_cache_on_upstream_failure(self, fetch):
        catalog = threat_app.normalize_catalog({'count': 1, 'vulnerabilities': [RECORD]})
        catalog['fetchedAt'] = '2026-09-01T00:00:00+00:00'
        with threat_app._cache_lock:
            threat_app._cache.update(catalog=catalog, fetched_monotonic=threat_app.time.monotonic())
        fetch.side_effect = threat_app.FeedError('temporary upstream failure')
        response = self.client.get('/api/kev?refresh=1')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['sourceStatus'], 'stale')
        self.assertIn('last-known-good', response.get_json()['warning'])

    @patch('app.fetch_upstream_catalog', side_effect=threat_app.FeedError('offline'))
    def test_api_returns_502_without_cached_data(self, _fetch):
        response = self.client.get('/api/kev')
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.get_json()['error'], 'offline')

    def test_health_does_not_require_upstream_network(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['source'], 'CISA KEV')


if __name__ == '__main__':
    unittest.main(verbosity=2)
