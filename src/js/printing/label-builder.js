/**
 * CodeLapras - Shipping Label Builder
 *
 * Generates and prints shipping labels for packages.
 * Supports standard 4x6" thermal labels and 8.5x11" paper labels.
 *
 * Day 18: Shipments Module
 */

import { getCarrier, getCarrierIcon } from '../../config/carriers.js';
import { showNotification } from '../ui/notifications.js';

/**
 * Print shipping label for a shipment
 * @param {Object} shipment - Shipment object
 * @param {string} labelType - 'thermal' (4x6) or 'paper' (8.5x11)
 */
export function printLabel(shipment, labelType = 'thermal') {
  if (!shipment) {
    showNotification('No shipment data provided', 'error');
    return;
  }

  try {
    const html = labelType === 'thermal'
      ? generateThermalLabel(shipment)
      : generatePaperLabel(shipment);

    printHTML(html);
    showNotification('Opening print dialog...', 'info');
  } catch (error) {
    console.error('[Label Builder] Error generating label:', error);
    showNotification(`Error generating label: ${error.message}`, 'error');
  }
}

/**
 * Generate 4x6" thermal label HTML
 * @param {Object} shipment - Shipment object
 * @returns {string} HTML for label
 */
function generateThermalLabel(shipment) {
  const carrier = getCarrier(shipment.carrier);
  const carrierName = carrier ? carrier.fullName : shipment.carrier;
  const carrierIcon = getCarrierIcon(shipment.carrier);

  const fromAddress = getCompanyAddress();
  const toAddress = shipment.recipientAddress || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${shipment.trackingNumber}</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      width: 4in;
      height: 6in;
      padding: 0.25in;
      background: white;
      color: black;
      font-size: 10pt;
    }

    .label-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      border: 2px solid black;
      padding: 8px;
    }

    .carrier-header {
      text-align: center;
      padding: 8px 0;
      border-bottom: 2px solid black;
      margin-bottom: 8px;
    }

    .carrier-name {
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
    }

    .carrier-icon {
      font-size: 24pt;
    }

    .tracking-section {
      text-align: center;
      padding: 12px 0;
      border-bottom: 2px solid black;
      margin-bottom: 8px;
    }

    .tracking-label {
      font-size: 9pt;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .tracking-number {
      font-size: 16pt;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
    }

    .barcode-placeholder {
      text-align: center;
      padding: 12px;
      border: 1px dashed #666;
      margin: 8px 0;
      font-size: 8pt;
      color: #666;
    }

    .address-section {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .address-block {
      margin-bottom: 12px;
    }

    .address-label {
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .address-content {
      font-size: 10pt;
      line-height: 1.4;
    }

    .address-name {
      font-weight: bold;
      font-size: 11pt;
    }

    .to-address {
      border: 2px solid black;
      padding: 8px;
      background: #f9f9f9;
    }

    .to-address .address-name {
      font-size: 14pt;
    }

    .to-address .address-content {
      font-size: 12pt;
    }

    .from-address {
      font-size: 8pt;
      line-height: 1.3;
    }

    .metadata {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      padding-top: 8px;
      border-top: 1px solid #ccc;
      margin-top: auto;
    }

    .metadata-item {
      flex: 1;
    }

    .metadata-label {
      font-weight: bold;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="label-container">
    <!-- Carrier Header -->
    <div class="carrier-header">
      <div class="carrier-icon">${carrierIcon}</div>
      <div class="carrier-name">${carrierName}</div>
    </div>

    <!-- Tracking Number -->
    <div class="tracking-section">
      <div class="tracking-label">TRACKING NUMBER</div>
      <div class="tracking-number">${shipment.trackingNumber || 'N/A'}</div>
    </div>

    <!-- Barcode Placeholder -->
    <div class="barcode-placeholder">
      [BARCODE: ${shipment.trackingNumber}]<br>
      <small>Barcode generation requires external library</small>
    </div>

    <!-- Addresses -->
    <div class="address-section">
      <!-- To Address -->
      <div class="address-block to-address">
        <div class="address-label">SHIP TO:</div>
        <div class="address-content">
          <div class="address-name">${shipment.recipientName || 'N/A'}</div>
          ${toAddress.line1 ? `<div>${toAddress.line1}</div>` : ''}
          ${toAddress.line2 ? `<div>${toAddress.line2}</div>` : ''}
          ${toAddress.city || toAddress.state || toAddress.zip ?
            `<div>${toAddress.city || ''} ${toAddress.state || ''} ${toAddress.zip || ''}</div>` : ''}
          ${toAddress.country && toAddress.country !== 'US' ? `<div>${toAddress.country}</div>` : ''}
          ${shipment.recipientPhone ? `<div>Tel: ${shipment.recipientPhone}</div>` : ''}
        </div>
      </div>

      <!-- From Address -->
      <div class="address-block from-address">
        <div class="address-label">FROM:</div>
        <div class="address-content">
          <div>${fromAddress.name}</div>
          ${fromAddress.line1 ? `<div>${fromAddress.line1}</div>` : ''}
          ${fromAddress.line2 ? `<div>${fromAddress.line2}</div>` : ''}
          ${fromAddress.city || fromAddress.state || fromAddress.zip ?
            `<div>${fromAddress.city || ''} ${fromAddress.state || ''} ${fromAddress.zip || ''}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Metadata -->
    <div class="metadata">
      <div class="metadata-item">
        <div class="metadata-label">Shipped:</div>
        <div>${shipment.shippedDate ? new Date(shipment.shippedDate).toLocaleDateString() : 'Pending'}</div>
      </div>
      ${shipment.weight ? `
        <div class="metadata-item">
          <div class="metadata-label">Weight:</div>
          <div>${shipment.weight}</div>
        </div>
      ` : ''}
      ${shipment.orderId ? `
        <div class="metadata-item">
          <div class="metadata-label">Order:</div>
          <div>${shipment.orderId}</div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate 8.5x11" paper label HTML (can print 2 per page)
 * @param {Object} shipment - Shipment object
 * @returns {string} HTML for label
 */
function generatePaperLabel(shipment) {
  const carrier = getCarrier(shipment.carrier);
  const carrierName = carrier ? carrier.fullName : shipment.carrier;
  const carrierIcon = getCarrierIcon(shipment.carrier);

  const fromAddress = getCompanyAddress();
  const toAddress = shipment.recipientAddress || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${shipment.trackingNumber}</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      background: white;
      color: black;
      padding: 20px;
    }

    .label {
      width: 7in;
      margin: 0 auto 0.5in auto;
      border: 3px solid black;
      padding: 20px;
      page-break-after: always;
    }

    .carrier-header {
      text-align: center;
      padding: 15px;
      border-bottom: 3px solid black;
      margin-bottom: 15px;
      background: #f0f0f0;
    }

    .carrier-icon {
      font-size: 36pt;
    }

    .carrier-name {
      font-size: 24pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 5px;
    }

    .tracking-section {
      text-align: center;
      padding: 20px;
      border: 2px solid black;
      margin-bottom: 20px;
      background: #fff;
    }

    .tracking-label {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .tracking-number {
      font-size: 20pt;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      letter-spacing: 3px;
    }

    .barcode-placeholder {
      text-align: center;
      padding: 20px;
      border: 2px dashed #666;
      margin: 15px 0;
      font-size: 10pt;
      color: #666;
      background: #f9f9f9;
    }

    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }

    .address-block {
      padding: 15px;
      border: 2px solid black;
    }

    .to-address {
      background: #ffffcc;
      grid-column: 1 / -1;
    }

    .address-label {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #666;
    }

    .address-content {
      font-size: 12pt;
      line-height: 1.5;
    }

    .address-name {
      font-weight: bold;
      font-size: 14pt;
      margin-bottom: 5px;
    }

    .to-address .address-name {
      font-size: 18pt;
    }

    .metadata {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 15px;
      border: 1px solid #ccc;
      background: #f9f9f9;
      font-size: 10pt;
    }

    .metadata-item {
      padding: 8px;
    }

    .metadata-label {
      font-weight: bold;
      display: block;
      margin-bottom: 3px;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <!-- Carrier Header -->
    <div class="carrier-header">
      <div class="carrier-icon">${carrierIcon}</div>
      <div class="carrier-name">${carrierName}</div>
    </div>

    <!-- Tracking Number -->
    <div class="tracking-section">
      <div class="tracking-label">TRACKING NUMBER</div>
      <div class="tracking-number">${shipment.trackingNumber || 'N/A'}</div>
    </div>

    <!-- Barcode Placeholder -->
    <div class="barcode-placeholder">
      [BARCODE: ${shipment.trackingNumber}]<br>
      <small>For actual barcodes, integrate a barcode library like JsBarcode or barcode.js</small>
    </div>

    <!-- Addresses -->
    <div class="addresses">
      <!-- To Address (Full Width) -->
      <div class="address-block to-address">
        <div class="address-label">📍 SHIP TO:</div>
        <div class="address-content">
          <div class="address-name">${shipment.recipientName || 'N/A'}</div>
          ${toAddress.line1 ? `<div>${toAddress.line1}</div>` : ''}
          ${toAddress.line2 ? `<div>${toAddress.line2}</div>` : ''}
          ${toAddress.city || toAddress.state || toAddress.zip ?
            `<div>${toAddress.city || ''}, ${toAddress.state || ''} ${toAddress.zip || ''}</div>` : ''}
          ${toAddress.country && toAddress.country !== 'US' ? `<div><strong>${toAddress.country}</strong></div>` : ''}
          ${shipment.recipientPhone ? `<div>Phone: ${shipment.recipientPhone}</div>` : ''}
          ${shipment.recipientEmail ? `<div>Email: ${shipment.recipientEmail}</div>` : ''}
        </div>
      </div>

      <!-- From Address -->
      <div class="address-block">
        <div class="address-label">📤 FROM:</div>
        <div class="address-content">
          <div class="address-name">${fromAddress.name}</div>
          ${fromAddress.line1 ? `<div>${fromAddress.line1}</div>` : ''}
          ${fromAddress.line2 ? `<div>${fromAddress.line2}</div>` : ''}
          ${fromAddress.city || fromAddress.state || fromAddress.zip ?
            `<div>${fromAddress.city || ''}, ${fromAddress.state || ''} ${fromAddress.zip || ''}</div>` : ''}
          ${fromAddress.phone ? `<div>Phone: ${fromAddress.phone}</div>` : ''}
        </div>
      </div>

      <!-- Service Info -->
      <div class="address-block">
        <div class="address-label">📦 SERVICE:</div>
        <div class="address-content">
          ${shipment.serviceLevel ? `<div><strong>${shipment.serviceLevel}</strong></div>` : ''}
          ${shipment.weight ? `<div>Weight: ${shipment.weight}</div>` : ''}
          ${shipment.dimensions ? `<div>Dimensions: ${shipment.dimensions}</div>` : ''}
          ${shipment.insuranceValue ? `<div>Insurance: $${shipment.insuranceValue}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Metadata -->
    <div class="metadata">
      <div class="metadata-item">
        <span class="metadata-label">Order ID:</span>
        <div>${shipment.orderId || 'N/A'}</div>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Shipped Date:</span>
        <div>${shipment.shippedDate ? new Date(shipment.shippedDate).toLocaleDateString() : 'Pending'}</div>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Est. Delivery:</span>
        <div>${shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : 'N/A'}</div>
      </div>
      ${shipment.notes ? `
        <div class="metadata-item" style="grid-column: 1 / -1;">
          <span class="metadata-label">Notes:</span>
          <div>${shipment.notes}</div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Get company/sender address from settings
 * @returns {Object} Company address
 */
function getCompanyAddress() {
  // Try to get from settings
  const settings = localStorage.getItem('inv.settings');
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      if (parsed.company) {
        return {
          name: parsed.company.name || 'Your Company',
          line1: parsed.company.address || '',
          line2: parsed.company.address2 || '',
          city: parsed.company.city || '',
          state: parsed.company.state || '',
          zip: parsed.company.zip || '',
          phone: parsed.company.phone || ''
        };
      }
    } catch (error) {
      console.error('[Label Builder] Error parsing settings:', error);
    }
  }

  // Default fallback
  return {
    name: 'Your Company Name',
    line1: '123 Main Street',
    line2: '',
    city: 'Your City',
    state: 'ST',
    zip: '12345',
    phone: '(555) 123-4567'
  };
}

/**
 * Print HTML in new window
 * @param {string} html - HTML content to print
 */
function printHTML(html) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showNotification('Please allow popups to print labels', 'error');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Optionally close after printing
      // printWindow.close();
    }, 250);
  };
}

/**
 * Generate return label (reverses addresses)
 * @param {Object} shipment - Original shipment
 * @param {string} labelType - 'thermal' or 'paper'
 */
export function printReturnLabel(shipment, labelType = 'thermal') {
  if (!shipment) {
    showNotification('No shipment data provided', 'error');
    return;
  }

  // Create reversed shipment for return
  const returnShipment = {
    ...shipment,
    trackingNumber: `RETURN-${shipment.trackingNumber}`,
    recipientName: getCompanyAddress().name,
    recipientAddress: getCompanyAddress(),
    notes: `Return for order ${shipment.orderId || 'N/A'}`
  };

  printLabel(returnShipment, labelType);
}

/**
 * Batch print labels for multiple shipments
 * @param {Array<Object>} shipments - Array of shipments
 * @param {string} labelType - 'thermal' or 'paper'
 */
export function batchPrintLabels(shipments, labelType = 'thermal') {
  if (!shipments || shipments.length === 0) {
    showNotification('No shipments to print', 'error');
    return;
  }

  try {
    // Generate all labels as one HTML document
    const labels = shipments.map(s =>
      labelType === 'thermal'
        ? generateThermalLabel(s)
        : generatePaperLabel(s)
    );

    // Combine with page breaks
    const combinedHTML = labels.join('\n<div style="page-break-after: always;"></div>\n');

    printHTML(combinedHTML);
    showNotification(`Printing ${shipments.length} labels...`, 'info');
  } catch (error) {
    console.error('[Label Builder] Error batch printing:', error);
    showNotification(`Error printing labels: ${error.message}`, 'error');
  }
}

/**
 * Download label as PDF (requires external library)
 * This is a placeholder for future PDF generation
 * @param {Object} shipment - Shipment object
 */
export function downloadLabelAsPDF(shipment) {
  showNotification('PDF download requires a PDF library like jsPDF. Feature coming soon!', 'info');

  // Future implementation with jsPDF:
  // const html = generateThermalLabel(shipment);
  // Convert HTML to PDF
  // Download PDF
}

// Export public API
export default {
  printLabel,
  printReturnLabel,
  batchPrintLabels,
  downloadLabelAsPDF
};

// Expose to window for easy access
window.labelBuilder = {
  printLabel,
  printReturnLabel,
  batchPrintLabels,
  downloadLabelAsPDF
};
