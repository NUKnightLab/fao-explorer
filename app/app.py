from flask import Flask, render_template, request, redirect, url_for
from werkzeug import secure_filename

app = Flask(__name__)

@app.route("/<template_name>")
def index(template_name):
    return render_template(template_name)

if __name__ == "__main__":
    app.run(debug=True)

# http://data.fao.org/developers/api/catalog/resource/findResourceTypes?version=1.0
# http://data.fao.org/developers/api/catalog/resource/findResourceTypes
# http://data.fao.org/developers/api/resources?version=1.0

