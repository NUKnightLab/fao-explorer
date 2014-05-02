import requests, itertools, unicodecsv, sys
from lxml import etree
from StringIO import StringIO

first = lambda seq: next(itertools.ifilter(None, seq), None)


def get_detail(url):
    r = requests.get(url)
    parser = etree.HTMLParser()
    tree = etree.parse(StringIO(r.text.encode('utf-8')), parser)

    img_src = first(tree.xpath('//table[contains(@class,"infobox")]//a[contains(@class, "image")]/img/@src'))

    ingredients = first(tree.xpath('//table[contains(@class,"infobox")]//td[contains(@class, "ingredient")]'))

    return ('http:' + img_src if img_src is not None else '',
            etree.tostring(ingredients,
                           encoding="UTF-8",
                           method="text").strip() if ingredients is not None else '')

def get_list(url):
    r = requests.get('http://en.wikipedia.org/wiki/National_dish')
    parser = etree.HTMLParser()
    tree = etree.parse(StringIO(r.text), parser)

    for li in tree.xpath('//h2[contains(.,"By country")]/following-sibling::ul/li'):
        country = li.xpath('b/a')[0].text
        for dish in li.xpath('a[starts-with(@href, "/wiki/")]'):
            yield (country, dish.text, dish.attrib['href']) + get_detail('http://en.wikipedia.org' + dish.attrib['href'])

if __name__ == '__main__':
    csv = unicodecsv.writer(sys.stdout)
    csv.writerow(['country','dish','link','image','main_ingredients'])
    for dish in get_list('http://en.wikipedia.org/wiki/National_dish'):
        csv.writerow(dish)
