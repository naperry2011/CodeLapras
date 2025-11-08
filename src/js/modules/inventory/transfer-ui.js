/**
 * transfer-ui.js - Transfer UI Layer
 *
 * Provides UI rendering and interaction for stock transfers
 */

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

/**
 * Get transfer table column definitions
 * @param {object} options - Column options
 * @returns {Array<object>} Column definitions
 */
function getTransferColumns(options = {}) {
  const { showActions = true } = options;

  const columns = [
    {
      key: 'transferDate',
      label: 'Date',
      sortable: true,
      formatter: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return date.toLocaleDateString();
      }
    },
    {
      key: 'productId',
      label: 'Product',
      sortable: false,
      formatter: (value) => {
        if (!window.data) return value;
        const product = window.data.find(p => p.id === value);
        if (!product) return '<span class="muted">Unknown</span>';
        return `<strong>${product.name}</strong>`;
      }
    },
    {
      key: 'fromLocationId',
      label: 'From',
      sortable: false,
      formatter: (value) => {
        if (!window.Locations) return value;
        const location = window.Locations.getLocationById(value);
        return location ? location.name : '<span class="muted">Unknown</span>';
      }
    },
    {
      key: 'toLocationId',
      label: 'To',
      sortable: false,
      formatter: (value) => {
        if (!window.Locations) return value;
        const location = window.Locations.getLocationById(value);
        return location ? location.name : '<span class="muted">Unknown</span>';
      }
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      formatter: (value, row) => {
        const qty = Number(value) || 0;
        const loose = Number(row.looseUnits) || 0;
        if (loose > 0) {
          return `${qty} cases + ${loose} units`;
        }
        return `${qty} cases`;
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      formatter: (value) => {
        const statusMap = {
          pending: '<span class="pill" style="background: var(--warn)">Pending</span>',
          completed: '<span class="pill" style="background: var(--accent)">Completed</span>',
          cancelled: '<span class="pill" style="background: var(--muted)">Cancelled</span>'
        };
        return statusMap[value] || value;
      }
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: false,
      formatter: (value) => value || '-'
    }
  ];

  if (showActions) {
    columns.push({
      key: 'id',
      label: 'Actions',
      sortable: false,
      formatter: (value, row) => {
        if (row.status === 'pending') {
          return `
            <button class="btn btn-sm" style="background: var(--accent)" onclick="TransferUI.completeTransfer('${value}')" title="Complete">
              ✓
            </button>
            <button class="btn btn-sm" onclick="TransferUI.editTransfer('${value}')" title="Edit">
              ✏️
            </button>
            <button class="btn btn-sm danger" onclick="TransferUI.cancelTransfer('${value}')" title="Cancel">
              ✗
            </button>
          `;
        } else {
          return `
            <button class="btn btn-sm" onclick="TransferUI.viewTransfer('${value}')" title="View">
              👁️
            </button>
          `;
        }
      }
    });
  }

  return columns;
}

// ============================================================================
// TABLE RENDERING
// ============================================================================

/**
 * Render transfer table
 * @param {string} containerId - Container element ID
 * @param {Array} transfers - Transfers to render
 * @param {object} options - Render options
 */
