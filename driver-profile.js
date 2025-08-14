
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBH28orqC8xYjRInuIPOSfnEsm3m8OM62k",
  authDomain: "mechanic-7833c.firebaseapp.com",
  projectId: "mechanic-7833c",
  storageBucket: "mechanic-7833c.appspot.com",
  messagingSenderId: "143335857545",
  appId: "1:143335857545:web:277292ba9631f1e1ad5558",
  measurementId: "G-3RMQYMJLQR"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
  
    try {
      const userSnap = await getDoc(doc(db, "drivers", user.uid));
      if (!userSnap.exists()) {
        alert("Driver profile data not found.");
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }
  
      currentUser = { uid: user.uid, ...userSnap.data() };
      populateProfileData(currentUser);
      loadServiceHistory();
    } catch (error) {
      console.error("Profile load error:", error);
      window.location.href = "index.html";
    }
  });
  
  document.getElementById("personalInfoForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const formData = {
        name: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        updatedAt: new Date()
      };

      await setDoc(doc(db, "drivers", currentUser.uid), formData, { merge: true });

      document.getElementById("profileName").textContent = formData.name;
      document.getElementById("profileEmail").textContent = formData.email;

      alert("Personal info updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update personal info.");
    }
  });

  document.getElementById("vehicleInfoForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const vehicleInfo = {
        make: document.getElementById("vehicleMake").value,
        model: document.getElementById("vehicleModel").value,
        year: parseInt(document.getElementById("vehicleYear").value),
        licensePlate: document.getElementById("licensePlate").value
      };

      await setDoc(doc(db, "drivers", currentUser.uid), { vehicleInfo }, { merge: true });

      alert("Vehicle info updated successfully!");
    } catch (error) {
      console.error("Vehicle update error:", error);
      alert("Failed to update vehicle info.");
    }
  });
});

async function populateProfileData(data) {
  document.getElementById("profileName").textContent = data.name || "";
  document.getElementById("profileEmail").textContent = data.email || "";

  document.getElementById("fullName").value = data.name || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("phone").value = data.phone || "";

  if (data.vehicleInfo) {
    document.getElementById("vehicleMake").value = data.vehicleInfo.make || "";
    document.getElementById("vehicleModel").value = data.vehicleInfo.model || "";
    document.getElementById("vehicleYear").value = data.vehicleInfo.year || "";
    document.getElementById("licensePlate").value = data.vehicleInfo.licensePlate || "";
  }
}

async function loadServiceHistory() {
  const container = document.getElementById("serviceHistory");
  if (!container || !currentUser) return;

  try {
    const q = query(collection(db, "serviceHistory"), where("driverId", "==", currentUser.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <h3>No Service History</h3>
          <p>You haven't requested any services yet.</p>
          <a href="request-service.html" class="btn btn-primary">Request Service</a>
        </div>
      `;
    } else {
      container.innerHTML = "";
      snapshot.forEach(doc => {
        const record = doc.data();
        const item = document.createElement("div");
        item.className = "service-record";
        item.innerHTML = `
          <div><strong>Date:</strong> ${record.date || "Unknown"}</div>
          <div><strong>Mechanic:</strong> ${record.mechanicName || "N/A"}</div>
          <div><strong>Service:</strong> ${record.serviceType || "N/A"}</div>
        `;
        container.appendChild(item);
      });
    }
  } catch (error) {
    console.error("Error loading service history:", error);
    container.innerHTML = `<div class="error">Error loading service history. Check your Firestore rules.</div>`;
  }
}
