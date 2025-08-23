import requests
import re
from urllib.parse import quote, unquote

def resolve_maps_link(input_str, city):
    """
    If input is a URL, follow redirect.
    If input is a name, search Google Maps with city bias.
    """
    if input_str.startswith("http://") or input_str.startswith("https://"):
        return follow_redirect(input_str, "")
    # Treat as place name
    search_url = f"https://www.google.com/maps/search/{quote(input_str + ' ' + city)}"
    return follow_redirect(search_url, input_str)


def follow_redirect(url, place):
    """
    Follow short Google Maps redirect or parse HTML to get canonical place URL.
    """
    try:
        res = requests.get(url, allow_redirects=False, timeout=10)
    except requests.RequestException:
        return None

    if res.status_code in (301, 302):
        return res.headers.get("Location")

    # 200 OK → parse HTML if URL has no coordinates
    if "@" not in url and "query=" not in url:
        html = res.text
        match1 = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", html)
        match2 = re.search(r"center=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)", html)
        if not match1 and not match2:
            return None
        lat, lng = match1.groups() if match1 else match2.groups()
        canonical_place = quote(place.title().replace(" ", "+"))
        return f"https://www.google.com/maps/place/{canonical_place}/@{lat},{lng},17z/"

    # Already a full URL with coords
    return url


def extract_lat_lng(url):
    """
    Extract latitude and longitude from a Google Maps URL.
    """
    at_match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if at_match:
        return {"lat": at_match.group(1), "lng": at_match.group(2)}
    
    query_match = re.search(r"query=(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if query_match:
        return {"lat": query_match.group(1), "lng": query_match.group(2)}

    return None


def extract_place_name(url):
    """
    Extract place name from a Google Maps URL.
    """
    match = re.search(r"/maps/place/([^/]+)", url)
    if match:
        return unquote(match.group(1).replace("+", " "))
    return None

import pandas as pd
df = pd.read_csv('data/Tokyo/Tokyo.csv')
df['url'] = df['name'].apply(lambda x: resolve_maps_link(x, 'Tokyo'))
# df['lat_long'] = 
print(df)

