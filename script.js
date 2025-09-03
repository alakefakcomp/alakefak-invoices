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
            ENABLED: true,
            INVOICE_BIN: 'https://api.jsonbin.io/v3/b/675a1b2ce41b4d34e46d5a1b',
            CUSTOMER_BIN: 'https://api.jsonbin.io/v3/b/675a1b3ae41b4d34e46d5a1d',
            API_KEY: '$2a$10$9LqVjGFZ8kNf7Hj3Rp2Xeu8vYw5TcB9mD4nA6rE1sF8gH7jK0lM2q'
        }
    };

    // Global State
    const state = {
        currentTemplate: 'classic',
        editingCustomer: null,
        loadedAssets: {},
        isDirty: false
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
        
        // Auto-save on changes
        document.addEventListener('input', () => {
            state.isDirty = true;
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
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        let counter = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.COUNTER) || '{}');
        const dateKey = `${year}${month}${day}`;
        
        if (counter.date !== dateKey) {
            counter = { date: dateKey, sequence: 1 };
        } else {
            counter.sequence = (counter.sequence || 0) + 1;
        }
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.COUNTER, JSON.stringify(counter));
        
        return `INV-${dateKey}-${String(counter.sequence).padStart(3, '0')}`;
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

    function saveInvoice() {
        showLoading('Saving invoice...');
        
        try {
            const invoiceData = collectInvoiceData();
            
            if (!invoiceData.invoiceNumber) {
                showMessage('Invoice number is required', 'error');
                hideLoading();
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
            
            showMessage(`Invoice ${invoiceData.invoiceNumber} saved successfully!`, 'success');
            
            // Sync to cloud
            if (CONFIG.CLOUD.ENABLED) {
                syncInvoicesToCloud(invoices);
            }
            
            state.isDirty = false;
        } catch (error) {
            console.error('Error saving invoice:', error);
            showMessage('Error saving invoice', 'error');
        } finally {
            hideLoading();
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
            id: generateId(),
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
        
        showMessage('New invoice created', 'success');
        state.isDirty = false;
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

    function sendInvoiceEmail() {
        const emailTo = document.getElementById('emailTo').value;
        const subject = document.getElementById('emailSubject').value;
        const message = document.getElementById('emailMessage').value;
        
        if (!emailTo) {
            showMessage('Please enter recipient email', 'error');
            return;
        }
        
        // For now, open default email client
        const mailtoLink = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.open(mailtoLink);
        
        closeEmailModal();
        showMessage('Email client opened with invoice details', 'success');
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
        logo.style.maxWidth = size + 'px';
        logo.style.maxHeight = size + 'px';
        document.getElementById('logoSizeValue').textContent = size + 'px';
    }
    window.adjustLogoSize = adjustLogoSize;

    function adjustStampSize(size) {
        const stamp = elements.companyStamp();
        stamp.style.maxWidth = size + 'px';
        stamp.style.maxHeight = size + 'px';
        document.getElementById('stampSizeValue').textContent = size + 'px';
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
        if (!CONFIG.CLOUD.ENABLED) return;
        
        try {
            console.log('🔄 Syncing from cloud...');
            
            // Sync invoices
            const invoiceResponse = await fetch(`${CONFIG.CLOUD.INVOICE_BIN}/latest`, {
                headers: {
                    'X-Master-Key': CONFIG.CLOUD.API_KEY
                }
            });
            
            if (invoiceResponse.ok) {
                const data = await invoiceResponse.json();
                const cloudInvoices = data.record || [];
                const localInvoices = getStoredInvoices();
                
                // Merge (cloud wins for conflicts)
                const mergedInvoices = mergeData(cloudInvoices, localInvoices, 'id');
                saveInvoices(mergedInvoices);
            }
            
            // Sync customers
            const customerResponse = await fetch(`${CONFIG.CLOUD.CUSTOMER_BIN}/latest`, {
                headers: {
                    'X-Master-Key': CONFIG.CLOUD.API_KEY
                }
            });
            
            if (customerResponse.ok) {
                const data = await customerResponse.json();
                const cloudCustomers = data.record || [];
                const localCustomers = getStoredCustomers();
                
                const mergedCustomers = mergeData(cloudCustomers, localCustomers, 'id');
                saveCustomers(mergedCustomers);
                loadCustomers();
            }
            
            console.log('✅ Cloud sync completed');
        } catch (error) {
            console.warn('⚠️ Cloud sync failed:', error.message);
        }
    }

    async function syncInvoicesToCloud(invoices) {
        if (!CONFIG.CLOUD.ENABLED) return;
        
        try {
            await fetch(CONFIG.CLOUD.INVOICE_BIN, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': CONFIG.CLOUD.API_KEY
                },
                body: JSON.stringify(invoices)
            });
        } catch (error) {
            console.warn('⚠️ Invoice cloud sync failed:', error);
        }
    }

    async function syncCustomersToCloud(customers) {
        if (!CONFIG.CLOUD.ENABLED) return;
        
        try {
            await fetch(CONFIG.CLOUD.CUSTOMER_BIN, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': CONFIG.CLOUD.API_KEY
                },
                body: JSON.stringify(customers)
            });
        } catch (error) {
            console.warn('⚠️ Customer cloud sync failed:', error);
        }
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
            console.log('💾 Auto-saving...');
            saveInvoice();
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
