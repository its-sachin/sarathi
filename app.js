import { fetchMapKey, fetchPlacesCSV, fetchPlaceContributions, addContribution,
} from "./firebase.js";

import { initCalendar } from "./calendar.js";

import * as Constants from "./const.js";

let city = "Tokyo"; // default, updated on tab click
let map; // global map reference
let key;


// Reusable function to create emoji markers
const createEmojiIcon = (type, name) => L.divIcon({
    className: "emoji-marker",
    html: `
      <div class="emoji-wrapper">
        ${Constants.typeIcons[type.trim()] || Constants.typeIcons.Other}
        <span class="marker-label">${name}</span>
      </div>
    `,
    iconSize: [90, 90],      // slightly smaller
    iconAnchor: [30, 50]     // adjusted anchor
});
// Initialize or update map for a city
async function initMap(city, rows, zoom=13) {
  const center = Constants.cityCenters[city] || [35.68, 139.76]; // fallback
  // Base options for desktop
  let mapOptions = {
    center,
    zoom,
    scrollWheelZoom: true,  // keep normal on PC
    dragging: true,
    tap: false
  };

  // Detect mobile (touchscreen)
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    mapOptions = {
      ...mapOptions,
      dragging: false,        // disable 1-finger drag
      tap: false,             // prevent single-finger hijack
      scrollWheelZoom: false, // no scroll zoom on mobile
      touchZoom: true
    };
  }

  map = L.map('map', mapOptions);
  map = map.setView(center, zoom);

  if(!key) {
    key = await fetchMapKey();
  }

  
  const mtLayer = L.maptilerLayer({
    apiKey: key,
    style: `https://api.maptiler.com/maps/0198b438-d1b5-7f34-8dc7-9f51e521baaa/style.json?key=${key}`
  }).addTo(map);


  // Force English labels
  mtLayer.setLanguage(L.MaptilerLanguage.ENGLISH);
  

  // Clear existing markers
  map.eachLayer(l => l instanceof L.Marker && map.removeLayer(l));

  const markers = rows.filter(r => r[1] && r[2]).map(([name, lat, long, type, imgUrl]) => {
    const marker = L.marker([+lat, +long], { icon: createEmojiIcon(type, name) }).addTo(map);

    // Card HTML
    const popupContent = `
      <div class="place-card" style="cursor:pointer; width:200px; text-align:center;">
        <img src="${imgUrl}" alt="${name}" style="width:100%; height:120px; object-fit:cover; border-radius:6px;" />
        <h4 style="margin:5px 0;">${name}</h4>
        <p style="margin:0; color:#555;">${type}</p>
      </div>
    `;

    const popup = L.popup({
      offset: [0, -50], // move popup 70px above the marker
      closeButton: false,
      autoPan: true,
      className: 'place-card-popup'
    }).setContent(popupContent);

    marker.bindPopup(popup);

    // Navigate to page on click
    marker.on('popupopen', e => {
      const card = e.popup.getElement().querySelector('.place-card');
      card.onclick = () => showPlace(name, city);
    });

    return marker;
  });

  const updateLabels = ()=>markers.forEach(m=>{
    const l = m.getElement()?.querySelector('.marker-label');
    if(l) l.style.opacity = map.getZoom()>=Constants.LABEL_ZOOM?1:0;
  });

  map.on('zoomend', updateLabels);
  updateLabels();
}

