import os

from flask import Flask, request, jsonify, render_template
from huggingface_hub import InferenceClient

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

MODELS = {
    'en_to_de': 'Helsinki-NLP/opus-mt-en-de',
    'de_to_en': 'Helsinki-NLP/opus-mt-de-en',
}


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
        return _get_client().translation(str(input_text), model=model).translation_text
    except ValueError:
        return "Invalid translation direction"
    except Exception as exc:
        return f"Translation error: {exc}"


def process_text_in_chunks(text, direction='en_to_de', chunk_size=500):
    if text is None or not str(text).strip():
        return ""

    if direction not in {'en_to_de', 'de_to_en'}:
        return "Invalid translation direction"

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

