
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";


import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"; 


import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyB3M2YkW2uPL2f6y6B_IA0yotniG7ySBqM",
  authDomain: "mech-4192d.firebaseapp.com",
  projectId: "mech-4192d",
  storageBucket: "mech-4192d.firebasestorage.app",
  messagingSenderId: "229385789697",
  appId: "1:229385789697:web:308d4fae1d3404c2a83b00",
  measurementId: "G-Z84RVWH2N6"
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
class AuthManager {
  constructor() {
    this.currentUser = null;
  }

  
  async loadUserData() {
    
      const user = auth.currentUser;
      if (!user) {
        this.currentUser = null;
        return null;
      }
    
      
      let docRef = doc(db, "drivers", user.uid);
      let docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        this.currentUser = { uid: user.uid, ...docSnap.data(), role: "driver" };
        return this.currentUser;
      }
    
      
      docRef = doc(db, "mechanics", user.uid);
      docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        this.currentUser = { uid: user.uid, ...docSnap.data(), role: "mechanic" };
        return this.currentUser;
      }
    
      this.currentUser = { uid: user.uid, email: user.email, role: "unknown" };
      return this.currentUser;
    }
    

  async signUp(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userRole = userData.role;

      let collectionPath;
      let profileData = {
        name: userData.name,
        phone: userData.phone,
        email: user.email,
        createdAt: serverTimestamp(),
        role: userRole
      };

      if (userRole === "driver") {
        collectionPath = "drivers";
      } else if (userRole === "mechanic") {
        collectionPath = "mechanics";
        profileData.available = true;
      } else {
        throw new Error("Invalid user role provided.");
      }

      await setDoc(doc(db, collectionPath, user.uid), profileData);

      this.currentUser = { uid: user.uid, ...profileData, role: userRole };
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await this.loadUserData(); 
      // Check for target dashboard in sessionStorage
      const targetDashboard = sessionStorage.getItem('targetDashboard');
      if (targetDashboard) {
        this.redirectToDashboard(targetDashboard);
        sessionStorage.removeItem('targetDashboard'); // Clear the target after redirect
      } else {
        return { success: true, user: this.currentUser  };
      }
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await firebaseSignOut(auth);
      this.currentUser = null;
      window.location.href = "index.html";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  redirectToDashboard(role) {
    switch (role) {
      case "driver":
        window.location.href = "driver-dashboard.html";
        break;
      case "mechanic":
        window.location.href = "mechanic-dashboard.html";
        break;
      default:
        window.location.href = "login.html"; // fallback to login for unknown roles
    }
  }
}  

export const authManager = new AuthManager();
