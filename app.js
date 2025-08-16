const URL = "https://script.google.com/macros/s/AKfycbyrIG8t9W8Tlbzsw-kxQYMMdwMKZcB0fhVamNoGx7c3D4jTFg67XVt-wwwFcjgmY1Us/exec"; // <-- replace
let city = "Tokyo"; // default, updated on tab click

let map; // global map reference
const typeIcons = {
  Shrine: "⛩️", 
  Park: "🌳", 
  Museum: "🏛️",
  Restaurant: "🍽️", 
  Shop: "🛍️",
  Other: "📍",
  Street: "🚶"
};

const cityCenters = {
  Tokyo: [35.68, 139.76],
  Osaka: [34.69, 135.50],
  Kyoto: [35.01, 135.77]
};

// Reusable function to create emoji markers
const createEmojiIcon = (type, name) => L.divIcon({
  className: "emoji-marker",
  html: `${typeIcons[type?.toLowerCase()] || typeIcons.default}<br><span class="marker-label">${name}</span>`,
  iconSize: [40, 40], iconAnchor: [20, 40]
});

// Initialize or update map for a city
async function initMap(city,  zoom=11) {
  const center = cityCenters[city] || [35.68, 139.76]; // fallback
  if (!map) map = L.map('map');
  map = map.setView(center, zoom);
  console.log(map);

  const key = await fetch(URL)
                  .then(r => r.json()).then(d => d.key);

  console.log(`Using MapTiler key: ${key}`);

  L.tileLayer(`https://api.maptiler.com/maps/bright/{z}/{x}/{y}.png?key=${key}`, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors &copy; <a href="https://www.maptiler.com/">MapTiler</a>',
    maxZoom: 20
  }).addTo(map);

  // Clear existing markers
  map.eachLayer(l => l instanceof L.Marker && map.removeLayer(l));

  // Load city data
  const data = await fetch(`data/${city}.csv`).then(r => r.text());
  const rows = data.trim().split('\n').slice(1).map(l => l.split(','));
  rows.forEach(([name,lat,long,type]) => {
    if (lat && long) L.marker([+lat, +long], { icon: createEmojiIcon(type, name) })
      .addTo(map)
      .bindPopup(`<b>${name}</b><br>Type: ${type}`);
  });
}


async function showTab(c) {
  city = c;
  const r = await fetch(`data/${c}.csv`);
  const t = await r.text();
  const rows = t.trim().split('\n').slice(1).map(l => l.split(','));
  const ul = rows.map(x => `<li>${x[0]} (${x[3]})</li>`).join('');
  const opts = Object.keys(typeIcons).map(v=>`<option>${v}</option>`).join('');

  document.getElementById("cityTabs").innerHTML =
    `<h2>${c}</h2>
     <form id=placeForm>
       <input id=link placeholder="Google Maps link" required>
       <select id=type required><option value="">Type</option>${opts}</select>
       <button>Add</button>
     </form>
     <div id="msgBox"><span id=msg></span></div>`; // message area stays below

  document.getElementById("placeForm").onsubmit = savePlace;
  // Initialize map after container is ready
  await initMap(city);
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";
  for (const row of rows) {
    const name = row[0];
    const img = document.createElement("img");
    img.src = await getWikimediaImage(name);
    const card = document.createElement("div");
    card.className = "card";
    card.append(img, Object.assign(document.createElement("h4"), {textContent: name}));
    container.appendChild(card);
  }
}

async function getWikimediaImage(name) {
  const url = `https://en.wikipedia.org/w/api.php?origin=*&action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=300`;
  const data = await (await fetch(url)).json();
  const page = Object.values(data.query.pages)[0];
  return page?.thumbnail?.source || "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
}

async function savePlace(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  msg.textContent = "⏳ Saving...";

  try {
    const r = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "addPlaceFromLink",
        city,
        mapsLink: document.getElementById("link").value,
        info: document.getElementById("type").value
      })
    });

    msg.textContent = await r.text(); // stays visible
    await new Promise(res => setTimeout(res, 500)); // wait for backend update
    await showTab(city);

    // Restore the message after reloading tab
    document.getElementById("msg").textContent = msg.textContent;
  } catch {
    msg.textContent = "❌ Network error";
  }
}

showTab(city);

