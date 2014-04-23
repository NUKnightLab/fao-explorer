from flask import Flask, render_template, request, redirect, url_for
from werkzeug import secure_filename

app = Flask(__name__)

@app.route("/")
def index():
    return render_template('index.html',title="Home Page")


if __name__ == "__main__":
    app.run(debug=True)
