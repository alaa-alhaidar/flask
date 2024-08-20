document.addEventListener('DOMContentLoaded', function () {
        // elements in html
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
        //   CALL Speech API in JS
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

        // here if the command matched, perform event
        recognition.onresult = function (event) {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript;
                }
            }

            if (transcript.trim() !== '') {
                resultElem.textContent += transcript + ', ';
            }

             // Check if the command "Translate" is mentioned

        if (transcript.toLowerCase().includes('translate')) {
            // Remove the word 'translate' from the resultElem's textContent
            let cleanedText = resultElem.textContent.trim();
            cleanedText = cleanedText.replace(/translate/i, '').trim();

            // Call the translate function with cleaned text
            triggerTranslateFunction(cleanedText);
        }
          // Check if the command "delete" is mentioned
          const translateBtn = document.getElementById('translate-btn');
        if (transcript.toLowerCase().includes('delete')) {
        if (translateBtn) {
                translateBtn.style.backgroundColor = 'red';
                translationResultElem.textContent = '';
                translateBtn.innerHTML = 'deleted';

                // Revert the color back to its original state after 3 seconds
                setTimeout(() => {
                    translateBtn.style.backgroundColor = ''; // Reset to original color
                    translateBtn.innerHTML = 'Translate';
                }, 3000);
            }
            // Clear the text in resultElem
            resultElem.textContent = '';
        }
        if (transcript.toLowerCase().includes('stop')) {
        if (translateBtn) {
                translateBtn.style.backgroundColor = 'red';
                translateBtn.innerHTML = 'stopped';
                translationResultElem.textContent = '';
                recognition.stop();

                // Revert the color back to its original state after 3 seconds
                setTimeout(() => {
                    translateBtn.style.backgroundColor = ''; // Reset to original color
                    translateBtn.innerHTML = 'Translate';
                }, 3000);
            }
            // Clear the text in resultElem
            resultElem.textContent = '';
            translationResultElem.textContent = '';
        }
        if (transcript.toLowerCase().includes('save')) {
        const translateBtn = document.getElementById('translate-btn');
         if (translateBtn) {
                translateBtn.style.backgroundColor = 'yellow';
                translateBtn.innerHTML = 'saved';

                // Revert the color back to its original state after 3 seconds
                setTimeout(() => {
                    translateBtn.style.backgroundColor = ''; // Reset to original color
                    translateBtn.innerHTML = 'Translate';
                }, 3000);
            }
                // Remove the word "save" from the text before saving
                const textToSave = resultElem.textContent.trim().replace(/save$/, '').trim();
                triggerSaveFunction(textToSave);
            }
        };

        recognition.onstart = function () {
            isRecording = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            saveBtn.disabled = false;
        };

        recognition.onend = function () {
            isRecording = false;
            startBtn.disabled = false;
            stopBtn.disabled = false;
            saveBtn.disabled = false;
            // Remove recording effect when recording ends automatically
        startBtn.classList.remove('recording');
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error:', event.error);
            startBtn.disabled = false;
            stopBtn.disabled = true;
            saveBtn.disabled = false;
            // Remove recording effect in case of error
            startBtn.classList.remove('recording');
        };

        startBtn.addEventListener('click', function () {
            recognition.lang = languageSelect.value;
            recognition.start();
            resultElem.textContent = '';
            // Add recording effect
            startBtn.classList.add('recording');
            translateBtn.classList.add('recording');
        });

        stopBtn.addEventListener('click', function () {
            recognition.stop();
            startBtn.disabled = false;
            resultElem.textContent = resultElem.textContent.trim().slice(0, -1) + '.';
            // Remove recording effect
        startBtn.classList.remove('recording')
        translateBtn.classList.remove('recording')

        });

        saveBtn.addEventListener('click', function () {
            const textToSave = resultElem.textContent.trim();
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

        function triggerTranslateFunction(text) {
            // Change the color of the "Translate" button to red
            const translateBtn = document.getElementById('translate-btn');
            if (translateBtn) {
                translateBtn.style.backgroundColor = 'green';
                translateBtn.innerHTML = 'translated';
                // Revert the color back to its original state after 3 seconds
                setTimeout(() => {
                    translateBtn.style.backgroundColor = ''; // Reset to original color
                    translateBtn.innerHTML = 'translate';
                }, 3000);
            }
            fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    direction: 'en_to_de' // Adjust as needed
                })
            })
            .then(response => response.json())
            .then(data => {
                if (translationResultElem) { // Ensure the element exists
                    translationResultElem.textContent = data.translated_text;
                } else {
                    console.error('Translation result element not found.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }

      function triggerSaveFunction(text) {
       // Change the color of the "Translate" button to red
            const saveBtn = document.getElementById('save-btn');
            if (saveBtn) {
                saveBtn.style.backgroundColor = 'red';

                // Revert the color back to its original state after 3 seconds
                setTimeout(() => {
                    saveBtn.style.backgroundColor = ''; // Reset to original color
                }, 3000);
            }

            // Use the Fetch API to send a POST request to the backend
            fetch('/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Transcript saved successfully!');
                } else {
                    console.error('Failed to save transcript:', data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }
function saveFile(text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Create a temporary <a> element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt'; // Filename for the downloaded file
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Function to handle the "save" command
function triggerSaveFunction(text) {
    saveFile(text);
}
    });