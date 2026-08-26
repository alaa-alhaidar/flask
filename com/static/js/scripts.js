document.addEventListener('DOMContentLoaded', function () {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const saveBtn = document.getElementById('save-btn');
    const resultElem = document.getElementById('result');
    const translateBtn = document.getElementById('translate-btn');
    const translationResultElem = document.getElementById('translation-result');
    const languageSelect = document.getElementById('language-select');
    translationResultElem.textContent = '';
    let recognition;
    let isRecording = false;

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        recognition = new SpeechRecognition();
    } else {
        alert('Speech Recognition API not supported in this browser.');
        return;
    }

    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = function (event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
            }
        }

        if (transcript.trim() !== '') {
            resultElem.value += transcript + ', ';
        }

        if (/translate please?/.test(transcript.toLowerCase())) {
            let cleanedText = resultElem.value.trim().replace(/translate please?/i, '').trim();
            translateBtn.innerHTML = 'Translating...';
            setTimeout(() => {
                translateBtn.style.backgroundColor = '';
                translateBtn.innerHTML = 'Translate';
            }, 3000);
            triggerTranslateFunction(cleanedText);
        }

        if (transcript.toLowerCase().includes('delete')) {
            translateBtn.style.backgroundColor = 'red';
            translationResultElem.textContent = '';
            translateBtn.innerHTML = 'Deleting...';
            setTimeout(() => {
                translateBtn.style.backgroundColor = '';
                translateBtn.innerHTML = 'Translate';
            }, 3000);
            resultElem.value = '';
        }

        if (/save please?/.test(transcript.toLowerCase())) {
            translateBtn.style.backgroundColor = 'yellow';
            translateBtn.style.color = 'black';
            saveBtn.style.backgroundColor = 'yellow';
            translateBtn.innerHTML = 'Saving...';
            setTimeout(() => {
                translateBtn.style.backgroundColor = '';
                saveBtn.style.backgroundColor = ''; // Reset save button to its original color
                translateBtn.style.color = 'white';
                translateBtn.innerHTML = 'Translate';
            }, 3000);
            const textToSave = resultElem.value.trim().replace(/save please?/i, '').trim();
            triggerSaveFunction(textToSave);
        }

        // Stop the recognition if the "stop" command is detected
        if (/stop please?/.test(transcript.toLowerCase())) {
        if (translateBtn) {
                translateBtn.style.backgroundColor = 'red';
                stopBtn.style.backgroundColor = 'red';
                startBtn.style.backgroundColor = '';
                translateBtn.innerHTML = 'Stopping...';
                translationResultElem.textContent = '';
                recognition.stop();
                recognition.onend = null;
                startBtn.style.backgroundColor = '';

                // Revert the color back to its original state after 3 seconds
                setTimeout(() => {
                   stopBtn.style.backgroundColor = ''; // Reset stop button to its original color
                   translateBtn.style.backgroundColor = ''; // Reset translate button to its original color
                   startBtn.style.backgroundColor = 'blue';
                   location.reload();
                   translateBtn.innerHTML = 'Translate';
                }, 3000);
            }
            // Clear the text in resultElem
            resultElem.value = '';
            translationResultElem.textContent = '';
            recognition.stop(); // Stop the recording
            //alert("Recording stopped. Exiting system."); // Optional alert for confirmation
            return

        }
     /*        // Automatically save the transcript every 15 minutes
            setInterval(function() {
            const textToSave = resultElem.textContent.trim();
            if (textToSave !== '') { // Only save if there is content
                saveFile(textToSave);
                resultElem.textContent = ''
                console.log("Transcript automatically saved.");
            }
        }, 600000); // 600,000 milliseconds = 10 minutes:  10 min * 60 s * 1000 ms*/
    };

    recognition.onstart = function () {
        isRecording = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        saveBtn.disabled = false;
    };

    recognition.onend = function () {
        if (isRecording) {
            recognition.start();  // Ensure it restarts immediately if it stops on its own
        }
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error:', event.error);
        startBtn.disabled = false;
        stopBtn.disabled = true;
        saveBtn.disabled = false;
        startBtn.classList.remove('recording');
    };

    startBtn.addEventListener('click', function () {
        recognition.lang = languageSelect.value === 'de_to_en' ? 'de-DE' : 'en-US';
        isRecording = true;
        recognition.start();
        resultElem.value = '';

        // Make start button red when recording starts
        startBtn.style.backgroundColor = 'red';
        startBtn.classList.add('recording');
        translateBtn.classList.add('recording');
    });

    stopBtn.addEventListener('click', function () {
        stopRecording();
    });

    translateBtn.addEventListener('click', function () {
        const text = resultElem.value.trim();
        if (text) {
            triggerTranslateFunction(text);
        }
    });

    saveBtn.addEventListener('click', function () {
        const textToSave = resultElem.value.trim();
        if (textToSave === '') {
            alert('Nothing to save!');
            return;
        }
        const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function stopRecording() {
        isRecording = false;
        recognition.stop();
        startBtn.disabled = false;

        // Reset start button color after stopping
        startBtn.style.backgroundColor = '';
        resultElem.value = resultElem.value.trim().replace(/,$/, '') + '.';
        startBtn.classList.remove('recording');
        translateBtn.classList.remove('recording');
    }

    function triggerTranslateFunction(text) {
        const translateBtn = document.getElementById('translate-btn');
        translateBtn.style.backgroundColor = 'green';
        translateBtn.innerHTML = 'Translating...';
        setTimeout(() => {
            translateBtn.style.backgroundColor = '';
            translateBtn.innerHTML = 'Translated';
        }, 3000);
        fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, direction: languageSelect.value })
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Translation failed');
            return data;
        })
        .then(data => {
            translationResultElem.textContent = data.translated_text;
        })
        .catch(error => {
            translationResultElem.textContent = error.message;
            translateBtn.style.backgroundColor = '';
            translateBtn.innerHTML = 'Translate';
        });
    }

    function saveFile(text) {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function triggerSaveFunction(text) {
        saveFile(text);
    }
});
