const API = 'https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec'; // <--- set after you deploy Apps Script
const state = { cities: [], active: null, places: [], map: null, markers: [] };

/* ---------- small helpers ---------- */
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const api = (method, body) =>
  fetch(API + (method === 'GET' && body ? '?'+new URLSearchParams(body) : ''), {
    method: method === 'POST' ? 'POST' : 'GET',
    headers: method === 'POST' ? {'Content-Type':'application/json'} : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined
  }).then(r=>r.json());

/* ---------- UI ---------- */
async function init() {
  initMap();
  const res = await api('GET', { action: 'listCities' });
  state.cities = res.cities || [];
  renderTabs();
  if (state.cities[0]) loadCity(state.cities[0]);
  setupModal();
}

function renderTabs() {
  const t=qs('#cityTabs'); t.innerHTML='';
  ['Add City', ...state.cities].forEach(name=>{
    const el=document.createElement('div'); el.className='tab';
    el.textContent=name;
    if (name===state.active) el.classList.add('active');
    el.onclick=()=> name==='Add City'? addCityPrompt() : loadCity(name);
    t.appendChild(el);
  });
}

async function loadCity(city) {
  state.active = city;
  renderTabs();
  const res = await api('GET', { action: 'getCity', city });
  state.places = res.places || [];
  renderMapMarkers();
  renderCards();
}

function renderMapMarkers(){
  state.markers.forEach(m=>m.remove()); state.markers=[];
  if (!state.map) return;
  const group=[];
  state.places.forEach(p=>{
    const m=L.marker([+p.lat,+p.lng]).addTo(state.map)
      .bindPopup(`<b>${p.name}</b><div class="small">${p.images?.[0] ? `<img src="${p.images[0]}" style="width:120px;height:80px;object-fit:cover;border-radius:6px">` : ''}</div>`);
    state.markers.push(m); group.push([+p.lat,+p.lng]);
  });
  if (group.length) state.map.fitBounds(group,{padding:[50,50]});
}

function renderCards(){
  const wrap=qs('#cards'); wrap.innerHTML='';
  state.places.forEach(place=>{
    const c=document.createElement('div'); c.className='card';
    c.innerHTML = `
      <img src="${place.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}" />
      <h4>${place.name}</h4>
      <div class="small">Place id: ${place.id}</div>
      <div id="infos-${place.id}"></div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button data-place="${place.id}" class="add-info">+ Add Info</button>
        <a href="city.html?city=${encodeURIComponent(state.active)}&place=${encodeURIComponent(place.id)}">Open</a>
      </div>
    `;
    wrap.appendChild(c);
    const infosDiv = c.querySelector(`#infos-${place.id}`);
    (place.infos || []).forEach(info=>{
      const p=document.createElement('div'); p.className='person';
      p.innerHTML = `<div class="meta"><strong>${escapeHtml(info.user)}</strong><div class="small">${escapeHtml(info.text)}</div><div class="small">${new Date(info.ts).toLocaleString()}</div></div>`;
      infosDiv.appendChild(p);
    });
  });
  qsa('.add-info').forEach(b=>b.onclick=e=>{
    const id=b.dataset.place; openModal(id);
  });
}

/* ---------- modal ---------- */
function setupModal(){
  qs('#closeModal').onclick=closeModal;
  qs('#saveInfo').onclick=async ()=>{
    const place = qs('#modal').dataset.place;
    const user = qs('#userName').value.trim()||'Anonymous';
    const text = qs('#infoText').value.trim();
    if(!text) return alert('Empty');
    await api('POST',{ action:'addInfo', city: state.active, place, user, text });
    closeModal(); loadCity(state.active);
  };
}
function openModal(placeId){
  const m=qs('#modal'); m.dataset.place=placeId; m.classList.remove('hidden');
  qs('#modalTitle').textContent = `Add info to ${placeId}`;
}
function closeModal(){ qs('#modal').classList.add('hidden'); qs('#userName').value=''; qs('#infoText').value=''; }

/* ---------- small utilities ---------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

async function addCityPrompt(){
  const name = prompt('New city name (lowercase, no spaces, e.g. tokyo)')?.trim();
  if(!name) return;
  await api('POST',{ action:'createCity', city: name });
  state.cities.push(name); renderTabs(); loadCity(name);
}

/* ---------- map init ---------- */
function initMap(){
  state.map = L.map('map',{center:[35.68,139.76],zoom:5});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'' }).addTo(state.map);
}

/* ---------- start ---------- */
init();
