# # <script type="module">
# #   // Import the functions you need from the SDKs you need
# #   import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
# #   // TODO: Add SDKs for Firebase products that you want to use
# #   // https://firebase.google.com/docs/web/setup#available-libraries

# #   // Your web app's Firebase configuration
# #   const firebaseConfig = {
# #     apiKey: "AIzaSyCV9D-Zqao4CW-BkqyPr5MAmSjlVfP3kVA",
# #     authDomain: "sarathi-291ca.firebaseapp.com",
# #     projectId: "sarathi-291ca",
# #     storageBucket: "sarathi-291ca.firebasestorage.app",
# #     messagingSenderId: "162112970584",
# #     appId: "1:162112970584:web:b2bf396110896a253b8f2d"
# #   };

# #   // Initialize Firebase
# #   const app = initializeApp(firebaseConfig);
# # </script>

# import csv, json, os
# import firebase_admin
# from firebase_admin import credentials, firestore

# # Initialize Firebase Admin
# cred = credentials.Certificate("../sarathi-291ca-firebase-adminsdk-fbsvc-b56b87568d.json")
# firebase_admin.initialize_app(cred)
# db = firestore.client()

# # Path to your local data
# DATA_DIR = "./data"

# for city in ['Osaka']:
#     city_path = os.path.join(DATA_DIR, city)
#     # 1. Load city.csv
#     csv_path = os.path.join(city_path, f"{city}.csv")
#     with open(csv_path, newline="", encoding="utf-8") as f:
#         reader = csv.DictReader(f)
#         for row in reader:
#             place_ref = db.collection("cities").document(city).collection("places").document(row["name"])
#             place_ref.set({
#                 "name": row["name"],
#                 "lat": float(row["lat"]),
#                 "long": float(row["long"]),
#                 "type": row["type"],
#                 "link": row["link"]
#             })

#     # 2. Load place.json files
#     for file in os.listdir(city_path):
#         if file.endswith(".json") and not file.endswith(".csv"):
#             place_name = file.replace(".json", "")
#             place_ref = db.collection("cities").document(city).collection("places").document(place_name)

#             with open(os.path.join(city_path, file), encoding="utf-8") as f:
#                 content = json.load(f)["content"]
#                 for user, data in content.items():
#                     contrib_ref = place_ref.collection("contributions").document(user)
#                     contrib_ref.set({
#                         "userId": user,
#                         "data": data
#                     })


import requests

def get_osm_place_id(place_name):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": place_name, "format": "json"}
    response = requests.get(url, params=params, headers={"User-Agent": "my-app"})
    data = response.json()
    if data:
        return data[0]["osm_id"], data[0]["lat"], data[0]["lon"]
    return None

places = ["Tokyo Tower", "Senso-ji Temple", "Meiji Jingu Shrine"]
for place in places:
    print(place, "→", get_osm_place_id(place))