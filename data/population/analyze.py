# some simple set up for analysis to avoid repetition
import pandas as pd

# Country  UNI FAOSTAT
# Brazil  76  21
# China   156 351
# India   356 100
# Russia  643 185

pop = pd.read_csv('population.csv')
pop = pop[(pop.country_code == 76) | (pop.country_code == 156)| (pop.country_code == 356)| (pop.country_code == 643) ]
poppiv = pop.pivot('Year','Country','value')
