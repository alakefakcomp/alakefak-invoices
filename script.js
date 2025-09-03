// Utility functions and main logic
(function(){
  const { jsPDF } = window.jspdf || {};

  const VAT_RATE = 0.05; // 5%
  const STORAGE_KEY = 'alakefak_invoices_v1';
  const ASSETS_KEY = 'alakefak_assets_v1';

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

    // Attach listeners
    els.itemsBody().addEventListener('input', recalc);

    // Initial calc
    recalc();
  }

  function pad(n, width=4) { return String(n).padStart(width, '0'); }

  function nextInvoiceNumber(){
    const key = 'alakefak_invoice_counter';
    const today = new Date();
    const y = today.getFullYear();
    const m = pad(today.getMonth()+1,2);
    const d = pad(today.getDate(),2);
    let counterData = JSON.parse(localStorage.getItem(key) || '{}');
    const datePrefix = `${y}${m}${d}`;
    const current = counterData.date === datePrefix ? (counterData.seq||0)+1 : 1;
    counterData = { date: datePrefix, seq: current };
    localStorage.setItem(key, JSON.stringify(counterData));
    return `${datePrefix}-${pad(current,3)}`; // e.g., 20250902-001
  }

  function addItem(){
    const tr = document.createElement('tr');
    tr.className = 'item-row';
    tr.innerHTML = `
      <td><input type="text" class="item-input" placeholder="1"></td>
      <td><input type="text" class="item-input description-input" placeholder="Service description"></td>
      <td><input type="number" class="item-input quantity-input" placeholder="1" min="1" value="1"></td>
      <td><input type="number" class="item-input rate-input" placeholder="0.00" step="0.01"></td>
      <td class="amount-cell">0.00 AED</td>
      <td class="vat-cell">0.00 AED</td>
      <td class="total-cell">0.00 AED</td>
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

  function recalc(){
    let subtotal = 0;
    let totalVat = 0;
    const rows = els.itemsBody().querySelectorAll('.item-row');
    rows.forEach(row => {
      const qty = parseFloat(row.querySelector('.quantity-input')?.value || '0');
      const rate = parseFloat(row.querySelector('.rate-input')?.value || '0');
      const amount = qty * rate;
      const vat = amount * VAT_RATE;
      const total = amount + vat;
      row.querySelector('.amount-cell').textContent = fmt(amount) + ' AED';
      row.querySelector('.vat-cell').textContent = fmt(vat) + ' AED';
      row.querySelector('.total-cell').textContent = fmt(total) + ' AED';
      subtotal += amount;
      totalVat += vat;
    });
    els.subtotal().textContent = fmt(subtotal) + ' AED';
    els.totalVat().textContent = fmt(totalVat) + ' AED';
    const grand = subtotal + totalVat;
    els.grandTotal().textContent = fmt(grand) + ' AED';
    els.amountInWords().textContent = numberToWordsAED(grand) + ' only';
  }

  function fmt(n){ return (Math.round(n * 100) / 100).toFixed(2); }

  // Convert numbers to words (simplified for AED)
  function numberToWordsAED(amount){
    const ones = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    function toWords(n){
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10? ' ' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100? ' ' + toWords(n%100) : '');
      if (n < 1000000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000? ' ' + toWords(n%1000) : '');
      return n.toString();
    }

    const whole = Math.floor(amount);
    const fils = Math.round((amount - whole) * 100);
    const currency = 'AED';
    return `${toWords(whole)} ${currency}` + (fils? ` and ${toWords(fils)} Fils` : '');
  }

  async function generatePDF(){
    // Ensure one page by scaling content to A4 using html2canvas+jspdf
    const content = els.content();
    // Temporarily remove dashed input borders for PDF aesthetics
    const inputs = content.querySelectorAll('input');
    inputs.forEach(i=> i.style.borderBottom = '1px solid transparent');

    const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    // Fix library access
    let pdf;
    if (window.jspdf && window.jspdf.jsPDF) {
      pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    } else if (window.jsPDF) {
      pdf = new window.jsPDF('p', 'mm', 'a4');
    } else {
      alert('PDF library not loaded properly. Please refresh the page.');
      return;
    }
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

  function saveInvoice(){
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const data = collectInvoiceData();
    const existingIndex = invoices.findIndex(inv => inv.invoiceNumber === data.invoiceNumber);
    if (existingIndex >= 0) invoices[existingIndex] = data; else invoices.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    alert('Invoice saved locally on this device. It will persist unless you clear browser storage.');
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

  function viewSavedInvoices(){
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const list = els.savedList();
    list.innerHTML = '';
    invoices.sort((a,b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
    invoices.forEach(inv => {
      const div = document.createElement('div');
      div.className = 'saved-invoice-row';
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '6px 0';
      div.innerHTML = `
        <div>
          <strong>${inv.invoiceNumber}</strong> — ${inv.billTo || ''} (${inv.invoiceDate})
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" data-id="${inv.invoiceNumber}">Load</button>
          <button class="btn btn-success btn-sm" data-dl="${inv.invoiceNumber}">PDF</button>
        </div>
      `;
      list.appendChild(div);
    });
    list.addEventListener('click', onSavedListClick);
    els.savedModal().style.display = 'block';
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

  // Initialize when DOM loaded
  document.addEventListener('DOMContentLoaded', init);
})();
