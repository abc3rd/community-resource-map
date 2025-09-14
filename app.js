import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, doc, getDoc, updateDoc, query, where, arrayUnion, serverTimestamp, setDoc, increment } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCL03QIQULiU64iUQWL2YCPaouEv4Yyyak",
    authDomain: "map-app-v2-90d8d.firebaseapp.com",
    projectId: "map-app-v2-90d8d",
    storageBucket: "map-app-v2-90d8d.firebasestorage.app",
    messagingSenderId: "116352941102",
    appId: "1:116352941102:web:c9eb28488ec7fdec6bf3bf",
    measurementId: "G-9Q3ZP4RYLV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Global Variables
let map = null;
let userLocation = null;
let currentUser = null;
let markersLayer = null;
let selectedLocation = null;
let tempMarker = null;
const markers = {};

const resourceTypes = {
    "Food Drive": { color: "#f94144", icon: "fas fa-bread-slice" },
    "Water Spigot": { color: "#4cc9f0", icon: "fas fa-faucet" },
    "Electrical Outlet": { color: "#4361ee", icon: "fas fa-bolt" },
    "Shower": { color: "#7209b7", icon: "fas fa-shower" },
    "Camping Area": { color: "#f7b20e", icon: "fas fa-campground" },
    "WiFi Hotspot": { color: "#4895ef", icon: "fas fa-wifi" },
    "Donation Center": { color: "#3a0ca3", icon: "fas fa-hands-helping" },
    "Charity Event": { color: "#b5179e", icon: "fas fa-calendar-alt" },
    "Homeless Assistance": { color: "#f07167", icon: "fas fa-home" },
    "Yard/Garage Sale": { color: "#00a896", icon: "fas fa-tag" },
    "Storage Auction": { color: "#f15946", icon: "fas fa-box" }
};

// DOM Elements
const elements = {
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form-signup'),
    signInForm: document.getElementById('auth-form-signin'),
    authBtn: document.getElementById('auth-btn'),
    formModal: document.getElementById('form-modal'),
    resourceForm: document.getElementById('resource-form'),
    profileModal: document.getElementById('profile-modal'),
    userProfile: document.getElementById('user-profile'),
    profileBtn: document.getElementById('profile-btn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    typeSelect: document.getElementById('type'),
    legendItems: document.getElementById('legend-items'),
    messageCenter: document.getElementById('message-center'),
    addResourceBtn: document.getElementById('add-resource-btn'),
    currentLocationBtn: document.getElementById('current-location-btn'),
    cancelBtns: document.querySelectorAll('.cancel-btn, .close-btn'),
    profileDisplayName: document.getElementById('user-name'),
    profileAdded: document.getElementById('resources-added'),
    profileVerifications: document.getElementById('verifications-made'),
    profileTrustScore: document.getElementById('trust-score'),
    profileComments: document.getElementById('comments-posted'),
    switchSignInBtn: document.getElementById('switch-to-signin'),
    switchSignUpBtn: document.getElementById('switch-to-signup'),
    orgFields: document.getElementById('organization-fields'),
    authSubmitBtn: document.querySelector('#auth-form button[type="submit"]'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    setupEventListeners();
    populateResourceTypes();
    
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            updateUIForAuthenticatedUser();
            loadUserProfile();
        } else {
            currentUser = null;
            updateUIForUnauthenticatedUser();
        }
    });
});

