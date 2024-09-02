from flask import Flask, request, jsonify, render_template
#import torch
from transformers import pipeline

app = Flask(__name__)

# Initialize the translation pipeline globally
translator_en_to_de = pipeline(
    "translation_en_to_de",
    model="Helsinki-NLP/opus-mt-en-de",
    #model_kwargs={"torch_dtype": torch.float16},
    #device=0 if torch.cuda.is_available() else -1
)

translator_de_to_en = pipeline(
    "translation_de_to_en",
    model="Helsinki-NLP/opus-mt-de-en",
    #model_kwargs={"torch_dtype": torch.float16},
    #device=0 if torch.cuda.is_available() else -1
)

def translate_text(input_text, direction='en_to_de'):
    if direction == 'en_to_de':
        translator = translator_en_to_de
    elif direction == 'de_to_en':
        translator = translator_de_to_en
    else:
        return "Invalid translation direction"
    translation = translator(input_text)
    translated_text = translation[0]['translation_text']
    return translated_text

@app.route('/', methods=['GET', 'POST'])
def index():
    input_text = ''
    translated_text = ''
    if request.method == 'POST':
        input_text = request.form.get('text', '')
        translated_text = process_text_in_chunks(input_text)
    return render_template('index.html', input_text=input_text, translated_text=translated_text)

@app.route('/translate', methods=['POST'])
def translate():
    data = request.get_json()
    text = data.get('text', '')
    direction = data.get('direction', 'en_to_de')
    translated_text = translate_text(text, direction)
    return jsonify({'translated_text': translated_text})


@app.route('/save', methods=['POST'])
def save_transcript():
    data = request.get_json()
    text = data.get('text', '')

    # Save the text to a file or database
    try:
        with open('transcripts.txt', 'a') as f:
            f.write(text + '\n')
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
def process_text_in_chunks(text, chunk_size=512):
    translated_text = ''
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i + chunk_size]
        translated_chunk = translate_text(chunk)
        translated_text += translated_chunk
    return translated_text

if __name__ == '__main__':
    app.run(debug=True)
