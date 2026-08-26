try:
    from com.translationAPP import app
except ModuleNotFoundError:
    from translationAPP import app

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)