async function showTab(c, push=true) {
  city = c;
  if(push) {
    window.history.pushState({ type: "tab", city: c }, c, `?city=${c}`);
  }

  const rows = await fetchPlacesCSV(c);
  const opts = Object.keys(Constants.typeIcons)
    .map(v => `<option value="${v}">${Constants.typeIcons[v]} ${v}</option>`)
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


     <!-- ✅ calendar container -->
     <h2 class = "heading2"> Scheduler </h3>
    <div id="tripCalendar" style="margin-top:20px;"></div>

    <h2 class = "heading2"> Map-View </h3>
     <div id="map-container">
      <div id="map"></div>
    </div>
    
    `; // message area stays below

  document.getElementById("placeForm").onsubmit = savePlace;
  // Initialize map after container is ready
  initMap(city, rows);

  const refLat = Constants.cityCenters[city][0];
  const refLng = Constants.cityCenters[city][1];

  // Function to calculate simple squared distance (faster than haversine)
  function distanceSq(lat, lng) {
    return (lat - refLat)**2 + (lng - refLng)**2;
  }

  // Sort rows by distance
  rows.sort((a, b) => distanceSq(a[1], a[2]) - distanceSq(b[1], b[2]));


  initCalendar(city,rows);


  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";
  for (const row of rows) {
    const name = row[0];
    const img = document.createElement("img");
    img.src = row[4];

    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";

    card.className = "card";
    card.append(img, Object.assign(document.createElement("h3"), {textContent: Constants.typeIcons[row[3]] + " " + name}));
    container.appendChild(card);

    card.addEventListener("click", () => showPlace(name, city));
    
  }
}

export async function showPlace(placeName, city, push=true) {
  if(push) {
    window.history.pushState({ type: "place", city, placeName }, placeName, `?city=${city}&place=${placeName}`);
  }
  try {
    const placeData = await fetchPlaceContributions(city, placeName);

    const container = document.getElementById("cityTabs");

    // 🔹 Order users according to getUserEmoji map
    const userOrder = ["Sachin", "Rohit", "Neeraja", "Dheeraj", "Dyuti"];

    container.innerHTML = `
      <h2 class="heading">${placeName}</h2>
      <img class="imagePlace" src="${placeData['link']}">
      <div class="infoCardsContainer">
        ${userOrder
          .filter(user => placeData['content'][user] !== undefined) // only show existing users
          .map(user => {
            const items = placeData['content'][user] || [];
            return `
              <div class="infoCard">
                <div class="userBadge">${getUserEmoji(user)}</div>
                <div class="titleBar">${user}</div>
                <hr class="line">
                <ul>
                  ${items.map(item => `<li>${item}</li>`).join('')}
                </ul>

                <div id="savemsg-${user}"></div>
                <div style="display:flex; align-items:center; margin-bottom:10px;">
                  <input type="text" 
                    placeholder="Add info..." 
                    id="addInfoInput-${user}" 
                    class="addInfoInput"
                    onkeydown="if(event.key === 'Enter') addUserInfo('${user}', '${city}', '${placeName}')"
                  />
                  <button 
                    class="infoButton"
                    onclick="addUserInfo('${user}', '${city}', '${placeName}')"
                    title="Add"
                  >+</button>
                </div>
              </div>
            `;
          }).join('')}
      </div>
    `;
  } catch (err) {
    alert(`Could not load data for ${placeName}: ${err}`);
  }
}
/* Map user names to emojis */
function getUserEmoji(user) {
  return Constants.userMap[user] || "👤";
}

async function savePlace(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  msg.textContent = "⏳ Saving...";

  try {
    const r = await fetch(Constants.APP_URL, {
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

  document.getElementById(`savemsg-${user}`).textContent = "⏳ Saving...";
  try {
    // Replace URL with your backend endpoint
    const r = await addContribution(city, place, user, info);
    document.getElementById(`savemsg-${user}`).textContent = await r.message;
    await new Promise(res => setTimeout(res, 500));
    showPlace(place, city);
    // document.getElementById("msg").textContent = "";
  } catch (e) {
    console.error("Error adding user info:", e);
    document.getElementById(`savemsg-${user}`).textContent = "❌ Network error";
  }
}

window.addUserInfo = addUserInfo;

document.querySelectorAll(".city-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const city = btn.dataset.city;
    showTab(city);
  });
});

window.addEventListener("popstate", (event) => {
    const state = event.state;
    if (!state) return;

    if (state.type === "tab") {
        showTab(state.city, false); // false: don’t push again
    } else if (state.type === "place") {
        showPlace(state.placeName, state.city, false);
    }
});

// --- Initialize default city (or from URL) ---
const urlParams = new URLSearchParams(window.location.search);
const cityParam = urlParams.get("city");
const placeParam = urlParams.get("place");

if (placeParam && cityParam) {
    showPlace(placeParam, cityParam, false);
} else if (cityParam) {
    showTab(cityParam, false);
} else {
    showTab(city);
}