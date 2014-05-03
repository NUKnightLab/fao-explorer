import pandas as pd 
import numpy as np

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

CLASSES = {'SEAFOOD':  
[
'Aquatic Animals, Others',
'Cephalopods',
'Crustaceans',
'Demersal Fish',
'Fish, Body Oil',
'Fish, Liver Oil',
'Freshwater Fish',
'Marine Fish, Other',
'Molluscs, Other',
'Pelagic Fish'
],

'AQUA_PLANTS':  ['Aquatic Plants'],

'MEAT':  ['Bovine Meat',
'Fats, Animals, Raw',
'Meat, Other',
'Mutton & Goat Meat',
'Offals, Edible'
],

'PORK':  ['Pigmeat'],
'POULTRY':  ['Poultry Meat'],

'DAIRY':  ['Cheese',
'Whey',
'Milk - Excluding Butter',
'Milk, Whole',
'Butter, Ghee',
'Cream',
'Eggs'],

'HONEY':  ['Honey'],
}
livestock = pd.read_csv('livestock.csv',header=0,names=['year','commodity','comm_code','country','country_code','food_qty','fqflg','food_qty_yr','fqyflg','food_qty_day','fqd_flg','kcal_day','cdflg','fat_qty_day','fqdflg','pro_qty_day','pqd_flg'])
livestock = livestock[livestock.country_code.isin(FAOSTAT_COUNTRY_CODES.values())]

livestock['type'] = pd.Series()
for typecode,typelist in CLASSES.items():
    livestock['type'] = np.where(livestock['commodity'].isin(typelist),typecode,livestock['type'])

simpler = livestock[['country','year','type','kcal_day']]
simpler = simpler.groupby(['country','year','type']).sum()

# find top ten crops for nigeria
def data_for_code(country_code):
    livestock = pd.read_csv('livestock.csv',header=0,names=['year','commodity','comm_code','country','country_code','food_qty','fqflg','food_qty_yr','fqyflg','food_qty_day','fqd_flg','kcal_day','cdflg','fat_qty_day','fqdflg','pro_qty_day','pqd_flg'])
    livestock = livestock[livestock.country_code == country_code]
    livestock['type'] = pd.Series()
    for typecode,typelist in CLASSES.items():
        livestock['type'] = np.where(livestock['commodity'].isin(typelist),typecode,livestock['type'])
    return livestock

def top_crops(country_code,country_name):
    livestock = data_for_code(country_code)
    livestock = livestock[['year','type','kcal_day']]
    livestock = livestock.groupby(['year','type']).sum()
    livestock = livestock.unstack()
    tran = livestock.T
    tran = tran.reset_index(0)
    livestock = tran.T
    livestock = livestock.drop('level_0')
    livestock.to_csv('%s-topstock.csv' % country_name)

for name,code in FAOSTAT_COUNTRY_CODES.items():
    top_crops(code,name)