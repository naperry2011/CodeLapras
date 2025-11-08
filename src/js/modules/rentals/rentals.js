/* ============================================
   RENTALS MODEL
   CodeLapras - Equipment Rental Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create a new rental
 * @param {object} data - Rental data
 * @returns {object} Rental object
 */
function createRental(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'rental-' + Date.now()),
    customer: data.customer || '',
    customerId: data.customerId || '',
    equipment: data.equipment || '',
    equipmentId: data.equipmentId || '',
    qty: typeof data.qty === 'number' ? data.qty : 1,
    startDate: data.startDate || data.start || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    dueDate: data.dueDate || data.due || '',
    returnDate: data.returnDate || null,
    fee: typeof data.fee === 'number' ? data.fee : 0,
    deposit: typeof data.deposit === 'number' ? data.deposit : 0,
    paid: typeof data.paid === 'number' ? data.paid : 0,
    payDate: data.payDate || null,
    lateFee: typeof data.lateFee === 'number' ? data.lateFee : 0,
    status: data.status || 'active',
    notes: data.notes || '',
    createdAt: data.createdAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Validation ============

/**
 * Validate rental
 * @param {object} rental - Rental to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateRental(rental) {
  const errors = [];

  if (!rental) {
    errors.push('Rental object is required');
    return { isValid: false, errors };
  }

  if (!rental.customer || rental.customer.trim() === '') {
    errors.push('Customer is required');
  }

  if (!rental.equipment || rental.equipment.trim() === '') {
    errors.push('Equipment is required');
  }

  if (!rental.startDate) {
    errors.push('Start date is required');
  }

  if (!rental.dueDate) {
    errors.push('Due date is required');
  }

  if (typeof rental.fee !== 'number' || rental.fee < 0) {
    errors.push('Rental fee must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============ Status Management ============

/**
 * Check if rental is overdue
 * @param {object} rental - Rental object
 * @returns {boolean} True if overdue
 */
function isRentalOverdue(rental) {
  if (!rental || rental.returnDate) return false;
  if (!rental.dueDate) return false;

  const now = Date.now();
  const due = new Date(rental.dueDate).getTime();

  return now > due;
}

/**
 * Calculate late fee
 * @param {object} rental - Rental object
 * @param {number} feePerDay - Late fee per day
 * @returns {number} Late fee amount
 */
function calculateLateFee(rental, feePerDay = 5) {
  if (!rental || !isRentalOverdue(rental)) return 0;

  const now = Date.now();
  const due = new Date(rental.dueDate).getTime();
  const daysLate = Math.ceil((now - due) / (1000 * 60 * 60 * 24));

  return Math.max(0, daysLate * feePerDay);
}

/**
 * Mark rental as returned
 * @param {object} rental - Rental object
 * @param {string} returnDate - Return date (ISO string)
 * @returns {object} Updated rental
 */
