/**
 * invoice-ui.js - Invoice UI Layer
 *
 * Provides UI rendering and interaction for invoices:
 * - Invoice table rendering
 * - Invoice dialog management
 * - Invoice search and filtering
 * - Print/receipt actions
 * - Paid status toggle
 *
 * Integrates with:
 * - invoices.js (business logic)
 * - invoice-builder.js (invoice HTML generation)
 * - receipt-builder.js (receipt generation)
 * - orders.js (order integration)
 * - Day 7-10 UI systems
 *
 * Usage:
 * renderInvoiceTable('invoiceTableBody', invoices);
 * openInvoiceDialog(); // New invoice
 * openInvoiceDialog(invoice); // Edit invoice
 */

// Import invoice building functions (if using modules)
// import { openInvoicePrintWindow, printInvoice } from '../../printing/invoice-builder.js';
// import { openReceiptPrintWindow, printReceipt } from '../../printing/receipt-builder.js';

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

/**
 * Get invoice table column definitions
 * @param {object} options - Column options
 * @returns {Array<object>} Column definitions
 */
function getInvoiceColumns(options = {}) {
  const { showActions = true } = options;
  const esc = window.esc || ((s) => String(s || ''));

  const columns = [];

  // Invoice Number column
  columns.push({
    key: 'number',
    label: 'Invoice #',
    sortable: true,
    formatter: (value, row) => {
      const invoiceNum = esc(value || row.id);
      const paidClass = row.paid ? 'paid-invoice' : '';
      return `<strong class="${paidClass}">${invoiceNum}</strong>`;
    }
  });

  // Date column
  columns.push({
    key: 'date',
    label: 'Date',
    sortable: true,
    formatter: (value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (isNaN(date.getTime())) return esc(value);
      return date.toLocaleDateString();
    }
  });

  // Bill To column
  columns.push({
    key: 'billTo',
    label: 'Bill To',
    sortable: true,
    formatter: (value) => {
      if (!value) return '<span class="muted">-</span>';
      // Extract first line (usually company/person name)
      const firstLine = String(value).split('\n')[0];
      return esc(firstLine);
    }
  });

  // Total column
  columns.push({
    key: 'total',
    label: 'Total',
    sortable: true,
    formatter: (value, row) => {
      const currency = (window.settings && window.settings.currency) || 'USD';
      const fmt = (n) => Number(n || 0).toLocaleString(undefined, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
      });
      return `<span class="right">${fmt(value || 0)}</span>`;
    }
  });

  // Paid Status column
  columns.push({
    key: 'paid',
    label: 'Paid',
    sortable: true,
    formatter: (value, row) => {
      const checked = value ? 'checked' : '';
      const invoiceId = esc(row.id);
      return `
        <div class="center">
          <input type="checkbox"
                 class="invoice-paid-checkbox"
                 data-invoice-id="${invoiceId}"
                 ${checked}>
        </div>
      `;
    }
  });

  // Actions column
  if (showActions) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      sortable: false,
      formatter: (value, row) => {
        const invoiceId = esc(row.id);
        return `
          <div class="btn-group">
            <button class="btn btn-sm"
                    data-action="view-invoice"
                    data-invoice-id="${invoiceId}"
                    title="View/Print Invoice">
              📄 Invoice
            </button>
            <button class="btn btn-sm"
                    data-action="view-receipt"
                    data-invoice-id="${invoiceId}"
                    title="View/Print Receipt">
              🧾 Receipt
            </button>
            <button class="btn btn-sm btn-danger"
                    data-action="delete-invoice"
                    data-invoice-id="${invoiceId}"
                    title="Delete Invoice">
              🗑️
            </button>
          </div>
        `;
      }
    });
  }

  return columns;
}

// ============================================================================
// INVOICE TABLE RENDERING
// ============================================================================

/**
 * Render invoice table
 * @param {string} containerId - Table body element ID
 * @param {Array} invoices - Array of invoice objects
 * @param {object} options - Rendering options
 */
function renderInvoiceTable(containerId, invoices, options = {}) {
  const tbody = document.getElementById(containerId);
  if (!tbody) {
    console.error(`Invoice table container not found: ${containerId}`);
    return;
  }

  // If no invoices, show empty message
  if (!Array.isArray(invoices) || invoices.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted center">No invoices yet.</td></tr>';
    return;
  }

  // Get columns
  const columns = getInvoiceColumns(options);

  // Build table rows
  let html = '';
  invoices.forEach(invoice => {
    html += '<tr>';
    columns.forEach(col => {
      const value = invoice[col.key];
      const formattedValue = col.formatter ? col.formatter(value, invoice) : (value || '');
      html += `<td>${formattedValue}</td>`;
    });
    html += '</tr>';
  });

  tbody.innerHTML = html;

  // Attach event listeners
  attachInvoiceTableListeners(tbody);
}

