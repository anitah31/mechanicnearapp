
import "./firebase-config.js";

let currentUser = null;
let dashboardMap = null;
let miniMap = null;

let userLocationMarkerMini = null;        
let userLocationMarkerDashboard = null;   
let mechanicMarkers = [];


async function initializeDashboard() {
  try {
    initializeMaps();           
    await updateLocation();     
    await loadActiveRequests(); 
    await loadNearbyMechanics(); 
  } catch (error) {
    console.error("Dashboard initialization error:", error);
  }
}


async function updateLocation() {
  try {
    const options = {
      timeout: 10000, // Set timeout to 10 seconds
    };
    const location = await window.geoService.getCurrentPosition(options);
    console.log("Got user location:", location);
    updateLocationDisplay(location);
    updateMapLocation(location);
  } catch (error) {
    console.error("Location update error:", error);
    const locationText = document.getElementById("locationText");
    if (locationText) locationText.textContent = "Location unavailable";
  }
}


function updateLocationDisplay(location) {
  const locationText = document.getElementById("locationText");
  if (locationText) {
    locationText.textContent = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }
}


function initializeMaps() {
  miniMap = window.geoService.initializeMap("miniMap", {
    zoom: 15,
    zoomControl: false,
    scrollWheelZoom: false,
  });
  dashboardMap = window.geoService.initializeMap("mechanicsMap", {
    zoom: 13,
  });
}

/**
 * Updates the user location markers on both maps and centers maps on location
 * @param {Object} location - {latitude, longitude}
 */
function updateMapLocation(location) {
  if (userLocationMarkerMini) userLocationMarkerMini.remove();
  if (userLocationMarkerDashboard) userLocationMarkerDashboard.remove();

  if (miniMap) {
    window.geoService.centerMapOnLocation(miniMap, location);
    userLocationMarkerMini = window.geoService.addUserLocationMarker(miniMap, location);
  }

  if (dashboardMap) {
    window.geoService.centerMapOnLocation(dashboardMap, location);
    userLocationMarkerDashboard = window.geoService.addUserLocationMarker(dashboardMap, location);
  }
}


async function loadActiveRequests() {
  const container = document.getElementById("activeRequests");
  if (!container || !currentUser) return;

  try {
      const q = query(
          collection(window.db, "serviceRequests"),
          where("driverId", "==", currentUser.uid),
          where("status", "in", ["accepted", "enroute"])
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
          container.innerHTML = `
              <div class="empty-state">
                  <i class="fas fa-clock"></i>
                  <h3>No Active Requests</h3>
                  <p>You don't have any ongoing service requests</p>
                  <a href="request-service.html" class="btn btn-primary">Request Service</a>
              </div>
          `;
      } else {
          const requests = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          
          // Create tracking UI for each active request
          container.innerHTML = requests.map(request => `
              <div class="request-card">
                  <h4>${request.issueCategory}</h4>
                  <p>Status: ${request.status}</p>
                  <div id="trackingMap-${request.id}" style="height: 300px;"></div>
                  ${request.status === 'enroute' ? 
                      '<p class="tracking-notice">Mechanic is en route to your location</p>' : 
                      '<p class="tracking-notice">Mechanic has accepted your request</p>'}
              </div>
          `).join('');
          
          // Initialize tracking maps
          requests.forEach(request => {
              if (request.mechanicId) {
                  setupRequestTracking(request.id);
              }
          });
      }
  } catch (error) {
      console.error("Error loading active requests:", error);
      container.innerHTML = '<div class="error">Error loading requests</div>';
  }
}

