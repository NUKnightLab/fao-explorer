import pandas as pd 


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

crops = pd.read_csv('crops.csv',header=0,names=['year','crop','crop_code','country','country_code','area_harvested','ahflag','yield','yflag','production','pflag','seed','sflag'])


# find top ten crops for nigeria
def top_crops(country_code,country_name):
    crops = pd.read_csv('crops.csv',header=0,names=['year','crop','crop_code','country','country_code','area_harvested','ahflag','yield','yflag','production','pflag','seed','sflag'])
    crops = crops[crops.country_code == country_code]
    cropsum = crops[['crop_code','area_harvested']].groupby(['crop_code']).sum()
    cropsum=cropsum.dropna()
    cropsum.sort('area_harvested',ascending=False,inplace=True)
    crops=crops[crops.crop_code.isin(cropsum.head(10).index)]
    crops.pivot('year','crop','area_harvested').to_csv('%s-topcrops.csv' % country_name)

for name,code in FAOSTAT_COUNTRY_CODES.items():
    top_crops(code,name)
