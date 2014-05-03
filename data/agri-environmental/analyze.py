# some simple set up for analysis to avoid repetition
import pandas as pd

# Country  UNI FAOSTAT
# Brazil  76  21
# China   156 351
# India   356 100
# Russia  643 185

ag = pd.read_csv('dump.csv')
ag.rename(columns=dict(zip(ag.columns,['year', 'country', 'country_code', 'land_type', 'land_code', 'pct_ag_change', 'pct_ag_change_flg', 'pct_ag_area', 'pct_ag_area_flg', 'pct_land_area', 'pct_land_area_flg'])),inplace=True)

codes = ag[['land_type','land_code']]
codes = codes.drop_duplicates()
codes = codes.set_index('land_code')

# land types
# 6610                                      Agricultural area
# 6700                            Protected terrestrial areas
# 6655                         Permanent meadows and pastures
# 6690                     Total area equipped for irrigation
# 6621                                            Arable land
# 6650                                        Permanent crops
# 6713       Conservation agriculture area: >30% ground cover
# 6671                      Agricultural area organic, total

# ag[isnan(ag.pct_ag_area)].land_type.unique()
# ag[isnan(ag.pct_land_area)].land_type.unique()

ag = ag.drop(['pct_ag_change_flg','pct_ag_area_flg','pct_land_area_flg'],axis=1)
ag = ag[ag.year > 1983]
ag = ag[(ag.country_code == 21) | (ag.country_code == 351) | (ag.country_code == 100 )]
ag_area = ag[ag.land_code == 6610]
agpiv = ag_area.pivot('year','country','pct_land_area')
# agpiv.plot()

brazil = ag[ag.country_code == 21]
brazil = brazil[brazil.land_code != 6610]