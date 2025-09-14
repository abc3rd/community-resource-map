document.addEventListener('DOMContentLoaded', () => {

    // --- PASTE YOUR FIREBASE CONFIG KEYS HERE ---
    const firebaseConfig = {
      apiKey: "AIzaSyCL03QIQULiU64iUQWL2YCPaouEv4Yyyak",
      authDomain: "map-app-v2-90d8d.firebaseapp.com",
      projectId: "map-app-v2-90d8d",
      storageBucket: "map-app-v2-90d8d.firebasestorage.app",
      messagingSenderId: "116352941102",
      appId: "1:116352941102:web:c9eb28488ec7fdec6bf3bf"
    };

    // --- APP INITIALIZATION ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // --- GLOBAL VARIABLES & CONFIGURATION ---
    let userLocation = null;
    let map = null;
    let selectedLocation = null;
    let tempMarker = null;
    const markers = {};

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
    const typeSelect = document.getElementById('type');
    const legendContainer = document.querySelector('.legend');
    const messageCenter = document.getElementById('message-center');
    const addResourceBtn = document.getElementById('add-resource-btn');
    const currentLocationBtn = document.getElementById('current-location-btn');
    const cancelBtns = document.querySelectorAll('.cancel-btn, .close-btn');

    // --- MAP INITIALIZATION ---
    function initMap() {
        if (map) return;
        map = L.map('map', { zoomControl: false }).setView([26.72, -81.89], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            });
        }
    }

    // --- DYNAMICALLY POPULATE UI ---
    function populateUI() {
        typeSelect.innerHTML = '<option value="">--Please choose an option--</option>';
        if (legendContainer) {
            legendContainer.innerHTML = '<h3>Resource Types</h3>';
        }
        for (const type in resourceTypes) {
            const resource = resourceTypes[type];
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
            if (legendContainer) {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `<div class="legend-color" style="background-color: ${resource.color};"></div>
                    <span class="legend-label">${type}</span>`;
                legendContainer.appendChild(legendItem);
            }
        }
    }

    // --- FIREBASE AUTHENTICATION ---
    auth.signInAnonymously().catch((error) => {
        console.error("Error signing in anonymously", error);
    });

    // --- DATABASE FUNCTIONS ---
    function addLocation(lat, lng, name, type, description, operatingHours, accessibilityNotes) {
        if (!auth.currentUser) {
            showMessage("Authentication not ready. Please try again.", 'error');
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
            lastVerified: firebase.firestore.FieldValue.serverTimestamp(),
            uid: auth.currentUser.uid
        });
    }

    function updateLastVerified(docId) {
        return db.collection("locations").doc(docId).update({
            lastVerified: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    function addComment(docId, commentText, uid) {
        return db.collection("locations").doc(docId).collection("comments").add({
            text: commentText,
            uid: uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    function addRating(docId, rating, uid) {
        return db.collection("locations").doc(docId).collection("ratings").add({
            rating: rating,
            uid: uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // --- REAL-TIME DATABASE LISTENER ---
    db.collection("locations").onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                const location = change.doc.data();
                const docId = change.doc.id;
                
                if (markers[docId]) {
                    map.removeLayer(markers[docId]);
                }
                addMarkerToMap(location, docId);

                db.collection("locations").doc(docId).collection("comments").orderBy("createdAt").onSnapshot((commentsSnapshot) => {
                    const commentsHtml = commentsSnapshot.docs.map(doc => {
                        const comment = doc.data();
                        return `<div class="comment"><b>Community Member:</b> ${comment.text}</div>`;
                    }).join('');
                    
                    const popupElement = markers[docId]?.getPopup()?.getElement();
                    if (popupElement) {
                        const commentsContainer = popupElement.querySelector('.comments-container');
                        if (commentsContainer) {
                            commentsContainer.innerHTML = commentsHtml;
                        }
                    }
                });
                
                db.collection("locations").doc(docId).collection("ratings").onSnapshot((ratingsSnapshot) => {
                    const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
                    const avgRating = ratings.length ? (ratings.reduce((sum, current) => sum + current, 0) / ratings.length).toFixed(1) : 'N/A';
                    
                    const popupElement = markers[docId]?.getPopup()?.getElement();
                    if (popupElement) {
                        const ratingDisplay = popupElement.querySelector('.rating-display');
                        if (ratingDisplay) {
                            ratingDisplay.textContent = `Avg Rating: ${avgRating} / 5`;
                        }
                    }
                });
            }
        });
    });

    function addMarkerToMap(location, docId) {
        const lastVerifiedDate = location.lastVerified ? new Date(location.lastVerified.seconds * 1000).toLocaleDateString() : 'Never';
        const popupContent = `
            <h4>${location.name || location.type}</h4>
            <div class="rating-display">Avg Rating: N/A / 5</div>
            <div class="star-rating">
                <span data-rating="5">★</span><span data-rating="4">★</span><span data-rating="3">★</span><span data-rating="2">★</span><span data-rating="1">★</span>
            </div>
            <b>Type:</b> ${location.type}<br>
            <b>Description:</b> ${location.description}<br>
            <b>Operating Hours:</b> ${location.operatingHours || 'N/A'}<br>
            <b>Accessibility:</b> ${location.accessibilityNotes || 'N/A'}<br>
            <hr>
            <small>Last Verified: ${lastVerifiedDate}</small><br>
            <button class="verify-btn" data-id="${docId}">I was here today</button>
            <hr>
            <h5>Get Directions</h5>
            <div style="margin-top: 8px;">
                <a href="http://maps.google.com/maps?daddr=${location.lat},${location.lng}&dirflg=w" target="_blank">🚶 Walk</a>
                <a href="http://maps.google.com/maps?daddr=${location.lat},${location.lng}&dirflg=b" target="_blank">🚴 Bike</a>
                <a href="http://maps.google.com/maps?daddr=${location.lat},${location.lng}&dirflg=r" target="_blank">🚌 Bus Route</a>
            </div>
            <hr>
            <h5>Share This Resource</h5>
            <a href="https://www.facebook.com/sharer/sharer.php?u=https://map-app-v2-90d8d.web.app/location/${docId}" target="_blank">Share on Facebook</a>
            <a href="https://twitter.com/intent/tweet?url=https://map-app-v2-90d8d.web.app/location/${docId}&text=Check%20out%20this%20resource%20on%20the%20Cloud%20Connect%20app:" target="_blank">Share on Twitter</a>
            <hr>
            <h5>Comments</h5>
            <div class="comments-container"></div>
            <form class="comment-form" data-id="${docId}">
                <textarea placeholder="Add a comment..." required></textarea>
                <button type="submit">Post</button>
            </form>
        `;

        const marker = L.marker([location.lat, location.lng]).addTo(map)
            .bindPopup(popupContent);

        markers[docId] = marker;
    }

    // --- UI EVENT LISTENERS ---
    addResourceBtn.addEventListener('click', () => {
        showMessage("Click on the map to place the resource location.", 'info');
        formModal.style.display = 'none';
        if (tempMarker) {
            map.removeLayer(tempMarker);
        }
    });

    map.on('click', (e) => {
        if (!formModal.style.display || formModal.style.display === 'none') {
            selectedLocation = e.latlng;
            if (tempMarker) {
                map.removeLayer(tempMarker);
            }
            tempMarker = L.marker(selectedLocation).addTo(map)
                .bindPopup("Selected Location").openPopup();
            
            formModal.style.display = 'block';
            showMessage("Location selected. Fill out the form to add the resource.", 'success');
        }
    });
    
    currentLocationBtn.addEventListener('click', () => {
        if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 15);
            showMessage('Moved to your current location.', 'success');
        } else {
            showMessage('Could not determine your location.', 'error');
        }
    });

    cancelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            formModal.style.display = 'none';
            if (tempMarker) {
                map.removeLayer(tempMarker);
                tempMarker = null;
            }
        });
    });

    resourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const resourceName = document.getElementById('resource-name').value;
        const type = document.getElementById('type').value;
        const description = document.getElementById('description').value;
        const operatingHours = document.getElementById('operating-hours').value;
        const accessibility = document.getElementById('accessibility').value;
        
        if (!selectedLocation) {
            showMessage("Please select a location on the map first.", 'error');
            return;
        }
        
        addLocation(selectedLocation.lat, selectedLocation.lng, resourceName, type, description, operatingHours, accessibility)
            .then(() => {
                showMessage('Resource added successfully!', 'success');
                resourceForm.reset();
                formModal.style.display = 'none';
                if (tempMarker) {
                    map.removeLayer(tempMarker);
                    tempMarker = null;
                }
            })
            .catch(err => {
                showMessage('Failed to add resource. Please try again.', 'error');
                console.error(err);
            });
    });
    
    document.getElementById('map').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('verify-btn')) {
            const docId = target.getAttribute('data-id');
            updateLastVerified(docId)
                .then(() => {
                    showMessage('Thank you for verifying!', 'success');
                })
                .catch(err => {
                    showMessage('Failed to verify. Please try again.', 'error');
                    console.error(err);
                });
        }
        
        if (target.parentElement.classList.contains('star-rating')) {
            const docId = target.closest('.leaflet-popup-content').querySelector('.verify-btn').getAttribute('data-id');
            const rating = parseInt(target.getAttribute('data-rating'));
            if (auth.currentUser) {
                addRating(docId, rating, auth.currentUser.uid)
                    .then(() => {
                        showMessage(`Rated ${rating} stars!`, 'success');
                    })
                    .catch(err => {
                        showMessage('Failed to submit rating.', 'error');
                        console.error(err);
                    });
            }
        }
    });
    
    document.getElementById('map').addEventListener('submit', (e) => {
        if (e.target.classList.contains('comment-form')) {
            e.preventDefault();
            const form = e.target;
            const docId = form.getAttribute('data-id');
            const commentText = form.querySelector('textarea').value;
            const uid = auth.currentUser.uid;

            addComment(docId, commentText, uid)
                .then(() => {
                    form.reset();
                    showMessage('Comment posted!', 'success');
                })
                .catch(err => {
                    showMessage('Failed to post comment. Please try again.', 'error');
                    console.error(err);
                });
        }
    });
    
    // --- TOAST & HEADER MESSAGE FUNCTION ---
    function showMessage(message, type = 'success') {
        const headerMessage = document.getElementById('message-center');
        if (headerMessage) {
            headerMessage.textContent = message;
            headerMessage.className = `message-${type} show`;
        }
        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = 'toast';
            if (headerMessage) {
                headerMessage.className = '';
            }
        }, 3000);
    }
    
    // --- INITIALIZE APP ---
    initMap();
    populateUI();
});