/**
 * order-ui.js - Order UI Layer
 *
 * Provides UI rendering and interaction for orders:
 * - Order table rendering
 * - Order dialog management
 * - Line items table management
 * - Dynamic line item add/remove
 * - Real-time calculations
 *
 * Integrates with:
 * - orders.js (business logic)
 * - line-items.js (line item calculations)
 * - products.js (product data)
 * - Day 7-10 UI systems
 *
 * Usage:
 * renderOrderTable('orderTableBody', orders);
 * openOrderDialog(); // New order
 * openOrderDialog(order); // Edit order
 */

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

/**
 * Get order table column definitions
 * @param {object} options - Column options
 * @returns {Array<object>} Column definitions
 */
function getOrderColumns(options = {}) {
  const { showActions = true } = options;

  const columns = [];

  // Order Number column
  columns.push({
    key: 'orderNumber',
    label: 'Order #',
    sortable: true,
    formatter: (value, row) => {
      const esc = window.esc || ((s) => String(s || ''));
      const orderNum = esc(value || row.id);
      const statusClass = row.status === 'draft' ? 'muted' : '';
      return `<strong class="${statusClass}">${orderNum}</strong>`;
    }
  });

  // Customer column
  columns.push({
    key: 'customerName',
    label: 'Customer',
    sortable: true,
    formatter: (value) => {
      const esc = window.esc || ((s) => String(s || ''));
      return esc(value || 'Walk-in Customer');
    }
  });

  // Order Date column
  columns.push({
    key: 'orderDate',
    label: 'Date',
    sortable: true,
    formatter: window.TableRenderer?.formatters.date || ((value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleDateString();
    })
  });

  // Status column
  columns.push({
    key: 'status',
    label: 'Status',
    sortable: true,
    formatter: (value) => {
      const statusMap = {
        draft: { label: 'Draft', class: 'status-draft' },
        pending: { label: 'Pending', class: 'status-pending' },
        fulfilled: { label: 'Fulfilled', class: 'status-fulfilled' },
        cancelled: { label: 'Cancelled', class: 'status-cancelled' }
      };
      const status = statusMap[value] || { label: value, class: '' };
      return `<span class="status-badge ${status.class}">${status.label}</span>`;
    }
  });

  // Items column (count)
  columns.push({
    key: 'lineItems',
    label: 'Items',
    sortable: false,
    formatter: (value) => {
      const count = Array.isArray(value) ? value.length : 0;
      return `<span class="muted">${count} item${count !== 1 ? 's' : ''}</span>`;
    }
  });

  // Total column
  columns.push({
    key: 'total',
    label: 'Total',
    sortable: true,
    formatter: window.TableRenderer?.formatters.currency || ((value) => {
      const num = parseFloat(value) || 0;
      return `<strong>$${num.toFixed(2)}</strong>`;
    })
  });

  // Payment Status column
  columns.push({
    key: 'paymentStatus',
    label: 'Payment',
    sortable: true,
    formatter: (value) => {
      const statusMap = {
        unpaid: { label: 'Unpaid', class: 'payment-unpaid' },
        partial: { label: 'Partial', class: 'payment-partial' },
        paid: { label: 'Paid', class: 'payment-paid' },
        refunded: { label: 'Refunded', class: 'payment-refunded' }
      };
      const status = statusMap[value] || { label: value || 'Unpaid', class: '' };
      return `<span class="payment-badge ${status.class}">${status.label}</span>`;
    }
  });

  // Actions column
  if (showActions) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      sortable: false,
      formatter: (value, row) => {
        const canFulfill = row.status === 'pending' || row.status === 'draft';
        const canCancel = row.status !== 'cancelled' && row.status !== 'fulfilled';

        let html = `
          <button class="btn-icon" data-action="edit-order" data-id="${row.id}" title="Edit">✏️</button>
        `;

        if (canFulfill) {
          html += `<button class="btn-icon" data-action="fulfill-order" data-id="${row.id}" title="Fulfill">✅</button>`;
        }

        if (canCancel) {
          html += `<button class="btn-icon" data-action="cancel-order" data-id="${row.id}" title="Cancel">❌</button>`;
        }

        html += `<button class="btn-icon" data-action="delete-order" data-id="${row.id}" title="Delete">🗑️</button>`;

        return html;
      }
    });
  }

  return columns;
}

