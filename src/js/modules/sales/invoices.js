/* ============================================
   INVOICES MODEL
   CodeLapras - Invoice Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create a new invoice
 * @param {object} data - Invoice data
 * @returns {object} Invoice object
 */
function createInvoice(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'inv-' + Date.now()),
    number: data.number || '',
    date: data.date || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    from: data.from || '',
    billTo: data.billTo || '',
    customer: data.customer || createCustomer(),
    items: data.items || [],
    subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
    taxRate: typeof data.taxRate === 'number' ? data.taxRate : 0,
    tax: typeof data.tax === 'number' ? data.tax : 0,
    discount: typeof data.discount === 'number' ? data.discount : 0,
    discountPct: typeof data.discountPct === 'number' ? data.discountPct : 0,
    shipping: typeof data.shipping === 'number' ? data.shipping : 0,
    shipTaxable: data.shipTaxable !== undefined ? !!data.shipTaxable : false,
    mfrCoupon: typeof data.mfrCoupon === 'number' ? data.mfrCoupon : 0,
    total: typeof data.total === 'number' ? data.total : 0,
    notes: data.notes || '',
    footerNotes: data.footerNotes || '',
    footerImage: data.footerImage || '',
    status: data.status || 'unpaid',
    paidDate: data.paidDate || null,
    createdAt: data.createdAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Invoice Number Generation ============

/**
 * Generate invoice number with format: PREFIX-YYYYMMDD-XXXXX
 * @param {string} prefix - Invoice prefix (default 'INV')
 * @param {Array} existingInvoices - Existing invoices to check for uniqueness
 * @returns {string} Invoice number
 */