function renderTransferTable(containerId, transfers = [], options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found`);
    return;
  }

  // Sort by date (newest first)
  const sorted = [...transfers].sort((a, b) =>
    new Date(b.transferDate) - new Date(a.transferDate)
  );

  const columns = getTransferColumns(options);

  if (window.TableRenderer && typeof window.TableRenderer.renderTable === 'function') {
    window.TableRenderer.renderTable(containerId, sorted, columns, {
      emptyMessage: 'No transfers found.',
      ...options
    });
  } else {
    // Fallback: simple table rendering
    let html = '<table class="data-table"><thead><tr>';

    columns.forEach(col => {
      html += `<th>${col.label}</th>`;
    });

    html += '</tr></thead><tbody>';

    if (sorted.length === 0) {
      html += `<tr><td colspan="${columns.length}" class="text-center muted">No transfers found</td></tr>`;
    } else {
      sorted.forEach(transfer => {
        html += '<tr>';
        columns.forEach(col => {
          const value = transfer[col.key];
          const formatted = col.formatter ? col.formatter(value, transfer) : (value || '-');
          html += `<td>${formatted}</td>`;
        });
        html += '</tr>';
      });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }
}

// ============================================================================
// DIALOG MANAGEMENT
// ============================================================================

/**
 * Open transfer dialog for create/edit
 * @param {object|null} transfer - Transfer to edit (null for new)
 * @param {string|null} preselectedProductId - Preselect product (for product context menu)
 */
function openTransferDialog(transfer = null, preselectedProductId = null) {
  const dialog = document.getElementById('transferDialog');
  if (!dialog) {
    console.error('Transfer dialog not found');
    return;
  }

  const isEdit = !!transfer;

  // Update dialog title
  const title = dialog.querySelector('.dialog-title');
  if (title) {
    title.textContent = isEdit ? 'Edit Transfer' : 'New Transfer';
  }

  // Populate form
  if (isEdit) {
    populateTransferForm(transfer);
  } else {
    clearTransferForm();
    if (preselectedProductId) {
      const productSelect = document.getElementById('transferProduct');
      if (productSelect) {
        productSelect.value = preselectedProductId;
        updateTransferAvailableStock();
      }
    }
  }

  // Store current transfer ID in dialog
  dialog.dataset.transferId = transfer?.id || '';

  // Show/hide complete button based on status
  updateTransferDialogActions(isEdit, transfer);

  // Show dialog
  if (window.showDialog) {
    window.showDialog(dialog);
  } else {
    dialog.style.display = 'flex';
  }
}

/**
 * Update dialog action buttons based on transfer status
 * @param {boolean} isEdit - Is editing existing transfer
 * @param {object} transfer - Transfer object
 */
function updateTransferDialogActions(isEdit, transfer) {
  // This can be customized based on your dialog structure
  // For now, we'll handle actions via the table buttons
}

/**
 * Close transfer dialog
 */
function closeTransferDialog() {
  const dialog = document.getElementById('transferDialog');
  if (!dialog) return;

  if (window.hideDialog) {
    window.hideDialog(dialog);
  } else {
    dialog.style.display = 'none';
  }

  clearTransferForm();
}

// ============================================================================
// FORM HANDLING
// ============================================================================

/**
 * Populate transfer form with data
 * @param {object} transfer - Transfer data
 */
function populateTransferForm(transfer) {
  if (!transfer) return;

  const form = document.getElementById('transferForm');
  if (!form) return;

  form.querySelector('#transferProduct').value = transfer.productId || '';
  form.querySelector('#transferFrom').value = transfer.fromLocationId || '';
  form.querySelector('#transferTo').value = transfer.toLocationId || '';
  form.querySelector('#transferQty').value = transfer.quantity || 0;
  form.querySelector('#transferLoose').value = transfer.looseUnits || 0;
  form.querySelector('#transferDate').value = transfer.transferDate || '';
  form.querySelector('#transferReason').value = transfer.reason || 'Restock';
  form.querySelector('#transferNotes').value = transfer.notes || '';

  updateTransferAvailableStock();
}

/**
 * Clear transfer form
 */
function clearTransferForm() {
  const form = document.getElementById('transferForm');
  if (!form) return;

  form.reset();
  form.querySelector('#transferDate').value = new Date().toISOString().split('T')[0];
  form.querySelector('#transferReason').value = 'Restock';

  // Clear available stock display
  const availDisplay = document.getElementById('transferAvailableStock');
  if (availDisplay) {
    availDisplay.textContent = '-';
  }
}

/**
 * Extract data from transfer form
 * @returns {object} Transfer data
 */
function extractTransferFormData() {
  const form = document.getElementById('transferForm');
  if (!form) return null;

  return {
    productId: form.querySelector('#transferProduct').value,
    fromLocationId: form.querySelector('#transferFrom').value,
    toLocationId: form.querySelector('#transferTo').value,
    quantity: parseInt(form.querySelector('#transferQty').value) || 0,
    looseUnits: parseInt(form.querySelector('#transferLoose').value) || 0,
    transferDate: form.querySelector('#transferDate').value,
    reason: form.querySelector('#transferReason').value,
    notes: form.querySelector('#transferNotes').value.trim()
  };
}

/**
 * Update available stock display when product/location changes
 */
function updateTransferAvailableStock() {
  const productId = document.getElementById('transferProduct')?.value;
  const fromLocationId = document.getElementById('transferFrom')?.value;
  const availDisplay = document.getElementById('transferAvailableStock');

  if (!availDisplay) return;

  if (!productId || !fromLocationId) {
    availDisplay.textContent = '-';
    return;
  }

  if (window.Transfers) {
    const stock = window.Transfers.getAvailableStockAtLocation(productId, fromLocationId);
    if (stock.looseUnits > 0) {
      availDisplay.textContent = `${stock.qty} cases + ${stock.looseUnits} units`;
    } else {
      availDisplay.textContent = `${stock.qty} cases`;
    }
  }
}

/**
 * Save transfer from dialog
 */
function saveTransfer() {
  const dialog = document.getElementById('transferDialog');
  if (!dialog) return;

  const transferId = dialog.dataset.transferId;
  const isEdit = !!transferId;

  // Extract form data
  const formData = extractTransferFormData();
  if (!formData) {
    alert('Could not read form data');
    return;
  }

  let result;

  if (isEdit) {
    // Update existing transfer (only if pending)
    result = window.Transfers.updateTransferCRUD(transferId, formData);
  } else {
    // Create new transfer
    result = window.Transfers.createTransferCRUD(formData);
  }

  if (result.success) {
    closeTransferDialog();

    // Refresh transfer list if the render function is available
    if (typeof refreshTransferList === 'function') {
      refreshTransferList();
    }

    // Show success message
    if (window.showToast) {
      window.showToast(`Transfer ${isEdit ? 'updated' : 'created'} successfully`, 'success');
    }
  } else {
    alert(result.error || 'Failed to save transfer');
  }
}

// ============================================================================
// TRANSFER ACTIONS
// ============================================================================

/**
 * Edit transfer by ID
 * @param {string} id - Transfer ID
 */
function editTransfer(id) {
  if (!window.Transfers) return;

  const transfer = window.Transfers.getTransferById(id);
  if (!transfer) {
    alert('Transfer not found');
    return;
  }

  if (transfer.status !== 'pending') {
    alert('Only pending transfers can be edited');
    return;
  }

  openTransferDialog(transfer);
}

/**
 * View transfer details (for completed/cancelled transfers)
 * @param {string} id - Transfer ID
 */
function viewTransfer(id) {
  if (!window.Transfers) return;

  const transfer = window.Transfers.getTransferById(id);
  if (!transfer) {
    alert('Transfer not found');
    return;
  }

  // For now, just show an alert with details
  // In a full implementation, you'd show a read-only dialog
  const product = window.data?.find(p => p.id === transfer.productId);
  const fromLoc = window.Locations?.getLocationById(transfer.fromLocationId);
  const toLoc = window.Locations?.getLocationById(transfer.toLocationId);

  const details = [
    `Product: ${product?.name || 'Unknown'}`,
    `From: ${fromLoc?.name || 'Unknown'}`,
    `To: ${toLoc?.name || 'Unknown'}`,
    `Quantity: ${transfer.quantity} cases${transfer.looseUnits > 0 ? ' + ' + transfer.looseUnits + ' units' : ''}`,
    `Date: ${new Date(transfer.transferDate).toLocaleDateString()}`,
    `Status: ${transfer.status}`,
    `Reason: ${transfer.reason}`,
    transfer.notes ? `Notes: ${transfer.notes}` : ''
  ].filter(Boolean).join('\n');

  alert(details);
}

/**
 * Complete transfer by ID
 * @param {string} id - Transfer ID
 */
function completeTransfer(id) {
  if (!window.Transfers) return;

  const transfer = window.Transfers.getTransferById(id);
  if (!transfer) {
    alert('Transfer not found');
    return;
  }

  if (transfer.status !== 'pending') {
    alert('Only pending transfers can be completed');
    return;
  }

  if (!confirm('Complete this transfer? Stock will be adjusted at both locations.')) {
    return;
  }

  const result = window.Transfers.completeTransfer(id);

  if (result.success) {
    // Refresh transfer list
    if (typeof refreshTransferList === 'function') {
      refreshTransferList();
    }

    // Refresh product table if visible
    if (typeof refreshProductList === 'function') {
      refreshProductList();
    }

    // Show success message
    if (window.showToast) {
      window.showToast('Transfer completed successfully', 'success');
    }
  } else {
    alert(result.error || 'Failed to complete transfer');
  }
}

/**
 * Cancel transfer by ID
 * @param {string} id - Transfer ID
 */
function cancelTransfer(id) {
  if (!window.Transfers) return;

  const transfer = window.Transfers.getTransferById(id);
  if (!transfer) {
    alert('Transfer not found');
    return;
  }

  if (transfer.status !== 'pending') {
    alert('Only pending transfers can be cancelled');
    return;
  }

  const reason = prompt('Reason for cancellation (optional):');
  if (reason === null) return; // User clicked Cancel

  const result = window.Transfers.cancelTransfer(id, reason);

  if (result.success) {
    // Refresh transfer list
    if (typeof refreshTransferList === 'function') {
      refreshTransferList();
    }

    // Show success message
    if (window.showToast) {
      window.showToast('Transfer cancelled', 'info');
    }
  } else {
    alert(result.error || 'Failed to cancel transfer');
  }
}

// ============================================================================
// PRODUCT-SPECIFIC TRANSFER HISTORY
// ============================================================================

/**
 * Show transfer history for a specific product
 * @param {string} productId - Product ID
 */
function showProductTransferHistory(productId) {
  if (!window.Transfers) return;

  const transfers = window.Transfers.getTransfersByProduct(productId);
  const product = window.data?.find(p => p.id === productId);

  // In a full implementation, this would open a modal with the history table
  // For now, we'll just log it
  console.log(`Transfer history for ${product?.name || productId}:`, transfers);

  // You could render this in a dialog:
  // renderTransferTable('transferHistoryTableBody', transfers, { showActions: false });
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.TransferUI = {
    // Table
    getTransferColumns,
    renderTransferTable,

    // Dialog
    openTransferDialog,
    closeTransferDialog,

    // Form
    populateTransferForm,
    clearTransferForm,
    extractTransferFormData,
    updateTransferAvailableStock,
    saveTransfer,

    // Actions
    editTransfer,
    viewTransfer,
    completeTransfer,
    cancelTransfer,

    // History
    showProductTransferHistory
  };
}
