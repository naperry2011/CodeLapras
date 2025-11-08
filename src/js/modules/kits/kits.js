/* ============================================
   KITS MODEL
   CodeLapras - Product Kits/Bundles Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create a new kit
 * @param {object} data - Kit data
 * @returns {object} Kit object
 */
function createKit(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'kit-' + Date.now()),
    name: data.name || '',
    sku: data.sku || '',
    components: data.components || [],
    photo: data.photo || '',
    cost: typeof data.cost === 'number' ? data.cost : 0,
    price: typeof data.price === 'number' ? data.price : 0,
    notes: data.notes || '',
    createdAt: data.createdAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Create a kit component
 * @param {object} data - Component data
 * @returns {object} Component object
 */
function createKitComponent(data = {}) {
  return {
    productId: data.productId || data.id || '',
    sku: data.sku || '',
    qty: typeof data.qty === 'number' ? data.qty : 1
  };
}

// ============ Validation ============

/**
 * Validate kit
 * @param {object} kit - Kit to validate
 * @param {Array} products - Products array to validate components
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateKit(kit, products = []) {
  const errors = [];

  if (!kit) {
    errors.push('Kit object is required');
    return { isValid: false, errors };
  }

  // Name is required
  if (!kit.name || kit.name.trim() === '') {
    errors.push('Kit name is required');
  }

  // Components validation
  if (!Array.isArray(kit.components)) {
    errors.push('Kit components must be an array');
  } else if (kit.components.length === 0) {
    errors.push('Kit must have at least one component');
  } else {
    // Validate each component
    kit.components.forEach((comp, index) => {
      if (!comp.productId && !comp.id) {
        errors.push(`Component ${index + 1}: Product ID is required`);
      }

      if (typeof comp.qty !== 'number' || comp.qty <= 0) {
        errors.push(`Component ${index + 1}: Quantity must be greater than 0`);
      }

      // Check if product exists
      if (products.length > 0) {
        const product = products.find(p => p.id === (comp.productId || comp.id));
        if (!product) {
          errors.push(`Component ${index + 1}: Product not found`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============ Calculation Helpers ============

/**
 * Calculate kit cost from components
 * @param {object} kit - Kit object
 * @param {Array} products - Products array
 * @returns {number} Total cost
 */
function calculateKitCost(kit, products) {
  if (!kit || !Array.isArray(kit.components) || !Array.isArray(products)) {
    return 0;
  }

  return kit.components.reduce((total, comp) => {
    const product = products.find(p => p.id === (comp.productId || comp.id));
    if (!product) return total;

    const componentCost = (product.cost || 0) * (comp.qty || 0);
    return total + componentCost;
  }, 0);
}

/**
 * Suggest kit price based on cost and markup
 * @param {object} kit - Kit object
 * @param {Array} products - Products array
 * @param {number} markup - Markup percentage (default 50%)
 * @returns {number} Suggested price
 */
function suggestKitPrice(kit, products, markup = 50) {
  const cost = calculateKitCost(kit, products);
  return cost * (1 + (markup / 100));
}

// ============ Stock Availability ============

/**
 * Check if kit can be assembled (all components in stock)
 * @param {object} kit - Kit object
 * @param {Array} products - Products array
 * @returns {object} { available: boolean, issues: Array }
 */
function checkKitAvailability(kit, products) {
  if (!kit || !Array.isArray(kit.components) || !Array.isArray(products)) {
    return { available: false, issues: ['Invalid kit or products'] };
  }

  const issues = [];

  kit.components.forEach((comp, index) => {
    const product = products.find(p => p.id === (comp.productId || comp.id));

    if (!product) {
      issues.push(`Component ${index + 1}: Product not found`);
      return;
    }

    const totalUnits = typeof calculateTotalUnits === 'function'
      ? calculateTotalUnits(product)
      : product.qty || 0;

    if (totalUnits < comp.qty) {
      issues.push(`Component ${index + 1} (${product.name}): Insufficient stock. Available: ${totalUnits}, Needed: ${comp.qty}`);
    }
  });

  return {
    available: issues.length === 0,
    issues
  };
}

/**
 * Expand kit to line items for orders
 * @param {object} kit - Kit object
 * @param {Array} products - Products array
 * @param {number} kitQty - Number of kits (default 1)
 * @returns {Array} Array of line items
 */
function expandKitToItems(kit, products, kitQty = 1) {
  if (!kit || !Array.isArray(kit.components) || !Array.isArray(products)) {
    return [];
  }

  const items = [];

  kit.components.forEach(comp => {
    const product = products.find(p => p.id === (comp.productId || comp.id));
    if (!product) return;

    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: comp.qty * kitQty,
      price: product.price || 0,
      total: (comp.qty * kitQty) * (product.price || 0)
    });
  });

  return items;
}