function markRentalReturned(rental, returnDate = null) {
  if (!rental) return rental;

  return {
    ...rental,
    returnDate: returnDate || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    status: 'returned',
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Update rental status based on current state
 * @param {object} rental - Rental object
 * @returns {object} Rental with updated status
 */
function updateRentalStatus(rental) {
  if (!rental) return rental;

  let status = rental.status;

  if (rental.returnDate) {
    status = 'returned';
  } else if (isRentalOverdue(rental)) {
    status = 'overdue';
  } else {
    status = 'active';
  }

  if (status !== rental.status) {
    return {
      ...rental,
      status,
      updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
    };
  }

  return rental;
}

// ============ Invoice Generation ============

/**
 * Generate invoice from rental
 * @param {object} rental - Rental object
 * @param {object} settings - App settings
 * @returns {object} Invoice object
 */
function generateRentalInvoice(rental, settings = {}) {
  if (!rental) return null;

  const items = [
    {
      name: `Rental: ${rental.equipment}`,
      qty: rental.qty || 1,
      price: rental.fee || 0,
      total: (rental.qty || 1) * (rental.fee || 0)
    }
  ];

  // Add late fee if applicable
  if (rental.lateFee > 0) {
    items.push({
      name: 'Late Fee',
      qty: 1,
      price: rental.lateFee,
      total: rental.lateFee
    });
  }

  const invoice = {
    number: '', // Will be generated
    date: typeof nowISO === 'function' ? nowISO() : new Date().toISOString(),
    customer: { name: rental.customer },
    items,
    subtotal: items.reduce((sum, item) => sum + item.total, 0),
    taxRate: settings.taxDefault || 0,
    notes: `Rental ID: ${rental.id}\nStart: ${rental.startDate}\nDue: ${rental.dueDate}`
  };

  if (typeof calculateInvoiceTotals === 'function') {
    return calculateInvoiceTotals(invoice);
  }

  return invoice;
}

// ============ Query Helpers ============

/**
 * Filter rentals by criteria
 * @param {Array} rentals - Rentals array
 * @param {object} criteria - Filter criteria
 * @returns {Array} Filtered rentals
 */
function filterRentals(rentals, criteria = {}) {
  if (!Array.isArray(rentals)) return [];

  return rentals.filter(rental => {
    if (criteria.status && rental.status !== criteria.status) {
      return false;
    }

    if (criteria.customer) {
      if (!rental.customer.toLowerCase().includes(criteria.customer.toLowerCase())) {
        return false;
      }
    }

    if (criteria.overdue && !isRentalOverdue(rental)) {
      return false;
    }

    return true;
  });
}

/**
 * Get overdue rentals
 * @param {Array} rentals - Rentals array
 * @returns {Array} Overdue rentals
 */
function getOverdueRentals(rentals) {
  if (!Array.isArray(rentals)) return [];
  return rentals.filter(r => isRentalOverdue(r));
}

/**
 * Sort rentals
 * @param {Array} rentals - Rentals array
 * @param {string} sortBy - Sort field
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted rentals
 */
function sortRentals(rentals, sortBy = 'startDate', ascending = false) {
  if (!Array.isArray(rentals)) return [];

  const sorted = [...rentals].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'startDate':
        aVal = new Date(a.startDate || 0).getTime();
        bVal = new Date(b.startDate || 0).getTime();
        break;
      case 'dueDate':
        aVal = new Date(a.dueDate || 0).getTime();
        bVal = new Date(b.dueDate || 0).getTime();
        break;
      case 'customer':
        aVal = (a.customer || '').toLowerCase();
        bVal = (b.customer || '').toLowerCase();
        break;
      case 'equipment':
        aVal = (a.equipment || '').toLowerCase();
        bVal = (b.equipment || '').toLowerCase();
        break;
      case 'fee':
        aVal = a.fee || 0;
        bVal = b.fee || 0;
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

// ============ CRUD Operations ============

function getAllRentals() {
  return window.rentals || [];
}

function getRental(id) {
  if (!window.rentals) return null;
  return window.rentals.find(r => r.id === id) || null;
}

function createRentalCRUD(rentalData) {
  try {
    const rental = createRental(rentalData);
    const validation = validateRental(rental);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    if (!window.rentals) window.rentals = [];
    window.rentals.push(rental);
    saveRentalsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('rental:created', { id: rental.id, rental });
    }
    return { success: true, rental };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function updateRentalCRUD(id, updates) {
  try {
    const rental = getRental(id);
    if (!rental) return { success: false, errors: ['Rental not found'] };
    const updated = { ...rental, ...updates, updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString() };
    const validation = validateRental(updated);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    Object.assign(rental, updated);
    saveRentalsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('rental:updated', { id, updates, rental: updated });
    }
    return { success: true, rental: updated };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function deleteRentalCRUD(id) {
  try {
    const index = window.rentals.findIndex(r => r.id === id);
    if (index === -1) return { success: false, errors: ['Rental not found'] };
    const deleted = window.rentals.splice(index, 1)[0];
    saveRentalsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('rental:deleted', { id, rental: deleted });
    }
    return { success: true, rental: deleted };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function markRentalReturnedCRUD(id, returnDate = null) {
  try {
    const rental = getRental(id);
    if (!rental) return { success: false, errors: ['Rental not found'] };
    const returned = markRentalReturned(rental, returnDate);
    Object.assign(rental, returned);
    saveRentalsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('rental:returned', { id, returnDate: returned.returnDate, rental: returned });
    }
    return { success: true, rental: returned };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function saveRentalsToStorage() {
  if (typeof saveRentals === 'function') {
    saveRentals(window.rentals || []);
  }
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  window.createRental = createRental;
  window.validateRental = validateRental;
  window.isRentalOverdue = isRentalOverdue;
  window.calculateLateFee = calculateLateFee;
  window.markRentalReturned = markRentalReturned;
  window.updateRentalStatus = updateRentalStatus;
  window.generateRentalInvoice = generateRentalInvoice;
  window.filterRentals = filterRentals;
  window.getOverdueRentals = getOverdueRentals;
  window.sortRentals = sortRentals;
  window.getAllRentals = getAllRentals;
  window.getRental = getRental;
  window.createRentalCRUD = createRentalCRUD;
  window.updateRentalCRUD = updateRentalCRUD;
  window.deleteRentalCRUD = deleteRentalCRUD;
  window.markRentalReturnedCRUD = markRentalReturnedCRUD;
  window.saveRentalsToStorage = saveRentalsToStorage;
}
