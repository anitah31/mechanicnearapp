// Geolocation services with Leaflet integration
class GeolocationService {
    constructor() {
        this.currentLocation = null;
        this.watchId = null;
        this.maps = new Map(); // Store multiple map instances
    }

    // Get current position
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    resolve(this.currentLocation);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    }

    // Watch position changes
    watchPosition(callback) {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported');
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                callback(this.currentLocation);
            },
            (error) => {
                console.error('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    // Stop watching position
    stopWatching() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Initialize Leaflet map
    initializeMap(containerId, options = {}) {
        const defaultOptions = {
            center: [40.7128, -74.0060], // Default to NYC
            zoom: 13,
            zoomControl: true,
            scrollWheelZoom: true
        };

        const mapOptions = { ...defaultOptions, ...options };
        
        const map = L.map(containerId, mapOptions);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Store map instance
        this.maps.set(containerId, map);
        
        return map;
    }

    // Get map instance
    getMap(containerId) {
        return this.maps.get(containerId);
    }

    // Add marker to map
    addMarker(map, lat, lng, options = {}) {
        const defaultOptions = {
            title: 'Marker',
            draggable: false
        };

        const markerOptions = { ...defaultOptions, ...options };
        
        const marker = L.marker([lat, lng], markerOptions);
        
        if (options.popup) {
            marker.bindPopup(options.popup);
        }

        marker.addTo(map);
        return marker;
    }

    // Create custom icons
    createCustomIcon(iconUrl, options = {}) {
        const defaultOptions = {
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        };

        return L.icon({
            iconUrl: iconUrl,
            ...defaultOptions,
            ...options
        });
    }

    // Add user location marker
    addUserLocationMarker(map, location, options = {}) {
        const userIcon = this.createCustomIcon('data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        `), {
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        return this.addMarker(map, location.latitude, location.longitude, {
            icon: userIcon,
            title: 'Your Location',
            popup: 'Your current location',
            ...options
        });
    }

    // Add mechanic marker
    addMechanicMarker(map, mechanic, options = {}) {
        const mechanicIcon = this.createCustomIcon('data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
        `));

        const popupContent = `
            <div class="mechanic-popup">
                <h4>${mechanic.name}</h4>
                <div class="rating">
                    <span>⭐ ${mechanic.rating}</span>
                </div>
                <p>Distance: ${mechanic.distance.toFixed(1)} miles</p>
                <button onclick="viewMechanicDetail('${mechanic.id}')" class="btn btn-primary btn-sm">View Details</button>
            </div>
        `;

        return this.addMarker(map, mechanic.location.latitude, mechanic.location.longitude, {
            icon: mechanicIcon,
            title: mechanic.name,
            popup: popupContent,
            ...options
        });
    }

    // Add service request marker
    addServiceRequestMarker(map, request, options = {}) {
        const urgencyColors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444'
        };

        const color = urgencyColors[request.urgency] || '#6b7280';
        
        const requestIcon = this.createCustomIcon('data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
            </svg>
        `));

        const popupContent = `
            <div class="request-popup">
                <h4>${request.issue}</h4>
                <div class="urgency urgency-${request.urgency}">
                    <span>${request.urgency.toUpperCase()} PRIORITY</span>
                </div>
                <p><strong>Driver:</strong> ${request.driverName}</p>
                <p><strong>Vehicle:</strong> ${request.vehicleInfo.year} ${request.vehicleInfo.make} ${request.vehicleInfo.model}</p>
                <p><strong>Distance:</strong> ${request.distance.toFixed(1)} miles</p>
                <button onclick="acceptRequest('${request.id}')" class="btn btn-primary btn-sm">Accept Request</button>
            </div>
        `;

        return this.addMarker(map, request.location.latitude, request.location.longitude, {
            icon: requestIcon,
            title: request.issue,
            popup: popupContent,
            ...options
        });
    }

    // Center map on location
    centerMapOnLocation(map, location, zoom = 15) {
        map.setView([location.latitude, location.longitude], zoom);
    }

    // Fit map to show all markers
    fitMapToMarkers(map, markers) {
        if (markers.length === 0) return;

        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }

    // Reverse geocoding (get address from coordinates)
    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            return data.display_name || 'Unknown location';
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return 'Unknown location';
        }
    }

    // Forward geocoding (get coordinates from address)
    async geocodeAddress(address) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            const data = await response.json();
            
            if (data.length > 0) {
                return {
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon),
                    address: data[0].display_name
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    // Clean up resources
    cleanup() {
        this.stopWatching();
        this.maps.forEach(map => {
            map.remove();
        });
        this.maps.clear();
    }
}

// Initialize global geolocation service
const geoService = new GeolocationService();

// Global functions for popup interactions
window.viewMechanicDetail = function(mechanicId) {
    window.location.href = `mechanic-detail.html?id=${mechanicId}`;
};

window.acceptRequest = function(requestId) {
    // This would trigger the accept request functionality
    console.log('Accepting request:', requestId);
    // Add your accept request logic here
};

// Export for global use
window.geoService = geoService;
