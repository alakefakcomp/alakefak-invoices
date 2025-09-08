# Alakaifak Mover - Professional Invoice Management System

A comprehensive, modern invoice management system built for **Alakaifak Mover - Professional Moving Services**. This system provides all the tools needed to create, manage, and print professional invoices with advanced features and mobile support.

![Invoice System](https://img.shields.io/badge/Status-Ready%20for%20Production-brightgreen)
![Mobile Friendly](https://img.shields.io/badge/Mobile-Responsive-blue)
![PDF Export](https://img.shields.io/badge/PDF-Export%20Ready-red)

## 🚀 Features

### ✨ Core Functionality
- **Automatic Invoice Generation** - Auto-generated invoice numbers with manual override option
- **Real-time Calculations** - Automatic VAT (5%) and total calculations
- **Professional Templates** - Multiple layouts (Standard, Detailed, Compact, Bilingual)
- **Single-Page Optimization** - Automatically adjusts content to fit one A4 page

### 👥 Customer Management
- **Customer Database** - Save and manage customer information
- **Quick Selection** - Easy customer selection for new invoices
- **Search & Filter** - Find customers and invoices quickly

### 📄 Advanced Invoice Features
- **Company Branding** - Upload and manage company logo and stamps
- **Bilingual Support** - Arabic and English text support
- **Auto-resize Fields** - Description fields expand as you type
- **Multiple Formats** - Choose from 4 professional layouts

### 📱 Mobile & Print Support
- **100% Mobile Responsive** - Perfect on phones and tablets
- **Professional Printing** - Optimized A4 print layouts
- **PDF Export** - High-quality PDF generation
- **Firebase Cloud Sync** - Real-time data synchronization across devices

### 🎨 User Experience
- **Modern UI** - Clean, professional interface
- **Toast Notifications** - Instant feedback for all actions
- **Loading Indicators** - Visual feedback during operations
- **Settings Panel** - Customize VAT rates, currency, and more

## 📂 Project Structure

```
alakefak-invoice-website/
├── index.html          # Main application file
├── styles.css          # Comprehensive styling with mobile support
├── script.js           # Full-featured JavaScript application
├── README.md           # This file
└── deploy.sh          # Deployment script
```

## 🛠️ Installation & Deployment

### Option 1: GitHub Pages (Recommended)

1. **Create a GitHub Repository:**
   ```bash
   # Go to GitHub and create a new repository named "alakefak-invoice-system"
   ```

2. **Push the code:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/alakefak-invoice-system.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository settings
   - Scroll down to "Pages" section
   - Select "Deploy from branch" → "main" → "/ (root)"
   - Your site will be available at: `https://YOUR_USERNAME.github.io/alakefak-invoice-system`

### Option 2: Local Development

1. **Using Python (recommended):**
   ```bash
   cd alakefak-invoice-website
   python3 -m http.server 8080
   # Open http://localhost:8080 in your browser
   ```

2. **Using Node.js:**
   ```bash
   npx http-server -p 8080
   # Open http://localhost:8080 in your browser
   ```

### Option 3: Free Hosting Services

**Netlify:**
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the project folder
3. Your site will be live instantly with a custom URL

**Vercel:**
1. Go to [vercel.com](https://vercel.com)
2. Import from GitHub or upload files
3. Deploy with one click

## 📋 Usage Guide

### Creating Your First Invoice

1. **Navigate** to "New Invoice" (default page)
2. **Select or Add Customer** - Use the dropdown or click "New" to add
3. **Add Items** - Click "Add Item" and fill in service descriptions
4. **Review Totals** - All calculations happen automatically
5. **Save** - Click the save button to store the invoice
6. **Print/Export** - Use print or PDF export buttons

### Customer Management

1. **Go to "Customers" tab**
2. **Add Customer** - Click "Add New Customer" button
3. **Fill Details** - Name and address are required
4. **Save** - Customer is stored locally and synced

### Settings Configuration

1. **Go to "Settings" tab**
2. **Upload Logo** - Add your company logo
3. **Upload Stamp** - Add company stamp (can be toggled)
4. **Configure Invoice Settings** - Set starting numbers, VAT rates
5. **Manage Data** - Export/import your data

## 🎯 Key Benefits for Alakaifak Mover

- **Professional Image** - Branded invoices with company logo and stamps
- **Time Saving** - Auto-calculations and customer database
- **Mobile Access** - Create invoices anywhere, anytime
- **Data Security** - Local storage with simulated cloud sync
- **Cost Effective** - No monthly fees, completely free
- **Customizable** - Multiple templates and settings
- **Arabic Support** - Perfect for UAE/Middle East market

## 🔧 Technical Specifications

- **Framework:** Vanilla JavaScript (no dependencies except PDF generation)
- **Storage:** HTML5 Local Storage with JSON data structure
- **PDF Generation:** jsPDF + html2canvas libraries
- **Mobile Support:** CSS Grid, Flexbox, responsive design
- **Print Optimization:** CSS @media print rules with A4 formatting
- **Browser Support:** Chrome, Firefox, Safari, Edge (modern browsers)

## 🔥 Firebase Cloud Sync Setup

To enable real-time data synchronization across devices:

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name your project (e.g., "alakaifak-invoices")
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Set up Realtime Database
1. In Firebase console, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" for development
4. Select your preferred location
5. Click "Done"

### 3. Get Firebase Configuration
1. In project settings (gear icon), go to "General" tab
2. Scroll to "Your apps" section
3. Click "Web" icon (</>)
4. Register your app
5. Copy the Firebase configuration object

### 4. Update Configuration
Replace the placeholder configuration in `index.html` (around line 457):

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### 5. Test Cloud Sync
1. Open the application on multiple devices/browsers
2. Create an invoice or customer on one device
3. Verify it appears on other devices automatically
4. Check sync status indicators in the UI

## 📊 Data Management

### Local Storage Structure:
- `alakaifak_invoices_v1` - All saved invoices
- `alakaifak_customers_v1` - Customer database
- `alakaifak_settings_v1` - System settings
- `alakaifak_assets_v1` - Uploaded images (logo, stamp)
- `alakaifak_counter_v1` - Invoice number counter

### Firebase Structure:
- `/invoices/` - Cloud-synced invoice data
- `/customers/` - Cloud-synced customer data

### Data Sync Features:
- Automatic cloud backup
- Real-time synchronization
- Conflict resolution (cloud data takes precedence)
- Offline support with sync when connection restored

## 🚀 Live Demo

Once deployed, you can access the system at your chosen hosting platform. The system works entirely in the browser with no server requirements.

## 📞 Support & Customization

This system is specifically designed for **Alakaifak Mover** with their exact requirements:

- ✅ Auto-generating dates and invoice numbers (editable)
- ✅ Customer management and storage
- ✅ Multiple professional layouts
- ✅ Company logo and stamp management
- ✅ Mobile-responsive design
- ✅ Single-page print optimization
- ✅ PDF export with proper scaling
- ✅ Local storage with cloud sync simulation
- ✅ Arabic/English bilingual support
- ✅ VAT calculations and currency support

## 📄 License

This invoice management system is created specifically for Alakaifak Mover - Professional Moving Services. Free to use and modify as needed.

---

**Built with ❤️ for Alakaifak Mover - Professional Moving Services**

*Professional invoicing made simple and efficient*
