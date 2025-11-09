/**
 * Invoice Builder Module
 * Handles invoice HTML generation, printing, and PDF export
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
 * Generate CSS styles for invoice printing
 * @param {Object} settings - Company/app settings
 * @returns {string} CSS string
 */
function generateInvoiceCSS(settings = {}) {
  return `
    body {
      font: 14px/1.5 system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      background: #fff;
      padding: 24px;
      margin: 0;
    }
    h1, h2, h3 {
      margin: 0 0 8px;
      font-weight: 600;
    }
    h1 { font-size: 28px; }
    h2 { font-size: 22px; }
    h3 { font-size: 18px; }
    .row {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .col {
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f3f6fa;
      font-weight: 600;
    }
    .right {
      text-align: right;
    }
    .center {
      text-align: center;
    }
    .muted {
      color: #666;
    }
    .printbar {
      position: sticky;
      top: 0;
      background: #fff;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 1px solid #eee;
      z-index: 100;
    }
    .btn {
      border: 1px solid #ccc;
      padding: 8px 16px;
      border-radius: 6px;
      background: #fafafa;
      cursor: pointer;
      font-size: 14px;
      margin-right: 8px;
    }
    .btn:hover {
      background: #f0f0f0;
    }
    .logo {
      height: 48px;
      object-fit: contain;
    }
    pre {
      white-space: pre-wrap;
      margin: 0;
      font-family: inherit;
    }
    @media print {
      .printbar {
        display: none;
      }
      body {
        padding: 12px;
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
 * Format percentage value
 * @param {number} value - Numeric value
 * @returns {string} Formatted percentage string
 */
function formatPercent(value) {
  return (Number(value || 0)).toFixed(2) + '%';
}

/**
 * Generate line items table HTML
 * @param {Array} items - Array of line items
 * @param {string} currency - Currency code
 * @returns {string} HTML string for items table
 */
function generateLineItemsTable(items, currency) {
  const fmt = (n) => formatCurrency(n, currency);

  if (!items || items.length === 0) {
    return `
      <h3>Line Items</h3>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Item</th><th>SKU</th>
            <th class="right">Qty</th><th class="right">Price</th><th class="right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6" class="muted center">No items.</td></tr>
        </tbody>
      </table>
    `;
  }

  const itemsRows = items.map((item, index) => {
    const lineTotal = item.total != null ? item.total : (item.qty || 0) * (item.price || 0);
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.name || '')}</td>
        <td>${escapeHTML(item.sku || '')}</td>
        <td class="right">${item.qty || 0}</td>
        <td class="right">${fmt(item.price || 0)}</td>
        <td class="right">${fmt(lineTotal || 0)}</td>
      </tr>
    `;
  }).join('');

  return `
    <h3>Line Items</h3>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Item</th><th>SKU</th>
          <th class="right">Qty</th><th class="right">Price</th><th class="right">Line Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
  `;
}

/**
 * Generate totals table HTML
 * @param {Object} invoice - Invoice object
 * @param {string} currency - Currency code
 * @returns {string} HTML string for totals table
 */
function generateTotalsTable(invoice, currency) {
  const fmt = (n) => formatCurrency(n, currency);
  const pct = formatPercent;

  const shipTaxableNote = invoice.shipTaxable ? 'Yes' : 'No';
  const taxRatePct = pct((invoice.taxRate || 0) * 100);

  let rows = [];

  // Subtotal
  rows.push(`<tr><td>Subtotal (items)</td><td class="right">${fmt(invoice.subtotal)}</td></tr>`);

  // Seller Discount (if applicable)
  if ((invoice.sellerDiscountTotal || 0) > 0) {
    rows.push(`
      <tr>
        <td>Seller Discount (${pct(invoice.sellerDiscountPct || 0)} + ${fmt(invoice.sellerDiscountFixed || 0)})</td>
        <td class="right">-${fmt(invoice.sellerDiscountTotal || 0)}</td>
      </tr>
    `);
  }

  // Shipping
  rows.push(`
    <tr>
      <td>Shipping</td>
      <td class="right">${fmt(invoice.shipping || 0)} <span class="muted">(Taxable: ${shipTaxableNote})</span></td>
    </tr>
  `);

  // Tax Base
  const taxBaseNote = invoice.shipTaxable ? ' + shipping' : '';
  rows.push(`
    <tr>
      <td class="muted">Tax Base (after seller discount${taxBaseNote})</td>
      <td class="right muted">${fmt(invoice.taxBase || 0)}</td>
    </tr>
  `);

  // Tax
  rows.push(`
    <tr>
      <td>Tax (${taxRatePct})</td>
      <td class="right">${fmt(invoice.tax || 0)}</td>
    </tr>
  `);

  // Manufacturer Coupon (if applicable)
  if ((invoice.mfrCoupon || 0) > 0) {
    rows.push(`
      <tr>
        <td>Manufacturer Coupon</td>
        <td class="right">-${fmt(invoice.mfrCoupon || 0)}</td>
      </tr>
    `);
  }

  // Total
  rows.push(`
    <tr>
      <td><strong>Total</strong></td>
      <td class="right"><strong>${fmt(invoice.total || 0)}</strong></td>
    </tr>
  `);

  return `
    <h3>Totals</h3>
    <table>
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>
  `;
}

