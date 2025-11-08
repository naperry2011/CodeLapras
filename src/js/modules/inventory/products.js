/* ============================================
   PRODUCTS MODEL
   CodeLapras - Product/Inventory Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create a new product with default values
 * @param {object} data - Product data
 * @returns {object} Product object
 */
function createProduct(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'prod-' + Date.now()),
    name: data.name || '',
    sku: data.sku || '',
    category: data.category || '',
    supplier: data.supplier || '',
    qty: typeof data.qty === 'number' ? data.qty : 0,
    looseUnits: typeof data.looseUnits === 'number' ? data.looseUnits : 0,
    unitsPerPackage: typeof data.unitsPerPackage === 'number' ? data.unitsPerPackage : 1,
    cost: typeof data.cost === 'number' ? data.cost : 0,
    price: typeof data.price === 'number' ? data.price : 0,
    reorderPoint: typeof data.reorderPoint === 'number' ? data.reorderPoint : 0,
    photo: data.photo || '',
    measurable: !!data.measurable,
    singleOnly: !!data.singleOnly,
    forSale: data.forSale !== undefined ? !!data.forSale : true,
    restockOnly: !!data.restockOnly,
    notes: data.notes || '',
    createdAt: data.createdAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString(),
    // Additional fields from original
    unitLabel: data.unitLabel || '',
    packageCost: typeof data.packageCost === 'number' ? data.packageCost : 0,
    packageQty: typeof data.packageQty === 'number' ? data.packageQty : 1,
    components: data.components || '',
    // Multi-location stock support (Day 12)
    stockByLocation: data.stockByLocation || {},
    defaultLocationId: data.defaultLocationId || null
  };
}

// ============ Validation ============

/**
 * Validate product object
 * @param {object} product - Product to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateProduct(product) {
  const errors = [];

  if (!product) {
    errors.push('Product object is required');
    return { isValid: false, errors };
  }

  // Required fields
  if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
    errors.push('Product name is required');
  }

  // Numeric validations
  if (typeof product.qty !== 'number' || product.qty < 0) {
    errors.push('Quantity must be a non-negative number');
  }

  if (typeof product.cost !== 'number' || product.cost < 0) {
    errors.push('Cost must be a non-negative number');
  }

  if (typeof product.price !== 'number' || product.price < 0) {
    errors.push('Price must be a non-negative number');
  }

  if (typeof product.unitsPerPackage !== 'number' || product.unitsPerPackage < 1) {
    errors.push('Units per package must be at least 1');
  }

  // Business rule validations
  if (product.name && product.name.length > 200) {
    errors.push('Product name must be 200 characters or less');
  }

  if (product.sku && product.sku.length > 50) {
    errors.push('SKU must be 50 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Apply business rules to product
 * @param {object} product - Product to apply rules to
 * @returns {object} Product with rules applied
 */
function applyBusinessRules(product) {
  const result = { ...product };

  // If singleOnly is true, force unitsPerPackage to 1
  if (result.singleOnly) {
    result.unitsPerPackage = 1;
    result.packageQty = 1;
  }

  // If restockOnly is true, cannot be for sale
  if (result.restockOnly) {
    result.forSale = false;
  }

  return result;
}

// ============ Calculation Helpers ============

/**
 * Calculate total units available (packages * unitsPerPackage + loose units)
 * @param {object} product - Product object
 * @returns {number} Total units
 */
function calculateTotalUnits(product) {
  if (!product) return 0;
  const packages = typeof product.qty === 'number' ? product.qty : 0;
  const unitsPerPkg = typeof product.unitsPerPackage === 'number' ? product.unitsPerPackage : 1;
  const loose = typeof product.looseUnits === 'number' ? product.looseUnits : 0;
  return (packages * unitsPerPkg) + loose;
}

/**
 * Calculate total stock value (qty * cost)
 * @param {object} product - Product object
 * @returns {number} Stock value
 */
function calculateStockValue(product) {
  if (!product) return 0;
  const qty = typeof product.qty === 'number' ? product.qty : 0;
  const cost = typeof product.cost === 'number' ? product.cost : 0;
  return qty * cost;
}

/**
 * Check if product needs reorder
 * @param {object} product - Product object
 * @returns {boolean} True if qty <= reorderPoint
 */
function needsReorder(product) {
  if (!product) return false;
  const qty = typeof product.qty === 'number' ? product.qty : 0;
  const reorderPoint = typeof product.reorderPoint === 'number' ? product.reorderPoint : 0;
  return qty <= reorderPoint && reorderPoint > 0;
}

/**
 * Normalize loose units into packages
 * @param {object} product - Product object
 * @returns {object} Normalized product
 */
function normalizeUnits(product) {
  if (!product) return product;

  const result = { ...product };
  const unitsPerPkg = result.unitsPerPackage || 1;
  const loose = result.looseUnits || 0;

  if (loose >= unitsPerPkg) {
    const additionalPackages = Math.floor(loose / unitsPerPkg);
    result.qty = (result.qty || 0) + additionalPackages;
    result.looseUnits = loose % unitsPerPkg;
  }

  return result;
}

// ============ Stock Management ============

