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
            threat_app._cache.update(
                catalog=None,
                fetched_monotonic=0.0,
                etag='',
                last_modified='',
                last_error='',
            )

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

    @patch('app.save_observation')
    @patch('app._catalog_entry')
    @patch('app.nvd_cve')
    def test_cve_check_combines_nvd_and_kev_evidence(self, nvd, catalog_entry, save):
        nvd.return_value = {
            'id': 'CVE-2026-12345',
            'cvssScore': 9.8,
            'severity': 'CRITICAL',
            'description': 'Example vulnerability.',
            'references': ['https://example.gov/advisory'],
        }
        catalog_entry.return_value = RECORD

        response = self.client.post('/api/indicator/check', json={'indicator': 'cve-2026-12345'})

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result['indicator'], 'CVE-2026-12345')
        self.assertEqual(result['indicatorType'], 'cve')
        self.assertEqual(result['verdict'], 'critical')
        self.assertTrue(result['evidence']['cisa_kev'])
        self.assertTrue(result['evidence']['ransomware_use'])
        self.assertEqual(result['evidence']['cvss_score'], 9.8)
        save.assert_called_once()

    @patch('app.save_observation')
    @patch('app.threatfox_search', side_effect=RuntimeError('provider unavailable'))
    def test_indicator_check_keeps_partial_result_when_provider_fails(self, _threatfox, save):
        response = self.client.post('/api/indicator/check', json={'indicator': '203.0.113.10'})

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result['riskScore'], 0)
        self.assertEqual(result['verdict'], 'low')
        self.assertIn('ThreatFox: provider unavailable', result['providerErrors'])
        save.assert_called_once()

    def test_indicator_check_validates_supported_input(self):
        missing = self.client.post('/api/indicator/check', json={})
        unsupported = self.client.post('/api/indicator/check', json={'indicator': 'not an ioc'})
        oversized = self.client.post('/api/indicator/check', json={'indicator': 'x' * 4097})

        self.assertEqual(missing.status_code, 400)
        self.assertEqual(unsupported.status_code, 400)
        self.assertEqual(oversized.status_code, 400)

    @patch('app.recent')
    def test_history_returns_expanded_observations_and_validates_limit(self, recent):
        recent.return_value = [{'id': 7, 'indicator': 'example.com', 'riskScore': 10}]

        response = self.client.get('/api/history?limit=25')
        invalid = self.client.get('/api/history?limit=many')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['observations'][0]['id'], 7)
        recent.assert_called_once_with(25)
        self.assertEqual(invalid.status_code, 400)

    def test_feeds_reports_cache_state_without_network(self):
        response = self.client.get('/api/feeds')

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['cisaKEV']['status'], 'not_loaded')
        self.assertTrue(payload['nvd']['configured'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