/**
 * Attach event listeners to invoice table
 * @param {HTMLElement} tbody - Table body element
 */
function attachInvoiceTableListeners(tbody) {
  // Paid checkbox listeners
  tbody.querySelectorAll('.invoice-paid-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handlePaidStatusChange);
  });

  // View invoice button listeners
  tbody.querySelectorAll('[data-action="view-invoice"]').forEach(btn => {
    btn.addEventListener('click', handleViewInvoice);
  });

  // View receipt button listeners
  tbody.querySelectorAll('[data-action="view-receipt"]').forEach(btn => {
    btn.addEventListener('click', handleViewReceipt);
  });

  // Delete invoice button listeners
  tbody.querySelectorAll('[data-action="delete-invoice"]').forEach(btn => {
    btn.addEventListener('click', handleDeleteInvoice);
  });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle paid status change
 * @param {Event} event - Change event
 */
function handlePaidStatusChange(event) {
  const checkbox = event.target;
  const invoiceId = checkbox.getAttribute('data-invoice-id');
  const isPaid = checkbox.checked;

  // Find invoice in global array (or use business logic module)
  if (window.invoices) {
    const invoice = window.invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      invoice.paid = isPaid;

      // Save to storage
      if (typeof saveAll === 'function') {
        saveAll();
      } else if (typeof window.saveInvoices === 'function') {
        window.saveInvoices();
      }

      // Update stats if available
      if (typeof renderStats === 'function') {
        renderStats();
      }

      // Emit event for other modules
      if (window.eventBus) {
        window.eventBus.emit('invoice:updated', { invoice, field: 'paid', value: isPaid });
      }
    }
  }
}

/**
 * Handle view invoice action
 * @param {Event} event - Click event
 */
function handleViewInvoice(event) {
  const btn = event.target.closest('[data-action="view-invoice"]');
  const invoiceId = btn.getAttribute('data-invoice-id');

  // Find invoice
  const invoice = findInvoiceById(invoiceId);
  if (!invoice) {
    alert('Invoice not found.');
    return;
  }

  // Open invoice print window
  if (typeof window.openInvoicePrintWindow === 'function') {
    window.openInvoicePrintWindow(invoice, window.settings || {});
  } else if (typeof openInvoiceWindow === 'function') {
    // Legacy function name
    openInvoiceWindow(invoice);
  } else {
    console.error('Invoice builder not available');
    alert('Unable to open invoice. Please ensure invoice-builder.js is loaded.');
  }
}

/**
 * Handle view receipt action
 * @param {Event} event - Click event
 */
function handleViewReceipt(event) {
  const btn = event.target.closest('[data-action="view-receipt"]');
  const invoiceId = btn.getAttribute('data-invoice-id');

  // Find invoice
  const invoice = findInvoiceById(invoiceId);
  if (!invoice) {
    alert('Invoice not found.');
    return;
  }

  // Open receipt print window
  if (typeof window.openReceiptPrintWindow === 'function') {
    window.openReceiptPrintWindow(invoice, window.settings || {});
  } else {
    console.error('Receipt builder not available');
    alert('Unable to open receipt. Please ensure receipt-builder.js is loaded.');
  }
}

/**
 * Handle delete invoice action
 * @param {Event} event - Click event
 */
