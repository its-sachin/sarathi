// --- Firebase imports ---
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
    import { 
    getFirestore, collection, doc, getDocs, getDoc, setDoc, arrayUnion 
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