// Import Firebase
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { authManager } from "./auth.js"; //  Now using authManager directly

const auth = getAuth();
const db = getFirestore();

let currentUser  = null;
let requestsMap = null;
let userLocationMarker = null;
let requestMarkers = [];
let isAvailable = true;

// Utility: Redirect helper
function redirectTo(url) {
  console.log('[Redirect] Navigating to:', url);
  window.location.href = url;
}
// map initialization
function initializeMap() {
    const mapContainer = document.getElementById('requestsMap');
    
    if (!mapContainer) {
      console.error('Map container element not found!');
      return;
    }
  
    // Leaflet is loaded
    if (!window.L || !window.L.map) {
      console.error('Leaflet map library not loaded!');
      return;
    }
  
    try {
      requestsMap = L.map('requestsMap', {
        center: [51.505, -0.09], // Default center
        zoom: 12
      });
  
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(requestsMap);
  
      console.log('Map initialized successfully');
      
      // Now try to get and update location
      updateLocation();
  
    } catch (error) {
      console.error('Map initialization failed:', error);
    }
  }
  
  // location handling
  async function updateLocation() {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }
  
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
  
      const { latitude, longitude } = position.coords;
      window.geoService.currentLocation = { latitude, longitude };
  
      if (requestsMap) {
        if (userLocationMarker) {
          // Update existing marker
          userLocationMarker.setLatLng([latitude, longitude]);
        } else {
          // Create new marker
          userLocationMarker = L.marker([latitude, longitude], {
            title: 'Your Location'
          }).addTo(requestsMap)
          .bindPopup('Your current location');
        }
        
        requestsMap.setView([latitude, longitude], 13);
      }
  
    } catch (error) {
      console.error('Error getting location:', error);
      // Fallback to default location if user denies permission
      if (requestsMap) {
        requestsMap.setView([51.505, -0.09], 10); // Default London coordinates
      }
    }
  }
  

function updateMapLocation(location) {
  if (userLocationMarker) {
    // Update the existing marker's position instead of removing and adding a new one
    userLocationMarker.setLatLng([location.latitude, location.longitude]);
    window.geoService.centerMapOnLocation(requestsMap, location);
  } else {
    // Create a new marker if it doesn't exist
    userLocationMarker = window.geoService.addUserLocationMarker(requestsMap, location, {
      popup: 'Your Location (Mechanic)'
    });
  }
}

function setupAvailabilityToggle() {
  const toggle = document.getElementById('availabilityToggle');
  const text = document.getElementById('availabilityText');
  if (toggle && text) {
    toggle.addEventListener('change', async (e) => {
      isAvailable = e.target.checked;
      text.textContent = isAvailable ? 'Available' : 'Unavailable';
      console.log('[Availability] Toggled to:', text.textContent);

      if (isAvailable) {
        await loadIncomingRequests();
      } else {
        clearRequestMarkers();
        const container = document.getElementById('incomingRequests');
        if (container) container.innerHTML = '<div class="empty-state">You are currently unavailable</div>';
        const pendingElement = document.getElementById('pendingRequests');
        if (pendingElement) pendingElement.textContent = '0';
      }
    });
  }
}

function clearRequestMarkers() {
    requestMarkers.forEach(marker => {
      if (marker && marker.remove) {
        marker.remove();
      }
    });
  requestMarkers = [];
}