function handleDeleteInvoice(event) {
  const btn = event.target.closest('[data-action="delete-invoice"]');
  const invoiceId = btn.getAttribute('data-invoice-id');

  // Confirm deletion
  if (!confirm('Delete this invoice? This action cannot be undone.')) {
    return;
  }

  // Find and remove invoice
  if (window.invoices) {
    const index = window.invoices.findIndex(inv => inv.id === invoiceId);
    if (index !== -1) {
      window.invoices.splice(index, 1);

      // Save to storage
      if (typeof saveAll === 'function') {
        saveAll();
      } else if (typeof window.saveInvoices === 'function') {
        window.saveInvoices();
      }

      // Re-render table
      const containerId = btn.closest('tbody').id;
      if (containerId) {
        renderInvoiceTable(containerId, window.invoices);
      }

      // Update stats if available
      if (typeof renderStats === 'function') {
        renderStats();
      }

      // Emit event
      if (window.eventBus) {
        window.eventBus.emit('invoice:deleted', { invoiceId });
      }
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find invoice by ID
 * @param {string} invoiceId - Invoice ID
 * @returns {object|null} Invoice object or null
 */
function findInvoiceById(invoiceId) {
  if (window.invoices && Array.isArray(window.invoices)) {
    return window.invoices.find(inv => inv.id === invoiceId);
  }
  return null;
}

/**
 * Filter invoices by search term
 * @param {Array} invoices - Array of invoices
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered invoices
 */
function filterInvoices(invoices, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return invoices;
  }

  const term = searchTerm.toLowerCase();
  return invoices.filter(invoice => {
    return (
      (invoice.number && invoice.number.toLowerCase().includes(term)) ||
      (invoice.billTo && invoice.billTo.toLowerCase().includes(term)) ||
      (invoice.date && invoice.date.toLowerCase().includes(term))
    );
  });
}

/**
 * Filter invoices by paid status
 * @param {Array} invoices - Array of invoices
 * @param {string} status - 'all', 'paid', 'unpaid'
 * @returns {Array} Filtered invoices
 */
function filterInvoicesByPaidStatus(invoices, status) {
  if (status === 'all') {
    return invoices;
  } else if (status === 'paid') {
    return invoices.filter(inv => inv.paid === true);
  } else if (status === 'unpaid') {
    return invoices.filter(inv => !inv.paid);
  }
  return invoices;
}

/**
 * Sort invoices by field
 * @param {Array} invoices - Array of invoices
 * @param {string} field - Field to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted invoices
 */
function sortInvoices(invoices, field, direction = 'asc') {
  const sorted = [...invoices].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    // Handle dates
    if (field === 'date') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    }

    // Handle numbers
    if (field === 'total') {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    }

    // Handle strings
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

// ============================================================================
// INVOICE DIALOG (Create/Edit)
// ============================================================================

/**
 * Open invoice dialog for creating or editing an invoice
 * @param {object|null} invoice - Invoice object to edit, or null for new
 */
function openInvoiceDialog(invoice = null) {
  // For now, this is a placeholder
  // In a full implementation, this would open a modal dialog
  // with a form for creating/editing invoices

  alert('Invoice dialog not yet implemented. Use "Create from Order" feature instead.');

  // TODO: Implement full invoice dialog with:
  // - Customer selection
  // - Line items management
  // - Discount/tax/shipping inputs
  // - Notes fields
  // - Save/Cancel buttons
}

// ============================================================================
// SEARCH AND FILTER UI
// ============================================================================

/**
 * Setup invoice search and filter UI
 * @param {object} options - Configuration options
 */
function setupInvoiceSearchAndFilter(options = {}) {
  const {
    searchInputId = 'invoiceSearch',
    paidFilterId = 'invoicePaidFilter',
    tableBodyId = 'invoiceTrackerBody'
  } = options;

  const searchInput = document.getElementById(searchInputId);
  const paidFilter = document.getElementById(paidFilterId);

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyInvoiceFilters(searchInputId, paidFilterId, tableBodyId);
    });
  }

  if (paidFilter) {
    paidFilter.addEventListener('change', () => {
      applyInvoiceFilters(searchInputId, paidFilterId, tableBodyId);
    });
  }
}

/**
 * Apply invoice filters and re-render table
 * @param {string} searchInputId - Search input element ID
 * @param {string} paidFilterId - Paid filter element ID
 * @param {string} tableBodyId - Table body element ID
 */
function applyInvoiceFilters(searchInputId, paidFilterId, tableBodyId) {
  const searchInput = document.getElementById(searchInputId);
  const paidFilter = document.getElementById(paidFilterId);

  if (!window.invoices) return;

  let filtered = [...window.invoices];

  // Apply search filter
  if (searchInput && searchInput.value) {
    filtered = filterInvoices(filtered, searchInput.value);
  }

  // Apply paid status filter
  if (paidFilter && paidFilter.value) {
    filtered = filterInvoicesByPaidStatus(filtered, paidFilter.value);
  }

  // Re-render table
  renderInvoiceTable(tableBodyId, filtered);
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy renderInvoiceTracker function for backward compatibility
 * Maps to new renderInvoiceTable function
 */
function renderInvoiceTracker() {
  if (window.invoices) {
    renderInvoiceTable('invoiceTrackerBody', window.invoices);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export functions for use in other modules or global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderInvoiceTable,
    renderInvoiceTracker,
    openInvoiceDialog,
    getInvoiceColumns,
    filterInvoices,
    filterInvoicesByPaidStatus,
    sortInvoices,
    setupInvoiceSearchAndFilter
  };
}

// Also expose to window for backward compatibility
if (typeof window !== 'undefined') {
  window.renderInvoiceTable = renderInvoiceTable;
  window.renderInvoiceTracker = renderInvoiceTracker;
  window.openInvoiceDialog = openInvoiceDialog;
  window.InvoiceUI = {
    renderTable: renderInvoiceTable,
    renderTracker: renderInvoiceTracker,
    openDialog: openInvoiceDialog,
    getColumns: getInvoiceColumns,
    filter: filterInvoices,
    filterByPaidStatus: filterInvoicesByPaidStatus,
    sort: sortInvoices,
    setupSearchAndFilter: setupInvoiceSearchAndFilter
  };
}
