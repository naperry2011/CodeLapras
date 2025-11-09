/* ============================================
   LINE ITEMS MODULE
   CodeLapras - Order Line Item Management
   ============================================ */

/**
 * Create a new line item with default values
 * @param {object} data - Initial line item data
 * @returns {object} Line item object
 */
function createLineItem(data = {}) {
  const now = new Date().toISOString();

  return {
    id: data.id || `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productId: data.productId || '',
    productName: data.productName || '',
    sku: data.sku || '',
    quantity: typeof data.quantity === 'number' ? data.quantity : 1,
    unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : 0,
    discount: typeof data.discount === 'number' ? data.discount : 0,
    discountType: data.discountType || 'percentage', // percentage or fixed
    taxRate: typeof data.taxRate === 'number' ? data.taxRate : 0,
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Create line item from product
 * @param {object} product - Product object
 * @param {number} quantity - Quantity to order
 * @param {number} taxRate - Tax rate percentage
 * @returns {object} Line item object
 */
function createLineItemFromProduct(product, quantity = 1, taxRate = 0) {
  if (!product) return null;

  return createLineItem({
    productId: product.id,
    productName: product.name || '',
    sku: product.sku || '',
    quantity: quantity,
    unitPrice: product.price || 0,
    taxRate: taxRate,
    discount: 0,
    discountType: 'percentage'
  });
}

// ============ Calculations ============

/**
 * Calculate line item subtotal (quantity × unit price)
 * @param {object} lineItem - Line item object
 * @returns {number} Subtotal
 */
function calculateLineSubtotal(lineItem) {
  const qty = lineItem.quantity || 0;
  const price = lineItem.unitPrice || 0;
  return qty * price;
}

/**
 * Calculate discount amount
 * @param {object} lineItem - Line item object
 * @returns {number} Discount amount
 */
function calculateLineDiscount(lineItem) {
  const subtotal = calculateLineSubtotal(lineItem);
  const discount = lineItem.discount || 0;

  if (lineItem.discountType === 'percentage') {
    // Percentage discount
    return (subtotal * discount) / 100;
  } else {
    // Fixed amount discount
    return Math.min(discount, subtotal); // Don't discount more than subtotal
  }
}

/**
 * Calculate line item total after discount, before tax
 * @param {object} lineItem - Line item object
 * @returns {number} Total after discount
 */
function calculateLineAfterDiscount(lineItem) {
  const subtotal = calculateLineSubtotal(lineItem);
  const discountAmount = calculateLineDiscount(lineItem);
  return Math.max(0, subtotal - discountAmount);
}

/**
 * Calculate tax amount for line item
 * @param {object} lineItem - Line item object
 * @returns {number} Tax amount
 */
function calculateLineTax(lineItem) {
  const afterDiscount = calculateLineAfterDiscount(lineItem);
  const taxRate = lineItem.taxRate || 0;
  return (afterDiscount * taxRate) / 100;
}

/**
 * Calculate line item total (after discount + tax)
 * @param {object} lineItem - Line item object
 * @returns {number} Final total
 */
function calculateLineTotal(lineItem) {
  const afterDiscount = calculateLineAfterDiscount(lineItem);
  const tax = calculateLineTax(lineItem);
  return afterDiscount + tax;
}

/**
 * Calculate all line item totals and update the object
 * @param {object} lineItem - Line item object
 * @returns {object} Line item with calculated fields
 */
function calculateLineItemTotals(lineItem) {
  return {
    ...lineItem,
    subtotal: calculateLineSubtotal(lineItem),
    discountAmount: calculateLineDiscount(lineItem),
    afterDiscount: calculateLineAfterDiscount(lineItem),
    taxAmount: calculateLineTax(lineItem),
    total: calculateLineTotal(lineItem),
    updatedAt: new Date().toISOString()
  };
}

// ============ Validation ============

/**
 * Validate line item structure
 * @param {object} lineItem - Line item to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateLineItem(lineItem) {
  const errors = [];

  if (!lineItem || typeof lineItem !== 'object') {
    errors.push('Line item must be an object');
    return { valid: false, errors };
  }

  if (!lineItem.productId || typeof lineItem.productId !== 'string') {
    errors.push('Product ID is required');
  }

  if (typeof lineItem.quantity !== 'number' || lineItem.quantity <= 0) {
    errors.push('Quantity must be greater than zero');
  }

  if (typeof lineItem.unitPrice !== 'number' || lineItem.unitPrice < 0) {
    errors.push('Unit price must be non-negative');
  }

  if (typeof lineItem.discount !== 'number' || lineItem.discount < 0) {
    errors.push('Discount must be non-negative');
  }

  const validDiscountTypes = ['percentage', 'fixed'];
  if (!validDiscountTypes.includes(lineItem.discountType)) {
    errors.push('Invalid discount type');
  }

  if (lineItem.discountType === 'percentage' && lineItem.discount > 100) {
    errors.push('Percentage discount cannot exceed 100%');
  }

  if (typeof lineItem.taxRate !== 'number' || lineItem.taxRate < 0 || lineItem.taxRate > 100) {
    errors.push('Tax rate must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate line item against product stock
 * @param {object} lineItem - Line item to validate
 * @param {object} product - Product object
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateLineItemStock(lineItem, product) {
  const errors = [];

  if (!product) {
    errors.push('Product not found');
    return { valid: false, errors };
  }

  // Calculate total available stock
  const availableQty = product.qty || 0;
  const requestedQty = lineItem.quantity || 0;

  if (requestedQty > availableQty) {
    errors.push(
      `Insufficient stock. Available: ${availableQty}, Requested: ${requestedQty}`
    );
  }

  if (availableQty === 0) {
    errors.push('Product is out of stock');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============ Bulk Operations ============

/**
 * Calculate totals for multiple line items
 * @param {Array} lineItems - Array of line items
 * @returns {object} Totals { subtotal, discountAmount, taxAmount, total }
 */
function calculateLineItemsTotals(lineItems = []) {
  if (!Array.isArray(lineItems)) {
    return {
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0
    };
  }

  const totals = lineItems.reduce((acc, item) => {
    const calculated = calculateLineItemTotals(item);
    return {
      subtotal: acc.subtotal + (calculated.subtotal || 0),
      discountAmount: acc.discountAmount + (calculated.discountAmount || 0),
      taxAmount: acc.taxAmount + (calculated.taxAmount || 0),
      total: acc.total + (calculated.total || 0)
    };
  }, {
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0
  });

  return totals;
}

/**
 * Recalculate all line items in array
 * @param {Array} lineItems - Array of line items
 * @returns {Array} Array with recalculated line items
 */
function recalculateLineItems(lineItems = []) {
  return lineItems.map(item => calculateLineItemTotals(item));
}

/**
 * Apply discount to all line items
 * @param {Array} lineItems - Array of line items
 * @param {number} discount - Discount value
 * @param {string} discountType - 'percentage' or 'fixed'
 * @returns {Array} Array with discount applied
 */
function applyDiscountToLineItems(lineItems = [], discount, discountType = 'percentage') {
  return lineItems.map(item => {
    const updated = {
      ...item,
      discount,
      discountType
    };
    return calculateLineItemTotals(updated);
  });
}

/**
 * Apply tax rate to all line items
 * @param {Array} lineItems - Array of line items
 * @param {number} taxRate - Tax rate percentage
 * @returns {Array} Array with tax applied
 */
function applyTaxToLineItems(lineItems = [], taxRate) {
  return lineItems.map(item => {
    const updated = {
      ...item,
      taxRate
    };
    return calculateLineItemTotals(updated);
  });
}

// ============ Helpers ============

/**
 * Format line item for display
 * @param {object} lineItem - Line item object
 * @returns {string} Formatted string
 */
function formatLineItem(lineItem) {
  const calculated = calculateLineItemTotals(lineItem);
  return `${lineItem.productName} × ${lineItem.quantity} @ $${lineItem.unitPrice.toFixed(2)} = $${calculated.total.toFixed(2)}`;
}

/**
 * Clone a line item
 * @param {object} lineItem - Line item to clone
 * @returns {object} Cloned line item with new ID
 */
function cloneLineItem(lineItem) {
  return createLineItem({
    ...lineItem,
    id: undefined // Will generate new ID
  });
}

// ============ Exports ============

if (typeof window !== 'undefined') {
  window.LineItems = {
    // Factory
    createLineItem,
    createLineItemFromProduct,

    // Calculations
    calculateLineSubtotal,
    calculateLineDiscount,
    calculateLineAfterDiscount,
    calculateLineTax,
    calculateLineTotal,
    calculateLineItemTotals,

    // Validation
    validateLineItem,
    validateLineItemStock,

    // Bulk operations
    calculateLineItemsTotals,
    recalculateLineItems,
    applyDiscountToLineItems,
    applyTaxToLineItems,

    // Helpers
    formatLineItem,
    cloneLineItem
  };
}