function generateInvoiceNumber(prefix = 'INV', existingInvoices = []) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Find the highest number for today
  const todayPrefix = `${prefix}-${dateStr}-`;
  let maxNum = 0;

  existingInvoices.forEach(inv => {
    if (inv.number && inv.number.startsWith(todayPrefix)) {
      const numPart = inv.number.substring(todayPrefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = String(maxNum + 1).padStart(5, '0');
  return `${todayPrefix}${nextNum}`;
}

// ============ Validation ============

/**
 * Validate invoice
 * @param {object} invoice - Invoice to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateInvoice(invoice) {
  const errors = [];

  if (!invoice) {
    errors.push('Invoice object is required');
    return { isValid: false, errors };
  }

  // Invoice number is required
  if (!invoice.number || invoice.number.trim() === '') {
    errors.push('Invoice number is required');
  }

  // Date is required
  if (!invoice.date) {
    errors.push('Invoice date is required');
  }

  // Customer validation
  if (!invoice.customer || !invoice.customer.name) {
    if (!invoice.billTo || invoice.billTo.trim() === '') {
      errors.push('Customer name or bill-to is required');
    }
  }

  // Items validation
  if (!Array.isArray(invoice.items)) {
    errors.push('Invoice items must be an array');
  } else if (invoice.items.length === 0) {
    errors.push('Invoice must have at least one item');
  }

  // Numeric validations
  if (typeof invoice.subtotal !== 'number' || invoice.subtotal < 0) {
    errors.push('Subtotal must be a non-negative number');
  }

  if (typeof invoice.total !== 'number' || invoice.total < 0) {
    errors.push('Total must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============ Calculation Helpers ============

/**
 * Calculate invoice totals with complex logic
 * Order: subtotal → discount → shipping → tax → manufacturer coupon
 * @param {object} invoice - Invoice object
 * @returns {object} Invoice with recalculated totals
 */
function calculateInvoiceTotals(invoice) {
  if (!invoice) return invoice;

  const result = { ...invoice };

  // Step 1: Calculate subtotal from line items
  result.subtotal = 0;
  if (Array.isArray(result.items)) {
    result.subtotal = result.items.reduce((sum, item) => {
      return sum + ((item.qty || 0) * (item.price || 0));
    }, 0);
  }

  // Step 2: Apply discount (percentage, then dollar)
  let afterDiscount = result.subtotal;

  if (result.discountPct > 0) {
    afterDiscount = afterDiscount * (1 - (result.discountPct / 100));
  }

  if (result.discount > 0) {
    afterDiscount = afterDiscount - result.discount;
  }

  afterDiscount = Math.max(0, afterDiscount);

  // Step 3: Add shipping
  const shipping = result.shipping || 0;
  const beforeTax = afterDiscount + shipping;

  // Step 4: Calculate tax
  let taxableAmount = afterDiscount;

  // If shipping is taxable, include it
  if (result.shipTaxable) {
    taxableAmount += shipping;
  }

  result.tax = taxableAmount * (result.taxRate || 0);

  // Step 5: Calculate total before manufacturer coupon
  let total = beforeTax + result.tax;

  // Step 6: Apply manufacturer coupon (post-tax)
  if (result.mfrCoupon > 0) {
    total = total - result.mfrCoupon;
  }

  result.total = Math.max(0, total);

  // Round to 2 decimal places
  result.subtotal = Math.round(result.subtotal * 100) / 100;
  result.tax = Math.round(result.tax * 100) / 100;
  result.total = Math.round(result.total * 100) / 100;

  return result;
}

// ============ Conversion Functions ============

/**
 * Create invoice from order
 * @param {object} order - Order object
 * @param {object} settings - App settings for defaults
 * @param {Array} existingInvoices - Existing invoices for number generation
 * @returns {object} Invoice object
 */
function createInvoiceFromOrder(order, settings = {}, existingInvoices = []) {
  if (!order) return null;

  const prefix = settings.invPrefix || 'INV';
  const number = generateInvoiceNumber(prefix, existingInvoices);

  const invoice = createInvoice({
    number,
    date: typeof nowISO === 'function' ? nowISO() : new Date().toISOString(),
    from: settings.companyName || '',
    customer: order.customer || createCustomer(),
    items: order.items || [],
    subtotal: order.subtotal || 0,
    taxRate: order.taxRate || settings.taxDefault || 0,
    tax: order.tax || 0,
    discount: order.discount || 0,
    discountPct: order.discountPct || 0,
    shipping: order.shipping || 0,
    shipTaxable: order.shipTaxable || false,
    notes: order.notes || '',
    footerNotes: settings.footerNotes || '',
    footerImage: settings.footerImage || ''
  });

  return calculateInvoiceTotals(invoice);
}

// ============ Status Management ============

/**
 * Mark invoice as paid
 * @param {object} invoice - Invoice object
 * @param {string} paidDate - Date paid (ISO string)
 * @returns {object} Updated invoice
 */
function markInvoicePaid(invoice, paidDate = null) {
  if (!invoice) return invoice;

  return {
    ...invoice,
    status: 'paid',
    paidDate: paidDate || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Mark invoice as cancelled
 * @param {object} invoice - Invoice object
 * @returns {object} Updated invoice
 */
function cancelInvoice(invoice) {
  if (!invoice) return invoice;

  return {
    ...invoice,
    status: 'cancelled',
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Query Helpers ============

/**
 * Filter invoices by criteria
 * @param {Array} invoices - Invoices array
 * @param {object} criteria - Filter criteria
 * @returns {Array} Filtered invoices
 */
function filterInvoices(invoices, criteria = {}) {
  if (!Array.isArray(invoices)) return [];

  return invoices.filter(invoice => {
    // Status filter
    if (criteria.status && invoice.status !== criteria.status) {
      return false;
    }

    // Customer name filter
    if (criteria.customerName) {
      const customerName = invoice.customer?.name || invoice.billTo || '';
      if (!customerName.toLowerCase().includes(criteria.customerName.toLowerCase())) {
        return false;
      }
    }

    // Date range filter
    if (criteria.startDate) {
      const invoiceDate = new Date(invoice.date);
      const startDate = new Date(criteria.startDate);
      if (invoiceDate < startDate) return false;
    }

    if (criteria.endDate) {
      const invoiceDate = new Date(invoice.date);
      const endDate = new Date(criteria.endDate);
      if (invoiceDate > endDate) return false;
    }

    // Amount range filter
    if (criteria.minTotal && invoice.total < criteria.minTotal) {
      return false;
    }

    if (criteria.maxTotal && invoice.total > criteria.maxTotal) {
      return false;
    }

    // Search by invoice number
    if (criteria.number) {
      if (!invoice.number || !invoice.number.toLowerCase().includes(criteria.number.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort invoices
 * @param {Array} invoices - Invoices array
 * @param {string} sortBy - Sort field
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted invoices
 */
function sortInvoices(invoices, sortBy = 'date', ascending = false) {
  if (!Array.isArray(invoices)) return [];

  const sorted = [...invoices].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'date':
        aVal = new Date(a.date || 0).getTime();
        bVal = new Date(b.date || 0).getTime();
        break;
      case 'number':
        aVal = a.number || '';
        bVal = b.number || '';
        break;
      case 'total':
        aVal = a.total || 0;
        bVal = b.total || 0;
        break;
      case 'customer':
        aVal = (a.customer?.name || a.billTo || '').toLowerCase();
        bVal = (b.customer?.name || b.billTo || '').toLowerCase();
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

/**
 * Get unpaid invoices
 * @param {Array} invoices - Invoices array
 * @returns {Array} Unpaid invoices
 */
function getUnpaidInvoices(invoices) {
  return filterInvoices(invoices, { status: 'unpaid' });
}

/**
 * Calculate total revenue from invoices
 * @param {Array} invoices - Invoices array
 * @param {boolean} paidOnly - Only count paid invoices
 * @returns {number} Total revenue
 */
function calculateTotalRevenue(invoices, paidOnly = true) {
  if (!Array.isArray(invoices)) return 0;

  return invoices
    .filter(inv => !paidOnly || inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
}

// ============ CRUD Operations ============

/**
 * Get all invoices
 * @returns {Array} Invoices array
 */
function getAllInvoices() {
  return window.invoices || [];
}

/**
 * Get invoice by ID
 * @param {string} id - Invoice ID
 * @returns {object|null} Invoice or null
 */
function getInvoice(id) {
  if (!window.invoices) return null;
  return window.invoices.find(inv => inv.id === id) || null;
}

/**
 * Create and save a new invoice
 * @param {object} invoiceData - Invoice data
 * @param {object} settings - App settings (for defaults)
 * @returns {object} { success: boolean, invoice?: object, errors?: array }
 */
function createInvoiceCRUD(invoiceData, settings = {}) {
  try {
    // 1. Generate invoice number if not provided
    if (!invoiceData.number) {
      const prefix = settings.invPrefix || 'INV';
      invoiceData.number = generateInvoiceNumber(prefix, window.invoices || []);
    }

    // 2. Create invoice with factory
    const invoice = createInvoice(invoiceData);

    // 3. Calculate totals
    const withTotals = calculateInvoiceTotals(invoice);

    // 4. Validate
    const validation = validateInvoice(withTotals);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // 5. Add to array
    if (!window.invoices) window.invoices = [];
    window.invoices.push(withTotals);

    // 6. Save to storage
    saveInvoicesToStorage();

    // 7. Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('invoice:created', { id: withTotals.id, invoice: withTotals });
    }

    // 8. Return success
    return { success: true, invoice: withTotals };

  } catch (err) {
    console.error('Error creating invoice:', err);
    return { success: false, errors: [err.message] };
  }
}

/**
 * Update an existing invoice
 * @param {string} id - Invoice ID
 * @param {object} updates - Updates to apply
 * @returns {object} { success: boolean, invoice?: object, errors?: array }
 */
function updateInvoiceCRUD(id, updates) {
  try {
    // 1. Find invoice
    const invoice = getInvoice(id);
    if (!invoice) {
      return { success: false, errors: ['Invoice not found'] };
    }

    // 2. Apply updates
    const updated = { ...invoice, ...updates, updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString() };

    // 3. Recalculate totals
    const withTotals = calculateInvoiceTotals(updated);

    // 4. Validate
    const validation = validateInvoice(withTotals);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // 5. Update in place
    Object.assign(invoice, withTotals);

    // 6. Save to storage
    saveInvoicesToStorage();

    // 7. Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('invoice:updated', { id, updates, invoice: withTotals });
    }

    // 8. Return success
    return { success: true, invoice: withTotals };

  } catch (err) {
    console.error('Error updating invoice:', err);
    return { success: false, errors: [err.message] };
  }
}

/**
 * Delete an invoice
 * @param {string} id - Invoice ID
 * @returns {object} { success: boolean, invoice?: object, errors?: array }
 */
function deleteInvoiceCRUD(id) {
  try {
    // 1. Find index
    const index = window.invoices.findIndex(inv => inv.id === id);
    if (index === -1) {
      return { success: false, errors: ['Invoice not found'] };
    }

    // 2. Remove from array
    const deleted = window.invoices.splice(index, 1)[0];

    // 3. Save to storage
    saveInvoicesToStorage();

    // 4. Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('invoice:deleted', { id, invoice: deleted });
    }

    // 5. Return success
    return { success: true, invoice: deleted };

  } catch (err) {
    console.error('Error deleting invoice:', err);
    return { success: false, errors: [err.message] };
  }
}

/**
 * Mark invoice as paid
 * @param {string} id - Invoice ID
 * @param {string} paidDate - Payment date (ISO string)
 * @returns {object} { success: boolean, invoice?: object, errors?: array }
 */
function markInvoicePaidCRUD(id, paidDate = null) {
  try {
    // 1. Find invoice
    const invoice = getInvoice(id);
    if (!invoice) {
      return { success: false, errors: ['Invoice not found'] };
    }

    // 2. Mark as paid
    const paid = markInvoicePaid(invoice, paidDate);

    // 3. Update in place
    Object.assign(invoice, paid);

    // 4. Save to storage
    saveInvoicesToStorage();

    // 5. Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('invoice:paid', { id, paidDate: paid.paidDate, invoice: paid });
    }

    // 6. Return success
    return { success: true, invoice: paid };

  } catch (err) {
    console.error('Error marking invoice as paid:', err);
    return { success: false, errors: [err.message] };
  }
}

/**
 * Save invoices to storage
 */
function saveInvoicesToStorage() {
  if (typeof saveInvoices === 'function') {
    saveInvoices(window.invoices || []);
  }
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  // Factory and helper functions
  window.createInvoice = createInvoice;
  window.generateInvoiceNumber = generateInvoiceNumber;
  window.validateInvoice = validateInvoice;
  window.calculateInvoiceTotals = calculateInvoiceTotals;
  window.createInvoiceFromOrder = createInvoiceFromOrder;
  window.markInvoicePaid = markInvoicePaid;
  window.cancelInvoice = cancelInvoice;

  // Query helpers
  window.filterInvoices = filterInvoices;
  window.sortInvoices = sortInvoices;
  window.getUnpaidInvoices = getUnpaidInvoices;
  window.calculateTotalRevenue = calculateTotalRevenue;

  // CRUD operations
  window.getAllInvoices = getAllInvoices;
  window.getInvoice = getInvoice;
  window.createInvoiceCRUD = createInvoiceCRUD;
  window.updateInvoiceCRUD = updateInvoiceCRUD;
  window.deleteInvoiceCRUD = deleteInvoiceCRUD;
  window.markInvoicePaidCRUD = markInvoicePaidCRUD;
  window.saveInvoicesToStorage = saveInvoicesToStorage;
}