async function loadIncomingRequests() {
  const container = document.getElementById('incomingRequests');
  if (!container || !currentUser  || !window.geoService.currentLocation || !isAvailable) {
    if (container) container.innerHTML = '<div class="empty-state">No incoming requests</div>';
    return;
  }

  try {
    console.log('[Requests] Loading incoming requests...');
    const q = query(collection(db, "serviceRequests"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    const requests = [];

    querySnapshot.forEach(doc => {
      const request = doc.data();
      request.id = doc.id;

      request.distance = window.geoService.calculateDistance(
        window.geoService.currentLocation.latitude,
        window.geoService.currentLocation.longitude,
        request.location.latitude,
        request.location.longitude
      );

      if (request.distance <= (currentUser .serviceRadius || 10)) {
        requests.push(request);
      }
    });

    if (requests.length > 0) {
      displayRequestsList(requests, container, 'incoming');
      updateRequestsMap(requests);
      const pendingElement = document.getElementById('pendingRequests');
      if (pendingElement) pendingElement.textContent = requests.length.toString();
    } else {
      container.innerHTML = '<div class="empty-state">No incoming requests</div>';
      clearRequestMarkers();
      const pendingElement = document.getElementById('pendingRequests');
      if (pendingElement) pendingElement.textContent = '0';
    }
  } catch (error) {
    console.error('[Requests] Error loading incoming requests:', error);
    if (container) container.innerHTML = '<div class="error">Error loading requests</div>';
  }
}

async function loadActiveJobs() {
  const container = document.getElementById('activeJobsList');
  if (!container || !currentUser ) return;

  try {
    console.log('[Jobs] Loading active jobs...');
    const q = query(
      collection(db, "serviceRequests"),
      where("mechanicId", "==", currentUser .uid),
      where("status", "in", ["accepted", "in-progress"])
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-tools"></i>
          <h3>No Active Jobs</h3>
          <p>You don't have any active jobs at the moment</p>
        </div>
      `;
    } else {
      let html = '<ul class="job-list">';
      querySnapshot.forEach(doc => {
        const job = doc.data();
        html += `<li><strong>${job.issueCategory}</strong> - Status: ${job.status}</li>`;
      });
      html += '</ul>';
      container.innerHTML = html;
    }
  } catch (error) {
    console.error('[Jobs] Error loading active jobs:', error);
    container.innerHTML = '<div class="error">Error loading jobs</div>';
  }
}
// In mechanic-dashboard.js, modify the acceptRequest function:
window.acceptRequest = async function(requestId) {
    try {
        const requestRef = doc(db, "serviceRequests", requestId);
        await updateDoc(requestRef, {
            status: "accepted",
            mechanicId: currentUser.uid,
            acceptedAt: new Date()
        });
        
        // Start sharing mechanic location
        startSharingLocation(requestId);
        
        alert('Request accepted! You can now see the driver location.');
        
    } catch (error) {
        console.error('Error accepting request:', error);
        alert('Error accepting request. Please try again.');
    }
};

function startSharingLocation(requestId) {
    setInterval(async () => {
        const location = await window.geoService.getCurrentPosition();
        await updateDoc(doc(db, "serviceRequests", requestId), {
            mechanicLocation: location
        });
    }, 10000);
}

function displayRequestsList(requests, container, type) {
  const requestsHtml = requests.map(request => createRequestItem(request, type)).join('');
  container.innerHTML = requestsHtml;
}

function createRequestItem(request, type) {
  const urgencyClass = `urgency-${request.urgency}`;
  const timeAgo = getTimeAgo(request.createdAt ? new Date(request.createdAt.seconds * 1000) : null);

  return `
    <div class="request-item">
      <div class="request-header">
        <div class="request-info">
          <h4>${request.issueCategory || 'Unknown Issue'}</h4>
          <div class="request-meta">
            <span><i class="fas fa-user"></i> ${request.driverName || 'Unknown Driver'}</span>
            <span><i class="fas fa-car"></i> ${request.vehicleInfo?.year || 'Year'} ${request.vehicleInfo?.make || 'Make'} ${request.vehicleInfo?.model || 'Model'}</span>
            <span><i class="fas fa-map-marker-alt"></i> ${request.distance ? request.distance.toFixed(1) : '?'} miles away</span>
            <span><i class="fas fa-clock"></i> ${timeAgo}</span>
          </div>
          <div class="request-details">
            <p><strong>License Plate:</strong> ${request.vehicleInfo?.licensePlate || 'N/A'}</p>
            <p><strong>Location:</strong> ${request.location?.address || 'N/A'}</p>
          </div>
        </div>
        <div class="request-badges">
          <span class="urgency-badge ${urgencyClass}">${(request.urgency || '').toUpperCase() || 'N/A'}</span>
        </div>
      </div>
      <div class="request-actions">
        ${type === 'incoming'
          ? `
            <button class="btn btn-primary btn-sm" onclick="acceptRequest('${request.id}')">
              <i class="fas fa-check"></i> Accept
            </button>
            <button class="btn btn-outline btn-sm" onclick="viewRequestLocation('${request.id}')">
              <i class="fas fa-map-marker-alt"></i> View Location
            </button>
          `
          : `
            <button class="btn btn-primary btn-sm">
              <i class="fas fa-phone"></i> Call Driver
            </button>
            <button class="btn btn-secondary btn-sm">
              <i class="fas fa-tools"></i> Update Status
            </button>
            <button class="btn btn-success btn-sm">
              <i class="fas fa-check-circle"></i> Complete
            </button>
          `}
      </div>
    </div>
  `;
}

function updateRequestsMap(requests) {
  if (!requestsMap) return;
  clearRequestMarkers();
  requests.forEach(request => {
    const marker = window.geoService.addServiceRequestMarker(requestsMap, request);
    requestMarkers.push(marker);
  });
  const allMarkers = [...requestMarkers];
  if (userLocationMarker) allMarkers.push(userLocationMarker);
  if (allMarkers.length > 0) {
    window.geoService.fitMapToMarkers(requestsMap, allMarkers);
  }
}

function updateStats() {
  if (!currentUser ) return;
  try {
    const ratingElement = document.getElementById('rating');
    if (ratingElement) ratingElement.textContent = '4.9';
  } catch (error) {
    console.error('[Stats] Error updating stats:', error);
  }
}

window.viewRequestLocation = function (requestId) {
  console.log('[Location] View request location for ID:', requestId);
  alert(`Viewing location for request ${requestId} (implementation pending)`);
};

function getTimeAgo(date) {
  if (!date) return 'Unknown';
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Initialize when DOM loads
window.addEventListener("DOMContentLoaded", async () => {
    const data = await window.authManager?.loadUserData?.();
    if (data?.role === "mechanic") {
      currentUser  = data;
      window.updateUserInfo?.(data);
      initializeMap(); // Initialize the map here
      setupAvailabilityToggle(); // Set up the availability toggle
      await loadActiveJobs(); // Load active jobs on initialization
    } else {
      console.warn("User  is not a mechanic or not logged in.");
    }
});
