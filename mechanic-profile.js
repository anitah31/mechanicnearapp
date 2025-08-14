// mechanic-profile.js

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  updateEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBH28orqC8xYjRInuIPOSfnEsm3m8OM62k",
  authDomain: "mechanic-7833c.firebaseapp.com",
  projectId: "mechanic-7833c",
  storageBucket: "mechanic-7833c.firebasestorage.app",
  messagingSenderId: "143335857545",
  appId: "1:143335857545:web:277292ba9631f1e1ad5558",
  measurementId: "G-3RMQYMJLQR"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth; // expose auth for console debugging

document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      console.log('User logged in:', user.uid);

      try {
        await ensureMechanicProfileExists(user);
        await loadAndPopulateProfile(user.uid);
        attachFormEventListeners();
      } catch (err) {
        console.error('Error initializing mechanic profile:', err);
        if (err.code === 'permission-denied') {
          alert('Permission denied. Ensure your account has the correct role claim.');
        } else {
          alert(`Failed to load profile: ${err.message || err}`);
        }
      }
    } else {
      console.log('User not logged in, redirecting...');
      window.location.href = "index.html"; // replace with your login page URL
    }
  });

  async function ensureMechanicProfileExists(user) {
    const mechanicRef = doc(db, 'mechanics', user.uid);
    const snapshot = await getDoc(mechanicRef);
    if (!snapshot.exists()) {
      console.log('Creating mechanic profile...');
      await setDoc(mechanicRef, {
        name: user.displayName || '',
        email: user.email || '',
        createdAt: serverTimestamp(),
        rating: 4.9,
        specialties: [],
        experience: 0,
        serviceRadius: 10,
        bio: '',
        phone: ''
      });
      console.log('Mechanic profile created.');
    }
  }

  async function loadAndPopulateProfile(uid) {
    const mechanicRef = doc(db, 'mechanics', uid);
    const snapshot = await getDoc(mechanicRef);
    if (!snapshot.exists()) throw new Error('Mechanic profile not found.');

    populateProfileUI(snapshot.data());
  }

  function populateProfileUI(data) {
    if (document.getElementById('profileName'))
      document.getElementById('profileName').textContent = data.name || '';
    if (document.getElementById('profileEmail'))
      document.getElementById('profileEmail').textContent = data.email || '';
    if (document.getElementById('profileRating'))
      document.getElementById('profileRating').textContent = (data.rating ?? 4.9).toFixed(1);

    if (document.getElementById('fullName'))
      document.getElementById('fullName').value = data.name || '';
    if (document.getElementById('email'))
      document.getElementById('email').value = data.email || '';
    if (document.getElementById('phone'))
      document.getElementById('phone').value = data.phone || '';
    if (document.getElementById('bio'))
      document.getElementById('bio').value = data.bio || '';
    if (document.getElementById('experience'))
      document.getElementById('experience').value = data.experience || '';
    if (document.getElementById('serviceRadius'))
      document.getElementById('serviceRadius').value = data.serviceRadius || 10;

    const specialties = data.specialties || [];
    const checkboxes = document.querySelectorAll('.specialty-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = specialties.includes(cb.value);
    });
  }

  function attachFormEventListeners() {
    const professionalForm = document.getElementById('professionalInfoForm');
    if (professionalForm) {
      professionalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
          alert('User not logged in');
          return;
        }

        try {
          const specialties = Array.from(document.querySelectorAll('.specialty-checkboxes input[type="checkbox"]:checked')).map(cb => cb.value);
          const data = {
            experience: parseInt(document.getElementById('experience').value, 10) || 0,
            specialties,
            serviceRadius: parseInt(document.getElementById('serviceRadius').value, 10) || 10
          };

          const mechanicRef = doc(db, 'mechanics', currentUser.uid);
          await setDoc(mechanicRef, data, { merge: true });
          alert('Professional information updated successfully!');
        } catch (err) {
          console.error('Failed to update professional info:', err);
          alert('Failed to update professional information. Please try again.');
        }
      });
    }

    const personalForm = document.getElementById('personalInfoForm');
    if (personalForm) {
      personalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
          alert('User not logged in');
          return;
        }

        const newName = document.getElementById('fullName').value.trim();
        const newEmail = document.getElementById('email').value.trim();
        const newPhone = document.getElementById('phone').value.trim();
        const newBio = document.getElementById('bio').value.trim();

        try {
          if (newName !== currentUser.displayName) {
            await updateProfile(currentUser, { displayName: newName });
          }
          if (newEmail !== currentUser.email) {
            await updateEmail(currentUser, newEmail);
          }

          const mechanicRef = doc(db, 'mechanics', currentUser.uid);
          await setDoc(mechanicRef, { name: newName, email: newEmail, phone: newPhone, bio: newBio }, { merge: true });

          if (document.getElementById('profileName'))
            document.getElementById('profileName').textContent = newName;
          if (document.getElementById('profileEmail'))
            document.getElementById('profileEmail').textContent = newEmail;

          alert('Personal information updated successfully!');
        } catch (err) {
          console.error('Failed to update personal info:', err);
          if (err.code === 'auth/requires-recent-login') {
            alert('Please log out and sign back in to update your email.');
          } else {
            alert('Failed to update personal information. Please try again.');
          }
        }
      });
    }
  }
});
