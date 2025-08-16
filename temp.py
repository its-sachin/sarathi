import pandas as pd
import json

import requests

def get_wikimedia_image(name):
    fallback = "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg"

    # Step 1: Search for the page
    search_url = (
        "https://en.wikipedia.org/w/api.php"
        "?action=query&list=search&srsearch={}&format=json"
    ).format(requests.utils.quote(name))
    
    search_res = requests.get(search_url).json()
    search_results = search_res.get("query", {}).get("search", [])
    if not search_results:
        return fallback

    page_title = search_results[0].get("title")
    if not page_title:
        return fallback

    # Step 2: Get the thumbnail
    image_url = (
        "https://en.wikipedia.org/w/api.php"
        "?action=query&titles={}&prop=pageimages&format=json&pithumbsize=300"
    ).format(requests.utils.quote(page_title))
    
    image_res = requests.get(image_url).json()
    pages = image_res.get("query", {}).get("pages", {})
    page = next(iter(pages.values()))
    return page.get("thumbnail", {}).get("source", fallback)


df = pd.read_csv('data/Tokyo/Tokyo.csv')
for name in df.name.values:
    with open(f'data/Tokyo/{name}.json', "w", encoding="utf-8") as f:
      json.dump({'content': {'Sachin':[], 'Neeraja': [], 'Dheeraj': [], 'Dyuti': []}, "link": get_wikimedia_image(name)}, f, indent=2)