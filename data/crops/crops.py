import csv
import pdb
import random
from operator import itemgetter

country = input("What country?: ")
year = input("Year?: ")

filtered = []

with open('crops.csv', 'rb') as f:
	reader = csv.DictReader(f)
	for row in reader:
		if row['Country'] == country and row['Year'] == year:
			filtered.append(row)
	for row in filtered:
			row['Production [t]'] = float(row['Production [t]'])
	new_list = sorted(filtered, key=itemgetter('Production [t]'), reverse=True)
	for x in range(0,3):
		print x+1, new_list[x]['Crops'], new_list[x]['Production [t]']
	# pdb.set_trace()

# 	data = csv.reader(f)

# 	crops = []
# 	for row in data:
# 		crops.append(row[1])

# crops = sorted(list(set(crops)))
# # random_crop = random.sample(crops, 3)
# return crops