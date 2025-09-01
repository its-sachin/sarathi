// --- Firebase imports ---
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
    import { 
    getFirestore, collection, doc, getDocs, getDoc, setDoc, arrayUnion, addDoc, deleteDoc
    } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

  // --- Firebase config ---
  const firebaseConfig = {
     apiKey: "AIzaSyCV9D-Zqao4CW-BkqyPr5MAmSjlVfP3kVA",
     authDomain: "sarathi-291ca.firebaseapp.com",
     projectId: "sarathi-291ca",
     storageBucket: "sarathi-291ca.firebasestorage.app",
     messagingSenderId: "162112970584",
     appId: "1:162112970584:web:b2bf396110896a253b8f2d"
   };

  // --- Init Firestore ---
  const app = initializeApp(firebaseConfig);
  export const db = getFirestore(app);

  export async function fetchMapKey() {
    const keyDoc = await getDoc(doc(db, "key", "maptiler-key"));
    return keyDoc.exists() ? keyDoc.data().value : null;
  }

  // --- 1. Fetch all places of a city (returns CSV-like rows) ---
  export async function fetchPlacesCSV(cityId) {
    const snap = await getDocs(collection(db, "cities", cityId, "places"));
    return snap.docs.map(d => {
      const { name, lat, long, type, link } = d.data();
      return [name, lat, long, type, link]; // same as CSV row
    });
  }

  // --- 2. Fetch all contributions for a place ---
  export async function fetchPlaceContributions(cityId, placeId) {
    const placeDoc = await getDoc(doc(db, "cities", cityId, "places", placeId));
    const { link } = placeDoc.data();
    const snap = await getDocs(collection(db, "cities", cityId, "places", placeId, "contributions"));
    let content = {};
    snap.forEach(docSnap => {
      content[docSnap.id] = docSnap.data().data || [];
    });
    return { link, content };
  }

  // --- 3. Add data for a city/place/user ---
 export async function addContribution(cityId, placeId, userId, newItem) {
  try {
    const ref = doc(db, "cities", cityId, "places", placeId, "contributions", userId);
    await setDoc(ref, { data: arrayUnion(newItem) }, { merge: true });
    return { success: true, message: "✅ Contribution added successfully" };
  } catch (error) {
    console.error("❌ Error adding contribution:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Generalised Firestore CRUD for events
 */
export async function fetchEvents(cityId) {
  const snap = await getDocs(collection(db, "cities", cityId, "calendar"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addOrUpdateEvent(cityId, eventId, event) {
  if (eventId) {
    // update existing
    await setDoc(doc(db, "cities", cityId, "calendar", eventId), event);
    return { id: eventId, ...event };
  } else {
    // add new
    const ref = await addDoc(collection(db, "cities", cityId, "calendar"), event);
    return { id: ref.id, ...event };
  }
}

export async function deleteEvent(cityId, eventId) {
  await deleteDoc(doc(db, "cities", cityId, "calendar", eventId));
}


// Fetch trip info (arrival/departure)
export async function fetchTripInfo(cityId) {
  const docRef = doc(db, "cities", cityId, "tripInfo", "dates");
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

// Save trip info
export async function saveTripInfo(cityId, arrival, departure) {
  const docRef = doc(db, "cities", cityId, "tripInfo", "dates");
  await setDoc(docRef, { arrival, departure }, { merge: true });
  return { arrival, departure };
}