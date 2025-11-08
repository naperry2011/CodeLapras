/* ============================================
   ORDERS MODEL
   CodeLapras - Order/Sales Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create a new order
 * @param {object} data - Order data
 * @returns {object} Order object
 */
function createOrder(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'order-' + Date.now()),
    customer: data.customer || createCustomer(),
    items: data.items || [],
    subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
    tax: typeof data.tax === 'number' ? data.tax : 0,
    taxRate: typeof data.taxRate === 'number' ? data.taxRate : 0,
    discount: typeof data.discount === 'number' ? data.discount : 0,
    discountPct: typeof data.discountPct === 'number' ? data.discountPct : 0,
    shipping: typeof data.shipping === 'number' ? data.shipping : 0,
    shipTaxable: data.shipTaxable !== undefined ? !!data.shipTaxable : false,
    total: typeof data.total === 'number' ? data.total : 0,
    notes: data.notes || '',
    status: data.status || 'draft',
    createdAt: data.createdAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Create a line item
 * @param {object} data - Line item data
 * @returns {object} Line item object
 */
function createLineItem(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'item-' + Date.now()),
    productId: data.productId || '',
    name: data.name || '',
    sku: data.sku || '',
    qty: typeof data.qty === 'number' ? data.qty : 1,
    price: typeof data.price === 'number' ? data.price : 0,
    total: typeof data.total === 'number' ? data.total : 0,
    notes: data.notes || ''
  };
}

// ============ Validation ============

/**
 * Validate order
 * @param {object} order - Order to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateOrder(order) {
  const errors = [];

  if (!order) {
    errors.push('Order object is required');
    return { isValid: false, errors };
  }

  // Customer validation
  if (!order.customer || !order.customer.name) {
    errors.push('Customer name is required');
  }

  // Items validation
  if (!Array.isArray(order.items)) {
    errors.push('Order items must be an array');
  } else if (order.items.length === 0) {
    errors.push('Order must have at least one item');
  } else {
    // Validate each line item
    order.items.forEach((item, index) => {
      const itemValidation = validateLineItem(item);
      if (!itemValidation.isValid) {
        errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
      }
    });
  }

  // Numeric validations
  if (typeof order.subtotal !== 'number' || order.subtotal < 0) {
    errors.push('Subtotal must be a non-negative number');
  }

  if (typeof order.total !== 'number' || order.total < 0) {
    errors.push('Total must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate line item
 * @param {object} item - Line item to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateLineItem(item) {
  const errors = [];

  if (!item) {
    errors.push('Line item is required');
    return { isValid: false, errors };
  }

  if (!item.name || item.name.trim() === '') {
    errors.push('Item name is required');
  }

  if (typeof item.qty !== 'number' || item.qty <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (typeof item.price !== 'number' || item.price < 0) {
    errors.push('Price must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============ Line Item Management ============

/**
 * Add line item to order
 * @param {object} order - Order object
 * @param {object} item - Line item to add
 * @returns {object} Updated order
 */
function addLineItem(order, item) {
  if (!order || !item) return order;

  const lineItem = createLineItem(item);
  lineItem.total = lineItem.qty * lineItem.price;

  const updatedOrder = { ...order };
  updatedOrder.items = [...(updatedOrder.items || []), lineItem];
  updatedOrder.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return recalculateOrderTotals(updatedOrder);
}

/**
 * Remove line item from order
 * @param {object} order - Order object
 * @param {number} index - Index of item to remove
 * @returns {object} Updated order
 */
function removeLineItem(order, index) {
  if (!order || !Array.isArray(order.items)) return order;
  if (index < 0 || index >= order.items.length) return order;

  const updatedOrder = { ...order };
  updatedOrder.items = order.items.filter((_, i) => i !== index);
  updatedOrder.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return recalculateOrderTotals(updatedOrder);
}

/**
 * Update line item in order
 * @param {object} order - Order object
 * @param {number} index - Index of item to update
 * @param {object} updates - Updates to apply
 * @returns {object} Updated order
 */
function updateLineItem(order, index, updates) {
  if (!order || !Array.isArray(order.items)) return order;
  if (index < 0 || index >= order.items.length) return order;

  const updatedOrder = { ...order };
  updatedOrder.items = order.items.map((item, i) => {
    if (i === index) {
      const updated = { ...item, ...updates };
      updated.total = updated.qty * updated.price;
      return updated;
    }
    return item;
  });
  updatedOrder.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return recalculateOrderTotals(updatedOrder);
}

/**
 * Update line item quantity
 * @param {object} order - Order object
 * @param {number} index - Index of item
 * @param {number} qty - New quantity
 * @returns {object} Updated order
 */
function updateLineItemQuantity(order, index, qty) {
  return updateLineItem(order, index, { qty });
}

// ============ Calculation Helpers ============

/**
 * Calculate order subtotal (sum of line items)
 * @param {object} order - Order object
 * @returns {number} Subtotal
 */
function calculateSubtotal(order) {
  if (!order || !Array.isArray(order.items)) return 0;

  return order.items.reduce((sum, item) => {
    const itemTotal = (item.qty || 0) * (item.price || 0);
    return sum + itemTotal;
  }, 0);
}

/**
 * Apply discount to subtotal
 * @param {number} subtotal - Subtotal amount
 * @param {number} dollarDiscount - Dollar discount
 * @param {number} percentDiscount - Percent discount (0-100)
 * @returns {number} Amount after discount
 */
function applyDiscount(subtotal, dollarDiscount = 0, percentDiscount = 0) {
  let amount = subtotal;

  // Apply percentage discount first
  if (percentDiscount > 0) {
    amount = amount * (1 - (percentDiscount / 100));
  }

  // Then apply dollar discount
  if (dollarDiscount > 0) {
    amount = amount - dollarDiscount;
  }

  return Math.max(0, amount);
}

