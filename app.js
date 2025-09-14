document.addEventListener('DOMContentLoaded', () => {

    // --- PASTE YOUR FIREBASE CONFIG KEYS HERE ---
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    // --- APP INITIALIZATION ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // --- GLOBAL VARIABLES & CONFIGURATION ---
    let userLocation = null;
    let map = null;
    const markers = {}; // To keep track of markers by doc ID

    const resourceTypes = {
        "Food Drive": { "color": "#f94144" },
        "Water Spigot": { "color": "#4cc9f0" },
        "Electrical Outlet": { "color": "#4361ee" },
        "Shower": { "color": "#7209b7" },
        "Camping Area": { "color": "#f7b20e" },
        "WiFi Hotspot": { "color": "#4895ef" },
        "Donation Center": { "color": "#3a0ca3" },
        "Charity Event": { "color": "#b5179e" },
        "Homeless Assistance": { "color": "#f07167" },
        "Yard/Garage Sale": { "color": "#00a896" },
        "Storage Auction": { "color": "#f15946" }
    };

    // --- GET UI ELEMENTS ---
    const formModal = document.getElementById('form-modal');
    const resourceForm = document.getElementById('resource-form');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- MAP INITIALIZATION ---
    function initMap() {
        map = L.map('map', { zoomControl: false }).setView([26.72, -81.89], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        // Geolocation on load
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            });
        }
    }

    // --- FIREBASE AUTHENTICATION ---
    auth.signInAnonymously().catch((error) => {
        console.error("Error signing in anonymously", error);
    });

    // --- DATABASE FUNCTIONS ---
    function addLocation(lat, lng, name, type, description, operatingHours, accessibilityNotes) {
        if (!auth.currentUser) {
            alert("Authentication not ready. Please try again in a moment.");
            return Promise.reject("Authentication not ready");
        }
        return db.collection("locations").add({
            lat: lat,
            lng: lng,
            name: name,
            type: type,
            description: description,
            operatingHours: operatingHours,
            accessibilityNotes: accessibilityNotes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastVerified: firebase.firestore.FieldValue.serverTimestamp() // Initial verification timestamp
        });
    }

    function updateLastVerified(docId) {
        return db.collection("locations").doc(docId).update({
            lastVerified: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // --- REAL-TIME DATABASE LISTENER ---
    db.collection("locations").onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const location = change.doc.data();
                const docId = change.doc.id;
                addMarkerToMap(location, docId);
            }
        });
    });

    function addMarkerToMap(location, docId) {
        // Remove existing marker if it's been updated
        if (markers[docId]) {
            map.removeLayer(markers[docId]);
        }

        const lastVerifiedDate = location.lastVerified ? new Date(location.lastVerified.seconds * 1000).toLocaleDateString() : 'Never';
        const popupContent = `
            <h4>${location.name || location.type}</h4>
            <b>Type:</b> ${location.type}<br>
            <b>Description:</b> ${location.description}<br>
            <b>Operating Hours:</b> ${location.operatingHours || 'N/A'}<br>
            <b>Accessibility:</b> ${location.accessibilityNotes || 'N/A'}<br>
            <hr>
            <small>Last Verified: ${lastVerifiedDate}</small><br>
            <button class="verify-btn" data-id="${docId}">I was here today</button>
        `;

        const marker = L.marker([location.lat, location.lng]).addTo(map)
            .bindPopup(popupContent);

        markers[docId] = marker;
    }

    // Listen for clicks on the verify button within popups
    document.getElementById('map').addEventListener('click', (e) => {
        if (e.target.classList.contains('verify-btn')) {
            const docId = e.target.getAttribute('data-id');
            updateLastVerified(docId)
                .then(() => {
                    showToast('Thank you for verifying!', 'success');
                })
                .catch(err => {
                    showToast('Failed to verify. Please try again.', 'error');
                    console.error(err);
                });
        }
    });

    // --- UI EVENT LISTENERS ---
    document.getElementById('add-resource-btn').addEventListener('click', () => {
        formModal.style.display = 'block';
    });
    
    document.getElementById('current-location-btn').addEventListener('click', () => {
        if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 15);
            showToast('Moved to your current location.', 'success');
        } else {
            showToast('Could not determine your location.', 'error');
        }
    });

    document.querySelectorAll('.cancel-btn, .close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            formModal.style.display = 'none';
        });
    });

    resourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const resourceName = document.getElementById('resource-name').value;
        const type = document.getElementById('type').value;
        const description = document.getElementById('description').value;
        const operatingHours = document.getElementById('operating-hours').value;
        const accessibility = document.getElementById('accessibility').value;

        const mapCenter = map.getCenter();
        
        addLocation(mapCenter.lat, mapCenter.lng, resourceName, type, description, operatingHours, accessibility)
            .then(() => {
                showToast('Resource added successfully!', 'success');
                resourceForm.reset();
                formModal.style.display = 'none';
            })
            .catch(err => {
                showToast('Failed to add resource. Please try again.', 'error');
                console.error(err);
            });
    });
    
    // --- TOAST NOTIFICATION FUNCTION ---
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
    
    // --- INITIALIZE APP ---
    initMap();
});