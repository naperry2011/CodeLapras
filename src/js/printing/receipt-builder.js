/**
 * Receipt Builder Module
 * Handles POS-style receipt generation and printing
 * Optimized for thermal printers (80mm width) and compact formats
 */

/**
 * HTML escape utility for safe rendering
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/**
 * Generate CSS styles for receipt printing (thermal printer optimized)
 * @returns {string} CSS string
 */
function generateReceiptCSS() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 80mm;
      margin: 0 auto;
      padding: 8px;
    }
    .receipt {
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 2px dashed #000;
      padding-bottom: 8px;
    }
    .header h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .header .logo {
      max-width: 60mm;
      max-height: 30mm;
      margin-bottom: 6px;
    }
    .company-info {
      font-size: 11px;
      line-height: 1.3;
    }
    .section {
      margin-bottom: 10px;
    }
    .section-title {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .info-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 11px;
    }
    .info-label {
      font-weight: bold;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .divider-solid {
      border-top: 2px solid #000;
      margin: 8px 0;
    }
    .items-table {
      width: 100%;
      margin-bottom: 8px;
    }
    .items-table th {
      text-align: left;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .items-table td {
      padding: 2px 0;
      font-size: 11px;
    }
    .item-row {
      border-bottom: 1px dotted #ccc;
    }
    .item-name {
      font-weight: bold;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    .qty-price {
      flex: 1;
    }
    .line-total {
      text-align: right;
      font-weight: bold;
    }
    .totals {
      margin-top: 8px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 11px;
    }
    .total-line.grand-total {
      font-size: 14px;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 6px 0;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 2px dashed #000;
      font-size: 11px;
    }
    .footer-notes {
      white-space: pre-wrap;
      margin-top: 6px;
      font-size: 10px;
    }
    .printbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f0f0f0;
      padding: 8px;
      border-bottom: 1px solid #ccc;
      text-align: center;
      z-index: 1000;
    }
    .btn {
      border: 1px solid #666;
      padding: 6px 12px;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      font-size: 13px;
      margin: 0 4px;
    }
    .btn:hover {
      background: #e0e0e0;
    }
    @media print {
      .printbar {
        display: none;
      }
      body {
        width: 80mm;
        padding: 0;
      }
    }
  `;
}

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (USD, EUR, etc.)
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, currency = 'USD') {
  return Number(value || 0).toLocaleString(undefined, {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2
  });
}

/**
 * Generate receipt header HTML
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {string} HTML for receipt header
 */
function generateReceiptHeader(invoice, settings) {
  const logoTag = settings.logo
    ? `<img class="logo" src="${escapeHTML(settings.logo)}" alt="Logo">`
    : '';

  const companyName = settings.companyName || 'Your Company';
  const companyAddress = settings.companyAddress || '';
  const companyPhone = settings.companyPhone || '';
  const companyEmail = settings.companyEmail || '';

  return `
    <div class="header">
      ${logoTag}
      <h1>${escapeHTML(companyName)}</h1>
      <div class="company-info">
        ${companyAddress ? `<div>${escapeHTML(companyAddress)}</div>` : ''}
        ${companyPhone ? `<div>Tel: ${escapeHTML(companyPhone)}</div>` : ''}
        ${companyEmail ? `<div>${escapeHTML(companyEmail)}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Generate receipt info section (invoice number, date, customer)
 * @param {Object} invoice - Invoice object
 * @returns {string} HTML for receipt info
 */
function generateReceiptInfo(invoice) {
  const date = invoice.date || new Date().toLocaleString();
  const invoiceNumber = invoice.number || 'N/A';

  return `
    <div class="section">
      <div class="info-line">
        <span class="info-label">Receipt #:</span>
        <span>${escapeHTML(invoiceNumber)}</span>
      </div>
      <div class="info-line">
        <span class="info-label">Date:</span>
        <span>${escapeHTML(date)}</span>
      </div>
      ${invoice.billTo ? `
        <div class="info-line" style="margin-top: 4px;">
          <span class="info-label">Customer:</span>
        </div>
        <div style="font-size: 10px; white-space: pre-wrap; margin-left: 4px;">
${escapeHTML(invoice.billTo)}
        </div>
      ` : ''}
    </div>
    <div class="divider"></div>
  `;
}

/**
 * Generate receipt items section
 * @param {Array} items - Line items array
 * @param {string} currency - Currency code
 * @returns {string} HTML for receipt items
 */
function generateReceiptItems(items, currency) {
  const fmt = (n) => formatCurrency(n, currency);

  if (!items || items.length === 0) {
    return `
      <div class="section">
        <div class="section-title">Items</div>
        <div style="text-align: center; color: #666; font-size: 11px;">No items</div>
      </div>
      <div class="divider"></div>
    `;
  }

  const itemsHTML = items.map(item => {
    const qty = item.qty || 0;
    const price = item.price || 0;
    const lineTotal = item.total != null ? item.total : qty * price;

    return `
      <div class="item-row">
        <div class="item-name">${escapeHTML(item.name || 'Item')}</div>
        <div class="item-details">
          <span class="qty-price">${qty} x ${fmt(price)}</span>
          <span class="line-total">${fmt(lineTotal)}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section">
      <div class="section-title">Items</div>
      ${itemsHTML}
    </div>
    <div class="divider"></div>
  `;
}

/**
 * Generate receipt totals section
 * @param {Object} invoice - Invoice object
 * @param {string} currency - Currency code
 * @returns {string} HTML for receipt totals
 */
function generateReceiptTotals(invoice, currency) {
  const fmt = (n) => formatCurrency(n, currency);

  let totalsHTML = [];

  // Subtotal
  totalsHTML.push(`
    <div class="total-line">
      <span>Subtotal:</span>
      <span>${fmt(invoice.subtotal || 0)}</span>
    </div>
  `);

  // Seller Discount
  if ((invoice.sellerDiscountTotal || 0) > 0) {
    totalsHTML.push(`
      <div class="total-line">
        <span>Discount:</span>
        <span>-${fmt(invoice.sellerDiscountTotal)}</span>
      </div>
    `);
  }

  // Shipping
  if ((invoice.shipping || 0) > 0) {
    totalsHTML.push(`
      <div class="total-line">
        <span>Shipping:</span>
        <span>${fmt(invoice.shipping)}</span>
      </div>
    `);
  }

  // Tax
  if ((invoice.tax || 0) > 0) {
    const taxRate = ((invoice.taxRate || 0) * 100).toFixed(2);
    totalsHTML.push(`
      <div class="total-line">
        <span>Tax (${taxRate}%):</span>
        <span>${fmt(invoice.tax)}</span>
      </div>
    `);
  }

  // Manufacturer Coupon
  if ((invoice.mfrCoupon || 0) > 0) {
    totalsHTML.push(`
      <div class="total-line">
        <span>Coupon:</span>
        <span>-${fmt(invoice.mfrCoupon)}</span>
      </div>
    `);
  }

  // Grand Total
  totalsHTML.push(`
    <div class="total-line grand-total">
      <span>TOTAL:</span>
      <span>${fmt(invoice.total || 0)}</span>
    </div>
  `);

  return `
    <div class="totals">
      ${totalsHTML.join('\n')}
    </div>
  `;
}

/**
 * Generate receipt footer
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {string} HTML for receipt footer
 */
function generateReceiptFooter(invoice, settings) {
  const footerNotes = invoice.footerNotes || settings.receiptFooter || 'Thank you for your business!';

  return `
    <div class="footer">
      <div style="font-weight: bold;">THANK YOU!</div>
      ${footerNotes ? `<div class="footer-notes">${escapeHTML(footerNotes)}</div>` : ''}
      ${invoice.notes ? `
        <div class="divider"></div>
        <div class="footer-notes">
          <strong>Notes:</strong><br>
          ${escapeHTML(invoice.notes)}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate complete receipt HTML document
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {string} Complete HTML document
 */
function generateReceiptHTML(invoice, settings = {}) {
  const currency = settings.currency || 'USD';

  const header = generateReceiptHeader(invoice, settings);
  const info = generateReceiptInfo(invoice);
  const items = generateReceiptItems(invoice.items, currency);
  const totals = generateReceiptTotals(invoice, currency);
  const footer = generateReceiptFooter(invoice, settings);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt - ${escapeHTML(invoice.number || 'N/A')}</title>
        <style>${generateReceiptCSS()}</style>
      </head>
      <body>
        <div class="printbar">
          <button class="btn" onclick="window.print()">Print Receipt</button>
          <button class="btn" onclick="window.close()">Close</button>
        </div>

        <div class="receipt">
          ${header}
          ${info}
          ${items}
          ${totals}
          ${footer}
        </div>
      </body>
    </html>
  `;
}

/**
 * Open receipt in a new print window
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {Window|null} Window object or null if blocked
 */
function openReceiptPrintWindow(invoice, settings = {}) {
  const html = generateReceiptHTML(invoice, settings);
  const windowTitle = `Receipt - ${invoice.number || 'N/A'}`;

  const w = window.open('', '_blank', 'width=320,height=600,scrollbars=yes,resizable=yes');

  if (!w) {
    alert('Popup blocked. Please allow popups for this site to print receipts.');
    return null;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = windowTitle;

  return w;
}

/**
 * Print receipt directly (opens print dialog)
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 */
function printReceipt(invoice, settings = {}) {
  const w = openReceiptPrintWindow(invoice, settings);
  if (w) {
    // Wait for content to load before printing
    w.onload = function() {
      w.print();
    };
  }
}

/**
 * Generate receipt HTML for embedding (without print controls)
 * Useful for preview in a modal or iframe
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {string} HTML content (body only)
 */
function generateReceiptPreviewHTML(invoice, settings = {}) {
  const fullHTML = generateReceiptHTML(invoice, settings);
  // Extract body content only (remove printbar)
  const match = fullHTML.match(/<body>([\s\S]*)<\/body>/);
  if (match && match[1]) {
    // Remove printbar div
    return match[1].replace(/<div class="printbar">[\s\S]*?<\/div>/, '');
  }
  return fullHTML;
}

// Expose functions to global window object for non-module usage
if (typeof window !== 'undefined') {
  window.generateReceiptHTML = generateReceiptHTML;
  window.openReceiptPrintWindow = openReceiptPrintWindow;
  window.printReceipt = printReceipt;
  window.generateReceiptPreviewHTML = generateReceiptPreviewHTML;
}
