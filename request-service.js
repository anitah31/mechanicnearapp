// Import Firebase functions
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

// Globals
let currentUser = null;
let locationMap = null;
let mechanicsMap = null;
let selectedLocation = null;
let locationMarker = null;
let mechanicMarkers = [];

window.authManager = {
  loadUserData: () => {
    return new Promise((resolve) => {
      console.log('[AuthManager] Loading user data...');
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (user) {
          try {
            const userDocRef = doc(db, 'drivers', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              userData.uid = user.uid;
              resolve(userData);
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('Error loading user:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }
};

async function checkUserAndInit() {
  try {
    const userData = await window.authManager.loadUserData();
    currentUser = userData;

    if (userData) {
      if (typeof window.updateUserInfo === 'function') {
        window.updateUserInfo(userData);
      }

      // Update vehicle info if available
      if (userData.vehicleInfo) {
        const vehicleMake = document.getElementById('vehicleMake');
        const vehicleModel = document.getElementById('vehicleModel');
        const vehicleYear = document.getElementById('vehicleYear');
        const licensePlate = document.getElementById('licensePlate');
        if (vehicleMake) vehicleMake.value = userData.vehicleInfo.make || '';
        if (vehicleModel) vehicleModel.value = userData.vehicleInfo.model || '';
        if (vehicleYear) vehicleYear.value = userData.vehicleInfo.year || '';
        if (licensePlate) licensePlate.value = userData.vehicleInfo.licensePlate || '';
      }

      // Show content
      document.body.style.visibility = 'visible';
      initializePage();
    } else {
      document.body.style.visibility = 'visible';
    }
  } catch (error) {
    console.error('Initialization error:', error);
    document.body.style.visibility = 'visible';
  }
}

function initializePage() {
  try {
    initializeLocationMap();
    setupEventListeners();
    getCurrentLocation();
  } catch (error) {
    console.error('Page initialization error:', error);
  }
}

function redirectTo(url) {
  console.log(`Redirecting to: ${url}`);
  window.location.href = url;
}

function initializeLocationMap() {
  const mapContainer = document.getElementById('locationMap');
  if (mapContainer && window.geoService) {
    console.log('[Map] Initializing location map');
    locationMap = window.geoService.initializeMap('locationMap', { zoom: 13 });

    locationMap.on('click', (e) => {
      selectLocationOnMap(e.latlng);
    });
  } else {
    console.warn('[Map] #locationMap element or geoService not found');
  }
}

function setupEventListeners() {
  console.log('[Events] Adding event listeners');
  document.getElementById('getCurrentLocation')?.addEventListener('click', getCurrentLocation);
  document.getElementById('selectOnMap')?.addEventListener('click', () => {
    document.querySelector('.map-section').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('serviceRequestForm')?.addEventListener('submit', handleServiceRequest);
  document.getElementById('manualAddress')?.addEventListener('input', handleAddressInput);
}

async function getCurrentLocation() {
  const button = document.getElementById('getCurrentLocation');
  const locationDisplay = document.getElementById('locationDisplay');
  try {
    if (button) {
      button.textContent = 'Getting location...';
      button.disabled = true;
    }
    const options = {
      timeout: 10000, // Set timeout to 10 seconds
    };
    const location = await window.geoService.getCurrentPosition();
    selectedLocation = location;
    const address = await window.geoService.reverseGeocode(location.latitude, location.longitude);
    updateLocationDisplay(address);
    
    if (locationMap) {
      window.geoService.centerMapOnLocation(locationMap, location);
      addLocationMarker(location);
      locationMap.invalidateSize();
    }
  } catch (error) {
    console.error('Error getting location:', error);
    if (locationDisplay) {
      locationDisplay.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Unable to get location. Please select on map or enter address manually.</span>`;
    }
  } finally {
    if (button) {
      button.textContent = 'Use Current Location';
      button.disabled = false;
    }
  }
}

function selectLocationOnMap(latlng) {
  console.log('[Map] Selecting location on map:', latlng);
  selectedLocation = { latitude: latlng.lat, longitude: latlng.lng };
  window.geoService.reverseGeocode(latlng.lat, latlng.lng)
    .then(address => updateLocationDisplay(address))
    .catch(err => console.error('[Map] Reverse geocode failed:', err));
  addLocationMarker(selectedLocation);
  if(locationMap) locationMap.invalidateSize();
}

function addLocationMarker(location) {
  if (locationMarker) locationMarker.remove();
  locationMarker = window.geoService.addUserLocationMarker(locationMap, location, { popup: 'Selected service location' });
}

function updateLocationDisplay(address) {
  const locationDisplay = document.getElementById('locationDisplay');
  if(locationDisplay) {
    locationDisplay.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>${address}</span>`;
  }
}

async function handleAddressInput(e) {
  const address = e.target.value;
  if (address.length < 5) return;
  try {
    const result = await window.geoService.geocodeAddress(address);
    if (result) {
      selectedLocation = result;
      updateLocationDisplay(result.address);
      if(locationMap) {
        window.geoService.centerMapOnLocation(locationMap, result);
        addLocationMarker(result);
        locationMap.invalidateSize();
      }
    }
  } catch (error) {
    console.error('[Address Input] Geocoding error:', error);
  }
}

// In request-service.js, modify the handleServiceRequest function:
async function handleServiceRequest(e) {
    e.preventDefault();
    
    if (!selectedLocation) {
      alert('Please select a location for the service request');
      return;
    }
    
    try {
      const serviceRequest = {
        driverId: currentUser.uid,
        driverName: currentUser.name || '',
        vehicleInfo: {
          make: document.getElementById('vehicleMake').value,
          model: document.getElementById('vehicleModel').value,
          year: parseInt(document.getElementById('vehicleYear').value) || null,
          licensePlate: document.getElementById('licensePlate').value
        },
        issueCategory: document.getElementById('issueCategory').value,
        issueDescription: document.getElementById('issueDescription').value,
        urgency: document.querySelector('input[name="urgency"]:checked')?.value || 'normal',
        location: selectedLocation,
        status: "pending",
        createdAt: new Date()
      };
  
      const docRef = await addDoc(collection(db, "serviceRequests"), serviceRequest);
      
      // Redirect to mechanic selection
      window.location.href = `mechanic-detail.html?requestId=${docRef.id}`;
      
    } catch (error) {
      console.error('Error creating service request:', error);
      alert('Error creating service request. Please try again.');
    }
  }

async function findNearbyMechanics() {
  try {
    console.log('[Mechanics] Finding nearby mechanics...');
    const mechanicsRef = collection(db, "mechanics");
    const mechanicsSnapshot = await getDocs(mechanicsRef);


    const mechanics = [];
    mechanicsSnapshot.forEach(doc => {
      const mechanic = doc.data();
      mechanic.id = doc.id;


      mechanic.distance = window.geoService.calculateDistance(
        selectedLocation.latitude,
        selectedLocation.longitude,
        mechanic.location.latitude,
        mechanic.location.longitude
      );


      if (mechanic.distance <= mechanic.serviceRadius) {
        mechanics.push(mechanic);
      }
    });


    if (mechanics.length > 0) {
      showAvailableMechanics(mechanics);
    } else {
      alert('No mechanics available in your area');
    }
  } catch (error) {
    console.error('[Mechanics] Error finding nearby mechanics:', error);
    alert('Error finding mechanics. Please try again.');
  }
}


function showAvailableMechanics(mechanics) {
  console.log('[Mechanics] Showing available mechanics:', mechanics);
  const container = document.getElementById('availableMechanics');
  if (container) container.style.display = 'block';


  if (!mechanicsMap) {
    mechanicsMap = window.geoService.initializeMap('mechanicsMap', { zoom: 12 });
  }


  mechanicMarkers.forEach(marker => marker.remove());
  mechanicMarkers = [];


  const requestMarker = window.geoService.addUserLocationMarker(mechanicsMap, selectedLocation, { popup: 'Service Request Location' });
  mechanicMarkers.push(requestMarker);


  mechanics.forEach(mechanic => {
    const marker = window.geoService.addMechanicMarker(mechanicsMap, mechanic);
    mechanicMarkers.push(marker);
  });


  window.geoService.fitMapToMarkers(mechanicsMap, mechanicMarkers);

  if (mechanicsMap) mechanicsMap.invalidateSize();

  displayMechanicsList(mechanics);
}


function displayMechanicsList(mechanics) {
  const container = document.getElementById('mechanicsList');
  if (!container) return;


  const mechanicsHtml = mechanics.map(mechanic => createMechanicCard(mechanic)).join('');
  container.innerHTML = mechanicsHtml;
}


function createMechanicCard(mechanic) {
  const stars = '★'.repeat(Math.floor(mechanic.rating || 0));
  const specialties = (mechanic.specialties || []).slice(0, 3)
    .map(s => `<span class="specialty-tag">${s}</span>`)
    .join('');


  return `
    <div class="mechanic-card">
      <div class="mechanic-header">
        <div class="mechanic-info">
          <h4>${mechanic.name}</h4>
          <div class="mechanic-rating">
            <span class="stars">${stars}</span>
            <span>${(mechanic.rating || 0).toFixed(1)}</span>
            <span class="distance">${mechanic.distance.toFixed(1)} miles away</span>
          </div>
          <div class="specialties">${specialties}</div>
          <p class="experience">${mechanic.experience || 0}+ years experience</p>
        </div>
        <div class="mechanic-actions">
          <button class="btn btn-primary" onclick="selectMechanic('${mechanic.id}')">
            <i class="fas fa-check"></i> Select Mechanic
          </button>
          <a href="mechanic-detail.html?id=${mechanic.id}" class="btn btn-outline">
            <i class="fas fa-eye"></i> View Details
          </a>
          <a href="tel:${mechanic.phone}" class="btn btn-secondary">
            <i class="fas fa-phone"></i> Call Now
          </a>
        </div>
      </div>
    </div>
  `;
}


window.selectMechanic = function(mechanicId) {
  alert('Request sent to mechanic! You will be notified when they respond.');
  redirectTo('driver-dashboard.html');
};

document.addEventListener('DOMContentLoaded', () => {
    checkUserAndInit();
});
