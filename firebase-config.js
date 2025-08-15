// firebase-config.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBH28orqC8xYjRInuIPOSfnEsm3m8OM62k",
  authDomain: "mechanic-7833c.firebaseapp.com",
  projectId: "mechanic-7833c",
  storageBucket: "mechanic-7833c.appspot.com",
  messagingSenderId: "143335857545",
  appId: "1:143335857545:web:277292ba9631f1e1ad5558",
  measurementId: "G-3RMQYMJLQR"
};

//initialize once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);


// Export for use in other files
window.auth = auth;
window.db = db;
window.app = app;
