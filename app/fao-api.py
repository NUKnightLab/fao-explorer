import requests
from urllib import urlencode

VERSION='1.0'

def _json_from_url(url):
    r = requests.get(url)
    if r.ok:
        return r.json()
    r.raise_for_status()

def resources(**kwargs):
    kwargs['version'] = VERSION

    return _json_from_url('http://data.fao.org/developers/api/resources?' + urlencode(kwargs))