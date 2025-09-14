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
    
    // --- GET HTML ELEMENTS ---
    const addResourceBtn = document.getElementById('add-resource-btn');
    const formModal = document.getElementById('form-modal');
    const resourceForm = document.getElementById('resource-form');
    const cancelBtn = document.getElementById('cancel-btn');

    // --- MAP INITIALIZATION ---
    const map = L.map('map').setView([26.72, -81.89], 13); // North Fort Myers
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // --- FIREBASE AUTHENTICATION ---
    auth.signInAnonymously().catch((error) => {
        console.error("Error signing in anonymously", error);
    });

    // --- DATABASE FUNCTIONS ---
    function addLocation(lat, lng, type, description) {
        if (!auth.currentUser) {
            alert("Authentication not ready. Please try again in a moment.");
            return;
        }
        db.collection("locations").add({
            lat: lat,
            lng: lng,
            type: type,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => console.log("Location added!"))
        .catch((error) => console.error("Error adding location: ", error));
    }

    db.collection("locations").onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const location = change.doc.data();
                L.marker([location.lat, location.lng]).addTo(map)
                    .bindPopup(`<b>${location.type}</b><br>${location.description}`);
            }
        });
    });

    // --- EVENT LISTENERS FOR THE FORM ---
    addResourceBtn.addEventListener('click', () => {
        formModal.style.display = 'block';
    });

    cancelBtn.addEventListener('click', () => {
        formModal.style.display = 'none';
    });

    resourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = resourceForm.type.value;
        const description = resourceForm.description.value;
        const mapCenter = map.getCenter();
        
        addLocation(mapCenter.lat, mapCenter.lng, type, description);
        
        resourceForm.reset();
        formModal.style.display = 'none';
    });

});