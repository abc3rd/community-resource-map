document.addEventListener('DOMContentLoaded', () => {
    // This function will run after the main app.js has initialized the map
    if (typeof initMap !== 'function') {
        console.error("app.js must be loaded first.");
        return;
    }

    // --- GET UI ELEMENTS ---
    const addResourceBtn = document.getElementById('add-resource-btn');
    const currentLocationBtn = document.getElementById('current-location-btn');
    const formModal = document.getElementById('form-modal');
    const resourceForm = document.getElementById('resource-form');
    const cancelBtns = document.querySelectorAll('.cancel-btn, .close-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const typeSelect = document.getElementById('type');
    const legendContainer = document.querySelector('.legend');

    // --- DYNAMICALLY POPULATE UI ---
    function populateUI() {
        // Clear previous entries
        typeSelect.innerHTML = '<option value="">--Please choose an option--</option>';
        legendContainer.innerHTML = '<h3>Resource Types</h3>';

        for (const type in resourceTypes) {
            const resource = resourceTypes[type];
            // Populate form dropdown
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);

            // Populate legend
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${resource.color};"></div>
                <span class="legend-label">${type}</span>
            `;
            legendContainer.appendChild(legendItem);
        }
    }
    
    // --- UI EVENT LISTENERS ---
    addResourceBtn.addEventListener('click', () => {
        formModal.style.display = 'block';
    });

    currentLocationBtn.addEventListener('click', () => {
        if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 15);
            showToast('Moved to your current location.', 'success');
        } else {
            showToast('Could not determine your location.', 'error');
        }
    });

    cancelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            formModal.style.display = 'none';
        });
    });

    resourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = resourceForm.type.value;
        const description = resourceForm.description.value;
        const mapCenter = map.getCenter();
        
        addLocation(mapCenter.lat, mapCenter.lng, type, description)
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

    // --- INITIALIZE ---
    initMap(); // This will start the main application logic from app.js
    populateUI(); // This sets up the dropdowns and legend based on app.js config
});
