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
  html: `${typeIcons[type.trim()] || typeIcons.Other}<br><span class="marker-label">${name}</span>`,
  iconSize: [40, 40], iconAnchor: [20, 40]
});

// Initialize or update map for a city
async function initMap(city, rows, zoom=11) {
  const center = cityCenters[city] || [35.68, 139.76]; // fallback
  map = L.map('map');
  map = map.setView(center, zoom);

  const key = await fetch(URL)
                  .then(r => r.json()).then(d => d.key);

  L.tileLayer(`https://api.maptiler.com/maps/bright/{z}/{x}/{y}.png?key=${key}`, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors &copy; <a href="https://www.maptiler.com/">MapTiler</a>',
    maxZoom: 20
  }).addTo(map);

  // Clear existing markers
  map.eachLayer(l => l instanceof L.Marker && map.removeLayer(l));

  rows.forEach(([name,lat,long,type]) => {
    if (lat && long) L.marker([+lat, +long], { icon: createEmojiIcon(type, name) })
      .addTo(map)
      .bindPopup(`<b>${name}</b><br>Type: ${type}`);
  });
}


async function showTab(c) {
  city = c;
  const r = await fetch(`data/${c}/${c}.csv`);
  const t = await r.text();
  const rows = t.trim().split('\n').slice(1).map(l => l.split(','));
  const opts = Object.keys(typeIcons)
    .map(v => `<option value="${v}">${typeIcons[v]} ${v}</option>`)
    .join('');


  document.getElementById("cityTabs").innerHTML =
    `<h2>${c}</h2>
     <form id=placeForm>
       <input id=link placeholder="Google Maps link" required>
       <select id=type required><option value="">Type</option>${opts}</select>
       <button>Add</button>
     </form>
     <div id="msgBox"><span id=msg></span></div>
     <div id="map-container">
      <div id="map"></div>
    </div>
    <div id="cardsContainer"></div>
    `; // message area stays below

  document.getElementById("placeForm").onsubmit = savePlace;
  // Initialize map after container is ready
  initMap(city, rows);
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";
  for (const row of rows) {
    const name = row[0];
    const img = document.createElement("img");

    const res = await (await fetch(`data/${city}/${name}.json`)).json();
    img.src = res["link"];

    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";

    card.className = "card";
    card.append(img, Object.assign(document.createElement("h4"), {textContent: name}));
    container.appendChild(card);

    card.addEventListener("click", () => showPlace(name, city, res));
  }
}

async function showPlace(placeName, city, placeData=undefined) {
  try {
    if (!placeData) {
      const res = await fetch(`data/${city}/${placeName}.json`);
      if (!res.ok) throw new Error(`Failed to fetch data for ${placeName}`);
      placeData = await res.json();
    }
    const container = document.getElementById("cityTabs");
    container.innerHTML = `
      <h2>${placeName}</h2>
      <img src="${placeData['link']}" style="max-width:400px; display:block; margin:10px 0;">
      <div class="infoCardsContainer">
        ${Object.entries(placeData['content']).map(([user, items]) => `
          <div class="infoCard">
            <div class="userBadge">${getUserEmoji(user)}</div>
            <div class="titleBar">${user}</div><div id="savemsg"></div>
            <div style="display:flex; align-items:center; margin-bottom:10px;">
              <input type="text" 
                placeholder="Add info..." 
                id="addInfoInput-${user}" 
                style="flex:1; padding:4px 8px;" 
              />
              <button 
                style="margin-left:4px; font-size:18px; padding:2px 8px;" 
                onclick="addUserInfo('${user}', '${city}', '${placeName}')"
                title="Add"
              >+</button>
            </div>
            <ul>
              ${items.length ? items.map(item => `<li>${item}</li>`).join('') : '<li>No info yet</li>'}
            </ul>
          </div>
        `).join('')}
      </div>
      <div id="msg"></div>
    `;
  } catch (err) {
    alert(`Could not load data for ${placeName}: ${err}`);
  }
}
/* Map user names to emojis */
function getUserEmoji(user) {
  const map = {
    "Sachin": "😎",
    "Neeraja": "🤓",
    "Dheeraj": "🧐",
    "Dyuti": "😇"
  };
  return map[user] || "👤";
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

// Add this helper function once in your JS
async function addUserInfo(user, city, place) {
  const input = document.getElementById(`addInfoInput-${user}`);
  const info = input.value.trim();
  if (!info) return;
  input.value = "";

  document.getElementById("savemsg").textContent = "⏳ Saving...";
  try {
    // Replace URL with your backend endpoint
    const r = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "addInfo",
        city,
        place,
        info,
        user,
      })
    });
    document.getElementById("savemsg").textContent = await r.text();
    await new Promise(res => setTimeout(res, 500));
    showPlace(place, city);
    // document.getElementById("msg").textContent = "";
  } catch (e) {
    document.getElementById("savemsg").textContent = "❌ Network error";
  }
}

showTab(city); // Initialize with default city