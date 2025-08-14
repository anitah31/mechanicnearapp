// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBH28orqC8xYjRInuIPOSfnEsm3m8OM62k",
    authDomain: "mechanic-7833c.firebaseapp.com",
    projectId: "mechanic-7833c",
    storageBucket: "mechanic-7833c.firebasestorage.app",
    messagingSenderId: "143335857545",
    appId: "1:143335857545:web:277292ba9631f1e1ad5558",
    measurementId: "G-3RMQYMJLQR"
  };
// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Mechanic Detail functionality
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let mechanicId = null;
    let mechanicData = null;
    let detailMap = null;

    // Initialize page
    async function initializePage() {
        // Get mechanic ID from URL
        mechanicId = getMechanicIdFromUrl();
        // Get requestId from URL (for tracking)
    const requestId = new URLSearchParams(window.location.search).get('requestId');

        if (!mechanicId) {
            showError('Mechanic not found');
            return;
        }

        try {
            // Load mechanic data from Firebase
            await loadMechanicData();
            
            // Initialize map
            initializeMap();

            // If there’s a requestId, set up live request tracking
        if (requestId) {
            await setupRequestTracking(requestId);
        }
            
            // Setup event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Page initialization error:', error);
            showError('Error loading mechanic details');
        }
    }

    // Get mechanic ID from URL
    function getMechanicIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Load mechanic data from Firebase
    async function loadMechanicData() {
        try {
            const docRef = doc(db, "mechanics", mechanicId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error("Mechanic not found");
            }
            
            mechanicData = docSnap.data();
            mechanicData.id = docSnap.id;
            
            // If reviews are in a separate collection
            await loadReviews();
            
            // Update UI with mechanic data
            updateMechanicInfo();

        } catch (error) {
            console.error('Error loading mechanic data:', error);
            showError('Error loading mechanic details');
        }
    }


