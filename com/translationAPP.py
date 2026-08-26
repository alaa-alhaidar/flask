import os
import json
import time
from collections import OrderedDict, defaultdict, deque
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, request, jsonify, render_template, send_from_directory
from huggingface_hub import InferenceClient

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

MAX_TEXT_LENGTH = 10000
RATE_LIMIT_REQUESTS = 20
RATE_LIMIT_WINDOW = 60
CACHE_TTL = 3600
CACHE_MAX_ITEMS = 200
translation_cache = OrderedDict()
request_times = defaultdict(deque)
state_lock = Lock()

MODELS = {
    'en_to_de': 'Helsinki-NLP/opus-mt-en-de',
    'de_to_en': 'Helsinki-NLP/opus-mt-de-en',
}
DEEPL_LANGUAGES = {
    'en_to_de': ('EN', 'DE'),
    'de_to_en': ('DE', 'EN-US'),
}


def _translate_with_deepl(input_text, direction):
    api_key = os.environ.get('DEEPL_API_KEY')
    if not api_key:
        raise RuntimeError('DEEPL_API_KEY is not configured')

    source_lang, target_lang = DEEPL_LANGUAGES[direction]
    default_host = 'https://api-free.deepl.com' if api_key.endswith(':fx') else 'https://api.deepl.com'
    api_url = os.environ.get('DEEPL_API_URL', f'{default_host}/v2/translate')
    payload = json.dumps({
        'text': [str(input_text)],
        'source_lang': source_lang,
        'target_lang': target_lang,
    }).encode('utf-8')
    request_data = Request(
        api_url,
        data=payload,
        headers={
            'Authorization': f'DeepL-Auth-Key {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'VoiceBridge/1.0',
        },
        method='POST',
    )
    with urlopen(request_data, timeout=8) as response:
        result = json.loads(response.read().decode('utf-8'))
    return result['translations'][0]['text']


def _get_client():
    token = os.environ.get('HF_TOKEN')
    if not token:
        raise RuntimeError('HF_TOKEN is not configured')
    return InferenceClient(provider='hf-inference', api_key=token)


def translate_text(input_text, direction='en_to_de'):
    if input_text is None or not str(input_text).strip():
        return ""

    try:
        model = MODELS.get(direction)
        if model is None:
            raise ValueError('Invalid translation direction')
        if os.environ.get('DEEPL_API_KEY'):
            try:
                return _translate_with_deepl(input_text, direction)
            except (HTTPError, URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError):
                pass
        return _get_client().translation(str(input_text), model=model).translation_text
    except ValueError:
        return "Invalid translation direction"
    except Exception as exc:
        app.logger.warning('Translation provider failed: %s', type(exc).__name__)
        return "Translation error"


def _client_address():
    forwarded = request.headers.get('X-Forwarded-For', '')
    return forwarded.split(',')[0].strip() or request.remote_addr or 'unknown'


def _rate_limit_exceeded():
    now = time.monotonic()
    address = _client_address()
    with state_lock:
        timestamps = request_times[address]
        while timestamps and now - timestamps[0] > RATE_LIMIT_WINDOW:
            timestamps.popleft()
        if len(timestamps) >= RATE_LIMIT_REQUESTS:
            return True
        timestamps.append(now)
        return False


def _cached_translation(text, direction):
    key = (direction, text)
    now = time.monotonic()
    with state_lock:
        cached = translation_cache.get(key)
        if cached and now - cached[0] <= CACHE_TTL:
            translation_cache.move_to_end(key)
            return cached[1]
        if cached:
            translation_cache.pop(key, None)
    return None


def _store_translation(text, direction, translation):
    key = (direction, text)
    with state_lock:
        translation_cache[key] = (time.monotonic(), translation)
        translation_cache.move_to_end(key)
        while len(translation_cache) > CACHE_MAX_ITEMS:
            translation_cache.popitem(last=False)


def process_text_in_chunks(text, direction='en_to_de', chunk_size=None):
    if text is None or not str(text).strip():
        return ""

    if direction not in {'en_to_de', 'de_to_en'}:
        return "Invalid translation direction"

    if chunk_size is None:
        chunk_size = 10000 if os.environ.get('DEEPL_API_KEY') else 500

    translated_chunks = []
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i + chunk_size]
        translated_chunk = translate_text(chunk, direction)
        if translated_chunk in {'Translation error', 'Invalid translation direction'}:
            return translated_chunk
        translated_chunks.append(translated_chunk)
    return ' '.join(translated_chunks)


@app.route('/', methods=['GET', 'POST'])
def index():
    input_text = ''
    translated_text = ''
    if request.method == 'POST':
        input_text = request.form.get('text', '')
        direction = request.form.get('language', 'en_to_de')
        translated_text = process_text_in_chunks(input_text, direction)
    return render_template('index.html', input_text=input_text, translated_text=translated_text)


@app.post('/translate')
def translate():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    direction = data.get('direction', 'en_to_de')
    if direction not in MODELS:
        return jsonify({'error': 'Choose a valid translation direction.'}), 400
    text = str(text).strip()
    if not text:
        return jsonify({'translated_text': ''})
    if len(text) > MAX_TEXT_LENGTH:
        return jsonify({'error': f'Text is limited to {MAX_TEXT_LENGTH:,} characters.'}), 413
    if _rate_limit_exceeded():
        return jsonify({'error': 'Too many requests. Please wait a moment.'}), 429

    cached = _cached_translation(text, direction)
    if cached is not None:
        return jsonify({'translated_text': cached, 'cached': True})

    translated_text = process_text_in_chunks(text, direction)
    if translated_text == 'Translation error':
        return jsonify({'error': 'Translation is temporarily unavailable. Please try again.'}), 502
    _store_translation(text, direction, translated_text)
    return jsonify({'translated_text': translated_text, 'cached': False})


@app.get('/health')
def health():
    provider = 'deepl' if os.environ.get('DEEPL_API_KEY') else 'huggingface'
    return jsonify({'status': 'ok', 'provider': provider})


@app.get('/service-worker.js')
def service_worker():
    response = send_from_directory(app.static_folder, 'service-worker.js')
    response.headers['Service-Worker-Allowed'] = '/'
    response.headers['Cache-Control'] = 'no-cache'
    return response


@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), geolocation=(), microphone=(self)'
    return response


@app.route('/save', methods=['POST'])
def save_transcript():
    return jsonify({
        'success': False,
        'error': 'Serverless storage is not persistent. Use the browser download instead.',
    }), 501
