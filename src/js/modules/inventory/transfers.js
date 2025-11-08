/* ============================================
   TRANSFERS MODULE
   CodeLapras - Inventory Transfer Management
   ============================================ */

/**
 * Get reference to global transfers array
 * @returns {Array} Transfers array
 */
function getTransfersArray() {
  if (!window.transfers) {
    window.transfers = [];
  }
  return window.transfers;
}

// ============ Transfer Factory ============

/**
 * Create a new transfer object with default values
 * @param {object} data - Initial transfer data
 * @returns {object} Transfer object
 */
function createTransfer(data = {}) {
  const now = new Date().toISOString();

  return {
    id: data.id || `xfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productId: data.productId || '',
    fromLocationId: data.fromLocationId || '',
    toLocationId: data.toLocationId || '',
    quantity: data.quantity || 0,
    looseUnits: data.looseUnits || 0,
    transferDate: data.transferDate || new Date().toISOString().split('T')[0],
    status: data.status || 'pending', // pending, completed, cancelled
    reason: data.reason || 'Restock', // Restock, Sale, Damaged, Adjustment, Other
    notes: data.notes || '',
    createdBy: data.createdBy || 'user',
    createdAt: data.createdAt || now,
    completedAt: data.completedAt || null,
    cancelledAt: data.cancelledAt || null,
    updatedAt: data.updatedAt || now
  };
}

// ============ Validation ============

/**
 * Validate transfer object
 * @param {object} transfer - Transfer to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateTransfer(transfer) {
  const errors = [];

  if (!transfer || typeof transfer !== 'object') {
    errors.push('Transfer must be an object');
    return { valid: false, errors };
  }

  if (!transfer.id || typeof transfer.id !== 'string') {
    errors.push('Transfer ID is required');
  }

  if (!transfer.productId || typeof transfer.productId !== 'string') {
    errors.push('Product ID is required');
  }

  if (!transfer.fromLocationId || typeof transfer.fromLocationId !== 'string') {
    errors.push('Source location is required');
  }

  if (!transfer.toLocationId || typeof transfer.toLocationId !== 'string') {
    errors.push('Destination location is required');
  }

  if (transfer.fromLocationId === transfer.toLocationId) {
    errors.push('Source and destination locations must be different');
  }

  if (typeof transfer.quantity !== 'number' || transfer.quantity < 0) {
    errors.push('Quantity must be a non-negative number');
  }

  if (typeof transfer.looseUnits !== 'number' || transfer.looseUnits < 0) {
    errors.push('Loose units must be a non-negative number');
  }

  if (transfer.quantity === 0 && transfer.looseUnits === 0) {
    errors.push('Transfer quantity must be greater than zero');
  }

  const validStatuses = ['pending', 'completed', 'cancelled'];
  if (!validStatuses.includes(transfer.status)) {
    errors.push('Invalid transfer status');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate transfer business rules (stock availability, location existence)
 * @param {object} transfer - Transfer to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateTransferBusinessRules(transfer) {
  const errors = [];

  // Verify locations exist
  if (window.Locations) {
    const fromLocation = window.Locations.getLocationById(transfer.fromLocationId);
    const toLocation = window.Locations.getLocationById(transfer.toLocationId);

    if (!fromLocation) {
      errors.push('Source location does not exist');
    } else if (!fromLocation.isActive) {
      errors.push('Source location is inactive');
    }

    if (!toLocation) {
      errors.push('Destination location does not exist');
    } else if (!toLocation.isActive) {
      errors.push('Destination location is inactive');
    }
  }

  // Verify product exists
  if (window.Products) {
    const product = window.Products.findProductById(transfer.productId);
    if (!product) {
      errors.push('Product does not exist');
    } else {
      // Check if sufficient stock exists at source location
      const available = getAvailableStockAtLocation(transfer.productId, transfer.fromLocationId);

      const unitsPerPackage = product.unitsPerPackage || 1;
      const requiredUnits = (transfer.quantity * unitsPerPackage) + transfer.looseUnits;
      const availableUnits = (available.qty * unitsPerPackage) + available.looseUnits;

      if (requiredUnits > availableUnits) {
        errors.push(
          `Insufficient stock at source location. ` +
          `Available: ${available.qty} cases + ${available.looseUnits} units, ` +
          `Required: ${transfer.quantity} cases + ${transfer.looseUnits} units`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============ CRUD Operations ============

/**
 * Create a new transfer (pending state)
 * @param {object} data - Transfer data
 * @returns {object} { success: boolean, transfer: object|null, error: string|null }
 */
function createTransferCRUD(data) {
  try {
    // Create transfer object
    const transfer = createTransfer({ ...data, status: 'pending' });

    // Validate structure
    const validation = validateTransfer(transfer);
    if (!validation.valid) {
      return {
        success: false,
        transfer: null,
        error: validation.errors.join(', ')
      };
    }

    // Validate business rules
    const businessValidation = validateTransferBusinessRules(transfer);
    if (!businessValidation.valid) {
      return {
        success: false,
        transfer: null,
        error: businessValidation.errors.join(', ')
      };
    }

    // Add to array
    const transfers = getTransfersArray();
    transfers.push(transfer);

    // Save
    saveTransfersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('transfer:created', { transfer });
    }

    return {
      success: true,
      transfer,
      error: null
    };

  } catch (err) {
    console.error('createTransferCRUD error:', err);
    return {
      success: false,
      transfer: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Update an existing transfer
 * @param {string} id - Transfer ID
 * @param {object} updates - Fields to update
 * @returns {object} { success: boolean, transfer: object|null, error: string|null }
 */
function updateTransferCRUD(id, updates) {
  try {
    const transfers = getTransfersArray();
    const index = transfers.findIndex(t => t.id === id);

    if (index === -1) {
      return {
        success: false,
        transfer: null,
        error: 'Transfer not found'
      };
    }

    const transfer = transfers[index];

    // Prevent modification of completed or cancelled transfers
    if (transfer.status !== 'pending') {
      return {
        success: false,
        transfer: null,
        error: `Cannot modify ${transfer.status} transfer`
      };
    }

    // Apply updates
    const updated = {
      ...transfer,
      ...updates,
      id: transfer.id, // Prevent ID changes
      status: transfer.status, // Prevent direct status changes (use complete/cancel methods)
      updatedAt: new Date().toISOString()
    };

    // Validate
    const validation = validateTransfer(updated);
    if (!validation.valid) {
      return {
        success: false,
        transfer: null,
        error: validation.errors.join(', ')
      };
    }

    // Validate business rules
    const businessValidation = validateTransferBusinessRules(updated);
    if (!businessValidation.valid) {
      return {
        success: false,
        transfer: null,
        error: businessValidation.errors.join(', ')
      };
    }

    // Update in array
    transfers[index] = updated;

    // Save
    saveTransfersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('transfer:updated', { transfer: updated });
    }

    return {
      success: true,
      transfer: updated,
      error: null
    };

  } catch (err) {
    console.error('updateTransferCRUD error:', err);
    return {
      success: false,
      transfer: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Delete a transfer (only if pending)
 * @param {string} id - Transfer ID
 * @returns {object} { success: boolean, error: string|null }
 */
function deleteTransferCRUD(id) {
  try {
    const transfers = getTransfersArray();
    const index = transfers.findIndex(t => t.id === id);

    if (index === -1) {
      return {
        success: false,
        error: 'Transfer not found'
      };
    }

    const transfer = transfers[index];

    // Only allow deletion of pending transfers
    if (transfer.status !== 'pending') {
      return {
        success: false,
        error: `Cannot delete ${transfer.status} transfer. Use cancel instead.`
      };
    }

    // Remove from array
    transfers.splice(index, 1);

    // Save
    saveTransfersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('transfer:deleted', { transferId: id });
    }

    return {
      success: true,
      error: null
    };

  } catch (err) {
    console.error('deleteTransferCRUD error:', err);
    return {
      success: false,
      error: err.message || 'Unknown error'
    };
  }
}

// ============ Transfer Workflow ============

/**
 * Complete a pending transfer (adjust stock at both locations)
 * @param {string} id - Transfer ID
 * @returns {object} { success: boolean, transfer: object|null, error: string|null }
 */
function completeTransfer(id) {
  try {
    const transfers = getTransfersArray();
    const index = transfers.findIndex(t => t.id === id);

    if (index === -1) {
      return {
        success: false,
        transfer: null,
        error: 'Transfer not found'
      };
    }

    const transfer = transfers[index];

    // Only complete pending transfers
    if (transfer.status !== 'pending') {
      return {
        success: false,
        transfer: null,
        error: `Transfer is already ${transfer.status}`
      };
    }

    // Re-validate business rules before completing
    const businessValidation = validateTransferBusinessRules(transfer);
    if (!businessValidation.valid) {
      return {
        success: false,
        transfer: null,
        error: businessValidation.errors.join(', ')
      };
    }

    // Perform stock adjustment
    const adjustmentResult = adjustStockForTransfer(transfer);
    if (!adjustmentResult.success) {
      return {
        success: false,
        transfer: null,
        error: adjustmentResult.error
      };
    }

    // Update transfer status
    transfer.status = 'completed';
    transfer.completedAt = new Date().toISOString();
    transfer.updatedAt = new Date().toISOString();

    // Save
    saveTransfersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('transfer:completed', { transfer });
    }

    return {
      success: true,
      transfer,
      error: null
    };

  } catch (err) {
    console.error('completeTransfer error:', err);
    return {
      success: false,
      transfer: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Cancel a pending transfer
 * @param {string} id - Transfer ID
 * @param {string} reason - Cancellation reason
 * @returns {object} { success: boolean, transfer: object|null, error: string|null }
 */
function cancelTransfer(id, reason = '') {
  try {
    const transfers = getTransfersArray();
    const index = transfers.findIndex(t => t.id === id);

    if (index === -1) {
      return {
        success: false,
        transfer: null,
        error: 'Transfer not found'
      };
    }

    const transfer = transfers[index];

    // Only cancel pending transfers
    if (transfer.status !== 'pending') {
      return {
        success: false,
        transfer: null,
        error: `Cannot cancel ${transfer.status} transfer`
      };
    }

    // Update transfer status
    transfer.status = 'cancelled';
    transfer.cancelledAt = new Date().toISOString();
    transfer.updatedAt = new Date().toISOString();
    if (reason) {
      transfer.notes = (transfer.notes ? transfer.notes + '\n' : '') + `Cancelled: ${reason}`;
    }

    // Save
    saveTransfersToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('transfer:cancelled', { transfer });
    }

    return {
      success: true,
      transfer,
      error: null
    };

  } catch (err) {
    console.error('cancelTransfer error:', err);
    return {
      success: false,
      transfer: null,
      error: err.message || 'Unknown error'
    };
  }
}

// ============ Stock Adjustment ============

/**
 * Adjust stock at both locations for a transfer
 * @param {object} transfer - Transfer object
 * @returns {object} { success: boolean, error: string|null }
 */
function adjustStockForTransfer(transfer) {
  try {
    if (!window.data) {
      return { success: false, error: 'Products not loaded' };
    }

    const product = window.data.find(p => p.id === transfer.productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // Initialize stockByLocation if not exists
    if (!product.stockByLocation) {
      product.stockByLocation = {};
    }

    // Initialize source location stock if not exists
    if (!product.stockByLocation[transfer.fromLocationId]) {
      product.stockByLocation[transfer.fromLocationId] = { qty: 0, looseUnits: 0 };
    }

    // Initialize destination location stock if not exists
    if (!product.stockByLocation[transfer.toLocationId]) {
      product.stockByLocation[transfer.toLocationId] = { qty: 0, looseUnits: 0 };
    }

    // Deduct from source location
    const fromStock = product.stockByLocation[transfer.fromLocationId];
    fromStock.qty -= transfer.quantity;
    fromStock.looseUnits -= transfer.looseUnits;

    // Normalize if loose units go negative
    if (fromStock.looseUnits < 0) {
      const unitsPerPackage = product.unitsPerPackage || 1;
      const casesToBorrow = Math.ceil(Math.abs(fromStock.looseUnits) / unitsPerPackage);
      fromStock.qty -= casesToBorrow;
      fromStock.looseUnits += casesToBorrow * unitsPerPackage;
    }

    // Add to destination location
    const toStock = product.stockByLocation[transfer.toLocationId];
    toStock.qty += transfer.quantity;
    toStock.looseUnits += transfer.looseUnits;

    // Normalize destination stock
    if (product.unitsPerPackage && toStock.looseUnits >= product.unitsPerPackage) {
      const fullCases = Math.floor(toStock.looseUnits / product.unitsPerPackage);
      toStock.qty += fullCases;
      toStock.looseUnits = toStock.looseUnits % product.unitsPerPackage;
    }

    // Update total product stock (sum all locations)
    updateProductTotalStock(product);

    // Save products
    if (window.Products && typeof window.Products.saveProductsToStorage === 'function') {
      window.Products.saveProductsToStorage();
    } else if (typeof saveProducts === 'function') {
      saveProducts(window.data);
    }

    return { success: true, error: null };

  } catch (err) {
    console.error('adjustStockForTransfer error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Update product total stock from all locations
 * @param {object} product - Product to update
 */
function updateProductTotalStock(product) {
  if (!product.stockByLocation) {
    return;
  }

  let totalQty = 0;
  let totalLooseUnits = 0;

  Object.values(product.stockByLocation).forEach(stock => {
    totalQty += stock.qty || 0;
    totalLooseUnits += stock.looseUnits || 0;
  });

  // Normalize total loose units
  if (product.unitsPerPackage && totalLooseUnits >= product.unitsPerPackage) {
    const fullCases = Math.floor(totalLooseUnits / product.unitsPerPackage);
    totalQty += fullCases;
    totalLooseUnits = totalLooseUnits % product.unitsPerPackage;
  }

  product.qty = totalQty;
  product.looseUnits = totalLooseUnits;
}

// ============ Query Functions ============

/**
 * Get all transfers
 * @param {string} status - Filter by status (optional)
 * @returns {Array} Array of transfers
 */
function getAllTransfers(status = null) {
  const transfers = getTransfersArray();

  if (status) {
    return transfers.filter(t => t.status === status);
  }

  return [...transfers];
}

/**
 * Get transfer by ID
 * @param {string} id - Transfer ID
 * @returns {object|null} Transfer or null
 */
function getTransferById(id) {
  const transfers = getTransfersArray();
  return transfers.find(t => t.id === id) || null;
}

/**
 * Get transfers for a product
 * @param {string} productId - Product ID
 * @param {string} status - Filter by status (optional)
 * @returns {Array} Array of transfers
 */
function getTransfersByProduct(productId, status = null) {
  const transfers = getTransfersArray();

  let filtered = transfers.filter(t => t.productId === productId);

  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  return filtered;
}

/**
 * Get transfers for a location (source or destination)
 * @param {string} locationId - Location ID
 * @param {string} status - Filter by status (optional)
 * @returns {Array} Array of transfers
 */
function getTransfersByLocation(locationId, status = null) {
  const transfers = getTransfersArray();

  let filtered = transfers.filter(t =>
    t.fromLocationId === locationId || t.toLocationId === locationId
  );

  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  return filtered;
}

/**
 * Get pending transfers
 * @returns {Array} Array of pending transfers
 */
function getPendingTransfers() {
  return getAllTransfers('pending');
}

/**
 * Get transfer history for a product
 * @param {string} productId - Product ID
 * @returns {Array} Array of completed transfers, sorted by date (newest first)
 */
function getTransferHistory(productId) {
  const transfers = getTransfersByProduct(productId, 'completed');
  return transfers.sort((a, b) =>
    new Date(b.completedAt) - new Date(a.completedAt)
  );
}

// ============ Helper Functions ============

/**
 * Get available stock at a specific location
 * @param {string} productId - Product ID
 * @param {string} locationId - Location ID
 * @returns {object} { qty: number, looseUnits: number }
 */
function getAvailableStockAtLocation(productId, locationId) {
  if (!window.data) {
    return { qty: 0, looseUnits: 0 };
  }

  const product = window.data.find(p => p.id === productId);
  if (!product || !product.stockByLocation) {
    return { qty: 0, looseUnits: 0 };
  }

  const stock = product.stockByLocation[locationId];
  if (!stock) {
    return { qty: 0, looseUnits: 0 };
  }

  return {
    qty: stock.qty || 0,
    looseUnits: stock.looseUnits || 0
  };
}

/**
 * Get transfer statistics
 * @returns {object} Transfer statistics
 */
function getTransferStats() {
  const transfers = getTransfersArray();

  return {
    total: transfers.length,
    pending: transfers.filter(t => t.status === 'pending').length,
    completed: transfers.filter(t => t.status === 'completed').length,
    cancelled: transfers.filter(t => t.status === 'cancelled').length
  };
}

// ============ Storage Integration ============

/**
 * Save transfers to localStorage
 */
function saveTransfersToStorage() {
  if (typeof window.Storage !== 'undefined' && typeof window.Storage.saveTransfers === 'function') {
    window.Storage.saveTransfers(window.transfers);
  } else if (typeof saveTransfers === 'function') {
    saveTransfers(window.transfers);
  } else {
    console.warn('Storage.saveTransfers not available');
  }
}

/**
 * Load transfers from localStorage
 * @returns {Array} Transfers array
 */
function loadTransfersFromStorage() {
  let transfers = [];

  if (typeof window.Storage !== 'undefined' && typeof window.Storage.loadTransfers === 'function') {
    transfers = window.Storage.loadTransfers();
  } else if (typeof loadTransfers === 'function') {
    transfers = loadTransfers();
  }

  window.transfers = transfers;
  return window.transfers;
}

// ============ Exports ============

if (typeof window !== 'undefined') {
  window.Transfers = {
    // Factory
    createTransfer,

    // Validation
    validateTransfer,
    validateTransferBusinessRules,

    // CRUD
    createTransferCRUD,
    updateTransferCRUD,
    deleteTransferCRUD,

    // Workflow
    completeTransfer,
    cancelTransfer,

    // Stock adjustment
    adjustStockForTransfer,
    updateProductTotalStock,

    // Query
    getAllTransfers,
    getTransferById,
    getTransfersByProduct,
    getTransfersByLocation,
    getPendingTransfers,
    getTransferHistory,

    // Helpers
    getAvailableStockAtLocation,
    getTransferStats,

    // Storage
    saveTransfersToStorage,
    loadTransfersFromStorage
  };
}
