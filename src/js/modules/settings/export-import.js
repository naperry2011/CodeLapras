/**
 * CodeLapras - Export/Import Module
 *
 * Handles data export (JSON, CSV, Excel) and import with validation.
 *
 * Day 20: Settings Module
 */

import { showNotification } from '../../ui/notifications.js';
import EventBus from '../../core/eventBus.js';

/**
 * Export all data as JSON
 * @param {boolean} download - Whether to download file (default true)
 * @returns {Object} Export data object
 */
export function exportToJSON(download = true) {
  const exportData = {
    ts: new Date().toISOString(),
    version: 1,
    appName: 'CodeLapras',
    data: window.data || [],           // products
    order: window.order || [],         // orders
    invoices: window.invoices || [],
    customers: window.customers || [],
    rentals: window.rentals || [],
    subscriptions: window.subscriptions || [],
    shipments: window.shipments || [],
    kits: window.kits || [],
    settings: window.getSettings ? window.getSettings() : {},
    // Legacy fields for compatibility
    po: window.po || [],
    damaged: window.damaged || [],
    snapshots: window.snapshots || [],
    snaps: window.snaps || []
  };

  if (download) {
    const filename = `codelapras-export-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json');
    showNotification(`Data exported to ${filename}`, 'success');
  }

  EventBus.emit('data:exported', { format: 'json', timestamp: exportData.ts });

  return exportData;
}

/**
 * Export inventory to CSV
 */
export function exportInventoryToCSV() {
  const products = window.data || [];

  if (products.length === 0) {
    showNotification('No inventory data to export', 'warning');
    return;
  }

  // Build CSV
  const headers = ['id', 'name', 'sku', 'qty', 'costPer', 'pricePer', 'category', 'supplier', 'reorder', 'notes'];
  const rows = products.map(p => [
    p.id || '',
    p.name || '',
    p.sku || '',
    p.qty || 0,
    p.costPer || 0,
    p.pricePer || 0,
    p.category || '',
    p.supplier || '',
    p.reorder || '',
    p.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const filename = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, filename, 'text/csv');

  showNotification(`Inventory exported to ${filename}`, 'success');
  EventBus.emit('data:exported', { format: 'csv', type: 'inventory' });
}

/**
 * Export inventory to Excel
 */
export async function exportInventoryToExcel() {
  // Check if XLSX library is available
  if (!window.XLSX) {
    showNotification('Excel export requires SheetJS library', 'error');
    return;
  }

  const products = window.data || [];

  if (products.length === 0) {
    showNotification('No inventory data to export', 'warning');
    return;
  }

  try {
    // Build array of arrays
    const headers = ['ID', 'Name', 'SKU', 'Quantity', 'Cost', 'Price', 'Category', 'Supplier', 'Reorder', 'Notes'];
    const data = products.map(p => [
      p.id || '',
      p.name || '',
      p.sku || '',
      p.qty || 0,
      p.costPer || 0,
      p.pricePer || 0,
      p.category || '',
      p.supplier || '',
      p.reorder || '',
      p.notes || ''
    ]);

    const ws = window.XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

    const filename = `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;
    window.XLSX.writeFile(wb, filename);

    showNotification(`Inventory exported to ${filename}`, 'success');
    EventBus.emit('data:exported', { format: 'excel', type: 'inventory' });
  } catch (error) {
    console.error('[Export] Error exporting to Excel:', error);
    showNotification('Error exporting to Excel', 'error');
  }
}

/**
 * Import data from JSON file
 * @param {File} file - JSON file to import
 */
