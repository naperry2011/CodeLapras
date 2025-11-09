/**
 * Rental UI Module
 * Handles all rental-related UI rendering and interactions
 */

const RentalUI = (function () {
  'use strict';

  /**
   * Get column definitions for rental table
   */
  function getRentalColumns(options = {}) {
    return [
      {
        key: 'customer',
        label: 'Customer',
        sortable: true,
        formatter: (value, rental) => {
          if (rental.customerId && typeof Customers !== 'undefined') {
            const customer = Customers.getCustomer(rental.customerId);
            if (customer) {
              return `<a href="#" onclick="event.preventDefault(); CustomerUI.showCustomerDialog('${rental.customerId}')">${value}</a>`;
            }
          }
          return value || '—';
        }
      },
      {
        key: 'equipment',
        label: 'Equipment',
        sortable: true,
        formatter: (value, rental) => {
          if (rental.equipmentId && typeof Products !== 'undefined') {
            const product = Products.getProduct(rental.equipmentId);
            if (product) {
              return `<a href="#" onclick="event.preventDefault(); ProductUI.showProductDialog('${rental.equipmentId}')">${value}</a>`;
            }
          }
          return value || '—';
        }
      },
      {
        key: 'qty',
        label: 'Qty',
        sortable: true,
        align: 'center'
      },
      {
        key: 'startDate',
        label: 'Start Date',
        sortable: true,
        formatter: 'date'
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        sortable: true,
        formatter: (value, rental) => {
          const formatted = formatDate(value);
          const isOverdue = isRentalOverdue(rental);
          return isOverdue && rental.status !== 'returned'
            ? `<span style="color: var(--danger-color); font-weight: bold;">${formatted}</span>`
            : formatted;
        }
      },
      {
        key: 'returnDate',
        label: 'Returned',
        sortable: true,
        formatter: (value) => {
          return value ? formatDate(value) : '<span style="color: var(--muted-color);">Active</span>';
        }
      },
      {
        key: 'fee',
        label: 'Fee',
        sortable: true,
        formatter: 'currency',
        align: 'right'
      },
      {
        key: 'lateFee',
        label: 'Late Fee',
        sortable: true,
        formatter: (value) => {
          return value > 0
            ? `<span style="color: var(--danger-color);">${formatCurrency(value)}</span>`
            : formatCurrency(0);
        },
        align: 'right'
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        formatter: (value) => {
          const statusMap = {
            active: { label: 'Active', color: 'var(--success-color)' },
            overdue: { label: 'Overdue', color: 'var(--danger-color)' },
            returned: { label: 'Returned', color: 'var(--muted-color)' }
          };
          const status = statusMap[value] || { label: value, color: 'var(--text-color)' };
          return `<span class="badge" style="background: ${status.color};">${status.label}</span>`;
        }
      },
      {
        key: 'actions',
        label: 'Actions',
        formatter: (value, rental) => {
          const actions = [];

          if (rental.status !== 'returned') {
            actions.push(`<button class="btn small" onclick="RentalUI.showReturnDialog('${rental.id}')" title="Mark as Returned">Return</button>`);
          }

          actions.push(`<button class="btn small" onclick="RentalUI.showRentalDialog('${rental.id}')" title="Edit Rental">Edit</button>`);
          actions.push(`<button class="btn small" onclick="RentalUI.generateInvoice('${rental.id}')" title="Generate Invoice">Invoice</button>`);
          actions.push(`<button class="btn small danger" onclick="RentalUI.deleteRental('${rental.id}')" title="Delete Rental">Delete</button>`);

          return actions.join(' ');
        }
      }
    ];
  }

  /**
   * Render rental table
   */
  function renderRentalTable(containerId, rentals, options = {}) {
    const container = typeof containerId === 'string' ? $(containerId) : containerId;
    if (!container) {
      console.error('Rental table container not found:', containerId);
      return;
    }

    // Apply filters if provided
    let filteredRentals = [...rentals];

    if (options.status) {
      filteredRentals = filterRentals(filteredRentals, { status: options.status });
    }

    if (options.customerId) {
      filteredRentals = filteredRentals.filter(r => r.customerId === options.customerId);
    }

    if (options.equipmentId) {
      filteredRentals = filteredRentals.filter(r => r.equipmentId === options.equipmentId);
    }

    if (options.overdueOnly) {
      filteredRentals = getOverdueRentals(filteredRentals);
    }

    // Get columns
    const columns = getRentalColumns(options);

    // Render using table system
    renderTable(containerId, filteredRentals, columns, {
      emptyMessage: 'No rentals found',
      sortable: true,
      defaultSort: { key: 'startDate', direction: 'desc' },
      ...options
    });

    // Update overdue count if needed
    updateOverdueCount();
  }

  /**
   * Show rental dialog (create or edit)
   */
  function showRentalDialog(rentalId = null) {
    const dialog = $('#rentalDialog');
    if (!dialog) {
      console.error('Rental dialog not found');
      return;
    }

    const isEdit = !!rentalId;
    const title = $('#rentalDialogTitle');
    if (title) {
      title.textContent = isEdit ? 'Edit Rental' : 'New Rental';
    }

    // Populate customer dropdown
    populateCustomerDropdown();

    // Populate equipment dropdown
    populateEquipmentDropdown();

    if (isEdit) {
      const rental = getRental(rentalId);
      if (rental) {
        populateRentalForm(rental);
      } else {
        showNotification('Rental not found', 'error');
        return;
      }
    } else {
      clearRentalForm();
      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      $('#rentalStartDate').value = today;
      $('#rentalDueDate').value = nextWeek;
    }

    showDialog(dialog);
  }

  /**
   * Populate customer dropdown
   */
  function populateCustomerDropdown() {
    const select = $('#rentalCustomerId');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Customer --</option>';

    if (typeof Customers !== 'undefined') {
      const customers = Customers.getAllCustomers();
      customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        select.appendChild(option);
      });

      // Sync with text input
      select.addEventListener('change', function() {
        if (this.value) {
          const customer = Customers.getCustomer(this.value);
          if (customer) {
            $('#rentalCustomer').value = customer.name;
          }
        }
      });
    }
  }

  /**
   * Populate equipment dropdown
   */
  function populateEquipmentDropdown() {
    const select = $('#rentalEquipmentId');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Equipment --</option>';

    if (typeof Products !== 'undefined') {
      const products = Products.getAllProducts();
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (Stock: ${product.qty || 0})`;
        select.appendChild(option);
      });

      // Sync with text input
      select.addEventListener('change', function() {
        if (this.value) {
          const product = Products.getProduct(this.value);
          if (product) {
            $('#rentalEquipment').value = product.name;
          }
        }
      });
    }
  }

  /**
   * Populate rental form with data
   */
  function populateRentalForm(rental) {
    $('#rentalId').value = rental.id || '';
    $('#rentalCustomer').value = rental.customer || '';
    $('#rentalCustomerId').value = rental.customerId || '';
    $('#rentalEquipment').value = rental.equipment || '';
    $('#rentalEquipmentId').value = rental.equipmentId || '';
    $('#rentalQty').value = rental.qty || 1;
    $('#rentalStartDate').value = rental.startDate ? rental.startDate.split('T')[0] : '';
    $('#rentalDueDate').value = rental.dueDate ? rental.dueDate.split('T')[0] : '';
    $('#rentalReturnDate').value = rental.returnDate ? rental.returnDate.split('T')[0] : '';
    $('#rentalFee').value = rental.fee || 0;
    $('#rentalDeposit').value = rental.deposit || 0;
    $('#rentalPaid').value = rental.paid || 0;
    $('#rentalPayDate').value = rental.payDate ? rental.payDate.split('T')[0] : '';
    $('#rentalLateFee').value = rental.lateFee || 0;
    $('#rentalStatus').value = rental.status || 'active';
    $('#rentalNotes').value = rental.notes || '';
  }

  /**
   * Clear rental form
   */
  function clearRentalForm() {
    $('#rentalId').value = '';
    $('#rentalCustomer').value = '';
    $('#rentalCustomerId').value = '';
    $('#rentalEquipment').value = '';
    $('#rentalEquipmentId').value = '';
    $('#rentalQty').value = 1;
    $('#rentalStartDate').value = '';
    $('#rentalDueDate').value = '';
    $('#rentalReturnDate').value = '';
    $('#rentalFee').value = 0;
    $('#rentalDeposit').value = 0;
    $('#rentalPaid').value = 0;
    $('#rentalPayDate').value = '';
    $('#rentalLateFee').value = 0;
    $('#rentalStatus').value = 'active';
    $('#rentalNotes').value = '';
  }

  /**
   * Extract rental form data
   */
  function extractRentalFormData() {
    return {
      id: $('#rentalId').value || undefined,
      customer: $('#rentalCustomer').value.trim(),
      customerId: $('#rentalCustomerId').value || undefined,
      equipment: $('#rentalEquipment').value.trim(),
      equipmentId: $('#rentalEquipmentId').value || undefined,
      qty: parseInt($('#rentalQty').value) || 1,
      startDate: $('#rentalStartDate').value ? new Date($('#rentalStartDate').value).toISOString() : new Date().toISOString(),
      dueDate: $('#rentalDueDate').value ? new Date($('#rentalDueDate').value).toISOString() : new Date().toISOString(),
      returnDate: $('#rentalReturnDate').value ? new Date($('#rentalReturnDate').value).toISOString() : null,
      fee: parseFloat($('#rentalFee').value) || 0,
      deposit: parseFloat($('#rentalDeposit').value) || 0,
      paid: parseFloat($('#rentalPaid').value) || 0,
      payDate: $('#rentalPayDate').value ? new Date($('#rentalPayDate').value).toISOString() : null,
      lateFee: parseFloat($('#rentalLateFee').value) || 0,
      status: $('#rentalStatus').value || 'active',
      notes: $('#rentalNotes').value.trim()
    };
  }

  /**
   * Save rental from form
   */
  function saveRentalFromForm() {
    const data = extractRentalFormData();
    const rentalId = data.id;

    // Validate
    if (!data.customer) {
      showNotification('Customer name is required', 'error');
      $('#rentalCustomer').focus();
      return;
    }

    if (!data.equipment) {
      showNotification('Equipment name is required', 'error');
      $('#rentalEquipment').focus();
      return;
    }

    if (!data.startDate || !data.dueDate) {
      showNotification('Start date and due date are required', 'error');
      return;
    }

    try {
      let rental;
      if (rentalId) {
        // Update existing
        rental = updateRentalCRUD(rentalId, data);
        showNotification('Rental updated successfully', 'success');
      } else {
        // Create new
        rental = createRentalCRUD(data);
        showNotification('Rental created successfully', 'success');
      }

      // Hide dialog
      hideDialog('#rentalDialog');

      // Refresh table
      refreshRentalTable();

      return rental;
    } catch (error) {
      showNotification(error.message || 'Failed to save rental', 'error');
      console.error('Error saving rental:', error);
    }
  }

  /**
   * Show return dialog
   */
  function showReturnDialog(rentalId) {
    const rental = getRental(rentalId);
    if (!rental) {
      showNotification('Rental not found', 'error');
      return;
    }

    if (rental.status === 'returned') {
      showNotification('Rental already returned', 'warning');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const returnDate = prompt(`Return Date (YYYY-MM-DD):`, today);

    if (returnDate) {
      try {
        const returnedRental = markRentalReturnedCRUD(rentalId, new Date(returnDate).toISOString());

        // Calculate late fee if any
        const lateFee = returnedRental.lateFee || 0;

        if (lateFee > 0) {
          showNotification(`Rental returned with late fee: ${formatCurrency(lateFee)}`, 'warning');
        } else {
          showNotification('Rental returned successfully', 'success');
        }

        // Refresh table
        refreshRentalTable();
      } catch (error) {
        showNotification(error.message || 'Failed to return rental', 'error');
        console.error('Error returning rental:', error);
      }
    }
  }

  /**
   * Delete rental
   */
  function deleteRental(rentalId) {
    const rental = getRental(rentalId);
    if (!rental) {
      showNotification('Rental not found', 'error');
      return;
    }

    const confirmed = confirm(`Delete rental for "${rental.customer}" - "${rental.equipment}"?`);
    if (!confirmed) return;

    try {
      deleteRentalCRUD(rentalId);
      showNotification('Rental deleted successfully', 'success');
      refreshRentalTable();
    } catch (error) {
      showNotification(error.message || 'Failed to delete rental', 'error');
      console.error('Error deleting rental:', error);
    }
  }

  /**
   * Generate invoice from rental
   */
  function generateInvoice(rentalId) {
    const rental = getRental(rentalId);
    if (!rental) {
      showNotification('Rental not found', 'error');
      return;
    }

    try {
      // Get company settings
      const settings = typeof loadSettings === 'function' ? loadSettings() : {};

      // Generate invoice using rental module function
      const invoice = generateRentalInvoice(rental, settings);

      if (typeof Invoices !== 'undefined' && typeof Invoices.createInvoice === 'function') {
        // Save invoice to invoices module
        const savedInvoice = Invoices.createInvoice(invoice);
        showNotification('Invoice created successfully', 'success');

        // Optionally open invoice
        if (typeof InvoiceUI !== 'undefined' && typeof InvoiceUI.showInvoiceDialog === 'function') {
          InvoiceUI.showInvoiceDialog(savedInvoice.id);
        }
      } else {
        // Fallback: just show the invoice data
        console.log('Generated Invoice:', invoice);
        showNotification('Invoice generated (Invoices module not available)', 'warning');
      }
    } catch (error) {
      showNotification(error.message || 'Failed to generate invoice', 'error');
      console.error('Error generating invoice:', error);
    }
  }

  /**
   * Refresh rental table
   */
  function refreshRentalTable() {
    const rentals = getAllRentals();
    const container = $('#rentalsBody')?.parentElement || $('#rentalsTable');

    if (container) {
      renderRentalTable(container, rentals);
    }
  }

  /**
   * Update overdue count
   */
  function updateOverdueCount() {
    const rentals = getAllRentals();
    const overdueRentals = getOverdueRentals(rentals);
    const count = overdueRentals.length;

    const badge = $('#overdueRentalsBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    return count;
  }

  /**
   * Show overdue alert
   */
  function showOverdueAlert() {
    const overdueRentals = getOverdueRentals(getAllRentals());

    if (overdueRentals.length === 0) {
      showNotification('No overdue rentals', 'success');
      return;
    }

    const message = `${overdueRentals.length} overdue rental${overdueRentals.length > 1 ? 's' : ''}:\n\n` +
      overdueRentals.map(r => `• ${r.customer} - ${r.equipment} (Due: ${formatDate(r.dueDate)})`).join('\n');

    alert(message);
  }

  /**
   * Initialize rental UI
   */
  function init() {
    console.log('RentalUI initialized');

    // Listen for rental events
    if (typeof eventBus !== 'undefined') {
      eventBus.on('rental:created', () => refreshRentalTable());
      eventBus.on('rental:updated', () => refreshRentalTable());
      eventBus.on('rental:deleted', () => refreshRentalTable());
      eventBus.on('rental:returned', () => refreshRentalTable());
    }

    // Update overdue count on load
    updateOverdueCount();
  }

  // Public API
  return {
    getRentalColumns,
    renderRentalTable,
    showRentalDialog,
    populateRentalForm,
    clearRentalForm,
    extractRentalFormData,
    saveRentalFromForm,
    showReturnDialog,
    deleteRental,
    generateInvoice,
    refreshRentalTable,
    updateOverdueCount,
    showOverdueAlert,
    init
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', RentalUI.init);
} else {
  RentalUI.init();
}
