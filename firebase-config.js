// Firebase Configuration for Alakaifak Invoice System
// This file contains the complete Firebase setup

// Firebase configuration - REAL PRODUCTION CONFIG
const firebaseConfig = {
    // 🔥 PRODUCTION FIREBASE CONFIG FOR ALAKAIFAK INVOICES
    apiKey: "AIzaSyA8dmiwA7vkouMELrnzbAXHViyIaqfHYEY",
    authDomain: "alakefak-invoices.firebaseapp.com",
    databaseURL: "https://alakefak-invoices-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "alakefak-invoices",
    storageBucket: "alakefak-invoices.firebasestorage.app",
    messagingSenderId: "669136896397",
    appId: "1:669136896397:web:3d1f717547d1a52114bdc4"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
    window.firebaseInitialized = true;
    console.log('🔥 Firebase initialized successfully');
    console.log('☁️ Cloud sync enabled for Alakaifak Invoice System');
    
    // Test connection
    window.database.ref('.info/connected').on('value', function(snapshot) {
        if (snapshot.val() === true) {
            console.log('✅ Connected to Firebase Realtime Database');
            updateConnectionStatus(true);
        } else {
            console.log('❌ Disconnected from Firebase');
            updateConnectionStatus(false);
        }
    });
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    window.database = null;
    window.firebaseInitialized = false;
    updateConnectionStatus(false);
}

// Update UI connection status
function updateConnectionStatus(connected) {
    const indicators = document.querySelectorAll('.sync-indicator');
    indicators.forEach(indicator => {
        if (connected) {
            indicator.className = 'sync-indicator online';
            indicator.textContent = '☁️ Cloud Connected';
        } else {
            indicator.className = 'sync-indicator offline'; 
            indicator.textContent = '📱 Local Only';
        }
    });
}

// Enhanced cloud sync functions
window.CloudSync = {
    // Save invoice to cloud
    async saveInvoice(invoice) {
        if (!window.database) return false;
        
        try {
            const invoiceRef = window.database.ref(`invoices/${invoice.id}`);
            await invoiceRef.set({
                ...invoice,
                lastSynced: new Date().toISOString(),
                syncedFrom: 'web'
            });
            console.log(`📤 Invoice ${invoice.invoiceNumber} synced to cloud`);
            return true;
        } catch (error) {
            console.error('❌ Failed to sync invoice:', error);
            return false;
        }
    },
    
    // Save customer to cloud
    async saveCustomer(customer) {
        if (!window.database) return false;
        
        try {
            const customerRef = window.database.ref(`customers/${customer.id}`);
            await customerRef.set({
                ...customer,
                lastSynced: new Date().toISOString(),
                syncedFrom: 'web'
            });
            console.log(`📤 Customer ${customer.name} synced to cloud`);
            return true;
        } catch (error) {
            console.error('❌ Failed to sync customer:', error);
            return false;
        }
    },
    
    // Load all invoices from cloud
    async loadInvoices() {
        if (!window.database) return [];
        
        try {
            const snapshot = await window.database.ref('invoices').once('value');
            const data = snapshot.val();
            if (data) {
                const invoices = Object.values(data);
                console.log(`📥 Loaded ${invoices.length} invoices from cloud`);
                return invoices;
            }
            return [];
        } catch (error) {
            console.error('❌ Failed to load invoices:', error);
            return [];
        }
    },
    
    // Load all customers from cloud
    async loadCustomers() {
        if (!window.database) return [];
        
        try {
            const snapshot = await window.database.ref('customers').once('value');
            const data = snapshot.val();
            if (data) {
                const customers = Object.values(data);
                console.log(`📥 Loaded ${customers.length} customers from cloud`);
                return customers;
            }
            return [];
        } catch (error) {
            console.error('❌ Failed to load customers:', error);
            return [];
        }
    },
    
    // Real-time sync setup
    setupRealTimeSync() {
        if (!window.database) return;
        
        // Listen for new invoices
        window.database.ref('invoices').on('child_added', (snapshot) => {
            const invoice = snapshot.val();
            if (invoice.syncedFrom !== 'web') {
                console.log(`📱 New invoice received: ${invoice.invoiceNumber}`);
                // Trigger UI update
                if (window.handleCloudInvoiceUpdate) {
                    window.handleCloudInvoiceUpdate(invoice);
                }
            }
        });
        
        // Listen for new customers
        window.database.ref('customers').on('child_added', (snapshot) => {
            const customer = snapshot.val();
            if (customer.syncedFrom !== 'web') {
                console.log(`📱 New customer received: ${customer.name}`);
                // Trigger UI update
                if (window.handleCloudCustomerUpdate) {
                    window.handleCloudCustomerUpdate(customer);
                }
            }
        });
    }
};

// Auto-initialize real-time sync when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.firebaseInitialized) {
            window.CloudSync.setupRealTimeSync();
            console.log('🔄 Real-time sync activated');
        }
    }, 1000);
});

export { firebaseConfig, CloudSync };
