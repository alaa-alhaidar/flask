import unittest
from unittest.mock import patch

from com.translationAPP import (
    MAX_TEXT_LENGTH,
    app,
    request_times,
    state_lock,
    translation_cache,
)


class TranslationAppTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()
        with state_lock:
            request_times.clear()
            translation_cache.clear()

    def test_homepage_and_security_headers(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'VoiceBridge', response.data)
        self.assertIn(b'speak-translation', response.data)
        self.assertEqual(response.headers['X-Frame-Options'], 'DENY')
        self.assertIn('microphone=(self)', response.headers['Permissions-Policy'])

    def test_translation_cache_avoids_duplicate_provider_call(self):
        with patch('com.translationAPP.process_text_in_chunks', return_value='Hallo') as translator:
            first = self.client.post('/translate', json={'text': 'Hello', 'direction': 'en_to_de'})
            second = self.client.post('/translate', json={'text': 'Hello', 'direction': 'en_to_de'})

        self.assertEqual(first.get_json(), {'translated_text': 'Hallo', 'cached': False})
        self.assertEqual(second.get_json(), {'translated_text': 'Hallo', 'cached': True})
        translator.assert_called_once_with('Hello', 'en_to_de')

    def test_invalid_and_oversized_requests(self):
        invalid = self.client.post('/translate', json={'text': 'Hello', 'direction': 'invalid'})
        oversized = self.client.post('/translate', json={'text': 'x' * (MAX_TEXT_LENGTH + 1), 'direction': 'en_to_de'})
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(oversized.status_code, 413)

    def test_rate_limit(self):
        with patch('com.translationAPP.process_text_in_chunks', side_effect=lambda text, direction: text):
            for number in range(20):
                response = self.client.post('/translate', json={'text': f'text-{number}', 'direction': 'en_to_de'})
                self.assertEqual(response.status_code, 200)
            limited = self.client.post('/translate', json={'text': 'one-too-many', 'direction': 'en_to_de'})
        self.assertEqual(limited.status_code, 429)

    def test_health_and_service_worker(self):
        self.assertEqual(self.client.get('/health').status_code, 200)
        worker = self.client.get('/service-worker.js')
        self.assertEqual(worker.status_code, 200)
        self.assertEqual(worker.headers['Service-Worker-Allowed'], '/')
        worker.close()


if __name__ == '__main__':
    unittest.main()