/**
 * Adjust product quantity
 * @param {object} product - Product object
 * @param {number} delta - Amount to adjust (positive or negative)
 * @returns {object} Updated product
 */
function adjustQuantity(product, delta) {
  if (!product || typeof delta !== 'number') return product;

  const result = { ...product };
  result.qty = Math.max(0, (result.qty || 0) + delta);
  result.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return result;
}

/**
 * Consume units from product (for measurable items)
 * @param {object} product - Product object
 * @param {number} unitsToConsume - Units to consume
 * @returns {object} { success: boolean, product: object, message: string }
 */
function consumeUnits(product, unitsToConsume) {
  if (!product) {
    return { success: false, product: null, message: 'Product is required' };
  }

  if (typeof unitsToConsume !== 'number' || unitsToConsume <= 0) {
    return { success: false, product, message: 'Units to consume must be positive' };
  }

  const totalAvailable = calculateTotalUnits(product);

  if (unitsToConsume > totalAvailable) {
    return {
      success: false,
      product,
      message: `Insufficient stock. Available: ${totalAvailable}, Requested: ${unitsToConsume}`
    };
  }

  const result = { ...product };
  let remaining = unitsToConsume;

  // First consume loose units
  if (result.looseUnits > 0) {
    const consumeFromLoose = Math.min(result.looseUnits, remaining);
    result.looseUnits -= consumeFromLoose;
    remaining -= consumeFromLoose;
  }

  // Then consume from packages
  if (remaining > 0) {
    const unitsPerPkg = result.unitsPerPackage || 1;
    const packagesToConsume = Math.ceil(remaining / unitsPerPkg);
    result.qty = Math.max(0, result.qty - packagesToConsume);

    // If we consumed more units than needed, add back to loose
    const overConsumed = (packagesToConsume * unitsPerPkg) - remaining;
    if (overConsumed > 0) {
      result.looseUnits = overConsumed;
    }
  }

  result.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return { success: true, product: result, message: 'Units consumed successfully' };
}

// ============ Duplication ============

/**
 * Create a copy of a product with unique name and SKU
 * @param {object} product - Product to duplicate
 * @param {Array} existingProducts - Array of existing products to check for uniqueness
 * @returns {object} Duplicated product
 */
function duplicateProduct(product, existingProducts = []) {
  if (!product) return null;

  const duplicate = createProduct({
    ...product,
    id: typeof uid === 'function' ? uid() : 'prod-' + Date.now(),
    name: generateUniqueName(product.name, existingProducts),
    sku: generateUniqueSku(product.sku, existingProducts),
    qty: 0,
    looseUnits: 0,
    createdAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString(),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  });

  return duplicate;
}

/**
 * Generate unique product name
 * @param {string} baseName - Base name
 * @param {Array} existingProducts - Existing products
 * @returns {string} Unique name
 */
function generateUniqueName(baseName, existingProducts) {
  if (!baseName) return 'Copy';

  let name = baseName + ' (Copy)';
  let counter = 1;

  while (existingProducts.some(p => p.name === name)) {
    counter++;
    name = `${baseName} (Copy ${counter})`;
  }

  return name;
}

/**
 * Generate unique SKU
 * @param {string} baseSku - Base SKU
 * @param {Array} existingProducts - Existing products
 * @returns {string} Unique SKU
 */
function generateUniqueSku(baseSku, existingProducts) {
  if (!baseSku) return '';

  let sku = baseSku + '-COPY';
  let counter = 1;

  while (existingProducts.some(p => p.sku === sku)) {
    counter++;
    sku = `${baseSku}-COPY${counter}`;
  }

  return sku;
}

// ============ Query Helpers ============

/**
 * Filter products by criteria
 * @param {Array} products - Products array
 * @param {object} criteria - Filter criteria
 * @returns {Array} Filtered products
 */
