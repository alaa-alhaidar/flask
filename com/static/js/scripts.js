document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const el = { start: $('start-btn'), stop: $('stop-btn'), save: $('save-btn'), translate: $('translate-btn'), translateLabel: $('translate-label'), result: $('result'), output: $('translation-result'), language: $('language-select'), status: $('app-status'), statusText: $('status-text'), charCount: $('char-count'), sourceCode: $('source-code'), targetCode: $('target-code'), sourceLanguage: $('source-language'), targetLanguage: $('target-language'), historyCard: $('history-card'), historyList: $('history-list'), historyCount: $('history-count') };
    let recognition = null;
    let isRecording = false;
    let interimPreview = '';
    const HISTORY_KEY = 'voicebridge-history-v1';
    const MAX_HISTORY = 5;
    const MAX_TEXT_LENGTH = 10000;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceCommands = [
        { name: 'translate', pattern: /\b(?:translate|translation|uebersetze|uebersetzen)\b|(?:übersetze|übersetzen)/iu },
        { name: 'delete', pattern: /\b(?:delete|clear|leeren|loesche|loeschen)\b|(?:lösche|löschen)/iu },
        { name: 'stop', pattern: /\b(?:stop|stopp|anhalten|beenden)\b/iu },
        { name: 'save', pattern: /\b(?:save|download|speichere|speichern)\b/iu },
        { name: 'start', pattern: /\b(?:start|record|starte|aufnahme)\b/iu }
    ];

    const setStatus = (text, recording = false) => { el.statusText.textContent = text; el.status.classList.toggle('recording', recording); };
    const updateCount = () => {
        const count = el.result.value.length;
        el.charCount.textContent = `${count.toLocaleString()} / ${MAX_TEXT_LENGTH.toLocaleString()}`;
        el.charCount.classList.toggle('limit-warning', count > MAX_TEXT_LENGTH);
        el.save.disabled = count === 0;
    };
    const loadHistory = () => {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
        catch (error) { return []; }
    };
    const saveHistory = (history) => {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY))); }
        catch (error) { console.debug('History storage unavailable', error); }
    };
    const renderHistory = () => {
        const history = loadHistory();
        el.historyCount.textContent = history.length;
        el.historyCard.hidden = history.length === 0;
        el.historyList.replaceChildren();
        history.forEach((item) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'history-item';
            const source = document.createElement('span'); source.textContent = item.source;
            const arrow = document.createElement('span'); arrow.className = 'material-symbols-rounded'; arrow.textContent = 'arrow_forward';
            const translated = document.createElement('span'); translated.textContent = item.translation;
            button.append(source, arrow, translated);
            button.addEventListener('click', () => {
                el.language.value = item.direction;
                applyLanguageChange();
                el.result.value = item.source;
                el.output.textContent = item.translation;
                updateCount();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            el.historyList.append(button);
        });
    };
    const addToHistory = (source, translation, direction) => {
        const history = loadHistory().filter((item) => !(item.source === source && item.direction === direction));
        history.unshift({ source, translation, direction, createdAt: Date.now() });
        saveHistory(history);
        renderHistory();
    };
    const updateLanguages = () => {
        const germanSource = el.language.value === 'de_to_en';
        el.sourceCode.textContent = germanSource ? 'DE' : 'EN'; el.targetCode.textContent = germanSource ? 'EN' : 'DE';
        el.sourceLanguage.textContent = germanSource ? 'German' : 'English'; el.targetLanguage.textContent = germanSource ? 'English' : 'German';
        el.result.lang = germanSource ? 'de' : 'en';
        el.output.lang = germanSource ? 'en' : 'de';
        el.result.placeholder = germanSource ? 'Aufnahme starten oder deutschen Text eingeben…' : 'Start recording or type something here…';
    };
    const recognitionLanguage = () => el.language.value === 'de_to_en' ? 'de-DE' : 'en-US';
    const applyLanguageChange = () => {
        updateLanguages();
        if (!recognition) return;
        recognition.lang = recognitionLanguage();
        if (isRecording) {
            setStatus(el.language.value === 'de_to_en' ? 'Deutsch wird erkannt…' : 'Listening…', true);
            recognition.stop();
        }
    };
    const readVoiceCommand = (transcript) => {
        for (const command of voiceCommands) {
            if (command.pattern.test(transcript)) {
                const remainingText = transcript
                    .replace(command.pattern, '')
                    .replace(/\b(?:please|pleas|bitte)\b/giu, '')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                return { name: command.name, remainingText };
            }
        }
        return null;
    };
    const appendTranscript = (text) => {
        if (!text) return;
        const separator = el.result.value && !el.result.value.endsWith(' ') ? ' ' : '';
        el.result.value += `${separator}${text.trim()} `;
        updateCount();
    };
    const stopRecording = () => { if (!recognition || !isRecording) return; isRecording = false; interimPreview = ''; recognition.stop(); el.start.disabled = false; el.stop.disabled = true; setStatus('Ready'); };
    const downloadTranscript = () => {
        const text = el.result.value.trim(); if (!text) return;
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'transcript.txt'; link.click(); URL.revokeObjectURL(url); setStatus('Saved');
    };
    const translateText = async () => {
        const text = el.result.value.trim();
        if (!text) { el.result.focus(); setStatus('Add some text first'); return; }
        if (text.length > MAX_TEXT_LENGTH) { setStatus('Text is too long'); el.result.focus(); return; }
        el.translate.classList.add('loading'); el.translateLabel.textContent = 'Translating…'; el.translate.querySelector('.arrow-icon').textContent = 'progress_activity'; setStatus('Translating');
        try {
            const response = await fetch('/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, direction: el.language.value }) });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Translation failed');
            el.output.textContent = data.translated_text;
            addToHistory(text, data.translated_text, el.language.value);
        } catch (error) { el.output.textContent = error.message; setStatus('Translation failed'); }
        finally {
            el.translate.classList.remove('loading'); el.translateLabel.textContent = 'Translate text'; el.translate.querySelector('.arrow-icon').textContent = 'arrow_forward';
            setStatus(isRecording ? 'Listening…' : 'Ready', isRecording);
        }
    };

    if (Recognition) {
        recognition = new Recognition(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = recognitionLanguage();
        recognition.onresult = (event) => {
            if (interimPreview && el.result.value.endsWith(interimPreview)) {
                el.result.value = el.result.value.slice(0, -interimPreview.length);
            }
            interimPreview = '';

            let transcript = '';
            let interimText = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
                else interimText += event.results[i][0].transcript;
            }

            const showInterimText = () => {
                if (!interimText) return;
                const separator = el.result.value && !el.result.value.endsWith(' ') ? ' ' : '';
                interimPreview = `${separator}${interimText}`;
                el.result.value += interimPreview;
                updateCount();
                setStatus(el.language.value === 'de_to_en' ? 'Deutsch wird erkannt…' : 'Listening…', true);
            };

            if (!transcript) {
                showInterimText();
                return;
            }

            const command = readVoiceCommand(transcript);

            if (!command) {
                appendTranscript(transcript);
                showInterimText();
                return;
            }

            if (command.name === 'translate') {
                appendTranscript(command.remainingText);
                translateText();
            } else if (command.name === 'delete') {
                el.result.value = '';
                el.output.textContent = '';
                updateCount();
                setStatus(isRecording ? 'Listening…' : 'Ready', isRecording);
            } else if (command.name === 'stop') {
                stopRecording();
            } else if (command.name === 'save') {
                appendTranscript(command.remainingText);
                downloadTranscript();
            } else if (command.name === 'start') {
                setStatus('Listening…', true);
            }
        };
        recognition.onend = () => {
            if (isRecording) {
                window.setTimeout(() => {
                    try { recognition.start(); } catch (error) { console.debug('Recognition restart pending', error); }
                }, 150);
            }
        };
        recognition.onerror = (event) => {
            if (event.error === 'no-speech' && isRecording) {
                setStatus('Listening…', true);
                return;
            }
            isRecording = false; el.start.disabled = false; el.stop.disabled = true; setStatus(`Microphone: ${event.error}`);
        };
    } else { el.start.disabled = true; el.start.title = 'Speech recognition is not supported in this browser'; setStatus('Text mode'); }

    el.start.addEventListener('click', () => { recognition.lang = recognitionLanguage(); isRecording = true; recognition.start(); el.start.disabled = true; el.stop.disabled = false; setStatus(el.language.value === 'de_to_en' ? 'Deutsch wird erkannt…' : 'Listening…', true); });
    el.stop.addEventListener('click', stopRecording); el.save.addEventListener('click', downloadTranscript); el.translate.addEventListener('click', translateText); el.result.addEventListener('input', updateCount); el.language.addEventListener('change', applyLanguageChange);
    $('swap-btn').addEventListener('click', () => {
        const source = el.result.value.trim();
        const translation = el.output.textContent.trim();
        el.language.value = el.language.value === 'en_to_de' ? 'de_to_en' : 'en_to_de';
        if (translation) { el.result.value = translation; el.output.textContent = source; }
        applyLanguageChange(); updateCount();
    });
    $('clear-transcript').addEventListener('click', () => { el.result.value = ''; el.output.textContent = ''; updateCount(); el.result.focus(); });
    $('copy-translation').addEventListener('click', async () => { const text = el.output.textContent.trim(); if (!text) return; await navigator.clipboard.writeText(text); setStatus('Copied to clipboard'); });
    $('clear-history').addEventListener('click', () => { saveHistory([]); renderHistory(); });
    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); translateText(); }
    });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => {});
    updateLanguages(); updateCount(); renderHistory();
});
