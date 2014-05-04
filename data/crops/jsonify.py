import pandas as pd
import json

FAOSTAT_COUNTRY_CODES = {
    'Brazil': 21,
    'China': 351,
    'India': 100,
    'Nigeria': 159
}

for country in FAOSTAT_COUNTRY_CODES:
    d = {}
    df = pd.read_csv('%s-topcrops.csv' % country)
    df = df.set_index('year')
    for column in df.columns:
        series = df[column]
        d[column] = [[{'x': yr, 'y': series[yr]} for yr in series.index]]
        json.dump(d,open('%s-topcrops.json' % country,'w'),indent=2)