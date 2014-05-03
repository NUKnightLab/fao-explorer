# some simple set up for analysis to avoid repetition
import pandas as pd

# Country  UNI FAOSTAT
# Brazil  76  21
# China   156 351
# India   356 100
# Nigeria 566 159

ISO_COUNTRY_CODES = {
    'Brazil': 76,
    'China': 156,
    'India': 356,
    'Nigeria': 566
}

pop = pd.read_csv('population.csv')
pop = pop[pop.country_code.isin(ISO_COUNTRY_CODES.values())]
pop = pop.drop(['Variable','Variant','percent_change'],1)
pop = pop.rename(columns={'Country':'country','Year':'year', 'country_code': 'uni'})
pop = pop[pop.year >= 1983][pop.year<=2010]

# poppiv = pop.pivot('Year','Country','value')
