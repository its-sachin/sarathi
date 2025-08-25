const APP_URL = "https://script.google.com/macros/s/AKfycbzEQ5AjznW8o4vH_YugpF6VApf6fgyi_D4pnR36M9vgnjtaBWs8FheGUG8La9IG8Y4/exec"; // <-- replace
let city = "Tokyo"; // default, updated on tab click
const LABEL_ZOOM = 14;

let map; // global map reference
const typeIcons = {
  Home: "🏠",
  Shrine: "⛩️", 
  Park: "🌳", 
  Museum: "🏛️",
  Restaurant: "🍽️", 
  Shop: "🛍️",
  Other: "📍",
  Street: "🚶",
  Monument: "🗽",
  Activity: "🎉",
};

const cityCenters = {
  Tokyo: [35.68, 139.76],
  Osaka: [34.69, 135.50],
  Kyoto: [35.01, 135.77]
};

// Reusable function to create emoji markers
const createEmojiIcon = (type, name) => L.divIcon({
    className: "emoji-marker",
    html: `
      <div class="emoji-wrapper">
        ${typeIcons[type.trim()] || typeIcons.Other}
        <span class="marker-label">${name}</span>
      </div>
    `,
    iconSize: [90, 90],      // slightly smaller
    iconAnchor: [30, 50]     // adjusted anchor
});
// Initialize or update map for a city
async function initMap(city, rows, zoom=11) {
  const center = cityCenters[city] || [35.68, 139.76]; // fallback
  map = L.map('map');
  map = map.setView(center, zoom);

  const key = await fetch(APP_URL + "?action=getMapKey")
                  .then(r => r.json()).then(d => d.key);

  const mtLayer = L.maptilerLayer({
    apiKey: key,
    style: `https://api.maptiler.com/maps/0198b438-d1b5-7f34-8dc7-9f51e521baaa/style.json?key=${key}`
  }).addTo(map);

  // Force English labels
  mtLayer.setLanguage(L.MaptilerLanguage.ENGLISH);
  

  // Clear existing markers
  map.eachLayer(l => l instanceof L.Marker && map.removeLayer(l));

  const markers = rows.filter(r => r[1] && r[2]).map(([name, lat, long, type]) => 
      L.marker([+lat, +long], { icon: createEmojiIcon(type, name) })
        .addTo(map)
        .bindPopup(`<b>${name}</b><br>Type: ${type}`)
    );

  console.log(markers);

  const updateLabels = ()=>markers.forEach(m=>{
    const l = m.getElement()?.querySelector('.marker-label');
    if(l) l.style.opacity = map.getZoom()>=LABEL_ZOOM?1:0;
  });

  map.on('zoomend', updateLabels);
  updateLabels();
}


async function showTab(c, push=true) {
  city = c;
  if(push) {
    window.history.pushState({ type: "tab", city: c }, c, `?city=${c}`);
  }
  const r = await fetch(`data/${c}/${c}.csv`);
  const t = await r.text();
  const rows = t
    .trim()
    .split('\n')
    .slice(1)
    .filter(l => l.trim().length > 0) // skip empty rows
    .map(l => l.split(','));
  const opts = Object.keys(typeIcons)
    .map(v => `<option value="${v}">${typeIcons[v]} ${v}</option>`)
    .join('');


  document.getElementById("cityTabs").innerHTML =
    `<h2 class = "heading">${c}</h2>
     <form id=placeForm>
       <input id=link placeholder="Place Name/Link" required>
       <select id=type required><option value="">Type</option>${opts}</select>
       <button>Add</button>
     </form>
     <div id="msgBox"><span id=msg></span></div>
     <div id="cardsContainer"></div>
     <div id="map-container">
      <div id="map"></div>
    </div>
    
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
    card.append(img, Object.assign(document.createElement("h3"), {textContent: name}));
    container.appendChild(card);

    card.addEventListener("click", () => showPlace(name, city, res));
  }
}

async function showPlace(placeName, city, placeData=undefined, push=true) {
  if(push) {
    window.history.pushState({ type: "place", city, placeName }, placeName, `?city=${city}&place=${placeName}`);
  }
  try {
    if (!placeData) {
      const res = await fetch(`data/${city}/${placeName}.json`);
      if (!res.ok) throw new Error(`Failed to fetch data for ${placeName}`);
      placeData = await res.json();
    }
    const container = document.getElementById("cityTabs");
    container.innerHTML = `
      <h2 class="heading">${placeName}</h2>
      <img class = "imagePlace" src="${placeData['link']}">
      <div class="infoCardsContainer">
        ${Object.entries(placeData['content']).map(([user, items]) => `
          <div class="infoCard">
            <div class="userBadge">${getUserEmoji(user)}</div>
            <div class="titleBar">${user}</div><div id="savemsg"></div>
            <div style="display:flex; align-items:center; margin-bottom:10px;">
              <input type="text" 
                placeholder="Add info..." 
                id="addInfoInput-${user}" 
                class="addInfoInput"
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
    "Sachin": "🥷",
    "Neeraja": "😤",
    "Dheeraj": "🤠",
    "Dyuti": "👩‍🦳",
    "Rohit": "😎"
  };
  return map[user] || "👤";
}

async function savePlace(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  msg.textContent = "⏳ Saving...";

  try {
    const r = await fetch(APP_URL, {
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
    const r = await fetch(APP_URL, {
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

window.addEventListener("popstate", (event) => {
    const state = event.state;
    if (!state) return;

    if (state.type === "tab") {
        showTab(state.city, false); // false: don’t push again
    } else if (state.type === "place") {
        showPlace(state.placeName, state.city, undefined, false);
    }
});

// --- Initialize default city (or from URL) ---
const urlParams = new URLSearchParams(window.location.search);
const cityParam = urlParams.get("city");
const placeParam = urlParams.get("place");

if (placeParam && cityParam) {
    showPlace(placeParam, cityParam, undefined, false);
} else if (cityParam) {
    showTab(cityParam, false);
} else {
    showTab(city);
}