// Add new function for tracking:
async function setupRequestTracking(requestId) {
    const requestRef = doc(db, "serviceRequests", requestId);
    
    // Add tracking map section
    const trackingSection = `
        <div class="tracking-section">
            <h3>Service Request Tracking</h3>
            <div id="trackingMap" style="height: 400px;"></div>
            <div class="tracking-actions">
                <button id="enrouteBtn" class="btn btn-primary">
                    <i class="fas fa-road"></i> En Route
                </button>
                <button id="completeBtn" class="btn btn-success">
                    <i class="fas fa-check"></i> Complete
                </button>
            </div>
        </div>
    `;
    document.querySelector('.mechanic-detail-container').insertAdjacentHTML('beforeend', trackingSection);
    
    // Initialize tracking map
    const trackingMap = L.map('trackingMap');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(trackingMap);
    
    // Set up real-time listener
    onSnapshot(requestRef, (doc) => {
        const request = doc.data();
        
        // Update map with locations
        if (request.mechanicLocation) {
            updateMechanicMarker(trackingMap, request.mechanicLocation);
        }
        if (request.location) {
            updateDriverMarker(trackingMap, request.location);
        }
        
        // Fit map to show both locations
        if (request.mechanicLocation && request.location) {
            trackingMap.fitBounds([
                [request.mechanicLocation.latitude, request.mechanicLocation.longitude],
                [request.location.latitude, request.location.longitude]
            ]);
        }
    });
    
    // Set up button handlers
    document.getElementById('enrouteBtn').addEventListener('click', () => {
        updateDoc(requestRef, {
            status: "enroute",
            enrouteAt: new Date()
        });
    });
    
    document.getElementById('completeBtn').addEventListener('click', () => {
        updateDoc(requestRef, {
            status: "completed",
            completedAt: new Date()
        });
    });
    
    // Start sharing mechanic location
    setInterval(async () => {
        const location = await window.geoService.getCurrentPosition();
        await updateDoc(requestRef, {
            mechanicLocation: location
        });
    }, 10000);
}
    // Update mechanic info in UI (same as before)
    function updateMechanicInfo() {
        // Basic info
        const mechanicName = document.getElementById('mechanicName');
        const ratingValue = document.getElementById('ratingValue');
        const reviewCount = document.getElementById('reviewCount');
        const experience = document.getElementById('experience');
        const phone = document.getElementById('phone');
        const email = document.getElementById('email');
        const responseTime = document.getElementById('responseTime');
        const bio = document.getElementById('bio');

        if (mechanicName) mechanicName.textContent = mechanicData.name || 'N/A';
        if (ratingValue) ratingValue.textContent = mechanicData.rating?.toFixed(1) || '0.0';
        if (reviewCount) reviewCount.textContent = mechanicData.reviewCount || '0';
        if (experience) experience.textContent = `${mechanicData.experience || '0'} years`;
        if (phone) phone.textContent = mechanicData.phone || 'N/A';
        if (email) email.textContent = mechanicData.email || 'N/A';
        if (responseTime) responseTime.textContent = `${mechanicData.avgResponseTime || 'N/A'} minutes avg`;
        if (bio) bio.textContent = mechanicData.bio || 'No bio available';

        // Rating stars
        updateRatingStars(mechanicData.rating || 0);

        // Availability status
        updateAvailabilityStatus(mechanicData.available || false);

        // Distance (if user location is available)
        updateDistance();

        // Specialties
        updateSpecialties(mechanicData.specialties || []);

        // Address
        updateAddress();
    }


    // Update availability status
    function updateAvailabilityStatus(available) {
        const statusElement = document.getElementById('availabilityStatus');
        if (!statusElement) return;
        
        if (available) {
            statusElement.textContent = 'Available';
            statusElement.className = 'status available';
        } else {
            statusElement.textContent = 'Unavailable';
            statusElement.className = 'status offline';
        }
    }

    // Update distance
    function updateDistance() {
        const distanceElement = document.getElementById('distance');
        if (!distanceElement) return;

        if (!window.geoService.currentLocation || !mechanicData.currentLocation) {
            distanceElement.textContent = 'Distance unavailable';
            return;
        }

        const distance = window.geoService.calculateDistance(
            window.geoService.currentLocation.latitude,
            window.geoService.currentLocation.longitude,
            mechanicData.currentLocation.latitude,
            mechanicData.currentLocation.longitude
        );

        distanceElement.textContent = `${distance.toFixed(1)} miles away`;
    }

    // Update specialties
    function updateSpecialties(specialties) {
        const container = document.getElementById('specialties');
        if (!container) return;

        const specialtiesHtml = specialties.map(specialty => 
            `<span class="specialty-tag">${specialty}</span>`
        ).join('');
        container.innerHTML = specialtiesHtml;
    }

    // Update address
    async function updateAddress() {
        const addressElement = document.getElementById('address');
        if (!addressElement) return;

        if (!mechanicData.currentLocation) {
            addressElement.textContent = 'Address not available';
            return;
        }

        try {
            const address = await window.geoService.reverseGeocode(
                mechanicData.currentLocation.latitude,
                mechanicData.currentLocation.longitude
            );
            addressElement.textContent = address;
        } catch (error) {
            console.error('Error getting address:', error);
            addressElement.textContent = 'Address not available';
        }
    }

    // Initialize map
    function initializeMap() {
        if (!mechanicData.currentLocation) return;

        const mapContainer = document.getElementById('mechanicLocationMap');
        if (mapContainer) {
            detailMap = window.geoService.initializeMap('mechanicLocationMap', {
                center: [mechanicData.currentLocation.latitude, mechanicData.currentLocation.longitude],
                zoom: 15
            });

            // Add mechanic marker
            window.geoService.addMechanicMarker(detailMap, mechanicData);

            // Add user location marker if available
            if (window.geoService.currentLocation) {
                window.geoService.addUserLocationMarker(detailMap, window.geoService.currentLocation);
            }
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Call button
        document.getElementById('callMechanic')?.addEventListener('click', () => {
            if (mechanicData.phone) {
                window.open(`tel:${mechanicData.phone}`);
            }
        });

        // Request service button
        document.getElementById('requestService')?.addEventListener('click', () => {
            if (currentUser) {
                // Redirect to request service with pre-selected mechanic
                window.location.href = `request-service.html?mechanic=${mechanicId}`;
            } else {
                alert('Please log in to request service');
            }
        });
    }

    // Show error message
    function showError(message) {
        const container = document.querySelector('.mechanic-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="history.back()" class="btn btn-primary">Go Back</button>
                </div>
            `;
        }
    }

    // Utility function to get time ago
    function getTimeAgo(date) {
        if (!date) return 'Unknown';
        
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }

    // Try to get current location for distance calculation
    window.geoService.getCurrentPosition().catch(() => {
        // Ignore errors, just won't show distance
    });

    // Initialize auth state listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                // other user properties you need
            };
            window.updateUserInfo(currentUser);
        } else {
            currentUser = null;
        }
        
        // Initialize the page after auth state is determined
        initializePage();
    });

    // Initialize analytics
    logEvent(analytics, 'mechanic_detail_page_visited');


});
