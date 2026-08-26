# Speech to Text Translation

Flask application for browser-based speech recognition and English/German
translation. DeepL can be used for fast translation, with Hugging Face as a
fallback, so the Vercel function remains small.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export HF_TOKEN=hf_your_token
export DEEPL_API_KEY=your_deepl_api_key
flask --app app run --debug
```

## Deploy to Vercel

1. Create a DeepL API key for fast translations and a Hugging Face access token
   with Inference Providers permission as fallback.
2. Import the repository into Vercel.
3. Add `DEEPL_API_KEY` and `HF_TOKEN` under Project Settings > Environment Variables.
4. Deploy. Vercel detects the root-level `app.py` automatically.

With the CLI, use `vercel` for a preview and `vercel --prod` for production.

Speech recognition is provided by the browser and works best in Chrome or
Edge. The serverless filesystem is not persistent, so transcripts are saved
through the browser's download function.

## Features

- English/German live speech transcription and bilingual voice commands
- Fast DeepL translation with Hugging Face fallback
- Short-lived translation cache and request rate limiting
- Local translation history, keyboard shortcut, and installable PWA shell
- Text-size validation, safe API errors, and security headers

## Tests

```bash
python -m unittest discover -v
node --check com/static/js/scripts.js
```
