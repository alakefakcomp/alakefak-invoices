// Professional Invoice System for Alakaifak Mover
// Complete system with cloud sync, customer management, and PDF generation

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        VAT_RATE: 0.05, // 5% VAT
        STORAGE_KEYS: {
            INVOICES: 'alakaifak_invoices_v1',
            CUSTOMERS: 'alakaifak_customers_v1',
            COUNTER: 'alakaifak_counter_v1',
            ASSETS: 'alakaifak_assets_v1',
            SETTINGS: 'alakaifak_settings_v1'
        },
        CLOUD: {
            ENABLED: true, // Using Firebase for cross-device sync
            FIREBASE_CONFIG: {
                apiKey: "AIzaSyCxKPr4VtS8NmJ9XZ_8vG2LqW3mN1oP5fQ",
                authDomain: "alakefak-invoices.firebaseapp.com",
                databaseURL: "https://alakefak-invoices-default-rtdb.firebaseio.com",
                projectId: "alakefak-invoices",
                storageBucket: "alakefak-invoices.appspot.com",
                messagingSenderId: "123456789",
                appId: "1:123456789:web:abcd1234efgh5678"
            }
        }
    };

    // Global State
    const state = {
        currentTemplate: 'classic',
        editingCustomer: null,
        loadedAssets: {},
        isDirty: false,
        autoSaveMessageShown: false, // Track if we've shown the auto-save message
        currentInvoiceId: null // Track current invoice ID to prevent duplicates
    };

    // DOM Element Selectors
    const elements = {
        // Invoice elements
        invoiceContent: () => document.getElementById('invoiceContent'),
        invoiceDate: () => document.getElementById('invoiceDate'),
        invoiceNumber: () => document.getElementById('invoiceNumber'),
        billTo: () => document.getElementById('billTo'),
        customerTRNField: () => document.getElementById('customerTRNField'),
        customerAddressField: () => document.getElementById('customerAddressField'),
        customerPhoneField: () => document.getElementById('customerPhoneField'),
        customerLPOField: () => document.getElementById('customerLPOField'),
        itemsBody: () => document.getElementById('itemsBody'),
        subtotal: () => document.getElementById('subtotal'),
        totalVAT: () => document.getElementById('totalVAT'),
        grandTotal: () => document.getElementById('grandTotal'),
        amountInWords: () => document.getElementById('amountInWords'),
        
        // Assets
        companyLogo: () => document.getElementById('companyLogo'),
        companyStamp: () => document.getElementById('companyStamp'),
        
        // Customer management
        customerSelector: () => document.getElementById('customerSelector'),
        customerManager: () => document.getElementById('customerManager'),
        customerForm: () => document.getElementById('customerForm'),
        customerList: () => document.getElementById('customerList'),
        customerSearch: () => document.getElementById('customerSearch'),
        customerCount: () => document.getElementById('customerCount'),
        
        // Modals
        savedInvoicesModal: () => document.getElementById('savedInvoicesModal'),
        savedInvoicesList: () => document.getElementById('savedInvoicesList'),
        emailModal: () => document.getElementById('emailModal'),
        
        // Controls
        templateSelector: () => document.getElementById('templateSelector'),
        loadingIndicator: () => document.getElementById('loadingIndicator'),
        messageContainer: () => document.getElementById('messageContainer')
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function init() {
        console.log('🚛 Initializing Alakaifak Mover Invoice System...');
        
        // Set up initial state
        setupInitialState();
        
        // Load saved data
        loadStoredData();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize auto-expanding textareas
        setupAutoExpanding();
        
        // Load customers
        loadCustomers();
        
        // Sync from cloud
        if (CONFIG.CLOUD.ENABLED) {
            syncFromCloud();
        }
        
        // Initial calculation
        calculateTotals();
        
        // Setup date formatting
        setupDateFormatting();
        
        console.log('✅ Invoice system initialized successfully!');
        showMessage('Invoice system ready!', 'success');
    }

    function setupInitialState() {
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        elements.invoiceDate().value = today;
        
        // Generate invoice number
        elements.invoiceNumber().value = generateInvoiceNumber();
        
        // Load template preference
        const savedTemplate = localStorage.getItem('selectedTemplate') || 'classic';
        selectTemplate(savedTemplate);
        
        // Load assets
        loadAssets();
    }

    function setupEventListeners() {
        // Invoice calculation listeners
        document.addEventListener('input', handleInputChange);
        document.addEventListener('change', handleInputChange);
        
        // Auto-save on changes (but not on invoice number changes)
        document.addEventListener('input', (event) => {
            // Skip auto-save for invoice number changes
            if (event.target.id === 'invoiceNumber') {
                return;
            }
            
            state.isDirty = true;
            
            // Show message only once per session
            if (!state.autoSaveMessageShown) {
                showMessage('✏️ Auto-save enabled - your changes are being saved automatically', 'info');
                state.autoSaveMessageShown = true;
            }
            
            debounce(autoSave, 2000)();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Window events
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Mobile optimization
        if (isMobileDevice()) {
            optimizeForMobile();
        }
    }

    function setupAutoExpanding() {
        const expandableElements = document.querySelectorAll('.auto-expand');
        expandableElements.forEach(element => {
            element.addEventListener('input', autoExpand);
            autoExpand.call(element); // Initial expansion
        });
    }

    // ============================================================================
    // INVOICE MANAGEMENT
    // ============================================================================

    function generateInvoiceNumber() {
        // Get the highest existing invoice number from saved invoices
        const invoices = getStoredInvoices();
        let maxNumber = 0;
        
        invoices.forEach(invoice => {
            const num = parseInt(invoice.invoiceNumber);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        });
        
        // Get next number
        const nextNumber = maxNumber + 1;
        
        // Return simple sequential number
        return String(nextNumber);
    }

    function addItem() {
        const tbody = elements.itemsBody();
        const itemNumber = tbody.children.length + 1;
        
        const row = document.createElement('tr');
        row.className = 'item-row';
        row.innerHTML = `
            <td class="item-number">${itemNumber}</td>
            <td><textarea class="description-input auto-expand" placeholder="Describe the moving service (e.g., Packing and moving 2-bedroom apartment with fragile items)" rows="2"></textarea></td>
            <td><input type="number" class="quantity-input" value="1" min="1"></td>
            <td><input type="number" class="rate-input" placeholder="0.00" step="0.01" min="0"></td>
            <td class="amount-cell">0.00</td>
            <td class="vat-cell">0.00</td>
            <td class="total-cell">0.00</td>
            <td class="no-print"><button onclick="removeItem(this)" class="btn btn-danger btn-sm">✕</button></td>
        `;
        
        tbody.appendChild(row);
        
        // Set up auto-expanding for the new textarea
        const textarea = row.querySelector('.description-input');
        textarea.addEventListener('input', autoExpand);
        
        calculateTotals();
        optimizeLayout();
        
        // Focus on description field
        textarea.focus();
    }
    window.addItem = addItem;

    function removeItem(button) {
        const row = button.closest('tr');
        const tbody = elements.itemsBody();
        
        if (tbody.children.length <= 1) {
            showMessage('At least one item is required', 'warning');
            return;
        }
        
        row.remove();
        renumberItems();
        calculateTotals();
        optimizeLayout();
    }
    window.removeItem = removeItem;

    function duplicateLastItem() {
        const tbody = elements.itemsBody();
        const lastRow = tbody.lastElementChild;
        
        if (!lastRow) {
            addItem();
            return;
        }
        
        const description = lastRow.querySelector('.description-input').value;
        const quantity = lastRow.querySelector('.quantity-input').value;
        const rate = lastRow.querySelector('.rate-input').value;
        
        addItem();
        
        const newRow = tbody.lastElementChild;
        newRow.querySelector('.description-input').value = description;
        newRow.querySelector('.quantity-input').value = quantity;
        newRow.querySelector('.rate-input').value = rate;
        
        calculateTotals();
    }
    window.duplicateLastItem = duplicateLastItem;

    function renumberItems() {
        const rows = elements.itemsBody().querySelectorAll('.item-row');
        rows.forEach((row, index) => {
            row.querySelector('.item-number').textContent = index + 1;
        });
    }

    function handleInputChange(event) {
        if (event.target.matches('.quantity-input, .rate-input')) {
            calculateTotals();
            optimizeLayout();
        }
        
        if (event.target.matches('.description-input')) {
            autoExpand.call(event.target);
            optimizeLayout();
        }
        
        if (event.target.matches('.auto-expand')) {
            autoExpand.call(event.target);
        }
    }

    function calculateTotals() {
        let subtotal = 0;
        let totalVAT = 0;
        
        const rows = elements.itemsBody().querySelectorAll('.item-row');
        
        rows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
            const rate = parseFloat(row.querySelector('.rate-input').value) || 0;
            
            const amount = quantity * rate;
            const vat = amount * CONFIG.VAT_RATE;
            const total = amount + vat;
            
            // Update row displays
            row.querySelector('.amount-cell').textContent = formatCurrency(amount);
            row.querySelector('.vat-cell').textContent = formatCurrency(vat);
            row.querySelector('.total-cell').textContent = formatCurrency(total);
            
            subtotal += amount;
            totalVAT += vat;
        });
        
        const grandTotal = subtotal + totalVAT;
        
        // Update summary
        elements.subtotal().textContent = formatCurrency(subtotal) + ' AED';
        elements.totalVAT().textContent = formatCurrency(totalVAT) + ' AED';
        elements.grandTotal().textContent = formatCurrency(grandTotal) + ' AED';
        elements.amountInWords().textContent = numberToWords(grandTotal) + ' only';
        
        state.isDirty = true;
    }

    function optimizeLayout() {
        const itemCount = elements.itemsBody().children.length;
        const descriptionInputs = document.querySelectorAll('.description-input');
        let totalTextLength = 0;
        
        descriptionInputs.forEach(input => {
            totalTextLength += input.value.length;
        });
        
        const container = elements.invoiceContent();
        
        // Remove existing optimization classes
        container.classList.remove('compact-layout', 'ultra-compact');
        
        // Apply optimization based on content
        if (itemCount >= 4 || totalTextLength > 500) {
            container.classList.add('compact-layout');
        }
        
        if (itemCount >= 7 || totalTextLength > 800) {
            container.classList.add('ultra-compact');
        }
        
        console.log(`📐 Layout optimized: ${itemCount} items, ${totalTextLength} chars`);
    }

    // ============================================================================
    // CUSTOMER MANAGEMENT
    // ============================================================================

    function showCustomerManager() {
        elements.customerManager().style.display = 'block';
        document.querySelector('.main-container').style.display = 'none';
        loadCustomersGrid();
    }
    window.showCustomerManager = showCustomerManager;

    function hideCustomerManager() {
        elements.customerManager().style.display = 'none';
        document.querySelector('.main-container').style.display = 'grid';
    }
    window.hideCustomerManager = hideCustomerManager;

    function showAddCustomer() {
        elements.customerForm().style.display = 'block';
        document.getElementById('customerFormTitle').textContent = 'Add New Customer';
        clearCustomerForm();
        state.editingCustomer = null;
    }
    window.showAddCustomer = showAddCustomer;

    function hideAddCustomer() {
        elements.customerForm().style.display = 'none';
        state.editingCustomer = null;
    }
    window.hideAddCustomer = hideAddCustomer;

    function saveCustomer() {
        const name = document.getElementById('customerName').value.trim();
        const trn = document.getElementById('customerTRN').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const lpo = document.getElementById('customerLPO').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        
        if (!name) {
            showMessage('Please enter customer name', 'error');
            return;
        }
        
        const customers = getStoredCustomers();
        const customerId = state.editingCustomer || generateId();
        
        const customer = {
            id: customerId,
            name,
            trn,
            address,
            phone,
            lpo,
            email,
            createdAt: state.editingCustomer ? 
                customers.find(c => c.id === customerId)?.createdAt || new Date().toISOString() : 
                new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (state.editingCustomer) {
            const index = customers.findIndex(c => c.id === customerId);
            if (index !== -1) {
                customers[index] = customer;
            }
        } else {
            customers.push(customer);
        }
        
        saveCustomers(customers);
        loadCustomersGrid();
        loadCustomerSelector();
        hideAddCustomer();
        
        showMessage(`Customer "${name}" saved successfully!`, 'success');
        
        if (CONFIG.CLOUD.ENABLED) {
            syncCustomersToCloud(customers);
        }
    }
    window.saveCustomer = saveCustomer;

    function editCustomer(customerId) {
        const customers = getStoredCustomers();
        const customer = customers.find(c => c.id === customerId);
        
        if (!customer) {
            showMessage('Customer not found', 'error');
            return;
        }
        
        document.getElementById('customerName').value = customer.name || '';
        document.getElementById('customerTRN').value = customer.trn || '';
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';
        
        document.getElementById('customerFormTitle').textContent = `Edit Customer: ${customer.name}`;
        elements.customerForm().style.display = 'block';
        state.editingCustomer = customerId;
    }
    window.editCustomer = editCustomer;

    function deleteCustomer(customerId) {
        const customers = getStoredCustomers();
        const customer = customers.find(c => c.id === customerId);
        
        if (!customer) {
            showMessage('Customer not found', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete "${customer.name}"?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        const updatedCustomers = customers.filter(c => c.id !== customerId);
        saveCustomers(updatedCustomers);
        loadCustomersGrid();
        loadCustomerSelector();
        
        showMessage(`Customer "${customer.name}" deleted successfully`, 'success');
        
        if (CONFIG.CLOUD.ENABLED) {
            syncCustomersToCloud(updatedCustomers);
        }
    }
    window.deleteCustomer = deleteCustomer;

    function selectCustomer() {
        const selector = elements.customerSelector();
        const customerId = selector.value;
        
        if (!customerId) {
            clearCustomerData();
            return;
        }
        
        const customers = getStoredCustomers();
        const customer = customers.find(c => c.id === customerId);
        
        if (customer) {
            elements.billTo().value = customer.name;
            elements.customerTRNField().value = customer.trn || '';
            elements.customerAddressField().value = customer.address || '';
            elements.customerPhoneField().value = customer.phone || '';
            
            // Auto-expand textareas
            autoExpand.call(elements.billTo());
            autoExpand.call(elements.customerAddressField());
            
            showMessage(`Customer "${customer.name}" selected`, 'success');
        }
    }
    window.selectCustomer = selectCustomer;

    function clearCustomerData() {
        elements.billTo().value = '';
        elements.customerTRNField().value = '';
        elements.customerAddressField().value = '';
        elements.customerPhoneField().value = '';
        elements.customerSelector().value = '';
        
        // Auto-expand textareas
        autoExpand.call(elements.billTo());
        autoExpand.call(elements.customerAddressField());
    }
    window.clearCustomerData = clearCustomerData;

    function clearCustomerForm() {
        document.getElementById('customerName').value = '';
        document.getElementById('customerTRN').value = '';
        document.getElementById('customerAddress').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerEmail').value = '';
    }
    window.clearCustomerForm = clearCustomerForm;

    function filterCustomers() {
        const searchTerm = elements.customerSearch().value.toLowerCase();
        const customerCards = elements.customerList().querySelectorAll('.customer-card');
        let visibleCount = 0;
        
        customerCards.forEach(card => {
            const name = card.querySelector('h4').textContent.toLowerCase();
            const info = card.querySelector('.customer-info').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || info.includes(searchTerm)) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        elements.customerCount().textContent = visibleCount;
    }
    window.filterCustomers = filterCustomers;

    function loadCustomersGrid() {
        const customers = getStoredCustomers();
        const container = elements.customerList();
        
        container.innerHTML = '';
        
        if (customers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6c757d;">
                    <h3>No customers yet</h3>
                    <p>Add your first customer to get started!</p>
                    <button onclick="showAddCustomer()" class="btn btn-primary">➕ Add Customer</button>
                </div>
            `;
            elements.customerCount().textContent = '0';
            return;
        }
        
        customers.forEach(customer => {
            const card = document.createElement('div');
            card.className = 'customer-card';
            
            const contactInfo = [];
            if (customer.phone) contactInfo.push(`📞 ${customer.phone}`);
            if (customer.email) contactInfo.push(`📧 ${customer.email}`);
            if (customer.trn) contactInfo.push(`🏢 TRN: ${customer.trn}`);
            
            card.innerHTML = `
                <h4>${escapeHtml(customer.name)}</h4>
                <div class="customer-info">
                    ${customer.address ? `<div>📍 ${escapeHtml(customer.address)}</div>` : ''}
                    ${contactInfo.length > 0 ? `<div>${contactInfo.join(' • ')}</div>` : ''}
                    <div style="font-size: 0.8rem; color: #adb5bd; margin-top: 0.5rem;">
                        Added: ${new Date(customer.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="customer-actions">
                    <button onclick="editCustomer('${customer.id}')" class="btn btn-primary btn-sm">✏️ Edit</button>
                    <button onclick="deleteCustomer('${customer.id}')" class="btn btn-danger btn-sm">🗑️ Delete</button>
                    <button onclick="useCustomer('${customer.id}')" class="btn btn-success btn-sm">📄 Use</button>
                </div>
            `;
            
            container.appendChild(card);
        });
        
        elements.customerCount().textContent = customers.length;
    }

    function useCustomer(customerId) {
        elements.customerSelector().value = customerId;
        selectCustomer();
        hideCustomerManager();
    }
    window.useCustomer = useCustomer;

    function loadCustomerSelector() {
        const customers = getStoredCustomers();
        const selector = elements.customerSelector();
        
        // Keep current selection
        const currentValue = selector.value;
        
        selector.innerHTML = '<option value="">Select existing customer...</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            selector.appendChild(option);
        });
        
        // Restore selection if still valid
        if (currentValue && customers.find(c => c.id === currentValue)) {
            selector.value = currentValue;
        }
    }

    function loadCustomers() {
        loadCustomerSelector();
        if (elements.customerList()) {
            loadCustomersGrid();
        }
    }

    // ============================================================================
    // INVOICE SAVING & LOADING
    // ============================================================================

    function saveInvoice(showSuccessMessage = true) {
        if (showSuccessMessage) {
            showLoading('Saving invoice...');
        }
        
        try {
            const invoiceData = collectInvoiceData();
            
            if (!invoiceData.invoiceNumber) {
                showMessage('Invoice number is required', 'error');
                if (showSuccessMessage) hideLoading();
                return;
            }
            
            const invoices = getStoredInvoices();
            const existingIndex = invoices.findIndex(inv => inv.invoiceNumber === invoiceData.invoiceNumber);
            
            if (existingIndex >= 0) {
                invoices[existingIndex] = invoiceData;
            } else {
                invoices.push(invoiceData);
            }
            
            saveInvoices(invoices);
            
            // Only show success message if requested (manual saves)
            if (showSuccessMessage) {
                showMessage(`Invoice ${invoiceData.invoiceNumber} saved successfully!`, 'success');
            }
            
            // Sync to cloud silently
            if (CONFIG.CLOUD.ENABLED) {
                syncInvoicesToCloud(invoices);
            }
            
            state.isDirty = false;
        } catch (error) {
            console.error('Error saving invoice:', error);
            if (showSuccessMessage) {
                showMessage('Error saving invoice', 'error');
            }
        } finally {
            if (showSuccessMessage) {
                hideLoading();
            }
        }
    }
    window.saveInvoice = saveInvoice;

    function collectInvoiceData() {
        const items = [];
        
        elements.itemsBody().querySelectorAll('.item-row').forEach(row => {
            const description = row.querySelector('.description-input').value;
            const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
            const rate = parseFloat(row.querySelector('.rate-input').value) || 0;
            
            if (description || quantity > 0 || rate > 0) {
                items.push({
                    description,
                    quantity,
                    rate,
                    amount: quantity * rate,
                    vat: quantity * rate * CONFIG.VAT_RATE,
                    total: quantity * rate * (1 + CONFIG.VAT_RATE)
                });
            }
        });
        
        return {
            id: state.currentInvoiceId || generateId(),
            invoiceNumber: elements.invoiceNumber().value,
            invoiceDate: elements.invoiceDate().value,
            billTo: elements.billTo().value,
            customerTRN: elements.customerTRNField().value,
            customerAddress: elements.customerAddressField().value,
            customerPhone: elements.customerPhoneField().value,
            items,
            subtotal: parseFloat(elements.subtotal().textContent.replace(/[^\d.]/g, '')) || 0,
            totalVAT: parseFloat(elements.totalVAT().textContent.replace(/[^\d.]/g, '')) || 0,
            grandTotal: parseFloat(elements.grandTotal().textContent.replace(/[^\d.]/g, '')) || 0,
            amountInWords: elements.amountInWords().textContent,
            template: state.currentTemplate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    function loadInvoice(invoiceData) {
        try {
            // Load basic data
            elements.invoiceNumber().value = invoiceData.invoiceNumber || '';
            elements.invoiceDate().value = invoiceData.invoiceDate || '';
            elements.billTo().value = invoiceData.billTo || '';
            elements.customerTRNField().value = invoiceData.customerTRN || '';
            elements.customerAddressField().value = invoiceData.customerAddress || '';
            elements.customerPhoneField().value = invoiceData.customerPhone || '';
            
            // Load template
            if (invoiceData.template) {
                selectTemplate(invoiceData.template);
            }
            
            // Clear existing items
            elements.itemsBody().innerHTML = '';
            
            // Load items
            if (invoiceData.items && invoiceData.items.length > 0) {
                invoiceData.items.forEach((item, index) => {
                    if (index === 0 && elements.itemsBody().children.length === 0) {
                        // Use existing row if it's the first item and table is empty
                        addItem();
                    } else {
                        addItem();
                    }
                    
                    const row = elements.itemsBody().lastElementChild;
                    row.querySelector('.description-input').value = item.description || '';
                    row.querySelector('.quantity-input').value = item.quantity || 0;
                    row.querySelector('.rate-input').value = item.rate || 0;
                });
            } else {
                // Ensure at least one item row
                addItem();
            }
            
            // Auto-expand textareas
            autoExpand.call(elements.billTo());
            autoExpand.call(elements.customerAddressField());
            
            const descriptions = document.querySelectorAll('.description-input');
            descriptions.forEach(desc => autoExpand.call(desc));
            
            // Recalculate totals
            calculateTotals();
            
            // Update date display
            updateDateDisplay();
            
            showMessage(`Invoice ${invoiceData.invoiceNumber} loaded successfully!`, 'success');
            
            state.isDirty = false;
        } catch (error) {
            console.error('Error loading invoice:', error);
            showMessage('Error loading invoice', 'error');
        }
    }

    function newInvoice() {
        if (state.isDirty && !confirm('You have unsaved changes. Create new invoice anyway?')) {
            return;
        }
        
        // Reset form
        elements.invoiceDate().value = new Date().toISOString().split('T')[0];
        elements.invoiceNumber().value = generateInvoiceNumber();
        clearCustomerData();
        
        // Reset items
        elements.itemsBody().innerHTML = '';
        addItem();
        
        calculateTotals();
        
        // Update date display
        updateDateDisplay();
        
        showMessage('New invoice created', 'success');
        state.isDirty = false;
        state.currentInvoiceId = null; // Reset current invoice ID
    }
    window.newInvoice = newInvoice;

    // ============================================================================
    // SAVED INVOICES
    // ============================================================================

    function showSavedInvoices() {
        const modal = elements.savedInvoicesModal();
        modal.style.display = 'flex';
        loadSavedInvoicesList();
    }
    window.showSavedInvoices = showSavedInvoices;

    function closeSavedInvoices() {
        elements.savedInvoicesModal().style.display = 'none';
    }
    window.closeSavedInvoices = closeSavedInvoices;

    function loadSavedInvoicesList() {
        showLoading('Loading invoices...');
        
        setTimeout(() => {
            const invoices = getStoredInvoices();
            const container = elements.savedInvoicesList();
            
            container.innerHTML = '';
            
            if (invoices.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #6c757d;">
                        <h3>No saved invoices</h3>
                        <p>Create your first invoice to get started!</p>
                    </div>
                `;
                document.getElementById('invoiceCount').textContent = '0';
                hideLoading();
                return;
            }
            
            invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            invoices.forEach(invoice => {
                const item = document.createElement('div');
                item.className = 'invoice-item';
                
                const date = new Date(invoice.createdAt).toLocaleDateString();
                const itemCount = invoice.items ? invoice.items.length : 0;
                const amount = formatCurrency(invoice.grandTotal || 0);
                
                item.innerHTML = `
                    <div class="invoice-info">
                        <h4>Invoice ${escapeHtml(invoice.invoiceNumber)}</h4>
                        <p><strong>Customer:</strong> ${escapeHtml(invoice.billTo || 'N/A')}</p>
                        <p><strong>Date:</strong> ${date} | <strong>Items:</strong> ${itemCount} | <strong>Total:</strong> ${amount} AED</p>
                    </div>
                    <div class="invoice-actions">
                        <button onclick="loadSavedInvoice('${invoice.id}')" class="btn btn-primary btn-sm">📄 Load</button>
                        <button onclick="downloadSavedInvoicePDF('${invoice.id}')" class="btn btn-info btn-sm">📥 PDF</button>
                        <button onclick="duplicateInvoice('${invoice.id}')" class="btn btn-secondary btn-sm">📋 Copy</button>
                        <button onclick="deleteSavedInvoice('${invoice.id}')" class="btn btn-danger btn-sm">🗑️ Delete</button>
                    </div>
                `;
                
                container.appendChild(item);
            });
            
            document.getElementById('invoiceCount').textContent = invoices.length;
            hideLoading();
        }, 500);
    }

    function loadSavedInvoice(invoiceId) {
        const invoices = getStoredInvoices();
        const invoice = invoices.find(inv => inv.id === invoiceId);
        
        if (!invoice) {
            showMessage('Invoice not found', 'error');
            return;
        }
        
        if (state.isDirty && !confirm('You have unsaved changes. Load invoice anyway?')) {
            return;
        }
        
        loadInvoice(invoice);
        closeSavedInvoices();
    }
    window.loadSavedInvoice = loadSavedInvoice;

    function duplicateInvoice(invoiceId) {
        const invoices = getStoredInvoices();
        const invoice = invoices.find(inv => inv.id === invoiceId);
        
        if (!invoice) {
            showMessage('Invoice not found', 'error');
            return;
        }
        
        // Create copy with new invoice number and date
        const duplicate = {
            ...invoice,
            id: generateId(),
            invoiceNumber: generateInvoiceNumber(),
            invoiceDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        loadInvoice(duplicate);
        closeSavedInvoices();
        
        showMessage('Invoice duplicated successfully!', 'success');
    }
    window.duplicateInvoice = duplicateInvoice;

    function deleteSavedInvoice(invoiceId) {
        const invoices = getStoredInvoices();
        const invoice = invoices.find(inv => inv.id === invoiceId);
        
        if (!invoice) {
            showMessage('Invoice not found', 'error');
            return;
        }
        
        if (!confirm(`Delete Invoice ${invoice.invoiceNumber}?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
        saveInvoices(updatedInvoices);
        
        loadSavedInvoicesList();
        showMessage(`Invoice ${invoice.invoiceNumber} deleted`, 'success');
        
        if (CONFIG.CLOUD.ENABLED) {
            syncInvoicesToCloud(updatedInvoices);
        }
    }
    window.deleteSavedInvoice = deleteSavedInvoice;

    function downloadSavedInvoicePDF(invoiceId) {
        const invoices = getStoredInvoices();
        const invoice = invoices.find(inv => inv.id === invoiceId);
        
        if (!invoice) {
            showMessage('Invoice not found', 'error');
            return;
        }
        
        // Load invoice temporarily and generate PDF
        const originalData = collectInvoiceData();
        loadInvoice(invoice);
        
        setTimeout(() => {
            generatePDF();
            // Restore original invoice
            setTimeout(() => loadInvoice(originalData), 1000);
        }, 500);
    }
    window.downloadSavedInvoicePDF = downloadSavedInvoicePDF;

    function filterInvoices() {
        const searchTerm = document.getElementById('invoiceSearch').value.toLowerCase();
        const filterType = document.getElementById('invoiceFilter').value;
        const invoiceItems = elements.savedInvoicesList().querySelectorAll('.invoice-item');
        
        let visibleCount = 0;
        const today = new Date();
        
        invoiceItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const dateMatch = item.textContent.match(/Date:\s*(\d+\/\d+\/\d+)/);
            let showItem = true;
            
            // Text filter
            if (searchTerm && !text.includes(searchTerm)) {
                showItem = false;
            }
            
            // Date filter
            if (showItem && filterType !== 'all' && dateMatch) {
                const itemDate = new Date(dateMatch[1]);
                const daysDiff = (today - itemDate) / (1000 * 60 * 60 * 24);
                
                switch (filterType) {
                    case 'recent':
                        showItem = daysDiff <= 30;
                        break;
                    case 'this-month':
                        showItem = itemDate.getMonth() === today.getMonth() && 
                                  itemDate.getFullYear() === today.getFullYear();
                        break;
                    case 'last-month':
                        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        showItem = itemDate.getMonth() === lastMonth.getMonth() && 
                                  itemDate.getFullYear() === lastMonth.getFullYear();
                        break;
                }
            }
            
            item.style.display = showItem ? 'flex' : 'none';
            if (showItem) visibleCount++;
        });
        
        document.getElementById('invoiceCount').textContent = visibleCount;
    }
    window.filterInvoices = filterInvoices;

    // ============================================================================
    // PDF GENERATION
    // ============================================================================

    async function generatePDF() {
        showLoading('Generating PDF...');
        
        try {
            const content = elements.invoiceContent();
            
            // Check libraries
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library not loaded');
            }
            
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF library not loaded');
            }
            
            // Prepare content for PDF
            await prepareForPDF(content);
            
            // Generate canvas
            const canvas = await html2canvas(content, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                allowTaint: false,
                foreignObjectRendering: false,
                width: content.offsetWidth,
                height: content.offsetHeight
            });
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = 210;
            const pageHeight = 297;
            
            // Calculate dimensions
            const imgProps = pdf.getImageProperties(canvas.toDataURL('image/png'));
            const pdfWidth = pageWidth;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let height = pdfHeight;
            if (pdfHeight > pageHeight) {
                height = pageHeight;
            }
            
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, height);
            
            const filename = `Alakaifak-Invoice-${elements.invoiceNumber().value || 'new'}.pdf`;
            pdf.save(filename);
            
            showMessage('PDF generated successfully!', 'success');
            
        } catch (error) {
            console.error('PDF generation failed:', error);
            showMessage('PDF generation failed. Please try again.', 'error');
        } finally {
            restoreAfterPDF();
            hideLoading();
        }
    }
    window.generatePDF = generatePDF;

    async function prepareForPDF(content) {
        // Hide no-print elements
        const noPrintElements = content.querySelectorAll('.no-print');
        noPrintElements.forEach(el => {
            el.style.display = 'none';
            el.setAttribute('data-hidden-for-pdf', 'true');
        });
        
        // Convert inputs to text for better PDF rendering
        const inputs = content.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (input.value) {
                const span = document.createElement('span');
                span.textContent = input.value;
                span.style.cssText = window.getComputedStyle(input).cssText;
                span.style.border = 'none';
                span.style.background = 'transparent';
                span.style.outline = 'none';
                span.className = 'pdf-replacement';
                
                input.style.display = 'none';
                input.parentNode.insertBefore(span, input);
                input.setAttribute('data-hidden-for-pdf', 'true');
            }
        });
        
        // Wait for layout
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    function restoreAfterPDF() {
        const hiddenElements = document.querySelectorAll('[data-hidden-for-pdf]');
        hiddenElements.forEach(el => {
            el.style.display = '';
            el.removeAttribute('data-hidden-for-pdf');
        });
        
        const replacements = document.querySelectorAll('.pdf-replacement');
        replacements.forEach(span => span.remove());
    }

    function printInvoice() {
        window.print();
    }
    window.printInvoice = printInvoice;

    // ============================================================================
    // EMAIL FUNCTIONALITY
    // ============================================================================
    
    function createBilingualEmailMessage() {
        const invoiceNumber = elements.invoiceNumber().value;
        const customerName = elements.billTo().value || 'Valued Customer';
        const grandTotal = elements.grandTotal().textContent;
        const invoiceDate = elements.invoiceDate().value;
        
        return `Dear ${customerName},

We are pleased to send you Invoice #${invoiceNumber} for the moving services provided by Alakaifak Furniture Movers.

The detailed invoice is attached as a PDF file for your records.

Thank you for choosing our professional moving services. We appreciate your business and look forward to serving you again.

Best regards,
Alakaifak Furniture Movers Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

عميلنا المحترم ${customerName}،

يسعدنا أن نرسل لكم فاتورة رقم ${invoiceNumber} لخدمات نقل الأثاث المقدمة من مؤسسة على كيفك لنقل الأثاث.

الفاتورة المفصّلة مرفقة بصيغة PDF لسجلاتكم.

شكراً لاختياركم خدماتنا المهنية لنقل الأثاث. نقدّر ثقتكم ونتطلع إلى خدمتكم مرة أخرى.

مع أطيب التحيات،
فريق مؤسسة على كيفك لنقل الأثاث

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INVOICE DETAILS:
• Invoice Number: ${invoiceNumber}
• Date: ${invoiceDate}
• Total Amount: ${grandTotal}

تفاصيل الفاتورة:
• رقم الفاتورة: ${invoiceNumber}
• التاريخ: ${invoiceDate}
• المبلغ الإجمالي: ${grandTotal}

CONTACT / التواصل:
📞 Phone: +971 508199942 | +971 509100787
📧 Email: alakefakcomp@gmail.com
🌐 Website: www.alakefakfurnituremovers.com`;
    }
    
    async function generatePDFBlob() {
        try {
            const content = elements.invoiceContent();
            
            // Prepare content for PDF
            await prepareForPDF(content);
            
            // Generate canvas
            const canvas = await html2canvas(content, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                allowTaint: false,
                foreignObjectRendering: false,
                width: content.offsetWidth,
                height: content.offsetHeight
            });
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = 210;
            const pageHeight = 297;
            
            // Calculate dimensions
            const imgProps = pdf.getImageProperties(canvas.toDataURL('image/png'));
            const pdfWidth = pageWidth;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let height = pdfHeight;
            if (pdfHeight > pageHeight) {
                height = pageHeight;
            }
            
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, height);
            
            // Return blob instead of downloading
            const pdfBlob = pdf.output('blob');
            
            restoreAfterPDF();
            return pdfBlob;
            
        } catch (error) {
            restoreAfterPDF();
            throw error;
        }
    }

    function emailInvoice() {
        const modal = elements.emailModal();
        
        // Pre-fill email if customer has email
        const customerEmail = elements.customerPhoneField().value; // This should be email field
        if (customerEmail && customerEmail.includes('@')) {
            document.getElementById('emailTo').value = customerEmail;
        }
        
        // Pre-fill subject
        const invoiceNumber = elements.invoiceNumber().value;
        document.getElementById('emailSubject').value = `Invoice ${invoiceNumber} from Alakaifak Mover`;
        
        modal.style.display = 'flex';
    }
    window.emailInvoice = emailInvoice;

    function closeEmailModal() {
        elements.emailModal().style.display = 'none';
    }
    window.closeEmailModal = closeEmailModal;

    async function sendInvoiceEmail() {
        const emailTo = document.getElementById('emailTo').value;
        const subject = document.getElementById('emailSubject').value;
        const message = document.getElementById('emailMessage').value;
        
        if (!emailTo) {
            showMessage('Please enter recipient email', 'error');
            return;
        }
        
        try {
            showLoading('Preparing email with PDF attachment...');
            
            // Generate PDF first
            const pdfBlob = await generatePDFBlob();
            
            // Create professional bilingual message
            const bilingualMessage = createBilingualEmailMessage();
            
            // Create Gmail compose URL with pre-filled fields
            const gmailUrl = `https://mail.google.com/mail/u/0/?view=cm&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bilingualMessage)}&tf=1`;
            
            // Open Gmail compose in new tab
            window.open(gmailUrl, '_blank');
            
            closeEmailModal();
            hideLoading();
            showMessage('📎 Gmail opened! Please attach the downloaded PDF to your email.', 'success');
            
            // Auto-download PDF for attachment
            setTimeout(() => {
                generatePDF(); // This will download the PDF
                showMessage('📁 PDF downloaded! Drag it to your Gmail to attach.', 'info');
            }, 1000);
            
        } catch (error) {
            console.error('Email preparation failed:', error);
            showMessage('Failed to prepare email. Please try again.', 'error');
            hideLoading();
        }
    }
    window.sendInvoiceEmail = sendInvoiceEmail;

    // ============================================================================
    // TEMPLATE MANAGEMENT
    // ============================================================================

    function showTemplateSelector() {
        elements.templateSelector().style.display = 'block';
    }
    window.showTemplateSelector = showTemplateSelector;

    function hideTemplateSelector() {
        elements.templateSelector().style.display = 'none';
    }
    window.hideTemplateSelector = hideTemplateSelector;

    function selectTemplate(templateName) {
        const container = elements.invoiceContent();
        
        // Remove existing template classes
        container.className = container.className.replace(/template-\w+/g, '');
        
        // Add new template class
        container.classList.add(`template-${templateName}`);
        
        // Update active template option
        const options = document.querySelectorAll('.template-option');
        options.forEach(option => {
            option.classList.toggle('active', option.dataset.template === templateName);
        });
        
        state.currentTemplate = templateName;
        localStorage.setItem('selectedTemplate', templateName);
        
        showMessage(`Template changed to ${templateName}`, 'success');
    }
    window.selectTemplate = selectTemplate;

    // ============================================================================
    // ASSET MANAGEMENT
    // ============================================================================

    function handleLogoUpload(event) {
        handleAssetUpload(event, 'logo');
    }
    window.handleLogoUpload = handleLogoUpload;

    function handleStampUpload(event) {
        handleAssetUpload(event, 'stamp');
    }
    window.handleStampUpload = handleStampUpload;

    function handleAssetUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showMessage('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            showMessage('Image file too large. Please select a file under 2MB.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            
            // Store asset
            const assets = getStoredAssets();
            assets[type] = imageData;
            saveAssets(assets);
            
            // Display asset
            const imgElement = type === 'logo' ? elements.companyLogo() : elements.companyStamp();
            imgElement.src = imageData;
            imgElement.style.display = 'block';
            
            // Hide stamp placeholder if it's a stamp
            if (type === 'stamp') {
                const placeholder = document.getElementById('stampPlaceholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            }
            
            showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`, 'success');
        };
        
        reader.readAsDataURL(file);
    }

    function removeAsset(type) {
        if (!confirm(`Remove ${type}?`)) return;
        
        const assets = getStoredAssets();
        delete assets[type];
        saveAssets(assets);
        
        const imgElement = type === 'logo' ? elements.companyLogo() : elements.companyStamp();
        imgElement.src = '';
        imgElement.style.display = 'none';
        
        showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`, 'success');
    }
    window.removeAsset = removeAsset;

    function adjustLogoSize(size) {
        const logo = elements.companyLogo();
        if (logo && logo.src) {
            logo.style.maxWidth = size + 'px';
            logo.style.maxHeight = size + 'px';
            logo.style.width = 'auto';
            logo.style.height = 'auto';
        }
        
        const sizeValue = document.getElementById('logoSizeValue');
        if (sizeValue) {
            sizeValue.textContent = size + 'px';
        }
        
        // Store preference
        localStorage.setItem('logoSize', size);
        
        console.log(`📏 Logo size adjusted to ${size}px`);
    }
    window.adjustLogoSize = adjustLogoSize;

    function adjustStampSize(size) {
        const stamp = elements.companyStamp();
        if (stamp && stamp.src) {
            stamp.style.maxWidth = size + 'px';
            stamp.style.maxHeight = size + 'px';
            stamp.style.width = 'auto';
            stamp.style.height = 'auto';
        }
        
        const sizeValue = document.getElementById('stampSizeValue');
        if (sizeValue) {
            sizeValue.textContent = size + 'px';
        }
        
        // Store preference
        localStorage.setItem('stampSize', size);
        
        console.log(`📏 Stamp size adjusted to ${size}px`);
    }
    window.adjustStampSize = adjustStampSize;

    function loadAssets() {
        const assets = getStoredAssets();
        
        if (assets.logo) {
            elements.companyLogo().src = assets.logo;
            elements.companyLogo().style.display = 'block';
        }
        
        if (assets.stamp) {
            elements.companyStamp().src = assets.stamp;
            elements.companyStamp().style.display = 'block';
        }
    }

    // ============================================================================
    // CLOUD SYNC
    // ============================================================================

    async function syncFromCloud() {
        if (!CONFIG.CLOUD.ENABLED || !window.database) return;
        
        try {
            console.log('🔄 Syncing from Firebase...');
            
            // Sync invoices from Firebase
            const invoicesRef = window.database.ref('invoices');
            const invoicesSnapshot = await invoicesRef.once('value');
            const cloudInvoices = invoicesSnapshot.val() ? Object.values(invoicesSnapshot.val()) : [];
            
            if (cloudInvoices.length > 0) {
                const localInvoices = getStoredInvoices();
                const mergedInvoices = mergeData(cloudInvoices, localInvoices, 'id');
                saveInvoices(mergedInvoices);
                console.log(`📄 Synced ${cloudInvoices.length} invoices from cloud`);
            }
            
            // Sync customers from Firebase
            const customersRef = window.database.ref('customers');
            const customersSnapshot = await customersRef.once('value');
            const cloudCustomers = customersSnapshot.val() ? Object.values(customersSnapshot.val()) : [];
            
            if (cloudCustomers.length > 0) {
                const localCustomers = getStoredCustomers();
                const mergedCustomers = mergeData(cloudCustomers, localCustomers, 'id');
                saveCustomers(mergedCustomers);
                loadCustomers();
                console.log(`👥 Synced ${cloudCustomers.length} customers from cloud`);
            }
            
            updateSyncStatus(true, 'Cloud Synced');
            console.log('✅ Firebase sync completed');
        } catch (error) {
            console.warn('⚠️ Firebase sync failed:', error.message);
            updateSyncStatus(false, 'Sync Failed');
        }
    }

    async function syncInvoicesToCloud(invoices) {
        if (!CONFIG.CLOUD.ENABLED || !window.database) return;
        
        try {
            const invoicesRef = window.database.ref('invoices');
            
            // Convert invoices array to object with IDs as keys for Firebase
            const invoicesObject = {};
            invoices.forEach(invoice => {
                invoicesObject[invoice.id] = {
                    ...invoice,
                    lastSynced: new Date().toISOString()
                };
            });
            
            await invoicesRef.set(invoicesObject);
            console.log(`📤 ${invoices.length} invoices synced to cloud`);
            updateSyncStatus(true, 'Cloud Synced');
        } catch (error) {
            console.warn('⚠️ Invoice cloud sync failed:', error);
            updateSyncStatus(false, 'Sync Failed');
        }
    }

    async function syncCustomersToCloud(customers) {
        if (!CONFIG.CLOUD.ENABLED || !window.database) return;
        
        try {
            const customersRef = window.database.ref('customers');
            
            // Convert customers array to object with IDs as keys for Firebase
            const customersObject = {};
            customers.forEach(customer => {
                customersObject[customer.id] = {
                    ...customer,
                    lastSynced: new Date().toISOString()
                };
            });
            
            await customersRef.set(customersObject);
            console.log(`📤 ${customers.length} customers synced to cloud`);
            updateSyncStatus(true, 'Cloud Synced');
        } catch (error) {
            console.warn('⚠️ Customer cloud sync failed:', error);
            updateSyncStatus(false, 'Sync Failed');
        }
    }

    function updateSyncStatus(isOnline, message) {
        const syncIndicators = document.querySelectorAll('.sync-indicator');
        syncIndicators.forEach(indicator => {
            indicator.className = `sync-indicator ${isOnline ? 'online' : 'offline'}`;
            indicator.textContent = `☁️ ${message}`;
        });
    }

    function mergeData(cloudData, localData, keyField) {
        const merged = [...cloudData];
        
        localData.forEach(localItem => {
            const existsInCloud = merged.some(cloudItem => 
                cloudItem[keyField] === localItem[keyField]
            );
            
            if (!existsInCloud) {
                merged.push(localItem);
            }
        });
        
        return merged.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    function autoExpand() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    }

    function formatCurrency(amount) {
        return parseFloat(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function numberToWords(amount) {
        const ones = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 
                     'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 
                     'Seventeen', 'Eighteen', 'Nineteen'];
        
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        function toWords(n) {
            if (n === 0) return 'Zero';
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n/10)] + (n % 10 ? ' ' + ones[n % 10] : '');
            if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
            if (n < 1000000) {
                return toWords(Math.floor(n/1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
            }
            return n.toLocaleString();
        }
        
        const whole = Math.floor(amount);
        const fils = Math.round((amount - whole) * 100);
        
        let result = toWords(whole) + ' AED';
        if (fils > 0) {
            result += ' and ' + toWords(fils) + ' Fils';
        }
        
        return result;
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showLoading(text = 'Processing...') {
        const loading = elements.loadingIndicator();
        document.getElementById('loadingText').textContent = text;
        loading.style.display = 'flex';
    }

    function hideLoading() {
        elements.loadingIndicator().style.display = 'none';
    }

    function showMessage(message, type = 'info') {
        const container = elements.messageContainer();
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        container.appendChild(messageEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
        
        // Remove on click
        messageEl.addEventListener('click', () => messageEl.remove());
    }

    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    function optimizeForMobile() {
        if (isMobileDevice()) {
            document.body.classList.add('mobile-device');
            console.log('📱 Mobile optimization applied');
        }
    }

    function handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    saveInvoice();
                    break;
                case 'p':
                    event.preventDefault();
                    printInvoice();
                    break;
                case 'n':
                    event.preventDefault();
                    newInvoice();
                    break;
            }
        }
    }

    function handleBeforeUnload(event) {
        if (state.isDirty) {
            const message = 'You have unsaved changes. Are you sure you want to leave?';
            event.returnValue = message;
            return message;
        }
    }

    function autoSave() {
        if (state.isDirty && elements.invoiceNumber().value) {
            console.log('💾 Auto-saving silently...');
            saveInvoice(false); // Silent save - no success message
        }
    }

    function toggleEdit(fieldId) {
        const field = document.getElementById(fieldId);
        if (field.readOnly) {
            field.readOnly = false;
            field.focus();
            showMessage(`${fieldId} is now editable`, 'info');
        } else {
            field.readOnly = true;
            showMessage(`${fieldId} is now locked`, 'info');
        }
    }
    window.toggleEdit = toggleEdit;

    // ============================================================================
    // INVOICE STATUS & NOTES MANAGEMENT
    // ============================================================================

    function showInvoiceStatus() {
        // Hide all other views
        document.querySelector('.main-container').style.display = 'none';
        elements.customerManager().style.display = 'none';
        elements.templateSelector().style.display = 'none';
        
        // Show status page
        const statusPage = document.getElementById('statusPage');
        if (statusPage) {
            statusPage.style.display = 'block';
            loadStatusPage();
        }
    }
    window.showInvoiceStatus = showInvoiceStatus;
    
    function hideStatusPage() {
        document.getElementById('statusPage').style.display = 'none';
        document.querySelector('.main-container').style.display = 'grid';
    }
    window.hideStatusPage = hideStatusPage;
    
    function loadStatusPage() {
        const invoices = getStoredInvoices();
        const statusList = document.getElementById('statusList');
        
        if (!statusList) return;
        
        statusList.innerHTML = '';
        
        if (invoices.length === 0) {
            statusList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6c757d; grid-column: 1/-1;">
                    <h3>No invoices found</h3>
                    <p>Create some invoices first to track their payment status</p>
                </div>
            `;
            document.getElementById('statusCount').textContent = '0';
            updateSummaryCards([], []);
            return;
        }
        
        let statusCount = 0;
        const statusStats = { paid: 0, unpaid: 0, partial: 0 };
        let totalOutstanding = 0;
        
        invoices.forEach(invoice => {
            const statusKey = `invoice_status_${invoice.invoiceNumber}`;
            const statusData = localStorage.getItem(statusKey);
            const status = statusData ? JSON.parse(statusData) : { status: 'unpaid', notes: '', paymentDate: '', paymentAmount: null };
            
            // Update statistics
            statusStats[status.status]++;
            if (status.status === 'unpaid') {
                totalOutstanding += invoice.grandTotal || 0;
            } else if (status.status === 'partial' && status.paymentAmount) {
                totalOutstanding += (invoice.grandTotal || 0) - status.paymentAmount;
            }
            
            const statusCard = document.createElement('div');
            statusCard.className = 'status-card';
            
            const statusBadge = getStatusBadge(status.status);
            const formattedDate = formatDateToShort(invoice.invoiceDate);
            const amount = formatCurrency(invoice.grandTotal || 0);
            
            statusCard.innerHTML = `
                <div class="status-card-header">
                    <h4>Invoice #${invoice.invoiceNumber}</h4>
                    ${statusBadge}
                </div>
                <div class="status-card-info">
                    <p><strong>Customer:</strong> ${escapeHtml(invoice.billTo || 'N/A')}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Amount:</strong> ${amount} AED</p>
                    ${status.paymentDate ? `<p><strong>Payment Date:</strong> ${status.paymentDate}</p>` : ''}
                    ${status.paymentAmount ? `<p><strong>Paid Amount:</strong> ${formatCurrency(status.paymentAmount)} AED</p>` : ''}
                    ${status.notes ? `<p><strong>Notes:</strong> ${escapeHtml(status.notes.substring(0, 100))}${status.notes.length > 100 ? '...' : ''}</p>` : ''}
                </div>
                <div class="status-card-actions">
                    <button onclick="editInvoiceStatus('${invoice.invoiceNumber}')" class="btn btn-primary btn-sm">📝 Edit Status</button>
                    <button onclick="loadSavedInvoice('${invoice.id}')" class="btn btn-secondary btn-sm">📄 View Invoice</button>
                </div>
            `;
            
            statusList.appendChild(statusCard);
            statusCount++;
        });
        
        document.getElementById('statusCount').textContent = statusCount;
        updateSummaryCards(statusStats, totalOutstanding);
    }
    
    function updateSummaryCards(stats, totalOutstanding) {
        const paidCountEl = document.getElementById('paidCount');
        const unpaidCountEl = document.getElementById('unpaidCount');
        const partialCountEl = document.getElementById('partialCount');
        const totalAmountEl = document.getElementById('totalAmount');
        
        if (paidCountEl) paidCountEl.textContent = stats.paid || 0;
        if (unpaidCountEl) unpaidCountEl.textContent = stats.unpaid || 0;
        if (partialCountEl) partialCountEl.textContent = stats.partial || 0;
        if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalOutstanding || 0);
    }
    
    function getStatusBadge(status) {
        switch(status) {
            case 'paid':
                return '<span class="status-badge-card status-paid">✅ Paid</span>';
            case 'partial':
                return '<span class="status-badge-card status-partial">🟡 Partial</span>';
            default:
                return '<span class="status-badge-card status-unpaid">🔴 Unpaid</span>';
        }
    }
    
    function editInvoiceStatus(invoiceNumber) {
        // Load the specific invoice for editing
        const invoices = getStoredInvoices();
        const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
        
        if (invoice) {
            loadInvoice(invoice);
            showInvoiceStatusModal();
        }
    }
    window.editInvoiceStatus = editInvoiceStatus;
    
    function filterStatusList() {
        const searchTerm = document.getElementById('statusSearch').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const statusCards = document.querySelectorAll('.status-card');
        
        let visibleCount = 0;
        const visibleStats = { paid: 0, unpaid: 0, partial: 0 };
        let visibleOutstanding = 0;
        
        statusCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            let show = true;
            
            // Text search
            if (searchTerm && !text.includes(searchTerm)) {
                show = false;
            }
            
            // Status filter
            if (show && statusFilter !== 'all') {
                const cardStatus = card.querySelector('.status-badge-card');
                if (cardStatus) {
                    const cardStatusClass = cardStatus.className;
                    if (statusFilter === 'paid' && !cardStatusClass.includes('status-paid')) show = false;
                    if (statusFilter === 'unpaid' && !cardStatusClass.includes('status-unpaid')) show = false;
                    if (statusFilter === 'partial' && !cardStatusClass.includes('status-partial')) show = false;
                }
            }
            
            card.style.display = show ? 'block' : 'none';
            if (show) {
                visibleCount++;
                
                // Update visible statistics
                const cardStatus = card.querySelector('.status-badge-card');
                if (cardStatus) {
                    const cardStatusClass = cardStatus.className;
                    if (cardStatusClass.includes('status-paid')) {
                        visibleStats.paid++;
                    } else if (cardStatusClass.includes('status-unpaid')) {
                        visibleStats.unpaid++;
                        // Extract amount from card text
                        const amountMatch = card.textContent.match(/Amount:\s*([\d,]+\.\d{2})\s*AED/);
                        if (amountMatch) {
                            visibleOutstanding += parseFloat(amountMatch[1].replace(/,/g, ''));
                        }
                    } else if (cardStatusClass.includes('status-partial')) {
                        visibleStats.partial++;
                        // For partial payments, calculate remaining amount
                        const amountMatch = card.textContent.match(/Amount:\s*([\d,]+\.\d{2})\s*AED/);
                        const paidMatch = card.textContent.match(/Paid Amount:\s*([\d,]+\.\d{2})\s*AED/);
                        if (amountMatch) {
                            const total = parseFloat(amountMatch[1].replace(/,/g, ''));
                            const paid = paidMatch ? parseFloat(paidMatch[1].replace(/,/g, '')) : 0;
                            visibleOutstanding += Math.max(0, total - paid);
                        }
                    }
                }
            }
        });
        
        document.getElementById('statusCount').textContent = visibleCount;
        updateSummaryCards(visibleStats, visibleOutstanding);
    }
    window.filterStatusList = filterStatusList;
    
    function showInvoiceStatusModal() {
        const modal = document.getElementById('invoiceStatusModal');
        if (modal) {
            modal.style.display = 'flex';
            loadCurrentInvoiceStatus();
        }
    }
    window.showInvoiceStatusModal = showInvoiceStatusModal;

    function closeInvoiceStatusModal() {
        const modal = document.getElementById('invoiceStatusModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    window.closeInvoiceStatusModal = closeInvoiceStatusModal;

    function saveInvoiceStatus() {
        const status = document.querySelector('input[name="invoiceStatus"]:checked')?.value || 'unpaid';
        const paymentDate = document.getElementById('paymentDate')?.value || '';
        const paymentAmount = document.getElementById('paymentAmount')?.value || '';
        const notes = document.getElementById('invoiceNotes')?.value || '';
        
        const statusData = {
            status,
            paymentDate,
            paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
            notes,
            updatedAt: new Date().toISOString()
        };
        
        // Store status with current invoice
        const invoiceNumber = elements.invoiceNumber().value;
        if (invoiceNumber) {
            const statusKey = `invoice_status_${invoiceNumber}`;
            localStorage.setItem(statusKey, JSON.stringify(statusData));
            showMessage('Invoice status saved successfully!', 'success');
        } else {
            showMessage('Please save the invoice first before setting status', 'warning');
        }
        
        closeInvoiceStatusModal();
    }
    window.saveInvoiceStatus = saveInvoiceStatus;

    function clearInvoiceStatus() {
        document.querySelectorAll('input[name="invoiceStatus"]')[0].checked = true;
        document.getElementById('paymentDate').value = '';
        document.getElementById('paymentAmount').value = '';
        document.getElementById('invoiceNotes').value = '';
        showMessage('Status form cleared', 'info');
    }
    window.clearInvoiceStatus = clearInvoiceStatus;

    function loadCurrentInvoiceStatus() {
        const invoiceNumber = elements.invoiceNumber().value;
        if (invoiceNumber) {
            const statusKey = `invoice_status_${invoiceNumber}`;
            const statusData = localStorage.getItem(statusKey);
            
            if (statusData) {
                const data = JSON.parse(statusData);
                
                // Set status radio button
                const statusRadio = document.querySelector(`input[name="invoiceStatus"][value="${data.status}"]`);
                if (statusRadio) statusRadio.checked = true;
                
                // Set other fields
                if (data.paymentDate) document.getElementById('paymentDate').value = data.paymentDate;
                if (data.paymentAmount) document.getElementById('paymentAmount').value = data.paymentAmount;
                if (data.notes) document.getElementById('invoiceNotes').value = data.notes;
            }
        }
    }

    // ============================================================================
    // CUSTOM FIELDS MANAGEMENT
    // ============================================================================

    function addCustomField() {
        const container = document.getElementById('customFieldsList');
        if (!container) return;
        
        const fieldId = 'customField_' + Date.now();
        
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'custom-field-item';
        fieldDiv.innerHTML = `
            <div class="custom-field-row">
                <input type="text" placeholder="Field Name (e.g., Company Size)" class="custom-field-key" style="flex: 1; margin-right: 10px;">
                <input type="text" placeholder="Value (e.g., 50 employees)" class="custom-field-value" style="flex: 2; margin-right: 10px;">
                <button type="button" onclick="removeCustomField(this)" class="btn btn-sm btn-danger">✕</button>
            </div>
        `;
        
        container.appendChild(fieldDiv);
    }
    window.addCustomField = addCustomField;

    function removeCustomField(button) {
        const fieldItem = button.closest('.custom-field-item');
        if (fieldItem) {
            fieldItem.remove();
        }
    }
    window.removeCustomField = removeCustomField;

    function clearCustomFields() {
        const container = document.getElementById('customFieldsList');
        if (container) {
            container.innerHTML = '';
            showMessage('Custom fields cleared', 'info');
        }
    }
    window.clearCustomFields = clearCustomFields;

    function getCustomFieldsData() {
        const customFields = {};
        const fieldItems = document.querySelectorAll('.custom-field-item');
        
        fieldItems.forEach(item => {
            const keyInput = item.querySelector('.custom-field-key');
            const valueInput = item.querySelector('.custom-field-value');
            
            if (keyInput && valueInput && keyInput.value.trim() && valueInput.value.trim()) {
                customFields[keyInput.value.trim()] = valueInput.value.trim();
            }
        });
        
        return customFields;
    }

    function loadCustomFieldsData(customFields) {
        const container = document.getElementById('customFieldsList');
        if (!container || !customFields) return;
        
        container.innerHTML = '';
        
        Object.entries(customFields).forEach(([key, value]) => {
            addCustomField();
            const lastField = container.lastElementChild;
            if (lastField) {
                lastField.querySelector('.custom-field-key').value = key;
                lastField.querySelector('.custom-field-value').value = value;
            }
        });
    }

    // ============================================================================
    // ENHANCED DATE FORMATTING
    // ============================================================================

    function formatDateToReadable(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} ${month} ${year}`;
    }

    function formatDateToShort(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${month} ${day} ${year}`;
    }

    function setupDateFormatting() {
        const dateInput = elements.invoiceDate();
        const dateDisplay = document.getElementById('invoiceDateDisplay');
        
        if (dateInput && dateDisplay) {
            // Initialize - always show display first, hide input
            dateInput.style.display = 'none';
            dateDisplay.style.display = 'block';
            
            // Update display when date changes
            dateInput.addEventListener('change', function() {
                updateDateDisplay();
                // Auto-hide input after selection
                setTimeout(() => {
                    showDateDisplay();
                }, 100);
            });
            
            // Hide input when clicking outside
            dateInput.addEventListener('blur', function() {
                setTimeout(() => {
                    showDateDisplay();
                }, 150);
            });
            
            // Handle Enter key to close editing
            dateInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    showDateDisplay();
                }
            });
            
            // Make date display clickable
            dateDisplay.addEventListener('click', function() {
                showDateInput();
            });
            
            // Initialize date display
            updateDateDisplay();
        }
    }
    
    function updateDateDisplay() {
        const dateInput = elements.invoiceDate();
        const dateDisplay = document.getElementById('invoiceDateDisplay');
        
        if (dateInput && dateDisplay) {
            if (dateInput.value) {
                dateDisplay.textContent = formatDateToShort(dateInput.value);
                dateDisplay.style.color = '#2d3748';
            } else {
                dateDisplay.textContent = 'Click to select date';
                dateDisplay.style.color = '#a0aec0';
            }
        }
    }
    
    function showDateInput() {
        const dateInput = elements.invoiceDate();
        const dateDisplay = document.getElementById('invoiceDateDisplay');
        
        if (dateInput && dateDisplay) {
            // Force hide display first
            dateDisplay.style.display = 'none';
            // Then show input
            dateInput.style.display = 'block';
            dateInput.focus();
            console.log('✏️ Date input shown');
        }
    }
    
    function showDateDisplay() {
        const dateInput = elements.invoiceDate();
        const dateDisplay = document.getElementById('invoiceDateDisplay');
        
        if (dateInput && dateDisplay) {
            // Force hide input first
            dateInput.style.display = 'none';
            // Update and show display
            updateDateDisplay();
            dateDisplay.style.display = 'block';
            console.log('📅 Date display shown');
        }
    }
    
    function toggleDateEdit() {
        const dateInput = elements.invoiceDate();
        const dateDisplay = document.getElementById('invoiceDateDisplay');
        
        if (dateInput.style.display === 'none') {
            showDateInput();
        } else {
            showDateDisplay();
        }
    }
    window.toggleDateEdit = toggleDateEdit;

    // ============================================================================
    // STORAGE FUNCTIONS
    // ============================================================================

    function getStoredInvoices() {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.INVOICES) || '[]');
    }

    function saveInvoices(invoices) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    }

    function getStoredCustomers() {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOMERS) || '[]');
    }

    function saveCustomers(customers) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }

    function getStoredAssets() {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ASSETS) || '{}');
    }

    function saveAssets(assets) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.ASSETS, JSON.stringify(assets));
    }

    function loadStoredData() {
        // Load any existing data
        const invoices = getStoredInvoices();
        const customers = getStoredCustomers();
        
        console.log(`📊 Loaded ${invoices.length} invoices, ${customers.length} customers`);
    }

    // ============================================================================
    // INITIALIZE APPLICATION
    // ============================================================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Auto-sync every 5 minutes
    if (CONFIG.CLOUD.ENABLED) {
        setInterval(syncFromCloud, 5 * 60 * 1000);
    }

})();
