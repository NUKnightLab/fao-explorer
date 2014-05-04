import pandas as pd 
import numpy as np
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



cap = pd.read_csv("capital_stock.csv",names=['year','investment','inv_code','country','country_code','gross_stock','gross_stock_flg','net_stock','net_stock_flg'],header=0) 
cap = cap[cap.country_code.isin(FAOSTAT_COUNTRY_CODES.values())]
cap = cap[cap.year >= 1985]
# cap = cap[cap.year.isin(pop.year.unique())]

cap['type'] = pd.Series()
cap['type'] = np.where(cap['investment'].isin(['Land Development','Plantation Crops']),'CROPS',cap['type'])
cap['type'] = np.where((cap['investment']=='Machinery & Equipment'),'EQUIP',cap['type'])
cap['type'] = np.where(cap['investment'].isin(['Livestock (Fixed Assets)','Livestock (inventory)','Structures for Livestock']),'LIVESTOCK',cap['type'])
cap = cap[['year','country','type','gross_stock']]
cap = cap.groupby(['year','country','type'])['gross_stock'].sum()

pop = pd.read_csv('../population/pop-interpolated.csv')
pop = pop.set_index('Year')

for country in pop.columns:
    cty_cap = cap.unstack(1)[country].unstack()
    for stock_type in list(cty_cap.columns):
        cty_cap['%s_PER_CAP' % stock_type] = cty_cap[stock_type] / pop[country]
    cty_cap.to_csv('%s-capital.csv' % country)    

