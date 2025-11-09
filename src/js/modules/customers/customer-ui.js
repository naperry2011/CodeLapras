/**
 * customer-ui.js - Customer UI Layer
 *
 * Provides UI rendering and interaction for customers:
 * - Customer table rendering
 * - Customer dialog management
 * - Contact management UI
 * - Account management UI
 * - Customer search and filtering
 *
 * Integrates with:
 * - customers.js (business logic)
 * - contacts.js (contact management)
 * - accounts.js (account/credit management)
 * - UI frameworks (tables.js, dialogs.js, forms.js)
 *
 * Usage:
 * renderCustomerTable('customerTableBody', customers);
 * showCustomerDialog(); // New customer
 * showCustomerDialog(customerId); // Edit customer
 */

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

/**
 * Get customer table column definitions
 * @param {object} options - Column options
 * @returns {Array<object>} Column definitions
 */
function getCustomerColumns(options = {}) {
  const { showActions = true } = options;
  const esc = window.esc || ((s) => String(s || ''));

  const columns = [];

  // Name column
  columns.push({
    key: 'name',
    label: 'Name',
    sortable: true,
    formatter: (value, row) => {
      const name = esc(value || '');
      return `<strong>${name}</strong>`;
    }
  });

  // Company column
  columns.push({
    key: 'company',
    label: 'Company',
    sortable: true,
    formatter: (value) => {
      return value ? esc(value) : '<span class="muted">-</span>';
    }
  });

  // Email column
  columns.push({
    key: 'email',
    label: 'Email',
    sortable: true,
    formatter: (value) => {
      return value ? esc(value) : '<span class="muted">-</span>';
    }
  });

  // Phone column
  columns.push({
    key: 'phone',
    label: 'Phone',
    sortable: false,
    formatter: (value) => {
      return value ? esc(value) : '<span class="muted">-</span>';
    }
  });

  // Balance column
  columns.push({
    key: 'id',
    label: 'Balance',
    sortable: false,
    formatter: (value, row) => {
      const balance = typeof calculateBalance === 'function' ? calculateBalance(value) : 0;
      const currency = (window.settings && window.settings.currency) || 'USD';
      const fmt = (n) => Number(n || 0).toLocaleString(undefined, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
      });
      const balanceClass = balance > 0 ? 'warn' : '';
      return `<span class="${balanceClass}">${fmt(balance)}</span>`;
    }
  });

  // Actions column
  if (showActions) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      sortable: false,
      formatter: (value, row) => {
        const customerId = esc(row.id);
        return `
          <div class="btn-group">
            <button class="btn btn-sm"
                    data-action="view-customer"
                    data-customer-id="${customerId}"
                    title="View Details">
              👁️
            </button>
            <button class="btn btn-sm"
                    data-action="edit-customer"
                    data-customer-id="${customerId}"
                    title="Edit Customer">
              ✏️
            </button>
            <button class="btn btn-sm btn-danger"
                    data-action="delete-customer"
                    data-customer-id="${customerId}"
                    title="Delete Customer">
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
// CUSTOMER TABLE RENDERING
// ============================================================================

/**
 * Render customer table
 * @param {string} containerId - Table body element ID
 * @param {Array} customers - Array of customer objects
 * @param {object} options - Rendering options
 */
function renderCustomerTable(containerId, customers, options = {}) {
  const tbody = document.getElementById(containerId);
  if (!tbody) {
    console.error(`Customer table container not found: ${containerId}`);
    return;
  }

  // If no customers, show empty message
  if (!Array.isArray(customers) || customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted center">No customers yet.</td></tr>';
    return;
  }

  // Get columns
  const columns = getCustomerColumns(options);

  // Build table rows
  let html = '';
  customers.forEach(customer => {
    html += '<tr>';
    columns.forEach(col => {
      const value = customer[col.key];
      const formattedValue = col.formatter ? col.formatter(value, customer) : (value || '');
      html += `<td>${formattedValue}</td>`;
    });
    html += '</tr>';
  });

  tbody.innerHTML = html;

  // Attach event listeners
  attachCustomerTableListeners(tbody);
}

/**
 * Attach event listeners to customer table
 * @param {HTMLElement} tbody - Table body element
 */
function attachCustomerTableListeners(tbody) {
  // View customer button listeners
  tbody.querySelectorAll('[data-action="view-customer"]').forEach(btn => {
    btn.addEventListener('click', handleViewCustomer);
  });

  // Edit customer button listeners
  tbody.querySelectorAll('[data-action="edit-customer"]').forEach(btn => {
    btn.addEventListener('click', handleEditCustomer);
  });

  // Delete customer button listeners
  tbody.querySelectorAll('[data-action="delete-customer"]').forEach(btn => {
    btn.addEventListener('click', handleDeleteCustomer);
  });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle view customer action
 * @param {Event} event - Click event
 */
function handleViewCustomer(event) {
  const btn = event.target.closest('[data-action="view-customer"]');
  const customerId = btn.getAttribute('data-customer-id');
  showCustomerDetailDialog(customerId);
}

/**
 * Handle edit customer action
 * @param {Event} event - Click event
 */
function handleEditCustomer(event) {
  const btn = event.target.closest('[data-action="edit-customer"]');
  const customerId = btn.getAttribute('data-customer-id');
  showCustomerDialog(customerId);
}

/**
 * Handle delete customer action
 * @param {Event} event - Click event
 */
function handleDeleteCustomer(event) {
  const btn = event.target.closest('[data-action="delete-customer"]');
  const customerId = btn.getAttribute('data-customer-id');

  const customer = typeof getCustomer === 'function' ? getCustomer(customerId) : null;
  if (!customer) {
    alert('Customer not found.');
    return;
  }

  if (!confirm(`Delete customer "${customer.name}"? This action cannot be undone.`)) {
    return;
  }

  // Delete customer
  if (typeof deleteCustomer === 'function') {
    const success = deleteCustomer(customerId);
    if (success) {
      // Re-render table
      const containerId = btn.closest('tbody').id;
      if (containerId && window.customers) {
        renderCustomerTable(containerId, window.customers);
      }
    } else {
      alert('Failed to delete customer.');
    }
  }
}

// ============================================================================
// CUSTOMER DIALOG
// ============================================================================

/**
 * Show customer dialog for creating or editing
 * @param {string|null} customerId - Customer ID to edit, or null for new
 */
function showCustomerDialog(customerId = null) {
  const dialog = document.getElementById('customerDialog');
  if (!dialog) {
    console.error('Customer dialog not found in HTML');
    alert('Customer dialog not available. Please ensure customerDialog exists in index.html');
    return;
  }

  const form = document.getElementById('customerForm');
  const title = document.getElementById('customerDialogTitle');

  if (customerId) {
    // Edit mode
    title.textContent = 'Edit Customer';
    const customer = typeof getCustomer === 'function' ? getCustomer(customerId) : null;
    if (customer) {
      populateCustomerForm(customer);
    }
  } else {
    // Create mode
    title.textContent = 'Add Customer';
    form.reset();
    // Store that this is a new customer
    form.dataset.customerId = '';
  }

  // Store customer ID in form for save
  if (customerId) {
    form.dataset.customerId = customerId;
  }

  // Show dialog
  if (typeof showDialog === 'function') {
    showDialog(dialog);
  } else {
    dialog.showModal();
  }
}

/**
 * Populate customer form with data
 * @param {object} customer - Customer object
 */
function populateCustomerForm(customer) {
  document.getElementById('customer_name').value = customer.name || '';
  document.getElementById('customer_company').value = customer.company || '';
  document.getElementById('customer_email').value = customer.email || '';
  document.getElementById('customer_phone').value = customer.phone || '';
  document.getElementById('customer_address').value = customer.address || '';
  document.getElementById('customer_notes').value = customer.notes || '';
}

/**
 * Extract customer data from form
 * @returns {object} Customer data
 */
function extractCustomerFormData() {
  return {
    name: document.getElementById('customer_name').value.trim(),
    company: document.getElementById('customer_company').value.trim(),
    email: document.getElementById('customer_email').value.trim(),
    phone: document.getElementById('customer_phone').value.trim(),
    address: document.getElementById('customer_address').value.trim(),
    notes: document.getElementById('customer_notes').value.trim()
  };
}

/**
 * Handle customer form submission
 * @param {Event} event - Submit event
 */
function handleCustomerFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const customerId = form.dataset.customerId;
  const data = extractCustomerFormData();

  try {
    if (customerId) {
      // Update existing customer
      if (typeof updateCustomer === 'function') {
        updateCustomer(customerId, data);
      }
    } else {
      // Create new customer
      if (typeof createCustomerCRUD === 'function') {
        createCustomerCRUD(data);
      }
    }

    // Close dialog
    const dialog = document.getElementById('customerDialog');
    if (typeof hideDialog === 'function') {
      hideDialog(dialog);
    } else {
      dialog.close();
    }

    // Re-render table if it exists
    if (window.customers) {
      const tableBody = document.getElementById('customerTableBody');
      if (tableBody) {
        renderCustomerTable('customerTableBody', window.customers);
      }
    }

  } catch (error) {
    alert('Error saving customer: ' + error.message);
  }
}

// ============================================================================
// CUSTOMER DETAIL VIEW
// ============================================================================

/**
 * Show customer detail dialog
 * @param {string} customerId - Customer ID
 */
function showCustomerDetailDialog(customerId) {
  const customer = typeof getCustomer === 'function' ? getCustomer(customerId) : null;
  if (!customer) {
    alert('Customer not found.');
    return;
  }

  // For now, show a simple alert with customer details
  // In full implementation, this would show a tabbed dialog
  const activity = typeof getCustomerActivity === 'function' ? getCustomerActivity(customerId) : {};
  const summary = typeof getAccountSummary === 'function' ? getAccountSummary(customerId) : {};

  let details = `Customer: ${customer.name}\n`;
  if (customer.company) details += `Company: ${customer.company}\n`;
  if (customer.email) details += `Email: ${customer.email}\n`;
  if (customer.phone) details += `Phone: ${customer.phone}\n`;
  details += `\nActivity:\n`;
  details += `Orders: ${activity.orders ? activity.orders.length : 0}\n`;
  details += `Invoices: ${activity.invoices ? activity.invoices.length : 0}\n`;
  details += `Balance: $${summary.balance ? summary.balance.toFixed(2) : '0.00'}\n`;

  alert(details);

  // TODO: Implement full detail dialog with tabs (Info, Contacts, Account, History)
}

// ============================================================================
// SEARCH AND FILTER
// ============================================================================

/**
 * Setup customer search and filter UI
 * @param {object} options - Configuration options
 */
function setupCustomerSearchAndFilter(options = {}) {
  const {
    searchInputId = 'customerSearch',
    tableBodyId = 'customerTableBody'
  } = options;

  const searchInput = document.getElementById(searchInputId);

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyCustomerFilters(searchInputId, tableBodyId);
    });
  }
}

/**
 * Apply customer filters and re-render table
 * @param {string} searchInputId - Search input element ID
 * @param {string} tableBodyId - Table body element ID
 */
function applyCustomerFilters(searchInputId, tableBodyId) {
  const searchInput = document.getElementById(searchInputId);

  if (!window.customers) return;

  let filtered = [...window.customers];

  // Apply search filter
  if (searchInput && searchInput.value) {
    const query = searchInput.value;
    if (typeof searchCustomers === 'function') {
      filtered = searchCustomers(filtered, query);
    }
  }

  // Re-render table
  renderCustomerTable(tableBodyId, filtered);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize customer form event listener
 */
function initializeCustomerUI() {
  const form = document.getElementById('customerForm');
  if (form) {
    form.addEventListener('submit', handleCustomerFormSubmit);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCustomerUI);
} else {
  initializeCustomerUI();
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.renderCustomerTable = renderCustomerTable;
  window.showCustomerDialog = showCustomerDialog;
  window.showCustomerDetailDialog = showCustomerDetailDialog;
  window.populateCustomerForm = populateCustomerForm;
  window.extractCustomerFormData = extractCustomerFormData;
  window.setupCustomerSearchAndFilter = setupCustomerSearchAndFilter;
  window.getCustomerColumns = getCustomerColumns;
}