// ============================================================================
// TABLE RENDERING
// ============================================================================

/**
 * Render order table
 * @param {string|HTMLElement} containerId - Table body container
 * @param {Array<object>} orders - Orders to display
 * @param {object} options - Rendering options
 */
function renderOrderTable(containerId, orders, options = {}) {
  const {
    columns = null,
    emptyMessage = 'No orders found',
    onRowClick = null
  } = options;

  const tableColumns = columns || getOrderColumns(options);

  if (window.TableRenderer && window.TableRenderer.renderTable) {
    window.TableRenderer.renderTable(containerId, orders, tableColumns, {
      emptyMessage,
      onRowClick
    });
  } else {
    // Fallback rendering
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    if (!orders || orders.length === 0) {
      container.innerHTML = `<tr><td colspan="${tableColumns.length}" style="text-align:center;padding:2rem;color:#999">${emptyMessage}</td></tr>`;
      return;
    }

    const html = orders.map(order => {
      const cells = tableColumns.map(col => {
        const value = order[col.key];
        const formatted = col.formatter ? col.formatter(value, order) : (value || '');
        return `<td>${formatted}</td>`;
      }).join('');
      return `<tr data-id="${order.id}">${cells}</tr>`;
    }).join('');

    container.innerHTML = html;
  }

  // Attach action handlers
  attachOrderTableActions(containerId);
}

/**
 * Attach action handlers to order table
 * @param {string|HTMLElement} containerId - Table container
 */
function attachOrderTableActions(containerId) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (window.ActionRegistry && window.ActionRegistry.execute) {
      window.ActionRegistry.execute(action, { id });
    } else {
      console.warn('ActionRegistry not available for action:', action);
    }

    e.stopPropagation();
  });
}

// ============================================================================
// ORDER DIALOG
// ============================================================================

let currentOrderDialogData = null;

/**
 * Open order dialog
 * @param {object|null} order - Order to edit, or null for new order
 */
function openOrderDialog(order = null) {
  const dialog = document.getElementById('orderDialog');
  if (!dialog) {
    console.error('Order dialog not found');
    return;
  }

  currentOrderDialogData = order;

  // Populate form
  populateOrderForm(order);

  // Show dialog
  if (window.Dialog && window.Dialog.open) {
    window.Dialog.open('orderDialog');
  } else {
    dialog.style.display = 'flex';
  }
}

/**
 * Close order dialog
 */
function closeOrderDialog() {
  const dialog = document.getElementById('orderDialog');
  if (!dialog) return;

  currentOrderDialogData = null;

  if (window.Dialog && window.Dialog.close) {
    window.Dialog.close('orderDialog');
  } else {
    dialog.style.display = 'none';
  }

  // Reset form
  resetOrderForm();
}

/**
 * Populate order form with data
 * @param {object|null} order - Order data
 */
function populateOrderForm(order) {
  if (!order) {
    resetOrderForm();
    return;
  }

  // Set basic fields
  const fields = [
    'id', 'orderNumber', 'customerId', 'customerName',
    'orderDate', 'status', 'discount', 'discountType',
    'taxRate', 'notes', 'shippingAddress', 'paymentMethod', 'paymentStatus'
  ];

  fields.forEach(field => {
    const input = document.getElementById(`order_${field}`);
    if (input) {
      input.value = order[field] || '';
    }
  });

  // Populate line items
  if (order.lineItems && Array.isArray(order.lineItems)) {
    renderLineItemsTable(order.lineItems);
  }

  // Update dialog title
  const dialogTitle = document.getElementById('orderDialogTitle');
  if (dialogTitle) {
    dialogTitle.textContent = order ? `Edit Order ${order.orderNumber || ''}` : 'New Order';
  }

  // Recalculate totals
  recalculateOrderTotals();
}

/**
 * Reset order form to empty state
 */
function resetOrderForm() {
  const form = document.getElementById('orderForm');
  if (form) {
    form.reset();
  }

  // Clear line items
  renderLineItemsTable([]);

  // Reset totals
  updateOrderTotalsDisplay({ subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 });

  // Update dialog title
  const dialogTitle = document.getElementById('orderDialogTitle');
  if (dialogTitle) {
    dialogTitle.textContent = 'New Order';
  }
}

