// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCXm7IybpnE17zdXnbo7OdD32KSTXKqmSY",
    authDomain: "yomola-global-1f552.firebaseapp.com",
    projectId: "yomola-global-1f552",
    storageBucket: "yomola-global-1f552.firebasestorage.app",
    messagingSenderId: "884873998736",
    appId: "1:884873998736:web:b48cf603c4f55f91ee0315",
    measurementId: "G-LTJ10SLL4Y"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Make available globally for other scripts
window.db = db;
window.firebaseConfig = firebaseConfig;
window.formatMoney = (amount) => '₦' + (amount || 0).toLocaleString();
window.formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();