export async function importFromJSON(file) {
  if (!file) {
    showNotification('Please select a file to import', 'warning');
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate import data
    const validation = validateImportData(data);
    if (!validation.valid) {
      showNotification(`Import validation failed: ${validation.errors.join(', ')}`, 'error');
      return;
    }

    // Show confirmation
    const confirmed = confirm(
      `Import data from ${file.name}?\n\n` +
      `This will replace current data:\n` +
      `- Products: ${(data.data || []).length}\n` +
      `- Orders: ${(data.order || []).length}\n` +
      `- Invoices: ${(data.invoices || []).length}\n` +
      `- Customers: ${(data.customers || []).length}\n\n` +
      `Continue?`
    );

    if (!confirmed) {
      return;
    }

    // Apply import
    if (data.data) window.data = data.data;
    if (data.order) window.order = data.order;
    if (data.invoices) window.invoices = data.invoices;
    if (data.customers) window.customers = data.customers;
    if (data.rentals) window.rentals = data.rentals;
    if (data.subscriptions) window.subscriptions = data.subscriptions;
    if (data.shipments) window.shipments = data.shipments;
    if (data.kits) window.kits = data.kits;
    if (data.settings && typeof window.updateSettingsCRUD === 'function') {
      window.updateSettingsCRUD(data.settings);
    }

    // Save to localStorage
    if (typeof window.saveAll === 'function') {
      window.saveAll();
    }

    showNotification('Data imported successfully! Refreshing...', 'success');

    // Emit event
    EventBus.emit('data:imported', { source: file.name, timestamp: new Date().toISOString() });

    // Reload page to refresh all views
    setTimeout(() => location.reload(), 1000);

  } catch (error) {
    console.error('[Import] Error importing JSON:', error);
    showNotification(`Error importing file: ${error.message}`, 'error');
  }
}

/**
 * Import inventory from CSV file
 * @param {File} file - CSV file to import
 */
export async function importInventoryFromCSV(file) {
  if (!file) {
    showNotification('Please select a CSV file to import', 'warning');
    return;
  }

  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      showNotification('CSV file is empty or invalid', 'error');
      return;
    }

    // Parse CSV (simple implementation)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const product = {};

      headers.forEach((header, index) => {
        product[header] = values[index] || '';
      });

      // Convert numeric fields
      if (product.qty) product.qty = parseFloat(product.qty) || 0;
      if (product.costPer) product.costPer = parseFloat(product.costPer) || 0;
      if (product.pricePer) product.pricePer = parseFloat(product.pricePer) || 0;

      products.push(product);
    }

    const confirmed = confirm(`Import ${products.length} products from CSV?\n\nThis will replace current inventory.`);

    if (!confirmed) {
      return;
    }

    // Replace inventory
    window.data = products;

    // Save
    if (typeof window.saveData === 'function') {
      window.saveData();
    }

    showNotification(`Imported ${products.length} products`, 'success');
    EventBus.emit('data:imported', { source: file.name, type: 'inventory', count: products.length });

    // Refresh
    setTimeout(() => location.reload(), 1000);

  } catch (error) {
    console.error('[Import] Error importing CSV:', error);
    showNotification(`Error importing CSV: ${error.message}`, 'error');
  }
}

/**
 * Validate import data
 * @param {Object} data - Import data object
 * @returns {Object} Validation result {valid, errors}
 */
export function validateImportData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { valid: false, errors };
  }

  // Check version (if present)
  if (data.version && data.version > 1) {
    errors.push('Unsupported data version');
  }

  // Check timestamp
  if (data.ts) {
    const timestamp = new Date(data.ts);
    if (isNaN(timestamp.getTime())) {
      errors.push('Invalid timestamp');
    }
  }

  // Validate data arrays
  const arrayFields = ['data', 'order', 'invoices', 'customers', 'rentals', 'subscriptions', 'shipments', 'kits'];
  arrayFields.forEach(field => {
    if (data[field] && !Array.isArray(data[field])) {
      errors.push(`${field} must be an array`);
    }
  });

  // Validate settings
  if (data.settings && typeof data.settings !== 'object') {
    errors.push('Settings must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Download file helper
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} type - MIME type
 */
export function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger file selection for import
 * @param {string} type - Import type ('json', 'csv')
 * @param {Function} callback - Callback function with selected file
 */
export function selectFileForImport(type, callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = type === 'json' ? '.json' : '.csv';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file && callback) {
      callback(file);
    }
  };

  input.click();
}

// Export public API
export default {
  exportToJSON,
  exportInventoryToCSV,
  exportInventoryToExcel,
  importFromJSON,
  importInventoryFromCSV,
  validateImportData,
  downloadFile,
  selectFileForImport
};