/**
 * Extract order data from form
 * @returns {object} Order data
 */
function extractOrderFormData() {
  const data = {};

  // Extract basic fields
  const fields = [
    'id', 'orderNumber', 'customerId', 'customerName',
    'orderDate', 'status', 'discount', 'discountType',
    'taxRate', 'notes', 'shippingAddress', 'paymentMethod', 'paymentStatus'
  ];

  fields.forEach(field => {
    const input = document.getElementById(`order_${field}`);
    if (input) {
      data[field] = input.value;
    }
  });

  // Convert numeric fields
  if (data.discount) data.discount = parseFloat(data.discount) || 0;
  if (data.taxRate) data.taxRate = parseFloat(data.taxRate) || 0;

  // Extract line items from table
  data.lineItems = extractLineItemsFromTable();

  return data;
}

/**
 * Validate order form
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateOrderForm() {
  const errors = [];
  const data = extractOrderFormData();

  // Validate customer name
  if (!data.customerName || data.customerName.trim() === '') {
    errors.push('Customer name is required');
  }

  // Validate order date
  if (!data.orderDate) {
    errors.push('Order date is required');
  }

  // Validate line items
  if (!data.lineItems || data.lineItems.length === 0) {
    errors.push('At least one line item is required');
  }

  // Validate each line item
  if (data.lineItems && window.LineItems) {
    data.lineItems.forEach((item, idx) => {
      const validation = window.LineItems.validateLineItem(item);
      if (!validation.valid) {
        errors.push(`Line item ${idx + 1}: ${validation.errors.join(', ')}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// LINE ITEMS TABLE
// ============================================================================

/**
 * Render line items table
 * @param {Array<object>} lineItems - Line items to display
 */
