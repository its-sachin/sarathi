import os
import json
for file in os.listdir('data/Tokyo/'):
    if file.endswith('json'):
        con = json.load(open('data/Tokyo/'+file))
        con['content']['Rohit'] = []
        json.dump(con, open('data/Tokyo/'+file,'w'))