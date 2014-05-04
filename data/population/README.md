# United Nations Population Projections

Beginning from population over time from the 
[UN World Population Prospects](http://esa.un.org/wpp/) (WPP) and 
[World Urbanization Prospects](http://esa.un.org/unup/) (UNUP), we prepare that data 
in a few different formats to support pieces of the explorer. 

First, we filter down to the key countries we are investigating: 
Brazil, China, India and Nigeria. From the WPP data, we made 
`population-cut.csv`. From the UNUP data, we made:
* `percent-rural.csv`
* `percent-urban.csv`
* `rural.csv`
* `urban.csv`
Then, in the `analyze.py` script, we rearrange the 
data to, for each country, link total population projections, and 
total and percentage of urban and rural. The `pandas` python library was helpful to interpolate values in between the five year UN data points so that we could have smoother charts with other data that was available annually.

# Population by City

Source: [CityPopulation.de](http://citypopulation.de)

## Columns

1. Country
2. City
3. State
4. 1991
5. 2000
6. 2010