/**
 * Calculate tax
 * @param {number} taxableAmount - Amount to tax
 * @param {number} taxRate - Tax rate (e.g., 0.07 for 7%)
 * @returns {number} Tax amount
 */
function calculateTax(taxableAmount, taxRate) {
  if (typeof taxableAmount !== 'number' || typeof taxRate !== 'number') return 0;
  return taxableAmount * taxRate;
}

/**
 * Recalculate all order totals
 * @param {object} order - Order object
 * @returns {object} Order with updated totals
 */
function recalculateOrderTotals(order) {
  if (!order) return order;

  const result = { ...order };

  // Calculate subtotal
  result.subtotal = calculateSubtotal(result);

  // Apply discount
  const afterDiscount = applyDiscount(
    result.subtotal,
    result.discount || 0,
    result.discountPct || 0
  );

  // Add shipping
  const shipping = result.shipping || 0;
  let taxableAmount = afterDiscount;

  // If shipping is taxable, include it in taxable amount
  if (result.shipTaxable) {
    taxableAmount += shipping;
  }

  // Calculate tax
  result.tax = calculateTax(taxableAmount, result.taxRate || 0);

  // Calculate total
  result.total = afterDiscount + shipping + result.tax;

  // Round to 2 decimal places
  result.subtotal = Math.round(result.subtotal * 100) / 100;
  result.tax = Math.round(result.tax * 100) / 100;
  result.total = Math.round(result.total * 100) / 100;

  return result;
}

// ============ Status Management ============

/**
 * Update order status
 * @param {object} order - Order object
 * @param {string} newStatus - New status
 * @returns {object} Updated order
 */
function updateOrderStatus(order, newStatus) {
  if (!order) return order;

  const validStatuses = ['draft', 'pending', 'confirmed', 'processing', 'completed', 'cancelled'];

  if (!validStatuses.includes(newStatus)) {
    console.warn(`Invalid order status: ${newStatus}`);
    return order;
  }

  return {
    ...order,
    status: newStatus,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Stock Validation ============

/**
 * Check if order items are in stock
 * @param {object} order - Order object
 * @param {Array} products - Products array
 * @returns {object} { available: boolean, issues: Array }
 */
function checkStockAvailability(order, products) {
  if (!order || !Array.isArray(order.items) || !Array.isArray(products)) {
    return { available: false, issues: ['Invalid order or products'] };
  }

  const issues = [];

  order.items.forEach((item, index) => {
    if (!item.productId) return;

    const product = products.find(p => p.id === item.productId);

    if (!product) {
      issues.push(`Item ${index + 1} (${item.name}): Product not found`);
      return;
    }

    const totalUnits = typeof calculateTotalUnits === 'function'
      ? calculateTotalUnits(product)
      : product.qty || 0;

    if (totalUnits < item.qty) {
      issues.push(`Item ${index + 1} (${item.name}): Insufficient stock. Available: ${totalUnits}, Requested: ${item.qty}`);
    }
  });

  return {
    available: issues.length === 0,
    issues
  };
}

// ============ Query Helpers ============

/**
 * Filter orders by criteria
 * @param {Array} orders - Orders array
 * @param {object} criteria - Filter criteria
 * @returns {Array} Filtered orders
 */
function filterOrders(orders, criteria = {}) {
  if (!Array.isArray(orders)) return [];

  return orders.filter(order => {
    // Status filter
    if (criteria.status && order.status !== criteria.status) {
      return false;
    }

    // Customer name filter
    if (criteria.customerName) {
      const customerName = order.customer?.name || '';
      if (!customerName.toLowerCase().includes(criteria.customerName.toLowerCase())) {
        return false;
      }
    }

    // Date range filter
    if (criteria.startDate) {
      const orderDate = new Date(order.createdAt);
      const startDate = new Date(criteria.startDate);
      if (orderDate < startDate) return false;
    }

    if (criteria.endDate) {
      const orderDate = new Date(order.createdAt);
      const endDate = new Date(criteria.endDate);
      if (orderDate > endDate) return false;
    }

    // Minimum total filter
    if (criteria.minTotal && order.total < criteria.minTotal) {
      return false;
    }

    return true;
  });
}

/**
 * Sort orders
 * @param {Array} orders - Orders array
 * @param {string} sortBy - Sort field
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted orders
 */
function sortOrders(orders, sortBy = 'createdAt', ascending = false) {
  if (!Array.isArray(orders)) return [];

  const sorted = [...orders].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'createdAt':
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
        break;
      case 'total':
        aVal = a.total || 0;
        bVal = b.total || 0;
        break;
      case 'customer':
        aVal = (a.customer?.name || '').toLowerCase();
        bVal = (b.customer?.name || '').toLowerCase();
        break;
      case 'status':
        aVal = a.status || '';
        bVal = b.status || '';
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });

  return sorted;
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  window.createOrder = createOrder;
  window.createLineItem = createLineItem;
  window.validateOrder = validateOrder;
  window.validateLineItem = validateLineItem;
  window.addLineItem = addLineItem;
  window.removeLineItem = removeLineItem;
  window.updateLineItem = updateLineItem;
  window.updateLineItemQuantity = updateLineItemQuantity;
  window.calculateSubtotal = calculateSubtotal;
  window.applyDiscount = applyDiscount;
  window.calculateTax = calculateTax;
  window.recalculateOrderTotals = recalculateOrderTotals;
  window.updateOrderStatus = updateOrderStatus;
  window.checkStockAvailability = checkStockAvailability;
  window.filterOrders = filterOrders;
  window.sortOrders = sortOrders;
}
