import os
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, request, jsonify, render_template
from huggingface_hub import InferenceClient

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

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
        return f"Translation error: {exc}"


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


@app.route('/translate', methods=['GET', 'POST'])
def translate():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    direction = data.get('direction', 'en_to_de')
    if direction not in MODELS:
        return jsonify({'error': 'Invalid translation direction'}), 400
    if not str(text).strip():
        return jsonify({'translated_text': ''})

    translated_text = process_text_in_chunks(text, direction)
    if translated_text.startswith('Translation error:'):
        return jsonify({'error': translated_text}), 502
    return jsonify({'translated_text': translated_text})


@app.route('/save', methods=['POST'])
def save_transcript():
    return jsonify({
        'success': False,
        'error': 'Serverless storage is not persistent. Use the browser download instead.',
    }), 501
