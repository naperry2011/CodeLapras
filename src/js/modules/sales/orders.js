/* ============================================
   ORDERS MODULE
   CodeLapras - Sales Order Management
   ============================================ */

/**
 * Get reference to global orders array
 * @returns {Array} Orders array
 */
function getOrdersArray() {
  if (!window.orders) {
    window.orders = [];
  }
  return window.orders;
}

// ============ Order Number Generation ============

/**
 * Generate next order number
 * @returns {string} Order number (e.g., ORD-2025-001)
 */
function generateOrderNumber() {
  const orders = getOrdersArray();
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;

  // Find highest number for current year
  const yearOrders = orders.filter(o => o.orderNumber && o.orderNumber.startsWith(prefix));
  const numbers = yearOrders.map(o => {
    const match = o.orderNumber.match(/ORD-\d{4}-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

// ============ Order Factory ============

/**
 * Create a new order with default values
 * @param {object} data - Initial order data
 * @returns {object} Order object
 */
function createOrder(data = {}) {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  return {
    id: data.id || `ord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orderNumber: data.orderNumber || generateOrderNumber(),
    customerId: data.customerId || '',
    customerName: data.customerName || '',
    customerEmail: data.customerEmail || '',
    customerPhone: data.customerPhone || '',
    orderDate: data.orderDate || today,
    status: data.status || 'draft', // draft, pending, fulfilled, cancelled
    lineItems: Array.isArray(data.lineItems) ? data.lineItems : [],
    subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
    discount: typeof data.discount === 'number' ? data.discount : 0,
    discountType: data.discountType || 'percentage',
    taxRate: typeof data.taxRate === 'number' ? data.taxRate : 0,
    taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : 0,
    total: typeof data.total === 'number' ? data.total : 0,
    notes: data.notes || '',
    shippingAddress: data.shippingAddress || '',
    billingAddress: data.billingAddress || '',
    paymentMethod: data.paymentMethod || '',
    paymentStatus: data.paymentStatus || 'unpaid', // unpaid, partial, paid
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    fulfilledAt: data.fulfilledAt || null,
    cancelledAt: data.cancelledAt || null
  };
}

// ============ Order Calculations ============

/**
 * Calculate order totals from line items
 * @param {object} order - Order object
 * @returns {object} Order with recalculated totals
 */
function calculateOrderTotals(order) {
  if (!window.LineItems) {
    console.warn('LineItems module not available');
    return order;
  }

  // Recalculate line items
  const recalculatedItems = window.LineItems.recalculateLineItems(order.lineItems || []);

  // Get line items totals
  const lineItemsTotals = window.LineItems.calculateLineItemsTotals(recalculatedItems);

  // Calculate order-level discount
  let orderDiscount = 0;
  if (order.discount > 0) {
    if (order.discountType === 'percentage') {
      orderDiscount = (lineItemsTotals.subtotal * order.discount) / 100;
    } else {
      orderDiscount = Math.min(order.discount, lineItemsTotals.subtotal);
    }
  }

  // Calculate tax on subtotal after order discount
  const afterDiscount = Math.max(0, lineItemsTotals.subtotal - orderDiscount);
  const orderTax = (afterDiscount * (order.taxRate || 0)) / 100;

  // Calculate final total
  const total = afterDiscount + orderTax;

  return {
    ...order,
    lineItems: recalculatedItems,
    subtotal: lineItemsTotals.subtotal,
    discountAmount: orderDiscount,
    taxAmount: orderTax,
    total: total,
    updatedAt: new Date().toISOString()
  };
}

// ============ Line Item Management ============

/**
 * Add line item to order
 * @param {object} order - Order object
 * @param {object} lineItem - Line item to add
 * @returns {object} Updated order
 */
function addLineItem(order, lineItem) {
  if (!lineItem) return order;

  const updatedOrder = {
    ...order,
    lineItems: [...(order.lineItems || []), lineItem]
  };

  return calculateOrderTotals(updatedOrder);
}

/**
 * Update line item in order
 * @param {object} order - Order object
 * @param {string} lineItemId - Line item ID
 * @param {object} updates - Fields to update
 * @returns {object} Updated order
 */
function updateLineItem(order, lineItemId, updates) {
  const lineItems = [...(order.lineItems || [])];
  const index = lineItems.findIndex(item => item.id === lineItemId);

  if (index === -1) return order;

  lineItems[index] = {
    ...lineItems[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const updatedOrder = {
    ...order,
    lineItems
  };

  return calculateOrderTotals(updatedOrder);
}

/**
 * Remove line item from order
 * @param {object} order - Order object
 * @param {string} lineItemId - Line item ID
 * @returns {object} Updated order
 */
function removeLineItem(order, lineItemId) {
  const updatedOrder = {
    ...order,
    lineItems: (order.lineItems || []).filter(item => item.id !== lineItemId)
  };

  return calculateOrderTotals(updatedOrder);
}

// ============ Validation ============

/**
 * Validate order structure
 * @param {object} order - Order to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateOrder(order) {
  const errors = [];

  if (!order || typeof order !== 'object') {
    errors.push('Order must be an object');
    return { valid: false, errors };
  }

  if (!order.id || typeof order.id !== 'string') {
    errors.push('Order ID is required');
  }

  if (!order.orderNumber || typeof order.orderNumber !== 'string') {
    errors.push('Order number is required');
  }

  const validStatuses = ['draft', 'pending', 'fulfilled', 'cancelled'];
  if (!validStatuses.includes(order.status)) {
    errors.push('Invalid order status');
  }

  if (!Array.isArray(order.lineItems)) {
    errors.push('Line items must be an array');
  } else if (order.lineItems.length === 0) {
    errors.push('Order must have at least one line item');
  }

  if (typeof order.total !== 'number' || order.total < 0) {
    errors.push('Order total must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate order stock availability
 * @param {object} order - Order to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateOrderStock(order) {
  const errors = [];

  if (!window.data) {
    errors.push('Products not loaded');
    return { valid: false, errors };
  }

  if (!window.LineItems) {
    errors.push('LineItems module not available');
    return { valid: false, errors };
  }

  // Check stock for each line item
  (order.lineItems || []).forEach((lineItem, index) => {
    const product = window.data.find(p => p.id === lineItem.productId);

    if (!product) {
      errors.push(`Line ${index + 1}: Product not found`);
      return;
    }

    const stockValidation = window.LineItems.validateLineItemStock(lineItem, product);
    if (!stockValidation.valid) {
      errors.push(`Line ${index + 1} (${lineItem.productName}): ${stockValidation.errors.join(', ')}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============ CRUD Operations ============

/**
 * Create a new order
 * @param {object} data - Order data
 * @returns {object} { success: boolean, order: object|null, error: string|null }
 */
function createOrderCRUD(data) {
  try {
    // Create order object
    const order = createOrder(data);

    // Calculate totals
    const calculatedOrder = calculateOrderTotals(order);

    // Validate structure
    const validation = validateOrder(calculatedOrder);
    if (!validation.valid) {
      return {
        success: false,
        order: null,
        error: validation.errors.join(', ')
      };
    }

    // Validate stock (only for pending/fulfilled orders)
    if (calculatedOrder.status !== 'draft') {
      const stockValidation = validateOrderStock(calculatedOrder);
      if (!stockValidation.valid) {
        return {
          success: false,
          order: null,
          error: stockValidation.errors.join(', ')
        };
      }
    }

    // Add to array
    const orders = getOrdersArray();
    orders.push(calculatedOrder);

    // Save
    saveOrdersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('order:created', { order: calculatedOrder });
    }

    return {
      success: true,
      order: calculatedOrder,
      error: null
    };

  } catch (err) {
    console.error('createOrderCRUD error:', err);
    return {
      success: false,
      order: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Update an existing order
 * @param {string} id - Order ID
 * @param {object} updates - Fields to update
 * @returns {object} { success: boolean, order: object|null, error: string|null }
 */
function updateOrderCRUD(id, updates) {
  try {
    const orders = getOrdersArray();
    const index = orders.findIndex(o => o.id === id);

    if (index === -1) {
      return {
        success: false,
        order: null,
        error: 'Order not found'
      };
    }

    const order = orders[index];

    // Prevent modification of fulfilled/cancelled orders
    if (order.status === 'fulfilled' || order.status === 'cancelled') {
      return {
        success: false,
        order: null,
        error: `Cannot modify ${order.status} order`
      };
    }

    // Apply updates
    const updated = {
      ...order,
      ...updates,
      id: order.id, // Prevent ID changes
      orderNumber: order.orderNumber, // Prevent order number changes
      updatedAt: new Date().toISOString()
    };

    // Recalculate totals
    const calculatedOrder = calculateOrderTotals(updated);

    // Validate
    const validation = validateOrder(calculatedOrder);
    if (!validation.valid) {
      return {
        success: false,
        order: null,
        error: validation.errors.join(', ')
      };
    }

    // Validate stock if status changed to pending/fulfilled
    if (calculatedOrder.status !== 'draft' && calculatedOrder.status !== order.status) {
      const stockValidation = validateOrderStock(calculatedOrder);
      if (!stockValidation.valid) {
        return {
          success: false,
          order: null,
          error: stockValidation.errors.join(', ')
        };
      }
    }

    // Update in array
    orders[index] = calculatedOrder;

    // Save
    saveOrdersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('order:updated', { order: calculatedOrder });
    }

    return {
      success: true,
      order: calculatedOrder,
      error: null
    };

  } catch (err) {
    console.error('updateOrderCRUD error:', err);
    return {
      success: false,
      order: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Delete an order (only draft orders)
 * @param {string} id - Order ID
 * @returns {object} { success: boolean, error: string|null }
 */
function deleteOrderCRUD(id) {
  try {
    const orders = getOrdersArray();
    const index = orders.findIndex(o => o.id === id);

    if (index === -1) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    const order = orders[index];

    // Only allow deletion of draft orders
    if (order.status !== 'draft') {
      return {
        success: false,
        error: `Cannot delete ${order.status} order. Use cancel instead.`
      };
    }

    // Remove from array
    orders.splice(index, 1);

    // Save
    saveOrdersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('order:deleted', { orderId: id });
    }

    return {
      success: true,
      error: null
    };

  } catch (err) {
    console.error('deleteOrderCRUD error:', err);
    return {
      success: false,
      error: err.message || 'Unknown error'
    };
  }
}

// ============ Order Workflow ============

/**
 * Fulfill an order (deduct stock)
 * @param {string} id - Order ID
 * @returns {object} { success: boolean, order: object|null, error: string|null }
 */
function fulfillOrder(id) {
  try {
    const orders = getOrdersArray();
    const index = orders.findIndex(o => o.id === id);

    if (index === -1) {
      return {
        success: false,
        order: null,
        error: 'Order not found'
      };
    }

    const order = orders[index];

    // Only fulfill pending or draft orders
    if (order.status === 'fulfilled') {
      return {
        success: false,
        order: null,
        error: 'Order is already fulfilled'
      };
    }

    if (order.status === 'cancelled') {
      return {
        success: false,
        order: null,
        error: 'Cannot fulfill cancelled order'
      };
    }

    // Re-validate stock before fulfillment
    const stockValidation = validateOrderStock(order);
    if (!stockValidation.valid) {
      return {
        success: false,
        order: null,
        error: stockValidation.errors.join(', ')
      };
    }

    // Deduct stock for each line item
    const deductionResult = deductStockForOrder(order);
    if (!deductionResult.success) {
      return {
        success: false,
        order: null,
        error: deductionResult.error
      };
    }

    // Update order status
    order.status = 'fulfilled';
    order.fulfilledAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    // Save
    saveOrdersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('order:fulfilled', { order });
    }

    return {
      success: true,
      order,
      error: null
    };

  } catch (err) {
    console.error('fulfillOrder error:', err);
    return {
      success: false,
      order: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Cancel an order
 * @param {string} id - Order ID
 * @param {string} reason - Cancellation reason
 * @returns {object} { success: boolean, order: object|null, error: string|null }
 */
function cancelOrder(id, reason = '') {
  try {
    const orders = getOrdersArray();
    const index = orders.findIndex(o => o.id === id);

    if (index === -1) {
      return {
        success: false,
        order: null,
        error: 'Order not found'
      };
    }

    const order = orders[index];

    // Cannot cancel fulfilled orders
    if (order.status === 'fulfilled') {
      return {
        success: false,
        order: null,
        error: 'Cannot cancel fulfilled order'
      };
    }

    if (order.status === 'cancelled') {
      return {
        success: false,
        order: null,
        error: 'Order is already cancelled'
      };
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    if (reason) {
      order.notes = (order.notes ? order.notes + '\n' : '') + `Cancelled: ${reason}`;
    }

    // Save
    saveOrdersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('order:cancelled', { order });
    }

    return {
      success: true,
      order,
      error: null
    };

  } catch (err) {
    console.error('cancelOrder error:', err);
    return {
      success: false,
      order: null,
      error: err.message || 'Unknown error'
    };
  }
}

// ============ Stock Deduction ============

/**
 * Deduct stock for all line items in order
 * @param {object} order - Order object
 * @returns {object} { success: boolean, error: string|null }
 */
function deductStockForOrder(order) {
  try {
    if (!window.data) {
      return { success: false, error: 'Products not loaded' };
    }

    if (!window.Products) {
      return { success: false, error: 'Products module not available' };
    }

    // Deduct stock for each line item
    for (const lineItem of order.lineItems) {
      const product = window.data.find(p => p.id === lineItem.productId);
      if (!product) {
        return {
          success: false,
          error: `Product ${lineItem.productName} not found`
        };
      }

      // Deduct quantity
      const result = window.Products.adjustQuantity(product, -lineItem.quantity);
      if (!result.success) {
        return {
          success: false,
          error: `Failed to deduct stock for ${lineItem.productName}: ${result.error}`
        };
      }
    }

    // Save products
    if (window.Products && typeof window.Products.saveProductsToStorage === 'function') {
      window.Products.saveProductsToStorage();
    } else if (typeof saveProducts === 'function') {
      saveProducts(window.data);
    }

    return { success: true, error: null };

  } catch (err) {
    console.error('deductStockForOrder error:', err);
    return {
      success: false,
      error: err.message || 'Unknown error'
    };
  }
}

// ============ Query Functions ============

/**
 * Get all orders
 * @param {string} status - Filter by status (optional)
 * @returns {Array} Array of orders
 */
function getAllOrders(status = null) {
  const orders = getOrdersArray();

  if (status) {
    return orders.filter(o => o.status === status);
  }

  return [...orders];
}

/**
 * Get order by ID
 * @param {string} id - Order ID
 * @returns {object|null} Order or null
 */
function getOrderById(id) {
  const orders = getOrdersArray();
  return orders.find(o => o.id === id) || null;
}

/**
 * Get order by order number
 * @param {string} orderNumber - Order number
 * @returns {object|null} Order or null
 */
function getOrderByNumber(orderNumber) {
  const orders = getOrdersArray();
  return orders.find(o => o.orderNumber === orderNumber) || null;
}

/**
 * Get orders by customer
 * @param {string} customerId - Customer ID
 * @returns {Array} Array of orders
 */
function getOrdersByCustomer(customerId) {
  const orders = getOrdersArray();
  return orders.filter(o => o.customerId === customerId);
}

/**
 * Get orders by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Array of orders
 */
function getOrdersByDateRange(startDate, endDate) {
  const orders = getOrdersArray();
  return orders.filter(o => {
    const orderDate = o.orderDate;
    return orderDate >= startDate && orderDate <= endDate;
  });
}

/**
 * Get order statistics
 * @returns {object} Order statistics
 */
function getOrderStats() {
  const orders = getOrdersArray();

  return {
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    pending: orders.filter(o => o.status === 'pending').length,
    fulfilled: orders.filter(o => o.status === 'fulfilled').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.status === 'fulfilled')
      .reduce((sum, o) => sum + (o.total || 0), 0)
  };
}

// ============ Storage Integration ============

/**
 * Save orders to localStorage
 */
function saveOrdersToStorage() {
  if (typeof window.Storage !== 'undefined' && typeof window.Storage.saveOrders === 'function') {
    window.Storage.saveOrders(window.orders);
  } else if (typeof saveOrders === 'function') {
    saveOrders(window.orders);
  } else {
    console.warn('Storage.saveOrders not available');
  }
}

/**
 * Load orders from localStorage
 * @returns {Array} Orders array
 */
function loadOrdersFromStorage() {
  let orders = [];

  if (typeof window.Storage !== 'undefined' && typeof window.Storage.loadOrders === 'function') {
    orders = window.Storage.loadOrders();
  } else if (typeof loadOrders === 'function') {
    orders = loadOrders();
  }

  window.orders = orders;
  return window.orders;
}

// ============ Exports ============

if (typeof window !== 'undefined') {
  window.Orders = {
    // Factory
    createOrder,
    generateOrderNumber,

    // Calculations
    calculateOrderTotals,

    // Line item management
    addLineItem,
    updateLineItem,
    removeLineItem,

    // Validation
    validateOrder,
    validateOrderStock,

    // CRUD
    createOrderCRUD,
    updateOrderCRUD,
    deleteOrderCRUD,

    // Workflow
    fulfillOrder,
    cancelOrder,

    // Stock
    deductStockForOrder,

    // Query
    getAllOrders,
    getOrderById,
    getOrderByNumber,
    getOrdersByCustomer,
    getOrdersByDateRange,
    getOrderStats,

    // Storage
    saveOrdersToStorage,
    loadOrdersFromStorage
  };
}
