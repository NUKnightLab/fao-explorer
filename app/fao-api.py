import requests
from urllib import urlencode

VERSION='1.0'

def _json_from_url(url):
    r = requests.get(url)
    if r.ok:
        return r.json()
    r.raise_for_status()

def walkit(items=None,indent=0):
    if items is None:
        j = resources()
        items = j['result']['list']['items'] 
    for i in items:
        j = resources(parentType=i['type'])
        print (' '*indent) + i['label'] + " [%s] (%i)" % (i['type'],len(j['result']['list']['items']))
        if len(j['result']['list']['items']) != 0:
            
            walkit(j['result']['list']['items'],indent+2)

def resources(**kwargs):
    """Make a call to the resources API. Returns a JSON object where the good stuff is at
       j['result']['list']['items']

    """
    kwargs['version'] = VERSION

    return _json_from_url('http://data.fao.org/developers/api/resources?' + urlencode(kwargs))