function renderLineItemsTable(lineItems = []) {
  const tbody = document.getElementById('orderLineItemsBody');
  if (!tbody) return;

  if (!lineItems || lineItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1rem;color:#999">No items added</td></tr>';
    return;
  }

  const html = lineItems.map((item, idx) => {
    const calculated = window.LineItems ? window.LineItems.calculateLineItemTotals(item) : item;
    const subtotal = calculated.subtotal || 0;
    const discountAmount = calculated.discountAmount || 0;
    const taxAmount = calculated.taxAmount || 0;
    const total = calculated.total || 0;

    return `
      <tr data-line-index="${idx}">
        <td>
          <input type="text" class="line-item-product-name" value="${escapeHtml(item.productName || '')}" readonly style="width:100%">
          <input type="hidden" class="line-item-product-id" value="${escapeHtml(item.productId || '')}">
        </td>
        <td><input type="text" class="line-item-sku" value="${escapeHtml(item.sku || '')}" readonly style="width:80px"></td>
        <td><input type="number" class="line-item-quantity" value="${item.quantity || 1}" min="1" step="1" style="width:60px"></td>
        <td><input type="number" class="line-item-unit-price" value="${item.unitPrice || 0}" min="0" step="0.01" style="width:80px"></td>
        <td><span class="line-item-subtotal">$${subtotal.toFixed(2)}</span></td>
        <td>
          <input type="number" class="line-item-discount" value="${item.discount || 0}" min="0" step="0.01" style="width:60px">
          <select class="line-item-discount-type" style="width:80px">
            <option value="percentage" ${item.discountType === 'percentage' ? 'selected' : ''}>%</option>
            <option value="fixed" ${item.discountType === 'fixed' ? 'selected' : ''}>$</option>
          </select>
        </td>
        <td><input type="number" class="line-item-tax-rate" value="${item.taxRate || 0}" min="0" max="100" step="0.01" style="width:60px">%</td>
        <td><span class="line-item-total">$${total.toFixed(2)}</span></td>
        <td>
          <button type="button" class="btn-icon btn-remove-line-item" data-line-index="${idx}" title="Remove">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;

  // Attach handlers
  attachLineItemHandlers();
}

/**
 * Attach event handlers to line item inputs
 */
function attachLineItemHandlers() {
  const tbody = document.getElementById('orderLineItemsBody');
  if (!tbody) return;

  // Handle input changes
  tbody.addEventListener('input', (e) => {
    if (e.target.matches('.line-item-quantity, .line-item-unit-price, .line-item-discount, .line-item-tax-rate')) {
      recalculateLineItem(e.target.closest('tr'));
    }
  });

  // Handle discount type change
  tbody.addEventListener('change', (e) => {
    if (e.target.matches('.line-item-discount-type')) {
      recalculateLineItem(e.target.closest('tr'));
    }
  });

  // Handle remove button
  tbody.addEventListener('click', (e) => {
    if (e.target.matches('.btn-remove-line-item') || e.target.closest('.btn-remove-line-item')) {
      const btn = e.target.matches('.btn-remove-line-item') ? e.target : e.target.closest('.btn-remove-line-item');
      const index = parseInt(btn.dataset.lineIndex, 10);
      removeLineItem(index);
    }
  });
}

/**
 * Recalculate line item totals
 * @param {HTMLElement} row - Table row element
 */
function recalculateLineItem(row) {
  if (!row || !window.LineItems) return;

  // Extract line item data from row
  const lineItem = {
    quantity: parseFloat(row.querySelector('.line-item-quantity')?.value) || 1,
    unitPrice: parseFloat(row.querySelector('.line-item-unit-price')?.value) || 0,
    discount: parseFloat(row.querySelector('.line-item-discount')?.value) || 0,
    discountType: row.querySelector('.line-item-discount-type')?.value || 'percentage',
    taxRate: parseFloat(row.querySelector('.line-item-tax-rate')?.value) || 0
  };

  // Calculate totals
  const calculated = window.LineItems.calculateLineItemTotals(lineItem);

  // Update display
  const subtotalEl = row.querySelector('.line-item-subtotal');
  const totalEl = row.querySelector('.line-item-total');

  if (subtotalEl) subtotalEl.textContent = `$${(calculated.subtotal || 0).toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${(calculated.total || 0).toFixed(2)}`;

  // Recalculate order totals
  recalculateOrderTotals();
}

/**
 * Recalculate order totals from line items
 */
function recalculateOrderTotals() {
  if (!window.LineItems) return;

  const lineItems = extractLineItemsFromTable();
  const totals = window.LineItems.calculateLineItemsTotals(lineItems);

  // Get order-level discount
  const orderDiscount = parseFloat(document.getElementById('order_discount')?.value) || 0;
  const orderDiscountType = document.getElementById('order_discountType')?.value || 'percentage';

  // Calculate order-level discount amount
  let orderDiscountAmount = 0;
  if (orderDiscountType === 'percentage') {
    orderDiscountAmount = (totals.subtotal * orderDiscount) / 100;
  } else {
    orderDiscountAmount = Math.min(orderDiscount, totals.subtotal);
  }

  // Adjust totals
  const afterDiscount = Math.max(0, totals.subtotal - orderDiscountAmount);

  // Get order-level tax rate
  const orderTaxRate = parseFloat(document.getElementById('order_taxRate')?.value) || 0;
  const orderTaxAmount = (afterDiscount * orderTaxRate) / 100;

  const finalTotals = {
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount + orderDiscountAmount,
    taxAmount: totals.taxAmount + orderTaxAmount,
    total: afterDiscount + totals.taxAmount + orderTaxAmount
  };

  updateOrderTotalsDisplay(finalTotals);
}

/**
 * Update order totals display
 * @param {object} totals - { subtotal, discountAmount, taxAmount, total }
 */
function updateOrderTotalsDisplay(totals) {
  const subtotalEl = document.getElementById('orderSubtotal');
  const discountEl = document.getElementById('orderDiscountAmount');
  const taxEl = document.getElementById('orderTaxAmount');
  const totalEl = document.getElementById('orderTotal');

  if (subtotalEl) subtotalEl.textContent = `$${(totals.subtotal || 0).toFixed(2)}`;
  if (discountEl) discountEl.textContent = `$${(totals.discountAmount || 0).toFixed(2)}`;
  if (taxEl) taxEl.textContent = `$${(totals.taxAmount || 0).toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${(totals.total || 0).toFixed(2)}`;
}

/**
 * Extract line items from table
 * @returns {Array<object>} Line items
 */
function extractLineItemsFromTable() {
  const tbody = document.getElementById('orderLineItemsBody');
  if (!tbody) return [];

  const rows = tbody.querySelectorAll('tr[data-line-index]');
  const lineItems = [];

  rows.forEach(row => {
    const productId = row.querySelector('.line-item-product-id')?.value;
    const productName = row.querySelector('.line-item-product-name')?.value;
    const sku = row.querySelector('.line-item-sku')?.value;
    const quantity = parseFloat(row.querySelector('.line-item-quantity')?.value) || 1;
    const unitPrice = parseFloat(row.querySelector('.line-item-unit-price')?.value) || 0;
    const discount = parseFloat(row.querySelector('.line-item-discount')?.value) || 0;
    const discountType = row.querySelector('.line-item-discount-type')?.value || 'percentage';
    const taxRate = parseFloat(row.querySelector('.line-item-tax-rate')?.value) || 0;

    if (productId && productName) {
      lineItems.push({
        productId,
        productName,
        sku,
        quantity,
        unitPrice,
        discount,
        discountType,
        taxRate
      });
    }
  });

  return lineItems;
}

/**
 * Add line item to table
 * @param {object} lineItem - Line item data
 */
function addLineItem(lineItem) {
  const lineItems = extractLineItemsFromTable();
  lineItems.push(lineItem);
  renderLineItemsTable(lineItems);
  recalculateOrderTotals();
}

/**
 * Remove line item from table
 * @param {number} index - Line item index
 */
function removeLineItem(index) {
  const lineItems = extractLineItemsFromTable();
  lineItems.splice(index, 1);
  renderLineItemsTable(lineItems);
  recalculateOrderTotals();
}

/**
 * Open product selector to add line item
 */
function openProductSelector() {
  // This would integrate with a product search/selector dialog
  // For now, show a simple prompt
  const productId = prompt('Enter product ID:');
  if (!productId) return;

  // Get product from window.data
  const product = window.data?.find(p => p.id === productId);
  if (!product) {
    if (window.Notifications) {
      window.Notifications.error('Product not found');
    }
    return;
  }

  // Create line item from product
  const taxRate = parseFloat(document.getElementById('order_taxRate')?.value) || 0;
  const lineItem = window.LineItems?.createLineItemFromProduct(product, 1, taxRate) || {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    quantity: 1,
    unitPrice: product.price || 0,
    discount: 0,
    discountType: 'percentage',
    taxRate: taxRate
  };

  addLineItem(lineItem);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escape HTML for safe display
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (window.esc) return window.esc(str);

  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize order UI
 */
function initializeOrderUI() {
  // Attach add line item button handler
  const btnAddLineItem = document.getElementById('btnAddLineItem');
  if (btnAddLineItem) {
    btnAddLineItem.addEventListener('click', openProductSelector);
  }

  // Attach order-level discount/tax change handlers
  const orderDiscount = document.getElementById('order_discount');
  const orderDiscountType = document.getElementById('order_discountType');
  const orderTaxRate = document.getElementById('order_taxRate');

  if (orderDiscount) {
    orderDiscount.addEventListener('input', recalculateOrderTotals);
  }
  if (orderDiscountType) {
    orderDiscountType.addEventListener('change', recalculateOrderTotals);
  }
  if (orderTaxRate) {
    orderTaxRate.addEventListener('input', recalculateOrderTotals);
  }

  console.log('✅ Order UI initialized');
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOrderUI);
} else {
  initializeOrderUI();
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.OrderUI = {
    // Table rendering
    getOrderColumns,
    renderOrderTable,
    attachOrderTableActions,

    // Dialog management
    openOrderDialog,
    closeOrderDialog,
    populateOrderForm,
    resetOrderForm,
    extractOrderFormData,
    validateOrderForm,

    // Line items
    renderLineItemsTable,
    addLineItem,
    removeLineItem,
    openProductSelector,
    recalculateLineItem,
    recalculateOrderTotals,
    updateOrderTotalsDisplay,
    extractLineItemsFromTable,

    // Utilities
    escapeHtml,

    // Initialization
    initializeOrderUI
  };
}