function setupRequestTracking(requestId) {
  const mapElement = document.getElementById(`trackingMap-${requestId}`);
  if (!mapElement) return;
  
  const trackingMap = L.map(`trackingMap-${requestId}`);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(trackingMap);
  
  const requestRef = doc(window.db, "serviceRequests", requestId);
  
  onSnapshot(requestRef, (doc) => {
      const request = doc.data();
      
      // Clear existing markers
      trackingMap.eachLayer(layer => {
          if (layer instanceof L.Marker) {
              trackingMap.removeLayer(layer);
          }
      });
      
      // Add driver marker
      if (request.location) {
          L.marker(
              [request.location.latitude, request.location.longitude],
              { icon: driverIcon }
          ).addTo(trackingMap).bindPopup("Your Location");
      }
      
      // Add mechanic marker
      if (request.mechanicLocation) {
          L.marker(
              [request.mechanicLocation.latitude, request.mechanicLocation.longitude],
              { icon: mechanicIcon }
          ).addTo(trackingMap).bindPopup("Mechanic Location");
      }
      
      // Fit map to show both markers
      if (request.location && request.mechanicLocation) {
          trackingMap.fitBounds([
              [request.location.latitude, request.location.longitude],
              [request.mechanicLocation.latitude, request.mechanicLocation.longitude]
          ]);
      }
  });
}

async function loadNearbyMechanics() {
  const container = document.getElementById("nearbyMechanics");
  if (!container || !window.geoService.currentLocation) return;

  try {
    const mechanicsRef = collection(window.db, "mechanics");
    const mechanicsSnapshot = await getDocs(mechanicsRef);

    const mechanics = [];
    mechanicsSnapshot.forEach((doc) => {
      const mechanic = doc.data();
      mechanic.id = doc.id;

      // Filter location data presence
      if (!mechanic.location || !mechanic.location.latitude || !mechanic.location.longitude) return;

      mechanic.distance = window.geoService.calculateDistance(
        window.geoService.currentLocation.latitude,
        window.geoService.currentLocation.longitude,
        mechanic.location.latitude,
        mechanic.location.longitude
      );
      if (mechanic.distance <= 10) mechanics.push(mechanic);
    });

    if (mechanics.length > 0) {
      displayMechanicsList(mechanics);
      updateMechanicsMap(mechanics);
    } else {
      container.innerHTML = '<div class="empty-state">No nearby mechanics found</div>';
    }
  } catch (error) {
    console.error("Error loading nearby mechanics:", error);
    container.innerHTML = '<div class="error">Error loading mechanics</div>';
  }
}


function displayMechanicsList(mechanics) {
  const container = document.getElementById("nearbyMechanics");
  container.innerHTML = mechanics.map(createMechanicCard).join("");
}


function createMechanicCard(mechanic) {
  const stars = "★".repeat(Math.floor(mechanic.rating || 0));
  const specialties = (mechanic.specialties || [])
    .slice(0, 3)
    .map((s) => `<span class="specialty-tag">${s}</span>`)
    .join("");

  return `
    <div class="mechanic-card">
      <div class="mechanic-header">
        <div class="mechanic-info">
          <h4>${mechanic.name}</h4>
          <div class="mechanic-rating">
            <span class="stars">${stars}</span>
            <span>${mechanic.rating || 0}</span>
            <span class="distance">${mechanic.distance.toFixed(1)} miles</span>
          </div>
          <div class="specialties">${specialties}</div>
        </div>
        <div class="mechanic-actions">
          <a href="mechanic-detail.html?id=${mechanic.id}" class="btn btn-outline btn-sm">View Details</a>
          <a href="tel:${mechanic.phone}" class="btn btn-primary btn-sm">
            <i class="fas fa-phone"></i> Call
          </a>
        </div>
      </div>
    </div>
  `;
}


function updateMechanicsMap(mechanics) {
  if (!dashboardMap) return;

  // Remove existing mechanic markers from the map
  mechanicMarkers.forEach((marker) => marker.remove());

  // Add new markers for each mechanic
  mechanicMarkers = mechanics.map((mech) => window.geoService.addMechanicMarker(dashboardMap, mech));

  // Include user location marker in bounds
  const allMarkers = [...mechanicMarkers];
  if (userLocationMarkerDashboard) allMarkers.push(userLocationMarkerDashboard);

  if (allMarkers.length) {
    window.geoService.fitMapToMarkers(dashboardMap, allMarkers);
  }
}


document.getElementById("updateLocationBtn")?.addEventListener("click", updateLocation);

// Initialize when DOM loads
window.addEventListener("DOMContentLoaded", async () => {
  const data = await window.authManager?.loadUserData?.();
  if (data?.role === "driver") {
    currentUser = data;
    window.updateUserInfo?.(data);
    initializeDashboard();
  } else {
    console.warn("User is not a driver or not logged in.");
  }
});
