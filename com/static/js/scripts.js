<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Text Translator</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/styles.css') }}">
</head>
<body>
    <div class="container">
        <h1>Text Translator</h1>
        <form method="post">
            <textarea name="text" rows="10" cols="50" placeholder="Enter text here..."></textarea><br><br>
            <input type="submit" value="Translate">
        </form>
        {% if translated_text %}
        <h2>Translated Text:</h2>
        <textarea rows="10" cols="50" readonly>{{ translated_text }}</textarea>
        {% endif %}
    </div>
    <script src="{{ url_for('static', filename='js/scripts.js') }}"></script>
</body>
</html>
