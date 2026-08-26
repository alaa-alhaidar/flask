document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const el = { start: $('start-btn'), stop: $('stop-btn'), save: $('save-btn'), translate: $('translate-btn'), translateLabel: $('translate-label'), result: $('result'), output: $('translation-result'), language: $('language-select'), status: $('app-status'), statusText: $('status-text'), charCount: $('char-count'), sourceCode: $('source-code'), targetCode: $('target-code'), sourceLanguage: $('source-language'), targetLanguage: $('target-language') };
    let recognition = null;
    let isRecording = false;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const setStatus = (text, recording = false) => { el.statusText.textContent = text; el.status.classList.toggle('recording', recording); };
    const updateCount = () => { const count = el.result.value.length; el.charCount.textContent = `${count} ${count === 1 ? 'character' : 'characters'}`; el.save.disabled = count === 0; };
    const updateLanguages = () => {
        const germanSource = el.language.value === 'de_to_en';
        el.sourceCode.textContent = germanSource ? 'DE' : 'EN'; el.targetCode.textContent = germanSource ? 'EN' : 'DE';
        el.sourceLanguage.textContent = germanSource ? 'German' : 'English'; el.targetLanguage.textContent = germanSource ? 'English' : 'German';
        el.result.placeholder = germanSource ? 'Aufnahme starten oder deutschen Text eingeben…' : 'Start recording or type something here…';
    };
    const stopRecording = () => { if (!recognition || !isRecording) return; isRecording = false; recognition.stop(); el.start.disabled = false; el.stop.disabled = true; setStatus('Ready'); };
    const downloadTranscript = () => {
        const text = el.result.value.trim(); if (!text) return;
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'transcript.txt'; link.click(); URL.revokeObjectURL(url); setStatus('Saved');
    };
    const translateText = async () => {
        const text = el.result.value.trim();
        if (!text) { el.result.focus(); setStatus('Add some text first'); return; }
        el.translate.classList.add('loading'); el.translateLabel.textContent = 'Translating…'; el.translate.querySelector('.arrow-icon').textContent = 'progress_activity'; setStatus('Translating');
        try {
            const response = await fetch('/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, direction: el.language.value }) });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Translation failed');
            el.output.textContent = data.translated_text; setStatus('Translation complete');
        } catch (error) { el.output.textContent = error.message; setStatus('Translation failed'); }
        finally { el.translate.classList.remove('loading'); el.translateLabel.textContent = 'Translate text'; el.translate.querySelector('.arrow-icon').textContent = 'arrow_forward'; }
    };

    if (Recognition) {
        recognition = new Recognition(); recognition.continuous = true; recognition.interimResults = false;
        recognition.onresult = (event) => {
            let transcript = ''; for (let i = event.resultIndex; i < event.results.length; i += 1) if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
            const command = transcript.toLowerCase();
            if (/translate please?/.test(command)) { el.result.value += transcript.replace(/translate please?/i, '').trim(); stopRecording(); translateText(); }
            else if (/stop please?/.test(command)) stopRecording();
            else if (/save please?/.test(command)) { el.result.value += transcript.replace(/save please?/i, '').trim(); downloadTranscript(); }
            else el.result.value += `${transcript.trim()} `;
            updateCount();
        };
        recognition.onend = () => { if (isRecording) recognition.start(); };
        recognition.onerror = (event) => { isRecording = false; el.start.disabled = false; el.stop.disabled = true; setStatus(`Microphone: ${event.error}`); };
    } else { el.start.disabled = true; el.start.title = 'Speech recognition is not supported in this browser'; setStatus('Text mode'); }

    el.start.addEventListener('click', () => { recognition.lang = el.language.value === 'de_to_en' ? 'de-DE' : 'en-US'; isRecording = true; recognition.start(); el.start.disabled = true; el.stop.disabled = false; setStatus('Listening…', true); });
    el.stop.addEventListener('click', stopRecording); el.save.addEventListener('click', downloadTranscript); el.translate.addEventListener('click', translateText); el.result.addEventListener('input', updateCount); el.language.addEventListener('change', updateLanguages);
    $('swap-btn').addEventListener('click', () => { el.language.value = el.language.value === 'en_to_de' ? 'de_to_en' : 'en_to_de'; updateLanguages(); });
    $('clear-transcript').addEventListener('click', () => { el.result.value = ''; el.output.textContent = ''; updateCount(); el.result.focus(); });
    $('copy-translation').addEventListener('click', async () => { const text = el.output.textContent.trim(); if (!text) return; await navigator.clipboard.writeText(text); setStatus('Copied to clipboard'); });
    updateLanguages(); updateCount();
});
