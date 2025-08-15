
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
      if (!user) {
          console.log("No user signed in. Not redirecting (per requested behavior)");
          return;
      }

      try {
          const userData = await loadUserData(user.uid);
          if (!userData) {
              console.log("No user data found. Not redirecting (per requested behavior)");
              return;
          }

          updateUserInfo(userData);
          console.log(`User role detected: ${userData.role}. Not automatically redirecting (per requested behavior)`);
          
      } catch (error) {
          console.error("Auth check error:", error);
      }
  });

  // Logout functionality remains unchanged
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
          try {
              await signOut(auth);
              window.location.href = 'index.html';
          } catch (error) {
              console.error("Logout error:", error);
          }
      });
  }
});

async function loadUserData(uid) {
  try {
      let userDoc = await getDoc(doc(db, "drivers", uid));
      if (userDoc.exists()) {
          return { ...userDoc.data(), role: "driver" };
      }

      userDoc = await getDoc(doc(db, "mechanics", uid));
      if (userDoc.exists()) {
          return { ...userDoc.data(), role: "mechanic" };
      }

      return null; // no profile found
  } catch (error) {
      console.error("Error loading user data:", error);
      return null;
  }
}

// prevent automatic redirects
function handleRoleRouting(role) {
  // Completely empty function to prevent any routing
  console.log(`Role detected: ${role}. Routing disabled per requested behavior`);
}

function isIndexPage() {
  return window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
}

function updateUserInfo(userData) {
  const userNameElements = document.querySelectorAll('#userName, #driverName, #mechanicName, #profileName');
  userNameElements.forEach(el => el.textContent = userData.name || 'User');

  const userEmailElements = document.querySelectorAll('#profileEmail');
  userEmailElements.forEach(el => el.textContent = userData.email || '');
}

// Export globally
window.updateUserInfo = updateUserInfo;
