# Speech to Text Translation

Flask application for browser-based speech recognition and English/German
translation. Translation inference runs through Hugging Face so the Vercel
function remains small.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export HF_TOKEN=hf_your_token
flask --app app run --debug
```

## Deploy to Vercel

1. Create a Hugging Face access token with Inference Providers permission.
2. Import the repository into Vercel.
3. Add `HF_TOKEN` under Project Settings > Environment Variables.
4. Deploy. Vercel detects the root-level `app.py` automatically.

With the CLI, use `vercel` for a preview and `vercel --prod` for production.

Speech recognition is provided by the browser and works best in Chrome or
Edge. The serverless filesystem is not persistent, so transcripts are saved
through the browser's download function.
