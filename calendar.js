// calendar.js
import { fetchEvents, addOrUpdateEvent, deleteEvent, fetchTripInfo, saveTripInfo
} from "./firebase.js";


import { typeIcons } from "./const.js";

import { showPlace } from "./app.js";

import { Calendar } from "https://cdn.skypack.dev/@fullcalendar/core";
import timeGridPlugin from "https://cdn.skypack.dev/@fullcalendar/timegrid";
import interactionPlugin from "https://cdn.skypack.dev/@fullcalendar/interaction";


export async function initCalendar(cityId, rows) {
  const calendarEl = document.getElementById("tripCalendar");

  // --- trip info ---
  let trip = await fetchTripInfo(cityId);
  if (!trip) {
    const arrival = prompt("Enter arrival date (YYYY-MM-DD):");
    const departure = prompt("Enter departure date (YYYY-MM-DD):");
    if (!arrival || !departure) return alert("Trip dates required!");
    trip = await saveTripInfo(cityId, arrival, departure);
  }

  // --- add place selection modal ---
  const modal = document.createElement("div");
  modal.id = "tripModal";
  modal.innerHTML = `
    <div>
      <h3>Select a place</h3>
      <select id="placeSelect"></select>
      <div style="margin-top:1em;display:flex;gap:1em;justify-content:center">
        <button id="placeOk">OK</button>
        <button id="placeCancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const placeSelect = modal.querySelector("#placeSelect");
  const okBtn = modal.querySelector("#placeOk");
  const cancelBtn = modal.querySelector("#placeCancel");
  placeSelect.innerHTML = rows.map(r =>
    `<option value="${r[0]}" emoji="${typeIcons[r[3]]}">${typeIcons[r[3]]}${r[0]}</option>`
  ).join("");

  // --- event popup ---
  const popup = document.createElement("div");
  popup.id = "eventPopup";
  document.body.appendChild(popup);

  function showEventPopup(event) {
    popup.innerHTML = `
      <div>
        <h3>${event.title}</h3>
        <div id="eventButton">
          <button id="openEvent">Open</button>
          <button id="deleteEvent">Delete</button>
          <button id="closePopup">Cancel</button>
        </div>
      </div>
    `;
    popup.style.display = "block";

    popup.querySelector("#openEvent").onclick = () => {
      const placeId = event.extendedProps.value;
      if (placeId) {
        showPlace(placeId, cityId);
      }
      popup.style.display = "none";
    };
    popup.querySelector("#deleteEvent").onclick = async () => {
      if (confirm("Delete this slot?")) {
        await deleteEvent(cityId, event.id);
        event.remove();
        popup.style.display = "none";
      }
    };
    popup.querySelector("#closePopup").onclick = () => {
      popup.style.display = "none";
    };
  }

  function modelSelection(info) {
    modal.style.display = "flex";
    okBtn.onclick = async () => {
      const place = placeSelect.selectedOptions[0].getAttribute("emoji") + placeSelect.value;
      if (place) {
        const event = {
          title: place,
          start: info.dateStr,
          end: new Date(new Date(info.dateStr).getTime() + 60 * 60 * 1000).toISOString(), // 1 hr slot
          extendedProps: { value: placeSelect.value }
        };
        const saved = await addOrUpdateEvent(cityId, null, event);
        calendar.addEvent({ ...event, id: saved.id });
      }
      modal.style.display = "none";
      calendar.unselect();
    };
    cancelBtn.onclick = () => {
      modal.style.display = "none";
      calendar.unselect();
    };
  }

  async function saveChange(info){
    const updatedEvent = {
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      extendedProps: { value: info.event.extendedProps?.value }
    };
    await addOrUpdateEvent(cityId, info.event.id, updatedEvent);
  }

  // --- calendar setup ---
  const calendar = new Calendar(calendarEl, {
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridFourDay',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'today'
    },
    views: {
      timeGridFourDay: {
        type: 'timeGrid',
        duration: { days: 4 },
        buttonText: '4 day'
      }
    },
    validRange: {
      start: trip.arrival,
      end: new Date(new Date(trip.departure).getTime() + 86400000)
    },
    initialDate: trip.arrival,
    editable: true,
    selectable: true,
    slotMinTime: "06:00:00",
    slotMaxTime: "24:00:00",
    slotDuration: "01:00:00",
    longPressDelay: 300,
    eventLongPressDelay: 300,
    selectLongPressDelay: 300,
    height: "auto",
    

    dateClick: (info) => {
      modelSelection(info);
    },

    eventClick: (info) => {
      showEventPopup(info.event);
    },
    eventChange: (info) => saveChange(info),
    eventDrop: (info) => saveChange(info),
    eventResize: (info) => saveChange(info)
  });

  // --- mobile long press handling ---
  let pressTimer;
  calendarEl.addEventListener("touchstart", (e) => {
    const target = e.target.closest(".fc-event");
    if (!target) return;
    const ev = calendar.getEventById(target.getAttribute("data-event-id"));
    pressTimer = setTimeout(() => {
      // long press → drag/resize mode
    }, 600);
    target.addEventListener("touchend", () => {
      clearTimeout(pressTimer);
      if (e.changedTouches.length === 1) {
        showEventPopup(ev);
      }
    }, { once: true });
  });

  const savedEvents = await fetchEvents(cityId);
  savedEvents.forEach(e => calendar.addEvent(e));
  calendar.render();
}
