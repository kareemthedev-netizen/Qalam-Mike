// ==================== إعدادات Firebase ====================
const firebaseConfig = {
  apiKey: "AIzaSyAP_FSGEi5zBukd_MprCNNCqFTdNIuAWX8",
  authDomain: "qalam-mike-58f4f.firebaseapp.com",
  projectId: "qalam-mike-58f4f",
  storageBucket: "qalam-mike-58f4f.firebasestorage.app",
  messagingSenderId: "282390087171",
  appId: "1:282390087171:web:305c03152a48d1d9ee3036"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// خدمات Firebase
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

console.log('✅ Firebase connected from tablet');