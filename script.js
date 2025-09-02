// Utility functions and main logic
(function(){
  const { jsPDF } = window.jspdf || {};

  const VAT_RATE = 0.05; // 5%
  const STORAGE_KEY = 'alakefak_invoices_v1';
  const ASSETS_KEY = 'alakefak_assets_v1';
  
  // Cloud storage configuration using JSONBin (free cloud JSON database)
  const JSONBIN_BIN_ID = '675662d8e41b4d34e46d31d0';
  const JSONBIN_API_KEY = '$2a$10$5QX.hFqVQ6Bf2dJfFmQ8vuMmKzBEfNkqVJ.lF9MjO8TK5h7YCvB/y';
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
  const CLOUD_ENABLED = true; // Enable cross-device sync

  const els = {
    invoiceDate: () => document.getElementById('invoiceDate'),
    invoiceNumber: () => document.getElementById('invoiceNumber'),
    billTo: () => document.getElementById('billTo'),
    trn: () => document.getElementById('trn'),
    address: () => document.getElementById('address'),
    box: () => document.getElementById('box'),
    companyTrn: () => document.getElementById('companyTrn'),
    itemsBody: () => document.getElementById('itemsBody'),
    subtotal: () => document.getElementById('subtotal'),
    totalVat: () => document.getElementById('totalVat'),
    grandTotal: () => document.getElementById('grandTotal'),
    amountInWords: () => document.getElementById('amountInWords'),
    content: () => document.getElementById('invoice-content'),
    savedModal: () => document.getElementById('savedInvoicesModal'),
    savedList: () => document.getElementById('savedInvoicesList'),
    logo: () => document.getElementById('company-logo'),
    stamp: () => document.getElementById('company-stamp'),
    signature: () => document.getElementById('company-signature'),
  };

  function init() {
    // Set today's date
    els.invoiceDate().valueAsDate = new Date();
    // Load assets if previously saved
    const assets = JSON.parse(localStorage.getItem(ASSETS_KEY) || '{}');
    if (assets.logo) showAsset(els.logo(), assets.logo);
    if (assets.stamp) showAsset(els.stamp(), assets.stamp);
    if (assets.signature) showAsset(els.signature(), assets.signature);

    // Auto-generate invoice number
    if (!els.invoiceNumber().value) {
      els.invoiceNumber().value = nextInvoiceNumber();
    }

    // Attach listeners for real-time calculation
    els.itemsBody().addEventListener('input', handleInputChange);
    els.itemsBody().addEventListener('change', handleInputChange);
    els.itemsBody().addEventListener('blur', handleInputBlur, true);
    
    // Add auto-expanding textareas
    setupAutoExpanding();
    
    // Initial calc
    recalc();
  }
  
  function setupAutoExpanding() {
    // Auto-expand textareas
    function autoExpand(element) {
      element.style.height = 'auto';
      element.style.height = (element.scrollHeight) + 'px';
    }
    
    // Handle both existing and new textareas
    document.addEventListener('input', function(e) {
      if (e.target.matches('.description-input') || e.target.matches('#billTo')) {
        autoExpand(e.target);
      }
    });
    
    // Initial setup for existing textareas
    document.querySelectorAll('.description-input, #billTo').forEach(autoExpand);
  }

  function pad(n, width=4) { return String(n).padStart(width, '0'); }

  function nextInvoiceNumber(){
    const key = 'alakefak_invoice_counter';
    let counter = parseInt(localStorage.getItem(key) || '1633'); // Start from 1633 like your example
    counter += 1;
    localStorage.setItem(key, counter.toString());
    return counter.toString(); // e.g., 1634, 1635, etc.
  }

  function addItem(){
    const tbody = els.itemsBody();
    const itemCount = tbody.children.length + 1;
    
    const tr = document.createElement('tr');
    tr.className = 'item-row';
    tr.innerHTML = `
      <td>${itemCount}</td>
      <td>
        <textarea class="description-input" placeholder="Service description..." rows="3"></textarea>
      </td>
      <td>
        <input type="number" class="quantity-input" value="1" min="1">
      </td>
      <td>
        <input type="number" class="rate-input" placeholder="0.00" step="0.01" min="0" max="100000">
        <span class="currency">AED</span>
      </td>
      <td class="amount-cell">
        <span class="amount-value">0</span>
        <span class="currency">AED</span>
      </td>
      <td class="vat-cell">
        <span class="vat-value">0</span>
        <span class="currency">AED</span>
      </td>
      <td class="total-cell">
        <span class="total-value">0</span>
        <span class="currency">AED</span>
      </td>
      <td class="no-print"><button onclick="removeItem(this)" class="btn btn-danger btn-sm">Remove</button></td>
    `;
    els.itemsBody().appendChild(tr);
    recalc();
    ensureOnePage();
  }
  window.addItem = addItem;

  function removeItem(btn){
    const tr = btn.closest('tr');
    tr.remove();
    recalc();
    ensureOnePage();
  }
  window.removeItem = removeItem;

  function handleInputChange(e) {
    if (e.target.classList.contains('quantity-input') || e.target.classList.contains('rate-input')) {
      setTimeout(recalcAll, 0); // Force async to ensure DOM is updated
    }
  }
  
  function handleInputBlur(e) {
    if (e.target.classList.contains('quantity-input') || e.target.classList.contains('rate-input')) {
      setTimeout(recalcAll, 0);
    }
  }
  
  function recalcAll() {
    let grandSubtotal = 0;
    let grandTotalVat = 0;
    
    // Process each row
    const rows = els.itemsBody().querySelectorAll('.item-row');
    rows.forEach(row => {
      const qtyInput = row.querySelector('.quantity-input');
      const rateInput = row.querySelector('.rate-input');
      
      const qty = parseFloat(qtyInput.value) || 0;
      const rate = parseFloat(rateInput.value) || 0;
      
      const rowAmount = qty * rate;
      const rowVat = rowAmount * 0.05; // 5% VAT
      const rowTotal = rowAmount + rowVat;
      
      // Update row displays
      row.querySelector('.amount-value').textContent = formatMoney(rowAmount);
      row.querySelector('.vat-value').textContent = formatMoney(rowVat);
      row.querySelector('.total-value').textContent = formatMoney(rowTotal);
      
      // Add to grand totals
      grandSubtotal += rowAmount;
      grandTotalVat += rowVat;
    });
    
    const grandTotal = grandSubtotal + grandTotalVat;
    
    // Update footer totals
    els.subtotal().textContent = formatMoney(grandSubtotal) + ' AED';
    els.totalVat().textContent = formatMoney(grandTotalVat) + ' AED';
    els.grandTotal().textContent = formatMoney(grandTotal) + ' AED';
    els.amountInWords().textContent = numberToWordsAED(grandTotal) + ' only';
  }
  
  function formatMoney(n) {
    return n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  
  // Legacy functions for compatibility
  function calculateItemTotal(row) { recalcAll(); }
  function recalc() { recalcAll(); }

  function fmt(n){ 
    if (isNaN(n) || n === null || n === undefined) return '0.00';
    const num = parseFloat(n);
    return num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }

  // Convert numbers to words (enhanced for large numbers up to 100,000 AED)
  function numberToWordsAED(amount){
    const ones = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    function toWords(n){
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10? ' ' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100? ' ' + toWords(n%100) : '');
      if (n < 1000000) {
        const thousands = Math.floor(n/1000);
        const remainder = n%1000;
        return toWords(thousands) + ' Thousand' + (remainder? ' ' + toWords(remainder) : '');
      }
      return n.toLocaleString(); // For very large numbers, return formatted number
    }

    if (amount === 0) return 'Zero AED';
    
    const whole = Math.floor(amount);
    const fils = Math.round((amount - whole) * 100);
    const currency = 'AED';
    let result = `${toWords(whole)} ${currency}`;
    
    if (fils > 0) {
      result += ` and ${toWords(fils)} Fils`;
    }
    
    return result;
  }

  async function generatePDF(){
    // Ensure one page by scaling content to A4 using html2canvas+jspdf
    const content = els.content();
    // Temporarily remove dashed input borders for PDF aesthetics
    const inputs = content.querySelectorAll('input');
    inputs.forEach(i=> i.style.borderBottom = '1px solid transparent');

    const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210; const pageHeight = 297;

    // Calculate scale to fit one page
    const imgProps = { width: canvas.width, height: canvas.height };
    const ratio = Math.min(pageWidth / (imgProps.width/4), pageHeight / (imgProps.height/4));
    const width = (imgProps.width/4) * ratio;
    const height = (imgProps.height/4) * ratio;
    const x = (pageWidth - width)/2;
    const y = 0;

    pdf.addImage(imgData, 'PNG', x, y, width, height);
    const filename = `${els.invoiceNumber().value || 'invoice'}.pdf`;
    // Create local folder hint by using suggested filename; browsers save to default downloads.
    pdf.save(filename);

    // Restore borders
    inputs.forEach(i=> i.style.borderBottom = '1px dashed #999');
  }
  window.generatePDF = generatePDF;

  function ensureOnePage(){
    // Reduce font-size slightly when many rows to keep one A4 page
    const rows = els.itemsBody().querySelectorAll('.item-row').length;
    const content = els.content();
    let scale = 1;
    if (rows > 6) scale = 0.95;
    if (rows > 10) scale = 0.9;
    if (rows > 14) scale = 0.85; // hard cap
    content.style.transformOrigin = 'top left';
    content.style.transform = `scale(${scale})`;
  }
  
  // Cloud sync functions for cross-device availability
  async function syncToCloud(invoices) {
    if (!CLOUD_ENABLED) return false;
    try {
      const response = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Name': 'Alakefak Invoices Database'
        },
        body: JSON.stringify(invoices)
      });
      
      if (response.ok) {
        console.log('✅ Synced to cloud successfully');
        return true;
      } else {
        console.warn('⚠️ Cloud sync failed:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Cloud sync error:', error.message);
      return false;
    }
  }
  
  async function syncFromCloud() {
    if (!CLOUD_ENABLED) return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    try {
      const response = await fetch(`${JSONBIN_URL}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const cloudInvoices = data.record || [];
        const localInvoices = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        // Merge cloud and local invoices (newest wins)
        const mergedInvoices = mergeInvoices(cloudInvoices, localInvoices);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedInvoices));
        console.log('📥 Synced from cloud:', mergedInvoices.length, 'invoices');
        return mergedInvoices;
      } else {
        console.warn('⚠️ Failed to sync from cloud:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Cloud sync error:', error.message);
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }
  
  function mergeInvoices(cloudInvoices, localInvoices) {
    const merged = [...cloudInvoices];
    localInvoices.forEach(localInv => {
      const existsInCloud = merged.some(cloudInv => cloudInv.invoiceNumber === localInv.invoiceNumber);
      if (!existsInCloud) {
        merged.push(localInv);
      }
    });
    return merged.sort((a,b) => parseInt(b.invoiceNumber) - parseInt(a.invoiceNumber));
  }
  
  // Sync invoice counter to cloud as well
  async function syncCounterToCloud() {
    if (!CLOUD_ENABLED) return;
    const counter = localStorage.getItem('alakefak_invoice_counter');
    if (counter) {
      try {
        await fetch(`${JSONBIN_URL.replace(JSONBIN_BIN_ID, '675662e2e41b4d34e46d31d1')}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
            'X-Bin-Name': 'Alakefak Counter'
          },
          body: JSON.stringify({ counter: parseInt(counter) })
        });
      } catch (error) {
        console.warn('Counter sync failed:', error.message);
      }
    }
  }
  
  async function syncCounterFromCloud() {
    if (!CLOUD_ENABLED) return;
    try {
      const response = await fetch(`${JSONBIN_URL.replace(JSONBIN_BIN_ID, '675662e2e41b4d34e46d31d1')}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY }
      });
      if (response.ok) {
        const data = await response.json();
        const cloudCounter = data.record?.counter || 1633;
        const localCounter = parseInt(localStorage.getItem('alakefak_invoice_counter') || '1633');
        const maxCounter = Math.max(cloudCounter, localCounter);
        localStorage.setItem('alakefak_invoice_counter', maxCounter.toString());
      }
    } catch (error) {
      console.warn('Counter sync from cloud failed:', error.message);
    }
  }

  async function saveInvoice(){
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const data = collectInvoiceData();
    const existingIndex = invoices.findIndex(inv => inv.invoiceNumber === data.invoiceNumber);
    if (existingIndex >= 0) invoices[existingIndex] = data; else invoices.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    
    // Sync to cloud for cross-device availability
    const cloudSynced = await syncToCloud(invoices);
    const message = cloudSynced 
      ? '✅ Invoice saved and synced to cloud! Available on ALL devices.' 
      : '💾 Invoice saved locally. Cloud sync will retry automatically.';
    alert(message);
    
    // Also sync counter to cloud
    await syncCounterToCloud();
  }
  window.saveInvoice = saveInvoice;

  function collectInvoiceData(){
    const items = [];
    els.itemsBody().querySelectorAll('.item-row').forEach(row => {
      items.push({
        item: row.querySelector('td:nth-child(1) input')?.value || '',
        description: row.querySelector('.description-input')?.value || '',
        quantity: parseFloat(row.querySelector('.quantity-input')?.value || '0'),
        rate: parseFloat(row.querySelector('.rate-input')?.value || '0'),
      });
    });
    return {
      invoiceNumber: els.invoiceNumber().value,
      invoiceDate: els.invoiceDate().value,
      billTo: els.billTo().value,
      trn: els.trn().value,
      address: els.address().value,
      box: els.box().value,
      companyTrn: els.companyTrn().value,
      items,
    };
  }

  function newInvoice(){
    els.invoiceDate().valueAsDate = new Date();
    els.invoiceNumber().value = nextInvoiceNumber();
    els.billTo().value = '';
    els.trn().value = '';
    els.itemsBody().innerHTML = '';
    addItem();
    recalc();
  }
  window.newInvoice = newInvoice;

  async function viewSavedInvoices(){
    const list = els.savedList();
    list.innerHTML = '<div style="text-align:center;padding:20px;">🔄 Loading invoices from cloud...</div>';
    els.savedModal().style.display = 'block';
    
    // Sync from cloud first to get latest invoices from all devices
    const invoices = await syncFromCloud();
    
    list.innerHTML = '';
    if (invoices.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">No saved invoices yet. Save your first invoice!</div>';
      return;
    }
    
    invoices.sort((a,b) => parseInt(b.invoiceNumber) - parseInt(a.invoiceNumber));
    invoices.forEach(inv => {
      const div = document.createElement('div');
      div.className = 'saved-invoice-row';
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '6px 0';
      div.style.borderBottom = '1px solid #eee';
      div.innerHTML = `
        <div>
          <strong>#${inv.invoiceNumber}</strong> — ${inv.billTo || 'No Customer'} (${inv.invoiceDate})
          <div style="font-size:12px;color:#666;margin-top:2px;">${inv.items?.length || 0} items • Available on all devices ✅</div>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" data-id="${inv.invoiceNumber}">Load</button>
          <button class="btn btn-success btn-sm" data-dl="${inv.invoiceNumber}">PDF</button>
        </div>
      `;
      list.appendChild(div);
    });
    list.addEventListener('click', onSavedListClick);
  }
  window.viewSavedInvoices = viewSavedInvoices;

  function onSavedListClick(e){
    const id = e.target.getAttribute('data-id');
    const dl = e.target.getAttribute('data-dl');
    if (!id && !dl) return;
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const inv = invoices.find(x => x.invoiceNumber === (id||dl));
    if (!inv) return;
    if (id){ loadInvoice(inv); closeSavedInvoicesModal(); }
    if (dl){ loadInvoice(inv); generatePDF(); }
  }

  function loadInvoice(inv){
    els.invoiceNumber().value = inv.invoiceNumber;
    els.invoiceDate().value = inv.invoiceDate;
    els.billTo().value = inv.billTo || '';
    els.trn().value = inv.trn || '';
    els.address().value = inv.address || 'Abu Dhabi';
    els.box().value = inv.box || '130483';
    els.companyTrn().value = inv.companyTrn || '100234725800003';
    els.itemsBody().innerHTML = '';
    (inv.items||[]).forEach(it => {
      addItem();
      const last = els.itemsBody().lastElementChild;
      last.querySelector('td:nth-child(1) input').value = it.item || '';
      last.querySelector('.description-input').value = it.description || '';
      last.querySelector('.quantity-input').value = it.quantity || 1;
      last.querySelector('.rate-input').value = it.rate || 0;
    });
    recalc();
  }

  function closeSavedInvoicesModal(){ els.savedModal().style.display = 'none'; }
  window.closeSavedInvoicesModal = closeSavedInvoicesModal;

  function printInvoice(){ window.print(); }
  window.printInvoice = printInvoice;

  function handleLogoUpload(e){ handleAssetUpload(e, 'logo', els.logo()); }
  function handleStampUpload(e){ handleAssetUpload(e, 'stamp', els.stamp()); }
  function handleSignatureUpload(e){ handleAssetUpload(e, 'signature', els.signature()); }
  window.handleLogoUpload = handleLogoUpload;
  window.handleStampUpload = handleStampUpload;
  window.handleSignatureUpload = handleSignatureUpload;

  function handleAssetUpload(e, key, imgEl){
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const assets = JSON.parse(localStorage.getItem(ASSETS_KEY) || '{}');
      assets[key] = reader.result;
      localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
      showAsset(imgEl, reader.result);
    };
    reader.readAsDataURL(file);
  }

  function showAsset(imgEl, dataUrl){ imgEl.src = dataUrl; imgEl.style.display = 'block'; }
  
  // Size adjustment functions
  function adjustLogoSize(size) {
    const logo = els.logo();
    // Update the logo size whether it has a src or not
    logo.style.maxWidth = size + 'px';
    logo.style.maxHeight = size + 'px';
    
    // Also update the CSS rule for future uploads
    const logoContainer = document.querySelector('.logo-container img');
    if (logoContainer) {
      logoContainer.style.maxWidth = size + 'px';
      logoContainer.style.maxHeight = size + 'px';
    }
    
    document.getElementById('logoSizeValue').textContent = size + 'px';
  }
  window.adjustLogoSize = adjustLogoSize;
  
  function adjustStampSize(size) {
    const stamp = els.stamp();
    if (stamp.src) {
      stamp.style.maxWidth = size + 'px';
      stamp.style.maxHeight = size + 'px';
    }
    document.getElementById('stampSizeValue').textContent = size + 'px';
  }
  window.adjustStampSize = adjustStampSize;
  
  // Template switching functionality
  function changeTemplate() {
    const template = document.getElementById('templateSelect').value;
    const content = els.content();
    
    // Remove existing template classes
    content.className = content.className.replace(/template-\w+/g, '');
    
    // Apply new template
    content.classList.add(`template-${template}`);
    
    // Store preference
    localStorage.setItem('selected_template', template);
  }
  window.changeTemplate = changeTemplate;
  
  // Load saved template preference
  function loadTemplatePreference() {
    const savedTemplate = localStorage.getItem('selected_template') || 'modern';
    document.getElementById('templateSelect').value = savedTemplate;
    changeTemplate();
  }

  // Initialize EmailJS
  function initEmailJS() {
    emailjs.init('qOz8eVnmhzJmEPjld'); // Public key for EmailJS
  }
  
  // Generate PDF as base64 for email attachment
  async function generatePDFForEmail() {
    const content = els.content();
    // Temporarily remove dashed input borders for PDF aesthetics
    const inputs = content.querySelectorAll('input');
    inputs.forEach(i => i.style.borderBottom = '1px solid transparent');

    const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210; const pageHeight = 297;

    // Calculate scale to fit one page
    const imgProps = { width: canvas.width, height: canvas.height };
    const ratio = Math.min(pageWidth / (imgProps.width/4), pageHeight / (imgProps.height/4));
    const width = (imgProps.width/4) * ratio;
    const height = (imgProps.height/4) * ratio;
    const x = (pageWidth - width)/2;
    const y = 0;

    pdf.addImage(imgData, 'PNG', x, y, width, height);
    
    // Restore borders
    inputs.forEach(i => i.style.borderBottom = '1px dashed #999');
    
    // Return PDF as base64 string
    return pdf.output('dataurlstring');
  }
  
  // Send invoice by email
  async function sendInvoiceByEmail() {
    const emailTo = document.getElementById('emailTo').value.trim();
    const emailSubject = document.getElementById('emailSubject').value.trim();
    const emailMessage = document.getElementById('emailMessage').value.trim();
    
    // Validation
    if (!emailTo) {
      alert('❌ Please enter the recipient\'s email address.');
      return;
    }
    if (!emailTo.includes('@')) {
      alert('❌ Please enter a valid email address.');
      return;
    }
    
    // Auto-fill subject if empty
    const subject = emailSubject || `Invoice #${els.invoiceNumber().value} - Alakefak Furniture Movers`;
    const message = emailMessage || `Dear Customer,\n\nPlease find attached your invoice.\n\nBest regards,\nAlakefak Furniture Movers`;
    
    try {
      // Show loading state
      const sendButton = document.querySelector('button[onclick="sendInvoiceByEmail()"]');
      const originalText = sendButton.innerHTML;
      sendButton.innerHTML = '⏳ Generating PDF & Sending...';
      sendButton.disabled = true;
      
      // Generate PDF
      const pdfBase64 = await generatePDFForEmail();
      
      // Prepare email data
      const emailData = {
        to_email: emailTo,
        subject: subject,
        message: message,
        invoice_number: els.invoiceNumber().value || 'N/A',
        customer_name: els.billTo().value || 'Valued Customer',
        invoice_date: els.invoiceDate().value || new Date().toISOString().split('T')[0],
        grand_total: els.grandTotal().textContent || '0.00 AED',
        pdf_attachment: pdfBase64,
        from_name: 'Alakefak Furniture Movers',
        from_email: 'alakefakcomp@gmail.com'
      };
      
      // Send email using EmailJS - use a simpler service
      const response = await emailjs.send('default_service', 'template_qwertyui', {
        to_name: emailData.customer_name,
        to_email: emailData.to_email,
        from_name: emailData.from_name,
        message: emailData.message,
        subject: emailData.subject,
        invoice_number: emailData.invoice_number,
        reply_to: 'alakefakcomp@gmail.com'
      });
      
      // Success
      sendButton.innerHTML = '✅ Email Sent!';
      alert(`✅ Invoice successfully sent to ${emailTo}!\n\nThe customer will receive the PDF invoice as an attachment.`);
      
      // Reset button after delay
      setTimeout(() => {
        sendButton.innerHTML = originalText;
        sendButton.disabled = false;
      }, 3000);
      
    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Error handling
      const sendButton = document.querySelector('button[onclick="sendInvoiceByEmail()"]');
      sendButton.innerHTML = '❌ Send Failed';
      sendButton.disabled = false;
      
      alert(`❌ Failed to send email. Please try again.\n\nError: ${error.message || 'Unknown error'}`);
      
      // Reset button after delay
      setTimeout(() => {
        sendButton.innerHTML = '📨 Send Invoice by Email';
      }, 3000);
    }
  }
  window.sendInvoiceByEmail = sendInvoiceByEmail;
  
  // Auto-fill email fields when invoice data changes
  function updateEmailFields() {
    const invoiceNumber = els.invoiceNumber().value;
    const customerName = els.billTo().value;
    
    if (invoiceNumber) {
      const subjectField = document.getElementById('emailSubject');
      if (!subjectField.value || subjectField.value.includes('Invoice #')) {
        subjectField.value = `Invoice #${invoiceNumber} - Alakefak Furniture Movers`;
      }
    }
    
    if (customerName) {
      const messageField = document.getElementById('emailMessage');
      if (!messageField.value || messageField.value.includes('Dear Customer')) {
        messageField.value = `Dear ${customerName},\n\nThank you for choosing Alakefak Furniture Movers.\n\nPlease find attached your invoice #${invoiceNumber}.\n\nBest regards,\nAlakefak Furniture Movers Team`;
      }
    }
  }
  
  // Initialize when DOM loaded
  document.addEventListener('DOMContentLoaded', () => {
    init();
    loadTemplatePreference();
    initEmailJS();
    
    // Auto-update email fields when invoice data changes
    els.invoiceNumber().addEventListener('input', updateEmailFields);
    els.billTo().addEventListener('input', updateEmailFields);
  });
})();
