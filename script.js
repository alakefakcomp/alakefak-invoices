/**
 * ALAKAIFAK MOVER - PROFESSIONAL INVOICE MANAGEMENT SYSTEM
 * Comprehensive JavaScript Application
 * Features: Auto-generation, Customer Management, Cloud Sync, Multiple Layouts, Mobile Support
 */

(function() {
    'use strict';
    
    // Application Configuration
    const CONFIG = {
        VAT_RATE: 0.05, // 5%
        CURRENCY: 'AED',
        STARTING_INVOICE_NUMBER: 1334,
        STORAGE_KEYS: {
            INVOICES: 'alakaifak_invoices_v2',
            CUSTOMERS: 'alakaifak_customers_v2',
            SETTINGS: 'alakaifak_settings_v2',
            ASSETS: 'alakaifak_assets_v2',
            COUNTER: 'alakaifak_counter_v2'
        },
        COMPANY_INFO: {
            name: 'ALA KAIFAK FURNITURE MOVERS',
            arabicName: 'مؤسسة علي كيفك لنقل الاثاث',
            subtitle: 'مؤسسة وطنية',
            address: 'ABUDHABI',
            box: '130483',
            trn: '100234725800003',
            email: 'alakefakcomp@gmail.com',
            phone: '+971 2 5529191',
            fax: '+971 2 5529195',
            mobile: '+971 50 8199942'
        }
    };
    
    // Application State
    let currentInvoice = null;
    let customers = [];
    let savedInvoices = [];
    let settings = {};
    let currentTemplate = 'standard';
    
    // DOM Elements Cache
    const elements = {
        // Navigation
        navTabs: document.querySelectorAll('.nav-tab'),
        sections: document.querySelectorAll('.content-section'),
        
        // Invoice Form
        customerSelect: document.getElementById('customer-select'),
        templateSelect: document.getElementById('template-select'),
        customerInfo: document.getElementById('customer-info'),
        customerTrn: document.getElementById('customer-trn'),
        invoiceDate: document.getElementById('invoice-date'),
        invoiceNumber: document.getElementById('invoice-number'),
        itemsTable: document.getElementById('items-tbody'),
        
        // Totals
        subtotalAmount: document.getElementById('subtotal-amount'),
        subtotalVat: document.getElementById('subtotal-vat'),
        subtotalTotal: document.getElementById('subtotal-total'),
        totalInWords: document.getElementById('total-in-words'),
        
        // Controls
        saveInvoice: document.getElementById('save-invoice'),
        printInvoice: document.getElementById('print-invoice'),
        exportPdf: document.getElementById('export-pdf'),
        clearForm: document.getElementById('clear-form'),
        addItemBtn: document.getElementById('add-item-btn'),
        
        // Customer Management
        customersGrid: document.getElementById('customers-grid'),
        addNewCustomer: document.getElementById('add-new-customer'),
        quickAddCustomer: document.getElementById('quick-add-customer'),
        customerModal: document.getElementById('customer-modal'),
        customerForm: document.getElementById('customer-form'),
        
        // Saved Invoices
        invoicesGrid: document.getElementById('invoices-grid'),
        invoiceSearch: document.getElementById('invoice-search'),
        customerFilter: document.getElementById('customer-filter'),
        
        // Settings
        logoUpload: document.getElementById('logo-upload'),
        stampUpload: document.getElementById('stamp-upload'),
        logoPreview: document.getElementById('logo-preview'),
        stampPreview: document.getElementById('stamp-preview'),
        toggleStamp: document.getElementById('toggle-stamp'),
        startingInvoiceNum: document.getElementById('starting-invoice-num'),
        vatRate: document.getElementById('vat-rate'),
        currencySetting: document.getElementById('currency-setting'),
        
        // Utility
        loadingOverlay: document.getElementById('loading-overlay'),
        toastContainer: document.getElementById('toast-container'),
        companyStampArea: document.getElementById('company-stamp-area'),
        
        // Edit buttons
        editDate: document.getElementById('edit-date'),
        editNumber: document.getElementById('edit-number')
    };

    // =====================================
    // INITIALIZATION AND SETUP
    // =====================================
    
    function init() {
        console.log('🚀 Initializing Alakaifak Invoice Management System');
        
        loadData();
        setupEventListeners();
        initializeInvoice();
        updateCustomerDropdowns();
        renderCustomers();
        renderSavedInvoices();
        setupTemplates();
        simulateCloudSync();
        
        showToast('System initialized successfully!', 'success');
    }
    
    function loadData() {
        // Load customers
        customers = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOMERS) || '[]');
        
        // Load saved invoices
        savedInvoices = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.INVOICES) || '[]');
        
        // Load settings
        settings = {
            startingInvoiceNumber: CONFIG.STARTING_INVOICE_NUMBER,
            vatRate: CONFIG.VAT_RATE,
            currency: CONFIG.CURRENCY,
            showStamp: true,
            ...JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS) || '{}')
        };
        
        // Load assets
        const assets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ASSETS) || '{}');
        if (assets.logo && elements.logoPreview) {
            displayImagePreview(elements.logoPreview, assets.logo);
        }
        if (assets.stamp && elements.stampPreview) {
            displayImagePreview(elements.stampPreview, assets.stamp);
            if (settings.showStamp) {
                displayStampOnInvoice(assets.stamp);
            }
        }
        
        // Apply settings to form
        if (elements.startingInvoiceNum) elements.startingInvoiceNum.value = settings.startingInvoiceNumber;
        if (elements.vatRate) elements.vatRate.value = settings.vatRate * 100;
        if (elements.currencySetting) elements.currencySetting.value = settings.currency;
    }
    
    function setupEventListeners() {
        // Navigation
        elements.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const section = e.target.closest('.nav-tab').dataset.section;
                switchSection(section);
            });
        });
        
        // Invoice controls
        if (elements.saveInvoice) elements.saveInvoice.addEventListener('click', saveCurrentInvoice);
        if (elements.printInvoice) elements.printInvoice.addEventListener('click', printInvoice);
        if (elements.exportPdf) elements.exportPdf.addEventListener('click', generatePDF);
        if (elements.clearForm) elements.clearForm.addEventListener('click', clearInvoiceForm);
        if (elements.addItemBtn) elements.addItemBtn.addEventListener('click', addInvoiceItem);
        
        // Customer management
        if (elements.customerSelect) elements.customerSelect.addEventListener('change', loadSelectedCustomer);
        if (elements.quickAddCustomer) elements.quickAddCustomer.addEventListener('click', openCustomerModal);
        if (elements.addNewCustomer) elements.addNewCustomer.addEventListener('click', openCustomerModal);
        if (elements.customerForm) elements.customerForm.addEventListener('submit', saveCustomer);
        
        // Template selection
        if (elements.templateSelect) elements.templateSelect.addEventListener('change', changeTemplate);
        
        // Settings
        if (elements.logoUpload) elements.logoUpload.addEventListener('change', handleLogoUpload);
        if (elements.stampUpload) elements.stampUpload.addEventListener('change', handleStampUpload);
        if (elements.toggleStamp) elements.toggleStamp.addEventListener('click', toggleStampVisibility);
        
        // Edit buttons
        if (elements.editDate) elements.editDate.addEventListener('click', () => toggleFieldEdit('invoice-date'));
        if (elements.editNumber) elements.editNumber.addEventListener('click', () => toggleFieldEdit('invoice-number'));
        
        // Modal close
        const closeButtons = document.querySelectorAll('.close-modal, .cancel-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', closeModals);
        });
        
        // Search and filters
        if (elements.invoiceSearch) elements.invoiceSearch.addEventListener('input', filterInvoices);
        if (elements.customerFilter) elements.customerFilter.addEventListener('change', filterInvoices);
        
        // Auto-calculation on input
        document.addEventListener('input', (e) => {
            if (e.target.closest('.invoice-table')) {
                calculateTotals();
            }
        });
        
        // Mobile responsive table scroll
        const tables = document.querySelectorAll('.invoice-table');
        tables.forEach(table => {
            table.addEventListener('touchstart', handleTableTouch, { passive: true });
        });
    }

    // =====================================
    // UTILITY FUNCTIONS
    // =====================================
    
    function pad(num, size) {
        return String(num).padStart(size, '0');
    }
    
    function formatCurrency(amount, currency = settings.currency || CONFIG.CURRENCY) {
        return (Math.round(amount * 100) / 100).toFixed(2) + currency;
    }
    
    function generateInvoiceNumber() {
        const counterData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.COUNTER) || '{}');
        const currentNumber = (counterData.lastNumber || settings.startingInvoiceNumber || CONFIG.STARTING_INVOICE_NUMBER) + 1;
        
        counterData.lastNumber = currentNumber;
        localStorage.setItem(CONFIG.STORAGE_KEYS.COUNTER, JSON.stringify(counterData));
        
        return currentNumber.toString();
    }
    
    function getCurrentDate() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    }

    // =====================================
    // NUMBER TO WORDS CONVERSION
    // =====================================
    
    function numberToWords(amount) {
        const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
                     'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
        const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
        const thousands = ['', 'THOUSAND', 'MILLION', 'BILLION'];
        
        function convertHundreds(num) {
            let result = '';
            if (num >= 100) {
                result += ones[Math.floor(num / 100)] + ' HUNDRED ';
                num %= 100;
            }
            if (num >= 20) {
                result += tens[Math.floor(num / 10)];
                if (num % 10 > 0) result += ' ' + ones[num % 10];
            } else if (num > 0) {
                result += ones[num];
            }
            return result.trim();
        }
        
        if (amount === 0) return 'ZERO';
        
        const wholePart = Math.floor(amount);
        const decimalPart = Math.round((amount - wholePart) * 100);
        
        let result = '';
        let thousandIndex = 0;
        let num = wholePart;
        
        while (num > 0) {
            const chunk = num % 1000;
            if (chunk > 0) {
                const chunkWords = convertHundreds(chunk);
                result = chunkWords + (thousands[thousandIndex] ? ' ' + thousands[thousandIndex] : '') + 
                        (result ? ' ' + result : '');
            }
            num = Math.floor(num / 1000);
            thousandIndex++;
        }
        
        result += ' ' + (settings.currency || CONFIG.CURRENCY);
        
        if (decimalPart > 0) {
            result += ' AND ' + convertHundreds(decimalPart) + ' FILS';
        }
        
        return result;
    }

    // =====================================
    // INVOICE MANAGEMENT FUNCTIONS
    // =====================================
    
    function initializeInvoice() {
        // Set today's date
        if (elements.invoiceDate) {
            elements.invoiceDate.value = getCurrentDate();
        }
        
        // Auto-generate invoice number
        if (elements.invoiceNumber) {
            elements.invoiceNumber.value = generateInvoiceNumber();
        }
        
        // Add initial item if table is empty
        if (elements.itemsTable && elements.itemsTable.children.length === 0) {
            addInvoiceItem();
        }
        
        calculateTotals();
    }
    
    function addInvoiceItem() {
        const tbody = elements.itemsTable;
        if (!tbody) return;
        
        const itemNumber = tbody.children.length + 1;
        const row = document.createElement('tr');
        row.className = 'item-row';
        
        row.innerHTML = `
            <td>
                <input type="text" class="item-input" value="${itemNumber.toString().padStart(2, '0')}" readonly>
            </td>
            <td>
                <textarea class="item-input description-input auto-resize" placeholder="Service description" rows="1"></textarea>
            </td>
            <td>
                <input type="number" class="item-input numeric-input" value="1" min="1" step="1">
            </td>
            <td>
                <input type="number" class="item-input numeric-input" placeholder="0.00" step="0.01" min="0">
            </td>
            <td class="calculated-cell total-price">0.00AED</td>
            <td class="calculated-cell vat-amount">0.00AED</td>
            <td class="calculated-cell total-with-vat">0.00AED</td>
            <td class="no-print">
                <button class="remove-item-btn" onclick="removeInvoiceItem(this)">
                    ×
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Auto-resize textareas
        const textarea = row.querySelector('.auto-resize');
        if (textarea) {
            textarea.addEventListener('input', autoResizeTextarea);
        }
        
        // Auto-calculate on input
        const inputs = row.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', calculateTotals);
        });
        
        calculateTotals();
        adjustForPrint();
    }
    
    function removeInvoiceItem(button) {
        const row = button.closest('tr');
        if (row) {
            row.remove();
            renumberItems();
            calculateTotals();
            adjustForPrint();
        }
    }
    
    function renumberItems() {
        const rows = elements.itemsTable.querySelectorAll('.item-row');
        rows.forEach((row, index) => {
            const numberInput = row.querySelector('td:first-child input');
            if (numberInput) {
                numberInput.value = (index + 1).toString().padStart(2, '0');
            }
        });
    }

    function calculateTotals() {
        let subtotal = 0;
        let totalVat = 0;
        
        const rows = elements.itemsTable ? elements.itemsTable.querySelectorAll('.item-row') : [];
        
        rows.forEach(row => {
            const qtyInput = row.querySelector('td:nth-child(3) input');
            const priceInput = row.querySelector('td:nth-child(4) input');
            const totalPriceCell = row.querySelector('.total-price');
            const vatCell = row.querySelector('.vat-amount');
            const totalWithVatCell = row.querySelector('.total-with-vat');
            
            const quantity = parseFloat(qtyInput?.value || 0);
            const unitPrice = parseFloat(priceInput?.value || 0);
            const itemTotal = quantity * unitPrice;
            const itemVat = itemTotal * (settings.vatRate || CONFIG.VAT_RATE);
            const itemTotalWithVat = itemTotal + itemVat;
            
            if (totalPriceCell) totalPriceCell.textContent = formatCurrency(itemTotal);
            if (vatCell) vatCell.textContent = formatCurrency(itemVat);
            if (totalWithVatCell) totalWithVatCell.textContent = formatCurrency(itemTotalWithVat);
            
            subtotal += itemTotal;
            totalVat += itemVat;
        });
        
        const grandTotal = subtotal + totalVat;
        
        // Update total displays
        if (elements.subtotalAmount) elements.subtotalAmount.textContent = formatCurrency(subtotal);
        if (elements.subtotalVat) elements.subtotalVat.textContent = formatCurrency(totalVat);
        if (elements.subtotalTotal) elements.subtotalTotal.textContent = formatCurrency(grandTotal);
        if (elements.totalInWords) elements.totalInWords.textContent = numberToWords(grandTotal).toUpperCase();
    }

    // =====================================
    // CUSTOMER MANAGEMENT
    // =====================================
    
    function openCustomerModal(editCustomer = null) {
        const modal = elements.customerModal;
        if (!modal) return;
        
        // Reset form
        const form = elements.customerForm;
        if (form) form.reset();
        
        // If editing existing customer
        if (editCustomer) {
            document.getElementById('customer-name').value = editCustomer.name || '';
            document.getElementById('customer-trn-input').value = editCustomer.trn || '';
            document.getElementById('customer-address-input').value = editCustomer.address || '';
            document.getElementById('customer-phone').value = editCustomer.phone || '';
            document.getElementById('customer-email').value = editCustomer.email || '';
        }
        
        modal.style.display = 'block';
    }
    
    function saveCustomer(e) {
        e.preventDefault();
        
        const customerData = {
            id: Date.now().toString(),
            name: document.getElementById('customer-name').value,
            trn: document.getElementById('customer-trn-input').value,
            address: document.getElementById('customer-address-input').value,
            phone: document.getElementById('customer-phone').value,
            email: document.getElementById('customer-email').value,
            createdAt: new Date().toISOString()
        };
        
        // Validate required fields
        if (!customerData.name.trim() || !customerData.address.trim()) {
            showToast('Please fill in required fields (Name and Address)', 'error');
            return;
        }
        
        // Check for duplicate names
        const existingCustomer = customers.find(c => 
            c.name.toLowerCase() === customerData.name.toLowerCase()
        );
        
        if (existingCustomer) {
            showToast('Customer with this name already exists', 'warning');
            return;
        }
        
        customers.push(customerData);
        localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        
        closeModals();
        updateCustomerDropdowns();
        renderCustomers();
        
        showToast('Customer saved successfully!', 'success');
    }
    
    function loadSelectedCustomer() {
        const selectedId = elements.customerSelect?.value;
        if (!selectedId) {
            // Clear customer info
            if (elements.customerInfo) elements.customerInfo.value = '';
            if (elements.customerTrn) elements.customerTrn.value = '';
            return;
        }
        
        const customer = customers.find(c => c.id === selectedId);
        if (customer && elements.customerInfo && elements.customerTrn) {
            elements.customerInfo.value = `${customer.name}\n${customer.address}`;
            elements.customerTrn.value = customer.trn || '';
        }
    }
    
    function updateCustomerDropdowns() {
        const dropdowns = [elements.customerSelect, elements.customerFilter];
        
        dropdowns.forEach(dropdown => {
            if (!dropdown) return;
            
            // Clear existing options (except first)
            while (dropdown.children.length > 1) {
                dropdown.removeChild(dropdown.lastChild);
            }
            
            // Add customer options
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                dropdown.appendChild(option);
            });
        });
    }
    
    function renderCustomers() {
        const grid = elements.customersGrid;
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (customers.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No customers yet</h3>
                    <p>Add your first customer to get started</p>
                    <button class="primary-btn" onclick="openCustomerModal()">
                        <span>+</span> Add First Customer
                    </button>
                </div>
            `;
            return;
        }
        
        customers.forEach(customer => {
            const card = document.createElement('div');
            card.className = 'customer-card';
            card.innerHTML = `
                <h3>${customer.name}</h3>
                <div class="customer-info">
                    <p>${customer.address}</p>
                    ${customer.phone ? `<p>📞 ${customer.phone}</p>` : ''}
                    ${customer.email ? `<p>📧 ${customer.email}</p>` : ''}
                    ${customer.trn ? `<p>TRN: ${customer.trn}</p>` : ''}
                </div>
                <div class="customer-actions">
                    <button class="action-btn save-btn" onclick="selectCustomer('${customer.id}')">
                        Select
                    </button>
                    <button class="action-btn print-btn" onclick="editCustomer('${customer.id}')">
                        Edit
                    </button>
                    <button class="remove-item-btn" onclick="deleteCustomer('${customer.id}')">
                        Delete
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function selectCustomer(customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer && elements.customerSelect) {
            elements.customerSelect.value = customerId;
            loadSelectedCustomer();
            switchSection('invoice-section');
            showToast(`Customer "${customer.name}" selected`, 'success');
        }
    }
    
    function editCustomer(customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            openCustomerModal(customer);
        }
    }
    
    function deleteCustomer(customerId) {
        if (confirm('Are you sure you want to delete this customer?')) {
            customers = customers.filter(c => c.id !== customerId);
            localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
            updateCustomerDropdowns();
            renderCustomers();
            showToast('Customer deleted successfully', 'success');
        }
    }

    // =====================================
    // INVOICE OPERATIONS
    // =====================================
    
    function saveCurrentInvoice() {
        const invoiceData = collectInvoiceData();
        
        if (!invoiceData.items || invoiceData.items.length === 0) {
            showToast('Please add at least one item before saving', 'warning');
            return;
        }
        
        // Check if invoice number already exists
        const existingIndex = savedInvoices.findIndex(inv => 
            inv.invoiceNumber === invoiceData.invoiceNumber
        );
        
        if (existingIndex >= 0) {
            if (!confirm('An invoice with this number already exists. Do you want to overwrite it?')) {
                return;
            }
            savedInvoices[existingIndex] = invoiceData;
        } else {
            savedInvoices.push(invoiceData);
        }
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.INVOICES, JSON.stringify(savedInvoices));
        renderSavedInvoices();
        
        showToast('Invoice saved successfully! 💾', 'success');
    }

    function collectInvoiceData() {
        const items = [];
        
        if (elements.itemsTable) {
            const rows = elements.itemsTable.querySelectorAll('.item-row');
            rows.forEach(row => {
                const description = row.querySelector('.description-input')?.value || '';
                const quantity = parseFloat(row.querySelector('td:nth-child(3) input')?.value || 0);
                const unitPrice = parseFloat(row.querySelector('td:nth-child(4) input')?.value || 0);
                
                if (description.trim() && quantity > 0 && unitPrice >= 0) {
                    items.push({
                        description: description.trim(),
                        quantity: quantity,
                        unitPrice: unitPrice,
                        totalPrice: quantity * unitPrice,
                        vat: quantity * unitPrice * (settings.vatRate || CONFIG.VAT_RATE),
                        totalWithVat: quantity * unitPrice * (1 + (settings.vatRate || CONFIG.VAT_RATE))
                    });
                }
            });
        }
        
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalVat = items.reduce((sum, item) => sum + item.vat, 0);
        const grandTotal = subtotal + totalVat;
        
        return {
            id: Date.now().toString(),
            invoiceNumber: elements.invoiceNumber?.value || '',
            invoiceDate: elements.invoiceDate?.value || getCurrentDate(),
            customerInfo: elements.customerInfo?.value || '',
            customerTrn: elements.customerTrn?.value || '',
            items: items,
            subtotal: subtotal,
            totalVat: totalVat,
            grandTotal: grandTotal,
            totalInWords: numberToWords(grandTotal),
            template: currentTemplate,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
    }

    function clearInvoiceForm() {
        if (confirm('Are you sure you want to clear the current invoice?')) {
            // Reset form fields
            if (elements.customerSelect) elements.customerSelect.value = '';
            if (elements.customerInfo) elements.customerInfo.value = '';
            if (elements.customerTrn) elements.customerTrn.value = '';
            if (elements.invoiceDate) elements.invoiceDate.value = getCurrentDate();
            if (elements.invoiceNumber) elements.invoiceNumber.value = generateInvoiceNumber();
            
            // Clear items table
            if (elements.itemsTable) {
                elements.itemsTable.innerHTML = '';
                addInvoiceItem();
            }
            
            calculateTotals();
            showToast('Invoice cleared successfully', 'success');
        }
    }

    function renderSavedInvoices() {
        const grid = elements.invoicesGrid;
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (savedInvoices.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No saved invoices</h3>
                    <p>Your saved invoices will appear here</p>
                </div>
            `;
            return;
        }
        
        // Sort by date (newest first)
        const sortedInvoices = [...savedInvoices].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        sortedInvoices.forEach(invoice => {
            const card = document.createElement('div');
            card.className = 'invoice-card';
            
            const customerName = invoice.customerInfo.split('\n')[0] || 'No customer name';
            const itemCount = invoice.items ? invoice.items.length : 0;
            
            card.innerHTML = `
                <div class="invoice-header-info">
                    <h3>Invoice #${invoice.invoiceNumber}</h3>
                    <span class="invoice-date">${formatDate(invoice.invoiceDate)}</span>
                </div>
                <div class="invoice-details">
                    <p><strong>Customer:</strong> ${customerName}</p>
                    <p><strong>Items:</strong> ${itemCount} item(s)</p>
                    <p><strong>Total:</strong> ${formatCurrency(invoice.grandTotal)}</p>
                </div>
                <div class="invoice-actions">
                    <button class="action-btn save-btn" onclick="loadInvoice('${invoice.id}')">
                        📝 Edit
                    </button>
                    <button class="action-btn print-btn" onclick="loadAndPrint('${invoice.id}')">
                        🖨️ Print
                    </button>
                    <button class="action-btn pdf-btn" onclick="loadAndExportPDF('${invoice.id}')">
                        📄 PDF
                    </button>
                    <button class="remove-item-btn" onclick="deleteInvoice('${invoice.id}')">
                        🗑️
                    </button>
                </div>
            `;
            
            grid.appendChild(card);
        });
    }

    function loadInvoice(invoiceId) {
        const invoice = savedInvoices.find(inv => inv.id === invoiceId);
        if (!invoice) {
            showToast('Invoice not found', 'error');
            return;
        }
        
        // Load invoice data into form
        if (elements.invoiceNumber) elements.invoiceNumber.value = invoice.invoiceNumber;
        if (elements.invoiceDate) elements.invoiceDate.value = invoice.invoiceDate;
        if (elements.customerInfo) elements.customerInfo.value = invoice.customerInfo;
        if (elements.customerTrn) elements.customerTrn.value = invoice.customerTrn;
        
        // Clear and reload items
        if (elements.itemsTable) {
            elements.itemsTable.innerHTML = '';
            
            invoice.items.forEach(item => {
                addInvoiceItem();
                const lastRow = elements.itemsTable.lastElementChild;
                if (lastRow) {
                    const descInput = lastRow.querySelector('.description-input');
                    const qtyInput = lastRow.querySelector('td:nth-child(3) input');
                    const priceInput = lastRow.querySelector('td:nth-child(4) input');
                    
                    if (descInput) descInput.value = item.description;
                    if (qtyInput) qtyInput.value = item.quantity;
                    if (priceInput) priceInput.value = item.unitPrice;
                }
            });
        }
        
        calculateTotals();
        switchSection('invoice-section');
        showToast('Invoice loaded successfully', 'success');
    }
    
    function deleteInvoice(invoiceId) {
        if (confirm('Are you sure you want to delete this invoice?')) {
            savedInvoices = savedInvoices.filter(inv => inv.id !== invoiceId);
            localStorage.setItem(CONFIG.STORAGE_KEYS.INVOICES, JSON.stringify(savedInvoices));
            renderSavedInvoices();
            showToast('Invoice deleted successfully', 'success');
        }
    }
    
    function loadAndPrint(invoiceId) {
        loadInvoice(invoiceId);
        setTimeout(() => printInvoice(), 500);
    }
    
    function loadAndExportPDF(invoiceId) {
        loadInvoice(invoiceId);
        setTimeout(() => generatePDF(), 500);
    }

    // =====================================
    // PRINT AND PDF FUNCTIONS
    // =====================================
    
    function printInvoice() {
        // Ensure all calculations are up to date
        calculateTotals();
        adjustForPrint();
        
        // Hide all non-print elements
        document.body.classList.add('printing');
        
        // Print
        window.print();
        
        // Restore after print
        setTimeout(() => {
            document.body.classList.remove('printing');
        }, 1000);
        
        showToast('Printing invoice...', 'success');
    }
    
    async function generatePDF() {
        showLoading(true);
        
        try {
            calculateTotals();
            adjustForPrint();
            
            const invoiceDocument = document.getElementById('invoice-document');
            if (!invoiceDocument) {
                throw new Error('Invoice document not found');
            }
            
            // Temporarily hide non-print elements for PDF
            const nonPrintElements = document.querySelectorAll('.no-print');
            nonPrintElements.forEach(el => el.style.display = 'none');
            
            // Generate canvas
            const canvas = await html2canvas(invoiceDocument, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: invoiceDocument.scrollWidth,
                height: invoiceDocument.scrollHeight
            });
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate scaling to fit one page
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));
            
            const scaledWidth = imgWidth * 0.264583 * ratio;
            const scaledHeight = imgHeight * 0.264583 * ratio;
            
            const x = (pdfWidth - scaledWidth) / 2;
            const y = 0;
            
            pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
            
            // Generate filename
            const invoiceNum = elements.invoiceNumber?.value || 'invoice';
            const filename = `Alakaifak_Invoice_${invoiceNum}_${getCurrentDate()}.pdf`;
            
            pdf.save(filename);
            
            // Restore elements
            nonPrintElements.forEach(el => el.style.display = '');
            
            showToast('PDF generated successfully! 📄', 'success');
            
        } catch (error) {
            console.error('PDF Generation Error:', error);
            showToast('Error generating PDF. Please try again.', 'error');
        } finally {
            showLoading(false);
        }
    }

    function adjustForPrint() {
        const itemCount = elements.itemsTable ? elements.itemsTable.children.length : 0;
        const invoiceDoc = document.getElementById('invoice-document');
        const invoiceTable = document.getElementById('items-table');
        
        if (!invoiceDoc || !invoiceTable) return;
        
        // Adjust table styling based on item count
        if (itemCount >= 4) {
            invoiceTable.style.fontSize = '11px';
            
            // Reduce padding for table cells when there are many items
            const cells = invoiceTable.querySelectorAll('th, td');
            cells.forEach(cell => {
                if (itemCount >= 4 && itemCount < 8) {
                    cell.style.padding = '0.4rem 0.3rem';
                } else if (itemCount >= 8) {
                    cell.style.padding = '0.3rem 0.2rem';
                }
            });
            
            // Reduce row height for description inputs
            const descInputs = invoiceTable.querySelectorAll('.description-input');
            descInputs.forEach(input => {
                if (itemCount >= 4) {
                    input.style.minHeight = '1.5rem';
                    input.style.maxHeight = '3rem';
                }
            });
        } else {
            // Reset to default styling
            invoiceTable.style.fontSize = '13px';
            const cells = invoiceTable.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.padding = '';
            });
        }
        
        // Scale entire document if necessary
        let scale = 1;
        if (itemCount > 10) scale = 0.95;
        if (itemCount > 15) scale = 0.9;
        if (itemCount > 20) scale = 0.85;
        
        invoiceDoc.style.transformOrigin = 'top left';
        invoiceDoc.style.transform = `scale(${scale})`;
    }

    // =====================================
    // ASSET MANAGEMENT (LOGO, STAMP, ETC.)
    // =====================================
    
    function handleLogoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            
            // Save to storage
            const assets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ASSETS) || '{}');
            assets.logo = imageData;
            localStorage.setItem(CONFIG.STORAGE_KEYS.ASSETS, JSON.stringify(assets));
            
            // Display preview
            displayImagePreview(elements.logoPreview, imageData);
            
            // Update logo in document
            updateLogoInDocument(imageData);
            
            showToast('Logo uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }
    
    function handleStampUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            
            // Save to storage
            const assets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ASSETS) || '{}');
            assets.stamp = imageData;
            localStorage.setItem(CONFIG.STORAGE_KEYS.ASSETS, JSON.stringify(assets));
            
            // Display preview
            displayImagePreview(elements.stampPreview, imageData);
            
            // Update stamp in document if visible
            if (settings.showStamp) {
                displayStampOnInvoice(imageData);
            }
            
            showToast('Stamp uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }
    
    function displayImagePreview(container, imageData) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="preview-container">
                <img src="${imageData}" alt="Preview" style="max-width: 100%; max-height: 100px; border-radius: 8px;">
                <button class="remove-image-btn" onclick="removeImage('${container.id}')">×</button>
            </div>
        `;
    }
    
    function displayStampOnInvoice(stampData) {
        const stampArea = elements.companyStampArea;
        if (!stampArea) return;
        
        stampArea.innerHTML = `
            <img src="${stampData}" alt="Company Stamp" style="max-height: 70px; max-width: 100px; opacity: 0.9;">
        `;
    }
    
    function updateLogoInDocument(logoData) {
        const logoContainer = document.getElementById('logo-container');
        if (!logoContainer) return;
        
        logoContainer.innerHTML = `
            <img src="${logoData}" alt="Company Logo" style="max-height: 80px; max-width: 120px; border-radius: 8px;">
        `;
    }
    
    function toggleStampVisibility() {
        settings.showStamp = !settings.showStamp;
        localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        
        const stampArea = elements.companyStampArea;
        if (!stampArea) return;
        
        if (settings.showStamp) {
            const assets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ASSETS) || '{}');
            if (assets.stamp) {
                displayStampOnInvoice(assets.stamp);
            }
            elements.toggleStamp.textContent = 'Hide Stamp';
            showToast('Stamp is now visible on invoices', 'success');
        } else {
            stampArea.innerHTML = '';
            elements.toggleStamp.textContent = 'Show Stamp';
            showToast('Stamp is now hidden on invoices', 'success');
        }
    }

    // =====================================
    // UI HELPER FUNCTIONS
    // =====================================
    
    function switchSection(sectionId) {
        // Update navigation tabs
        elements.navTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === sectionId) {
                tab.classList.add('active');
            }
        });
        
        // Update content sections
        elements.sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });
        
        // Special actions when switching to certain sections
        if (sectionId === 'customers-section') {
            renderCustomers();
        } else if (sectionId === 'saved-section') {
            renderSavedInvoices();
        }
    }
    
    function showToast(message, type = 'success') {
        const container = elements.toastContainer;
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
        toast.innerHTML = `<span>${icon}</span> ${message}`;
        
        container.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
    
    function showLoading(show) {
        const overlay = elements.loadingOverlay;
        if (overlay) {
            overlay.style.display = show ? 'block' : 'none';
        }
    }
    
    function closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    function toggleFieldEdit(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        if (field.hasAttribute('readonly')) {
            field.removeAttribute('readonly');
            field.focus();
            field.select();
        } else {
            field.setAttribute('readonly', 'readonly');
        }
    }
    
    function autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(textarea.scrollHeight, 32) + 'px';
    }
    
    function handleTableTouch(e) {
        // Allow horizontal scrolling on mobile devices
        e.stopPropagation();
    }
    
    // =====================================
    // TEMPLATE MANAGEMENT
    // =====================================
    
    function setupTemplates() {
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('click', () => {
                const template = card.dataset.template;
                selectTemplate(template);
            });
        });
    }
    
    function selectTemplate(templateName) {
        currentTemplate = templateName;
        
        // Update template selection UI
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.classList.remove('active');
            if (card.dataset.template === templateName) {
                card.classList.add('active');
            }
        });
        
        // Update template dropdown
        if (elements.templateSelect) {
            elements.templateSelect.value = templateName;
        }
        
        applyTemplate(templateName);
        showToast(`Template "${templateName}" applied`, 'success');
    }
    
    function changeTemplate() {
        const template = elements.templateSelect?.value || 'standard';
        selectTemplate(template);
    }
    
    function applyTemplate(templateName) {
        const invoiceDoc = document.getElementById('invoice-document');
        if (!invoiceDoc) return;
        
        // Remove existing template classes
        invoiceDoc.classList.remove('template-standard', 'template-detailed', 'template-compact', 'template-bilingual');
        
        // Apply new template class
        invoiceDoc.classList.add(`template-${templateName}`);
        
        // Adjust layout based on template
        switch (templateName) {
            case 'compact':
                invoiceDoc.style.fontSize = '12px';
                break;
            case 'detailed':
                invoiceDoc.style.fontSize = '14px';
                break;
            case 'bilingual':
                // Show Arabic text more prominently
                break;
            default: // standard
                invoiceDoc.style.fontSize = '14px';
                break;
        }
        
        adjustForPrint();
    }
    
    // =====================================
    // CLOUD SYNC SIMULATION
    // =====================================
    
    function simulateCloudSync() {
        // Simulate cloud synchronization status
        const syncIndicator = document.getElementById('sync-indicator');
        if (!syncIndicator) return;
        
        // Check if there's local data to "sync"
        const hasLocalData = savedInvoices.length > 0 || customers.length > 0;
        
        if (hasLocalData) {
            // Simulate syncing
            syncIndicator.textContent = '🟡 Syncing...';
            syncIndicator.className = 'sync-syncing';
            
            setTimeout(() => {
                syncIndicator.textContent = '🟢 Synced';
                syncIndicator.className = 'sync-online';
            }, 2000);
        }
    }
    
    // =====================================
    // SEARCH AND FILTER FUNCTIONS
    // =====================================
    
    function filterInvoices() {
        const searchTerm = elements.invoiceSearch?.value.toLowerCase() || '';
        const selectedCustomer = elements.customerFilter?.value || '';
        
        const filteredInvoices = savedInvoices.filter(invoice => {
            const matchesSearch = !searchTerm || 
                invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
                invoice.customerInfo.toLowerCase().includes(searchTerm);
                
            const matchesCustomer = !selectedCustomer || 
                invoice.customerInfo.toLowerCase().includes(selectedCustomer.toLowerCase());
                
            return matchesSearch && matchesCustomer;
        });
        
        renderFilteredInvoices(filteredInvoices);
    }
    
    function renderFilteredInvoices(invoices) {
        // Similar to renderSavedInvoices but with filtered data
        const grid = elements.invoicesGrid;
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (invoices.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No invoices found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }
        
        // Use the same rendering logic as renderSavedInvoices
        invoices.forEach(invoice => {
            const card = document.createElement('div');
            card.className = 'invoice-card';
            
            const customerName = invoice.customerInfo.split('\n')[0] || 'No customer name';
            const itemCount = invoice.items ? invoice.items.length : 0;
            
            card.innerHTML = `
                <div class="invoice-header-info">
                    <h3>Invoice #${invoice.invoiceNumber}</h3>
                    <span class="invoice-date">${formatDate(invoice.invoiceDate)}</span>
                </div>
                <div class="invoice-details">
                    <p><strong>Customer:</strong> ${customerName}</p>
                    <p><strong>Items:</strong> ${itemCount} item(s)</p>
                    <p><strong>Total:</strong> ${formatCurrency(invoice.grandTotal)}</p>
                </div>
                <div class="invoice-actions">
                    <button class="action-btn save-btn" onclick="loadInvoice('${invoice.id}')">
                        📝 Edit
                    </button>
                    <button class="action-btn print-btn" onclick="loadAndPrint('${invoice.id}')">
                        🖨️ Print
                    </button>
                    <button class="action-btn pdf-btn" onclick="loadAndExportPDF('${invoice.id}')">
                        📄 PDF
                    </button>
                    <button class="remove-item-btn" onclick="deleteInvoice('${invoice.id}')">
                        🗑️
                    </button>
                </div>
            `;
            
            grid.appendChild(card);
        });
    }
    
    // =====================================
    // GLOBAL WINDOW FUNCTIONS
    // =====================================
    
    // Expose functions to global scope for onclick handlers
    window.openCustomerModal = openCustomerModal;
    window.removeInvoiceItem = removeInvoiceItem;
    window.loadInvoice = loadInvoice;
    window.deleteInvoice = deleteInvoice;
    window.loadAndPrint = loadAndPrint;
    window.loadAndExportPDF = loadAndExportPDF;
    window.selectCustomer = selectCustomer;
    window.editCustomer = editCustomer;
    window.deleteCustomer = deleteCustomer;
    
    // =====================================
    // APPLICATION STARTUP
    // =====================================
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