function filterProducts(products, criteria = {}) {
  if (!Array.isArray(products)) return [];

  return products.filter(product => {
    // Category filter
    if (criteria.category && product.category !== criteria.category) {
      return false;
    }

    // Supplier filter
    if (criteria.supplier && product.supplier !== criteria.supplier) {
      return false;
    }

    // Low stock filter
    if (criteria.lowStock && !needsReorder(product)) {
      return false;
    }

    // For sale filter
    if (criteria.forSale !== undefined && product.forSale !== criteria.forSale) {
      return false;
    }

    // Search by name or SKU
    if (criteria.search) {
      const searchLower = criteria.search.toLowerCase();
      const nameMatch = product.name && product.name.toLowerCase().includes(searchLower);
      const skuMatch = product.sku && product.sku.toLowerCase().includes(searchLower);
      if (!nameMatch && !skuMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort products
 * @param {Array} products - Products array
 * @param {string} sortBy - Sort field
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted products
 */
function sortProducts(products, sortBy = 'name', ascending = true) {
  if (!Array.isArray(products)) return [];

  const sorted = [...products].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'sku':
        aVal = (a.sku || '').toLowerCase();
        bVal = (b.sku || '').toLowerCase();
        break;
      case 'qty':
        aVal = a.qty || 0;
        bVal = b.qty || 0;
        break;
      case 'price':
        aVal = a.price || 0;
        bVal = b.price || 0;
        break;
      case 'cost':
        aVal = a.cost || 0;
        bVal = b.cost || 0;
        break;
      case 'category':
        aVal = (a.category || '').toLowerCase();
        bVal = (b.category || '').toLowerCase();
        break;
      case 'updatedAt':
        aVal = new Date(a.updatedAt || 0).getTime();
        bVal = new Date(b.updatedAt || 0).getTime();
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
 * Find product by ID
 * @param {Array} products - Products array
 * @param {string} id - Product ID
 * @returns {object|null} Product or null
 */
function findProductById(products, id) {
  if (!Array.isArray(products) || !id) return null;
  return products.find(p => p.id === id) || null;
}

/**
 * Find product by SKU
 * @param {Array} products - Products array
 * @param {string} sku - Product SKU
 * @returns {object|null} Product or null
 */
function findProductBySku(products, sku) {
  if (!Array.isArray(products) || !sku) return null;
  return products.find(p => p.sku === sku) || null;
}

// ============ CRUD Operations ============

/**
 * Get all products
 * @returns {Array} Products array
 */
function getAllProducts() {
  return window.data || [];
}

/**
 * Get product by ID
 * @param {string} id - Product ID
 * @returns {object|null} Product or null
 */
function getProduct(id) {
  return findProductById(window.data, id);
}

/**
 * Create and save a new product
 * @param {object} productData - Product data
 * @returns {object} { success: boolean, product?: object, errors?: array }
 */
function createProductCRUD(productData) {
  try {
    // 1. Create product with factory
    const product = createProduct(productData);

    // 2. Apply business rules
    const withRules = applyBusinessRules(product);

    // 3. Validate
    const validation = validateProduct(withRules);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // 4. Add to array
    if (!window.data) window.data = [];
    window.data.push(withRules);

    // 5. Save to storage
    saveProductsToStorage();

    // 6. Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('product:created', { id: withRules.id, product: withRules });
    }

    // 7. Return success
    return { success: true, product: withRules };

  } catch (err) {
    console.error('Error creating product:', err);
    return { success: false, errors: [err.message] };
  }
}

/**
 * Update an existing product
 * @param {string} id - Product ID
 * @param {object} updates - Updates to apply
 * @returns {object} { success: boolean, product?: object, errors?: array }
 */
function updateProductCRUD(id, updates) {
  try {
    // 1. Find product
    const product = findProductById(window.data, id);
    if (!product) {
      return { success: false, errors: ['Product not found'] };
    }

    // 2. Apply updates
    const updated = {
      ...product,
      ...updates,
      updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
    };

    // 3. Apply business rules
    const withRules = applyBusinessRules(updated);

    // 4. Validate
    const validation = validateProduct(withRules);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // 5. Update in place
    Object.assign(product, withRules);

    // 6. Save to storage
    saveProductsToStorage();

    // 7. Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('product:updated', { id, updates, product: withRules });
    }

    // 8. Return success
    return { success: true, product: withRules };

  } catch (err) {
    console.error('Error updating product:', err);
    return { success: false, errors: [err.message] };
  }
}

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {object} { success: boolean, product?: object, errors?: array }
 */
function deleteProductCRUD(id) {
  try {
    // 1. Find index
    const index = window.data.findIndex(p => p.id === id);
    if (index === -1) {
      return { success: false, errors: ['Product not found'] };
    }

    // 2. Remove from array
    const deleted = window.data.splice(index, 1)[0];

    // 3. Save to storage
    saveProductsToStorage();

    // 4. Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('product:deleted', { id, product: deleted });
    }

    // 5. Return success
    return { success: true, product: deleted };

  } catch (err) {
    console.error('Error deleting product:', err);
    return { success: false, errors: [err.message] };
  }
}

/**
 * Save products to storage
 */
function saveProductsToStorage() {
  if (typeof saveProducts === 'function') {
    saveProducts(window.data || []);
  }
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  // Factory and validation functions
  window.createProduct = createProduct;
  window.validateProduct = validateProduct;
  window.applyBusinessRules = applyBusinessRules;

  // Calculation helpers
  window.calculateTotalUnits = calculateTotalUnits;
  window.calculateStockValue = calculateStockValue;
  window.needsReorder = needsReorder;
  window.normalizeUnits = normalizeUnits;

  // Stock management
  window.adjustQuantity = adjustQuantity;
  window.consumeUnits = consumeUnits;

  // Duplication
  window.duplicateProduct = duplicateProduct;
  window.generateUniqueName = generateUniqueName;
  window.generateUniqueSku = generateUniqueSku;

  // Query helpers
  window.filterProducts = filterProducts;
  window.sortProducts = sortProducts;
  window.findProductById = findProductById;
  window.findProductBySku = findProductBySku;

  // CRUD operations
  window.getAllProducts = getAllProducts;
  window.getProduct = getProduct;
  window.createProductCRUD = createProductCRUD;
  window.updateProductCRUD = updateProductCRUD;
  window.deleteProductCRUD = deleteProductCRUD;
  window.saveProductsToStorage = saveProductsToStorage;
}
