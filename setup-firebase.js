// Firebase Setup Helper
// Run this in browser console after getting your Firebase config

// 1. Go to https://console.firebase.google.com/
// 2. Create new project: "Alakaifak Invoice System"  
// 3. Add Realtime Database in test mode
// 4. Add web app and copy config
// 5. Replace the config below and run updateFirebaseConfig()

const YOUR_REAL_FIREBASE_CONFIG = {
    // PASTE YOUR REAL CONFIG HERE:
    apiKey: "your-real-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com", 
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

function updateFirebaseConfig() {
    console.log("🔧 Use this config in your files:");
    console.log(JSON.stringify(YOUR_REAL_FIREBASE_CONFIG, null, 2));
}

// Test Firebase connection with your config
function testFirebaseConnection() {
    try {
        if (firebase.apps.length > 0) {
            firebase.app().delete();
        }
        
        firebase.initializeApp(YOUR_REAL_FIREBASE_CONFIG);
        const db = firebase.database();
        
        // Test write
        db.ref('test').set({
            message: "Firebase connection test",
            timestamp: new Date().toISOString()
        }).then(() => {
            console.log("✅ Firebase write test successful!");
            
            // Test read
            return db.ref('test').once('value');
        }).then((snapshot) => {
            console.log("✅ Firebase read test successful!");
            console.log("Data:", snapshot.val());
            
            // Clean up test data
            return db.ref('test').remove();
        }).then(() => {
            console.log("✅ Firebase connection fully working!");
        }).catch((error) => {
            console.error("❌ Firebase test failed:", error);
        });
        
    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
    }
}

console.log("🔥 Firebase Setup Helper Loaded");
console.log("1. Get your config from Firebase Console");
console.log("2. Update YOUR_REAL_FIREBASE_CONFIG above");
console.log("3. Run testFirebaseConnection() to test");