// Map Initialization
function initializeMap() {
    map = L.map('map', { zoomControl: false }).setView([26.72, -81.89], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    
    getCurrentLocation();
    loadResources();
}

// Geolocation
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                map.setView([userLocation.lat, userLocation.lng], 15);
                
                const userMarker = L.divIcon({
                    className: 'user-location-marker',
                    html: `<div style="
                        background-color: #ff0000;
                        width: 16px; height: 16px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 0 10px rgba(255,0,0,0.5);
                        animation: pulse 2s infinite;
                    "></div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });
                
                L.marker([userLocation.lat, userLocation.lng], { icon: userMarker })
                    .addTo(map)
                    .bindPopup('<b>Your Location</b>');
            },
            error => {
                console.error('Geolocation error:', error);
                showToast('Location access denied. Some features may be limited.', 'warning');
            }
        );
    }
}

// Resource Management
function loadResources() {
    onSnapshot(collection(db, 'resources'), snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                addResourceMarker(change.doc.data(), change.doc.id);
            } else if (change.type === 'removed') {
                removeResourceMarker(change.doc.id);
            } else if (change.type === 'modified') {
                updateResourceMarker(change.doc.data(), change.doc.id);
            }
        });
    });
}

function addResourceMarker(resource, id) {
    const iconConfig = resourceTypes[resource.type];
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<i class="${iconConfig.icon}" style="background-color: ${iconConfig.color};"></i>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -30]
    });

    const marker = L.marker([resource.lat, resource.lng], { icon })
        .bindPopup(() => createResourcePopup(resource, id));
    
    markersLayer.addLayer(marker);
    markers[id] = marker;
}

function updateResourceMarker(resource, id) {
    if (markers[id]) {
        markers[id].setPopupContent(createResourcePopup(resource, id));
    }
}

function removeResourceMarker(id) {
    if (markers[id]) {
        markersLayer.removeLayer(markers[id]);
        delete markers[id];
    }
}

function createResourcePopup(resource, id) {
    const isOwner = currentUser && resource.createdBy === currentUser.uid;
    const canVerify = currentUser && !isOwner;
    
    const popupDiv = document.createElement('div');
    popupDiv.innerHTML = `
        <div style="min-width: 280px; max-width: 350px;">
            <h3 style="color: ${resourceTypes[resource.type]?.color || '#666'}; margin-bottom: 8px;">
                ${resource.name}
            </h3>
            <div style="margin-bottom: 8px;">
                <strong>Type:</strong> ${resource.type}
            </div>
            <div style="margin-bottom: 8px;">
                <strong>Description:</strong> ${resource.description}
            </div>
            ${resource.operatingHours ? `<div style="margin-bottom: 8px;"><strong>Hours:</strong> ${resource.operatingHours}</div>` : ''}
            ${resource.contactInfo ? `<div style="margin-bottom: 8px;"><strong>Contact:</strong> ${resource.contactInfo}</div>` : ''}
            ${resource.accessibility ? `<div style="margin-bottom: 8px;"><strong>Accessibility:</strong> ${resource.accessibility}</div>` : ''}
            
            <div class="verification-status">
                <i class="fas fa-${resource.verifications?.length > 0 ? 'check-circle verified' : 'question-circle unverified'}"></i>
                <span class="${resource.verifications?.length > 0 ? 'verified' : 'unverified'}">
                    ${resource.verifications?.length || 0} verifications
                </span>
            </div>
            
            <div class="rating-display">
                ${generateStarRating(resource.averageRating || 0)}
                <span>(${resource.ratings?.length || 0} ratings)</span>
            </div>
            
            ${canVerify ? `
                <div style="margin: 10px 0;">
                    <button class="verify-btn comment-btn" data-id="${id}">
                        <i class="fas fa-check"></i> Verify Resource
                    </button>
                </div>
            ` : ''}
            
            <div class="comments-section">
                <h4>Community Updates</h4>
                <div id="comments-${id}" class="comments-list"></div>
                ${currentUser ? `
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="Share an update..." maxlength="200">
                        <button class="comment-btn" onclick="addComment('${id}', this)">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                ` : '<p><small>Sign in to post updates and verify resources</small>'}
            </div>
        </div>
    `;
    
    // Load comments
    setTimeout(() => loadComments(id), 100);
    
    return popupDiv;
}

function generateStarRating(rating) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars.push('<i class="fas fa-star star"></i>');
        } else if (i === fullStars && hasHalfStar) {
            stars.push('<i class="fas fa-star-half-alt star"></i>');
        } else {
            stars.push('<i class="far fa-star star"></i>');
        }
    }
    
    return stars.join('') + ` <span>${rating.toFixed(1)}</span>`;
}

// Comments System
function loadComments(resourceId) {
    const commentsContainer = document.getElementById(`comments-${resourceId}`);
    if (!commentsContainer) return;
    
    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where('resourceId', '==', resourceId));
    
    onSnapshot(q, snapshot => {
        commentsContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const comment = doc.data();
            const commentEl = document.createElement('div');
            commentEl.className = 'comment-item';
            commentEl.innerHTML = `
                <div class="comment-meta">
                    ${comment.authorName} 
                    <small>${formatTimeAgo(comment.createdAt)}</small>
                    ${comment.authorType === 'organization' ? '<span class="establishment-badge">Org</span>' : ''}
                </div>
                <div>${comment.text}</div>
            `;
            commentsContainer.appendChild(commentEl);
        });
    });
}

function addComment(resourceId, button) {
    if (!currentUser) {
        showToast('Please sign in to post comments', 'error');
        return;
    }
    
    const input = button.previousElementSibling;
    const text = input.value.trim();
    
    if (!text) return;
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    addDoc(collection(db, 'comments'), {
        resourceId: resourceId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous User',
        authorType: currentUser.accountType || 'individual',
        text: text,
        createdAt: serverTimestamp()
    }).then(() => {
        input.value = '';
        updateUserStats('comments', 1);
        showToast('Comment posted!', 'success');
    }).catch(error => {
        console.error('Error adding comment:', error);
        showToast('Failed to post comment', 'error');
    }).finally(() => {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-paper-plane"></i>';
    });
}

// Resource Verification
function verifyResource(resourceId) {
    if (!currentUser) {
        showToast('Please sign in to verify resources', 'error');
        return;
    }
    
    const resourceRef = doc(db, 'resources', resourceId);
    
    getDoc(resourceRef).then(docSnap => {
        if (docSnap.exists()) {
            const currentVerifications = docSnap.data().verifications || [];
            
            if (currentVerifications.some(v => v.userId === currentUser.uid)) {
                showToast('You have already verified this resource.', 'warning');
                return;
            }
            
            const verification = {
                userId: currentUser.uid,
                verifiedAt: serverTimestamp()
            };
            
            updateDoc(resourceRef, {
                verifications: arrayUnion(verification)
            }).then(() => {
                updateUserStats('verifications', 1);
                showToast('Resource verified! Thank you for helping the community.', 'success');
            }).catch(error => {
                console.error('Error verifying resource:', error);
                showToast('Failed to verify resource', 'error');
            });
        }
    });
}

// User Profile Management
function loadUserProfile() {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    onSnapshot(userRef, docSnap => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            updateProfileDisplay(userData);
        } else {
            const initialProfile = {
                email: currentUser.email,
                displayName: currentUser.displayName,
                accountType: 'individual',
                trustScore: 0,
                resourcesAdded: 0,
                verificationsMade: 0,
                commentsPosted: 0,
                createdAt: serverTimestamp()
            };
            
            setDoc(userRef, initialProfile);
        }
    });
}

function updateProfileDisplay(userData) {
    elements.profileDisplayName.textContent = userData.displayName || 'User';
    elements.profileAdded.textContent = userData.resourcesAdded || 0;
    elements.profileVerifications.textContent = userData.verificationsMade || 0;
    elements.profileTrustScore.textContent = userData.trustScore || 0;
    elements.profileComments.textContent = userData.commentsPosted || 0;
    
    const trustBadge = document.getElementById('trust-badge');
    const establishmentBadge = document.getElementById('establishment-badge');
    
    if (userData.accountType === 'organization') {
        establishmentBadge.style.display = 'inline-block';
        trustBadge.style.display = 'none';
    } else if (userData.trustScore >= 50) {
        trustBadge.style.display = 'inline-block';
        establishmentBadge.style.display = 'none';
    } else {
        trustBadge.style.display = 'none';
        establishmentBadge.style.display = 'none';
    }
}

function updateUserStats(field, incrementValue) {
    if (!currentUser) return;
    
    const fieldMap = {
        'resources': 'resourcesAdded',
        'verifications': 'verificationsMade',
        'comments': 'commentsPosted'
    };
    
    const dbField = fieldMap[field];
    if (!dbField) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    updateDoc(userRef, {
        [dbField]: increment(incrementValue),
        trustScore: increment(5 * incrementValue)
    });
}

// Authentication
function setupEventListeners() {
    // Auth modal
    elements.authBtn.addEventListener('click', () => {
        if (currentUser) {
            signOut(auth);
        } else {
            elements.authModal.style.display = 'block';
        }
    });
    
    // Account type switching
    document.querySelectorAll('input[name="accountType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const orgFields = document.getElementById('organization-fields');
            orgFields.style.display = e.target.value === 'organization' ? 'block' : 'none';
        });
    });
    
    // Auth form submission
    elements.authForm.addEventListener('submit', handleAuthSubmit);
    
    // Resource form
    elements.resourceForm.addEventListener('submit', handleResourceSubmit);
    
    // Profile button
    elements.profileBtn.addEventListener('click', () => {
        elements.profileModal.style.display = 'block';
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth);
        elements.profileModal.style.display = 'none';
    });
    
    // Current location
    document.getElementById('current-location-btn').addEventListener('click', () => {
        if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 15);
            showToast('Centered on your location', 'success');
        } else {
            getCurrentLocation();
        }
    });
    
    // Add resource
    document.getElementById('add-resource-btn').addEventListener('click', () => {
        if (!currentUser) {
            showToast('Please sign in to add resources', 'error');
            elements.authModal.style.display = 'block';
            return;
        }
        if (markers.temp) {
            map.removeLayer(markers.temp);
            delete markers.temp;
            selectedLocation = null;
        }
        showToast('Click on the map to place the resource location.', 'info');
    });
    
    // Close modals
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
            if (markers.temp) {
                map.removeLayer(markers.temp);
                delete markers.temp;
                selectedLocation = null;
            }
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            if (markers.temp) {
                map.removeLayer(markers.temp);
                delete markers.temp;
                selectedLocation = null;
            }
        }
    });
    
    // Map click to select location
    map.on('click', e => {
        if (elements.formModal.style.display !== 'block') {
            const latlng = e.latlng;
            if (markers.temp) {
                map.removeLayer(markers.temp);
                delete markers.temp;
            }
            markers.temp = L.marker(latlng).addTo(map).bindPopup('New Resource Location').openPopup();
            showToast(`Location selected: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`, 'info');
            
            selectedLocation = latlng;
            elements.formModal.style.display = 'block';
        }
    });

    // Map click for verification
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('verify-btn')) {
            verifyResource(e.target.dataset.id);
        }
    });
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const displayName = formData.get('displayName');
    const accountType = formData.get('accountType');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });
        
        const userDoc = {
            email,
            displayName,
            accountType,
            trustScore: accountType === 'organization' ? 100 : 0,
            resourcesAdded: 0,
            verificationsMade: 0,
            commentsPosted: 0,
            createdAt: serverTimestamp()
        };
        
        if (accountType === 'organization') {
            userDoc.organizationName = formData.get('orgName');
            userDoc.organizationType = formData.get('orgType');
        }
        
        await setDoc(doc(db, 'users', user.uid), userDoc);
        
        elements.authModal.style.display = 'none';
        showToast('Welcome to Cloud Connect!', 'success');
        
    } catch (error) {
        console.error('Auth error:', error);
        showToast(error.message, 'error');
    }
}

async function handleResourceSubmit(e) {
    e.preventDefault();
    
    if (!selectedLocation) {
        showToast('Please select a location on the map first!', 'error');
        return;
    }

    const formData = new FormData(e.target);
    
    const resourceData = {
        name: formData.get('resource-name'),
        type: formData.get('type'),
        description: formData.get('description'),
        operatingHours: formData.get('operating-hours'),
        contactInfo: formData.get('contact-info'),
        accessibility: formData.get('accessibility'),
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName,
        createdByType: currentUser.accountType || 'individual',
        createdAt: serverTimestamp(),
        verifications: [],
        ratings: [],
        averageRating: 0
    };
    
    try {
        await addDoc(collection(db, 'resources'), resourceData);
        updateUserStats('resources', 1);
        
        elements.resourceForm.reset();
        elements.formModal.style.display = 'none';
        if (markers.temp) {
            map.removeLayer(markers.temp);
            delete markers.temp;
        }
        showToast('Resource added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding resource:', error);
        showToast('Failed to add resource', 'error');
    }
}

function updateUIForAuthenticatedUser() {
    elements.authBtn.textContent = 'Sign Out';
    elements.userProfile.style.display = 'flex';
    elements.profileBtn.style.display = 'block';
}

function updateUIForUnauthenticatedUser() {
    elements.authBtn.textContent = 'Sign In';
    elements.userProfile.style.display = 'none';
    elements.profileBtn.style.display = 'none';
}

function populateResourceTypes() {
    const typeSelect = document.getElementById('type');
    const legendItems = document.getElementById('legend-items');
    
    typeSelect.innerHTML = '<option value="">--Select resource type--</option>';
    legendItems.innerHTML = '';
    
    Object.entries(resourceTypes).forEach(([type, config]) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${config.color};"></div>
            <span class="legend-label">${type}</span>
        `;
        legendItems.appendChild(legendItem);
    });
}

function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        elements.toast.className = 'toast';
    }, 4000);
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const then = timestamp.toDate();
    const diffMs = now - then;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}