/**
 * Generate complete invoice HTML document
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {string} Complete HTML document
 */
function generateInvoiceHTML(invoice, settings = {}) {
  const currency = settings.currency || 'USD';
  const logoTag = settings.logo
    ? `<img class="logo" src="${escapeHTML(settings.logo)}" alt="Company Logo">`
    : '';

  // Header with logo and invoice info
  const header = `
    <div class="row">
      <div class="col" style="display: flex; align-items: center; gap: 12px;">
        ${logoTag}
        <div>
          <h1>Invoice</h1>
          <div class="muted">${escapeHTML(invoice.number || '')}</div>
        </div>
      </div>
      <div class="col" style="text-align: right;">
        <div><strong>Invoice #:</strong> ${escapeHTML(invoice.number || '')}</div>
        <div><strong>Date:</strong> ${escapeHTML(invoice.date || new Date().toLocaleDateString())}</div>
      </div>
    </div>
  `;

  // From/Bill To section
  const parties = `
    <div class="row">
      <div class="col">
        <h3>From</h3>
        <pre>${escapeHTML(invoice.from || '')}</pre>
      </div>
      <div class="col">
        <h3>Bill To</h3>
        <pre>${escapeHTML(invoice.billTo || '')}</pre>
      </div>
    </div>
  `;

  // Line items table
  const itemsTable = generateLineItemsTable(invoice.items, currency);

  // Totals table
  const totalsTable = generateTotalsTable(invoice, currency);

  // Notes section
  const notes = invoice.notes ? `
    <div style="margin-top: 16px;">
      <h3>Notes</h3>
      <div class="muted"><pre>${escapeHTML(invoice.notes)}</pre></div>
    </div>
  ` : '';

  // Footer section
  const footer = (invoice.footerNotes || invoice.footerImage) ? `
    <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 12px;">
      ${invoice.footerImage ? `
        <div style="text-align: center; margin-bottom: 8px;">
          <img src="${escapeHTML(invoice.footerImage)}" style="max-width: 200px; max-height: 100px;" alt="Footer Image">
        </div>
      ` : ''}
      ${invoice.footerNotes ? `
        <div class="muted"><pre>${escapeHTML(invoice.footerNotes)}</pre></div>
      ` : ''}
    </div>
  ` : '';

  // Complete HTML document
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHTML(invoice.number || 'Invoice')}</title>
        <style>${generateInvoiceCSS(settings)}</style>
      </head>
      <body>
        <div class="printbar">
          <button class="btn" onclick="window.print()">Print / Save as PDF</button>
          <button class="btn" onclick="window.close()">Close</button>
        </div>

        ${header}
        ${parties}
        ${itemsTable}

        <div style="margin-top: 16px;">
          ${totalsTable}
        </div>

        ${notes}
        ${footer}
      </body>
    </html>
  `;
}

/**
 * Open invoice in a new print window
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {Window|null} Window object or null if blocked
 */
function openInvoicePrintWindow(invoice, settings = {}) {
  const html = generateInvoiceHTML(invoice, settings);
  const windowTitle = invoice.number || 'Invoice';

  const w = window.open('', '_blank', 'width=980,height=900,scrollbars=yes,resizable=yes');

  if (!w) {
    alert('Popup blocked. Please allow popups for this site to print invoices.');
    return null;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = windowTitle;

  return w;
}

/**
 * Print invoice directly (opens print dialog)
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 */
function printInvoice(invoice, settings = {}) {
  const w = openInvoicePrintWindow(invoice, settings);
  if (w) {
    // Wait for content to load before printing
    w.onload = function() {
      w.print();
    };
  }
}

/**
 * Download invoice as PDF (opens print dialog with save option)
 * Note: Browser's print-to-PDF feature is used
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 */
function downloadInvoicePDF(invoice, settings = {}) {
  // For now, this just opens the print dialog
  // Users can choose "Save as PDF" from their browser
  printInvoice(invoice, settings);
}

/**
 * Generate invoice HTML for embedding (without print controls)
 * Useful for preview in a modal or iframe
 * @param {Object} invoice - Invoice object
 * @param {Object} settings - Company/app settings
 * @returns {string} HTML content (body only)
 */
function generateInvoicePreviewHTML(invoice, settings = {}) {
  const fullHTML = generateInvoiceHTML(invoice, settings);
  // Extract body content only (remove printbar)
  const match = fullHTML.match(/<body>([\s\S]*)<\/body>/);
  if (match && match[1]) {
    // Remove printbar div
    return match[1].replace(/<div class="printbar">[\s\S]*?<\/div>/, '');
  }
  return fullHTML;
}

// Legacy compatibility: Keep original function name
function openInvoiceWindow(invoice, settings = {}) {
  return openInvoicePrintWindow(invoice, settings);
}

// Expose functions to global window object for non-module usage
if (typeof window !== 'undefined') {
  window.generateInvoiceHTML = generateInvoiceHTML;
  window.openInvoicePrintWindow = openInvoicePrintWindow;
  window.printInvoice = printInvoice;
  window.downloadInvoicePDF = downloadInvoicePDF;
  window.generateInvoicePreviewHTML = generateInvoicePreviewHTML;
  window.openInvoiceWindow = openInvoiceWindow; // Legacy
}