// ============ Component Management ============

/**
 * Add component to kit
 * @param {object} kit - Kit object
 * @param {object} component - Component to add
 * @returns {object} Updated kit
 */
function addKitComponent(kit, component) {
  if (!kit || !component) return kit;

  const comp = createKitComponent(component);
  const updatedKit = { ...kit };
  updatedKit.components = [...(updatedKit.components || []), comp];
  updatedKit.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return updatedKit;
}

/**
 * Remove component from kit
 * @param {object} kit - Kit object
 * @param {number} index - Component index
 * @returns {object} Updated kit
 */
function removeKitComponent(kit, index) {
  if (!kit || !Array.isArray(kit.components)) return kit;
  if (index < 0 || index >= kit.components.length) return kit;

  const updatedKit = { ...kit };
  updatedKit.components = kit.components.filter((_, i) => i !== index);
  updatedKit.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return updatedKit;
}

/**
 * Update component quantity
 * @param {object} kit - Kit object
 * @param {number} index - Component index
 * @param {number} qty - New quantity
 * @returns {object} Updated kit
 */
function updateKitComponentQty(kit, index, qty) {
  if (!kit || !Array.isArray(kit.components)) return kit;
  if (index < 0 || index >= kit.components.length) return kit;

  const updatedKit = { ...kit };
  updatedKit.components = kit.components.map((comp, i) => {
    if (i === index) {
      return { ...comp, qty };
    }
    return comp;
  });
  updatedKit.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return updatedKit;
}

// ============ Query Helpers ============

/**
 * Filter kits by criteria
 * @param {Array} kits - Kits array
 * @param {object} criteria - Filter criteria
 * @returns {Array} Filtered kits
 */
function filterKits(kits, criteria = {}) {
  if (!Array.isArray(kits)) return [];

  return kits.filter(kit => {
    // Search by name or SKU
    if (criteria.search) {
      const searchLower = criteria.search.toLowerCase();
      const nameMatch = kit.name && kit.name.toLowerCase().includes(searchLower);
      const skuMatch = kit.sku && kit.sku.toLowerCase().includes(searchLower);
      if (!nameMatch && !skuMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort kits
 * @param {Array} kits - Kits array
 * @param {string} sortBy - Sort field
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted kits
 */
function sortKits(kits, sortBy = 'name', ascending = true) {
  if (!Array.isArray(kits)) return [];

  const sorted = [...kits].sort((a, b) => {
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
      case 'price':
        aVal = a.price || 0;
        bVal = b.price || 0;
        break;
      case 'cost':
        aVal = a.cost || 0;
        bVal = b.cost || 0;
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

function getAllKits() {
  return window.kits || [];
}

function getKit(id) {
  if (!window.kits) return null;
  return window.kits.find(k => k.id === id) || null;
}

function createKitCRUD(kitData) {
  try {
    const kit = createKit(kitData);
    const validation = validateKit(kit, window.data || []);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    if (!window.kits) window.kits = [];
    window.kits.push(kit);
    saveKitsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('kit:created', { id: kit.id, kit });
    }
    return { success: true, kit };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function updateKitCRUD(id, updates) {
  try {
    const kit = getKit(id);
    if (!kit) return { success: false, errors: ['Kit not found'] };
    const updated = { ...kit, ...updates, updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString() };
    const validation = validateKit(updated, window.data || []);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    Object.assign(kit, updated);
    saveKitsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('kit:updated', { id, updates, kit: updated });
    }
    return { success: true, kit: updated };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function deleteKitCRUD(id) {
  try {
    const index = window.kits.findIndex(k => k.id === id);
    if (index === -1) return { success: false, errors: ['Kit not found'] };
    const deleted = window.kits.splice(index, 1)[0];
    saveKitsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('kit:deleted', { id, kit: deleted });
    }
    return { success: true, kit: deleted };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function saveKitsToStorage() {
  if (typeof saveKits === 'function') {
    saveKits(window.kits || []);
  }
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  window.createKit = createKit;
  window.createKitComponent = createKitComponent;
  window.validateKit = validateKit;
  window.calculateKitCost = calculateKitCost;
  window.suggestKitPrice = suggestKitPrice;
  window.checkKitAvailability = checkKitAvailability;
  window.expandKitToItems = expandKitToItems;
  window.addKitComponent = addKitComponent;
  window.removeKitComponent = removeKitComponent;
  window.updateKitComponentQty = updateKitComponentQty;
  window.filterKits = filterKits;
  window.sortKits = sortKits;
  window.getAllKits = getAllKits;
  window.getKit = getKit;
  window.createKitCRUD = createKitCRUD;
  window.updateKitCRUD = updateKitCRUD;
  window.deleteKitCRUD = deleteKitCRUD;
  window.saveKitsToStorage = saveKitsToStorage;
}
