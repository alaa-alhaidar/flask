import torch
from transformers import pipeline
from flask import Flask, request, render_template

app = Flask(__name__)

# Initialize the translation pipeline globally
translator = pipeline(
    "translation_en_to_de",
    model="Helsinki-NLP/opus-mt-en-de",
    model_kwargs={"torch_dtype": torch.float16},
    device=0 if torch.cuda.is_available() else -1
)

# Initialize the translation pipelines
translator_en_to_de = pipeline(
    "translation_en_to_de",
    model="Helsinki-NLP/opus-mt-en-de",
    model_kwargs={"torch_dtype": torch.float16},
    device=0 if torch.cuda.is_available() else -1
)

translator_de_to_en = pipeline(
    "translation_de_to_en",
    model="Helsinki-NLP/opus-mt-de-en",
    model_kwargs={"torch_dtype": torch.float16},
    device=0 if torch.cuda.is_available() else -1
)


def translate_text(input_text, direction='en_to_de'):
    if direction == 'en_to_de':
        translator = translator_en_to_de
    elif direction == 'de_to_en':
        translator = translator_de_to_en
    else:
        return "Invalid translation direction"

    # Translate the input text
    translation = translator(input_text)
    translated_text = translation[0]['translation_text']
    return translated_text

def process_text_in_chunks(text, chunk_size=512):
    translated_text = ''
    # Process the text in chunks
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i + chunk_size]
        translated_chunk = translate_text(chunk)
        translated_text += translated_chunk
    return translated_text

@app.route('/', methods=['GET', 'POST'])
def index():
    input_text = ''
    translated_text = ''
    if request.method == 'POST':
        input_text = request.form.get('text', '')
        # Perform translation and set the translated_text
        translated_text = process_text_in_chunks(input_text)
    return render_template('index.html', input_text=input_text, translated_text=translated_text)

if __name__ == '__main__':
    app.run(debug=True)
