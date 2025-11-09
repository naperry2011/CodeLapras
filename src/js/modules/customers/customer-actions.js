/**
 * Customer Actions Module
 * Registers customer-related actions and keyboard shortcuts
 */

// ============================================================================
// ACTION REGISTRATION
// ============================================================================

/**
 * Register all customer actions
 */
function registerCustomerActions() {
  // Check if action registry is available
  if (typeof window.registerAction !== 'function') {
    console.warn('Action registry not available. Customer actions not registered.');
    return;
  }

  // New Customer Action
  window.registerAction('new-customer', {
    label: 'New Customer',
    description: 'Create a new customer',
    icon: '👤',
    handler: () => {
      if (typeof showCustomerDialog === 'function') {
        showCustomerDialog();
      } else {
        alert('Customer dialog not available');
      }
    },
    shortcut: 'Ctrl+Shift+C'
  });

  // Edit Customer Action
  window.registerAction('edit-customer', {
    label: 'Edit Customer',
    description: 'Edit selected customer',
    icon: '✏️',
    handler: (data) => {
      const customerId = data?.customerId;
      if (!customerId) {
        alert('No customer selected');
        return;
      }
      if (typeof showCustomerDialog === 'function') {
        showCustomerDialog(customerId);
      }
    }
  });

  // Delete Customer Action
  window.registerAction('delete-customer', {
    label: 'Delete Customer',
    description: 'Delete selected customer',
    icon: '🗑️',
    handler: (data) => {
      const customerId = data?.customerId;
      if (!customerId) {
        alert('No customer selected');
        return;
      }

      const customer = typeof getCustomer === 'function' ? getCustomer(customerId) : null;
      if (!customer) {
        alert('Customer not found');
        return;
      }

      if (confirm(`Delete customer "${customer.name}"?`)) {
        if (typeof deleteCustomer === 'function') {
          deleteCustomer(customerId);
          // Refresh table if available
          if (window.customers && document.getElementById('customerTableBody')) {
            renderCustomerTable('customerTableBody', window.customers);
          }
        }
      }
    }
  });

  // View Customer Action
  window.registerAction('view-customer', {
    label: 'View Customer',
    description: 'View customer details',
    icon: '👁️',
    handler: (data) => {
      const customerId = data?.customerId;
      if (!customerId) {
        alert('No customer selected');
        return;
      }
      if (typeof showCustomerDetailDialog === 'function') {
        showCustomerDetailDialog(customerId);
      }
    }
  });

  // Export Customers Action
  window.registerAction('export-customers', {
    label: 'Export Customers',
    description: 'Export customers to JSON/CSV',
    icon: '📥',
    handler: () => {
      exportCustomers();
    }
  });

  console.log('Customer actions registered successfully');
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Register customer keyboard shortcuts
 */
function registerCustomerShortcuts() {
  // Register Ctrl+Shift+C for new customer
  document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+C - New Customer
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
      event.preventDefault();
      if (typeof showCustomerDialog === 'function') {
        showCustomerDialog();
      }
    }

    // Ctrl+F when on customers page - Focus search
    if (event.ctrlKey && event.key === 'f') {
      const searchInput = document.getElementById('customerSearch');
      if (searchInput && document.body.contains(searchInput)) {
        event.preventDefault();
        searchInput.focus();
      }
    }
  });
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

/**
 * Export customers to JSON file
 */
function exportCustomers() {
  if (!window.customers || !Array.isArray(window.customers)) {
    alert('No customers to export');
    return;
  }

  const data = {
    exportDate: new Date().toISOString(),
    customerCount: window.customers.length,
    customers: window.customers
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `customers_export_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export customers to CSV file
 */
function exportCustomersCSV() {
  if (!window.customers || !Array.isArray(window.customers)) {
    alert('No customers to export');
    return;
  }

  // CSV header
  let csv = 'ID,Name,Company,Email,Phone,Address,Notes,Created,Updated\n';

  // CSV rows
  window.customers.forEach(customer => {
    const row = [
      customer.id || '',
      customer.name || '',
      customer.company || '',
      customer.email || '',
      customer.phone || '',
      (customer.address || '').replace(/\n/g, ' '),
      (customer.notes || '').replace(/\n/g, ' '),
      customer.createdAt || '',
      customer.updatedAt || ''
    ];

    // Escape fields with commas or quotes
    const escaped = row.map(field => {
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    });

    csv += escaped.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// BULK ACTIONS
// ============================================================================

/**
 * Delete multiple customers
 * @param {Array<string>} customerIds - Array of customer IDs
 * @returns {number} Number of customers deleted
 */
function bulkDeleteCustomers(customerIds) {
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return 0;
  }

  if (!confirm(`Delete ${customerIds.length} customer(s)?`)) {
    return 0;
  }

  let deleted = 0;
  customerIds.forEach(id => {
    if (typeof deleteCustomer === 'function' && deleteCustomer(id)) {
      deleted++;
    }
  });

  return deleted;
}

/**
 * Export selected customers
 * @param {Array<string>} customerIds - Array of customer IDs
 */
function exportSelectedCustomers(customerIds) {
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    alert('No customers selected');
    return;
  }

  const selected = window.customers.filter(c => customerIds.includes(c.id));

  const data = {
    exportDate: new Date().toISOString(),
    customerCount: selected.length,
    customers: selected
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `customers_selected_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize customer actions and shortcuts
 */
function initializeCustomerActions() {
  registerCustomerActions();
  registerCustomerShortcuts();
  console.log('Customer actions initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCustomerActions);
} else {
  initializeCustomerActions();
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.registerCustomerActions = registerCustomerActions;
  window.registerCustomerShortcuts = registerCustomerShortcuts;
  window.exportCustomers = exportCustomers;
  window.exportCustomersCSV = exportCustomersCSV;
  window.bulkDeleteCustomers = bulkDeleteCustomers;
  window.exportSelectedCustomers = exportSelectedCustomers;
}
