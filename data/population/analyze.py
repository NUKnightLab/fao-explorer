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
pop = pop.reindex(pd.Index(xrange(1985,2011),name='Year'),columns=list(pop.columns))
pop = pop.interpolate()
pop.to_csv('pop-interpolated.csv')

def do_interpolation(df,pop_col_name):
    df = df.pivot('Year','Country',pop_col_name)
    df = df.reindex(pd.Index(xrange(1985,2011),name='Year'),columns=list(df.columns))
    return df.interpolate()    
pct_rural = do_interpolation(pd.read_csv('percent-rural.csv'),'Percentage_Rural_Population')

pct_urban = do_interpolation(pd.read_csv('percent-urban.csv'),'Percentage_Urban_Population')

rural = do_interpolation(pd.read_csv('rural.csv'),'Rural_Population')

urban = do_interpolation(pd.read_csv('urban.csv'),'Urban_Population')

for c in pop.columns:
    df = pd.DataFrame({'total': pop[c], 'urban': urban[c],'rural': rural[c],'pct_urban': pct_urban[c], 'pct_rural': pct_rural[c]})
    df.to_csv('%s-all-interp.csv' % c)
