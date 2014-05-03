import pandas as pd 
from collections import defaultdict


ISO_COUNTRY_CODES = {
    'Brazil': 76,
    'China': 156,
    'India': 356,
    'Nigeria': 566
}

FAOSTAT_COUNTRY_CODES = {
    'Brazil': 21,
    'China': 351,
    'India': 100,
    'Nigeria': 159
}

pop = pd.read_csv('../population/population.csv')
pop = pop[pop.country_code.isin(ISO_COUNTRY_CODES.values())]
pop = pop.drop(['Variable','Variant','percent_change'],1)
pop = pop.rename(columns={'Country':'country','Year':'year', 'country_code': 'uni'})
pop = pop[pop.year >= 1983][pop.year<=2010]


cap = pd.read_csv("capital_stock.csv",names=['year','investment','inv_code','country','country_code','gross_stock','gross_stock_flg','net_stock','net_stock_flg'],header=0) 
cap = cap[cap.country_code.isin(FAOSTAT_COUNTRY_CODES.values())]
cap = cap[cap.year.isin(pop.year.unique())]


records = cap.to_dict('records')
poprec = pop.to_dict('records')
poprecdict = defaultdict(dict)
for rec in poprec:
    poprecdict[rec['country']][rec['year']] = rec['value']

for rec in records:
    rec['population'] = poprecdict[rec['country']][rec['year']]
    rec['net_per_cap'] = rec['net_stock']/rec['population']
    rec['gross_per_cap'] = rec['gross_stock']/rec['population']
