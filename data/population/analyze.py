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

pop = pd.read_csv('population-cut.csv')
pop = pop.pivot('Year','Country','Population')
pop = pop.reindex(xrange(1985,2011),columns=list(pop.columns))
pop = pop.interpolate()
pop.to_csv('pop-interpolated.csv')