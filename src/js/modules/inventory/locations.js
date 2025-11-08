/* ============================================
   LOCATIONS MODULE
   CodeLapras - Inventory Location Management
   ============================================ */

/**
 * Get reference to global locations array
 * @returns {Array} Locations array
 */
function getLocationsArray() {
  if (!window.locations) {
    window.locations = [];
  }
  return window.locations;
}

// ============ Default Locations Factory ============

/**
 * Create default starter locations for new installations
 * @returns {Array} Array of default locations
 */
function createDefaultLocations() {
  const now = new Date().toISOString();

  return [
    {
      id: `loc-${Date.now()}-1`,
      name: 'Main Warehouse',
      address: '',
      type: 'warehouse',
      isActive: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: `loc-${Date.now()}-2`,
      name: 'Retail Store',
      address: '',
      type: 'store',
      isActive: true,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: `loc-${Date.now()}-3`,
      name: 'Delivery Vehicle',
      address: '',
      type: 'vehicle',
      isActive: true,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    }
  ];
}

/**
 * Initialize locations on first run
 * @returns {boolean} True if initialized
 */
function initializeLocations() {
  const locations = getLocationsArray();

  if (locations.length === 0) {
    const defaults = createDefaultLocations();
    window.locations = defaults;
    saveLocationsToStorage();

    if (window.EventBus) {
      window.EventBus.emit('locations:initialized', { count: defaults.length });
    }

    return true;
  }

  return false;
}

// ============ Location Factory ============

/**
 * Create a new location object with default values
 * @param {object} data - Initial location data
 * @returns {object} Location object
 */
function createLocation(data = {}) {
  const now = new Date().toISOString();

  return {
    id: data.id || `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: data.name || '',
    address: data.address || '',
    type: data.type || 'warehouse', // warehouse, store, vehicle, other
    isActive: data.isActive !== undefined ? data.isActive : true,
    isDefault: data.isDefault !== undefined ? data.isDefault : false,
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

// ============ Validation ============

/**
 * Validate location object
 * @param {object} location - Location to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateLocation(location) {
  const errors = [];

  if (!location || typeof location !== 'object') {
    errors.push('Location must be an object');
    return { valid: false, errors };
  }

  if (!location.id || typeof location.id !== 'string') {
    errors.push('Location ID is required');
  }

  if (!location.name || typeof location.name !== 'string' || location.name.trim() === '') {
    errors.push('Location name is required');
  }

  const validTypes = ['warehouse', 'store', 'vehicle', 'other'];
  if (!validTypes.includes(location.type)) {
    errors.push('Invalid location type');
  }

  if (typeof location.isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  if (typeof location.isDefault !== 'boolean') {
    errors.push('isDefault must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check for duplicate location names
 * @param {string} name - Location name to check
 * @param {string} excludeId - ID to exclude from check (for updates)
 * @returns {boolean} True if duplicate exists
 */
function isDuplicateLocationName(name, excludeId = null) {
  const locations = getLocationsArray();
  const trimmedName = name.trim().toLowerCase();

  return locations.some(loc =>
    loc.id !== excludeId &&
    loc.name.trim().toLowerCase() === trimmedName
  );
}

// ============ CRUD Operations ============

/**
 * Create a new location
 * @param {object} data - Location data
 * @returns {object} { success: boolean, location: object|null, error: string|null }
 */
function createLocationCRUD(data) {
  try {
    // Create location object
    const location = createLocation(data);

    // Validate
    const validation = validateLocation(location);
    if (!validation.valid) {
      return {
        success: false,
        location: null,
        error: validation.errors.join(', ')
      };
    }

    // Check for duplicates
    if (isDuplicateLocationName(location.name)) {
      return {
        success: false,
        location: null,
        error: `A location named "${location.name}" already exists`
      };
    }

    // If this is set as default, unset other defaults
    if (location.isDefault) {
      unsetAllDefaultLocations();
    }

    // Add to array
    const locations = getLocationsArray();
    locations.push(location);

    // Save
    saveLocationsToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('location:created', { location });
    }

    return {
      success: true,
      location,
      error: null
    };

  } catch (err) {
    console.error('createLocationCRUD error:', err);
    return {
      success: false,
      location: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Update an existing location
 * @param {string} id - Location ID
 * @param {object} updates - Fields to update
 * @returns {object} { success: boolean, location: object|null, error: string|null }
 */
function updateLocationCRUD(id, updates) {
  try {
    const locations = getLocationsArray();
    const index = locations.findIndex(loc => loc.id === id);

    if (index === -1) {
      return {
        success: false,
        location: null,
        error: 'Location not found'
      };
    }

    const location = locations[index];

    // Apply updates
    const updated = {
      ...location,
      ...updates,
      id: location.id, // Prevent ID changes
      updatedAt: new Date().toISOString()
    };

    // Validate
    const validation = validateLocation(updated);
    if (!validation.valid) {
      return {
        success: false,
        location: null,
        error: validation.errors.join(', ')
      };
    }

    // Check for duplicate name
    if (updates.name && isDuplicateLocationName(updates.name, id)) {
      return {
        success: false,
        location: null,
        error: `A location named "${updates.name}" already exists`
      };
    }

    // If setting as default, unset others
    if (updates.isDefault === true) {
      unsetAllDefaultLocations();
    }

    // Update in array
    locations[index] = updated;

    // Save
    saveLocationsToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('location:updated', { location: updated });
    }

    return {
      success: true,
      location: updated,
      error: null
    };

  } catch (err) {
    console.error('updateLocationCRUD error:', err);
    return {
      success: false,
      location: null,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Delete a location
 * @param {string} id - Location ID
 * @returns {object} { success: boolean, error: string|null }
 */
function deleteLocationCRUD(id) {
  try {
    const locations = getLocationsArray();
    const index = locations.findIndex(loc => loc.id === id);

    if (index === -1) {
      return {
        success: false,
        error: 'Location not found'
      };
    }

    const location = locations[index];

    // Check if location has stock
    if (hasStockInLocation(id)) {
      return {
        success: false,
        error: 'Cannot delete location with existing stock. Transfer stock first.'
      };
    }

    // Check if location has pending transfers
    if (hasPendingTransfers(id)) {
      return {
        success: false,
        error: 'Cannot delete location with pending transfers. Complete or cancel transfers first.'
      };
    }

    // Remove from array
    locations.splice(index, 1);

    // If this was the default, set a new default if locations remain
    if (location.isDefault && locations.length > 0) {
      locations[0].isDefault = true;
    }

    // Save
    saveLocationsToStorage();

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('location:deleted', { locationId: id });
    }

    return {
      success: true,
      error: null
    };

  } catch (err) {
    console.error('deleteLocationCRUD error:', err);
    return {
      success: false,
      error: err.message || 'Unknown error'
    };
  }
}

// ============ Query Functions ============

/**
 * Get all locations
 * @param {boolean} activeOnly - Return only active locations
 * @returns {Array} Array of locations
 */
function getAllLocations(activeOnly = false) {
  const locations = getLocationsArray();

  if (activeOnly) {
    return locations.filter(loc => loc.isActive);
  }

  return [...locations];
}

/**
 * Get location by ID
 * @param {string} id - Location ID
 * @returns {object|null} Location or null
 */
function getLocationById(id) {
  const locations = getLocationsArray();
  return locations.find(loc => loc.id === id) || null;
}

/**
 * Get default location
 * @returns {object|null} Default location or null
 */
function getDefaultLocation() {
  const locations = getLocationsArray();
  return locations.find(loc => loc.isDefault) || locations[0] || null;
}

/**
 * Get locations by type
 * @param {string} type - Location type
 * @returns {Array} Array of locations
 */
function getLocationsByType(type) {
  const locations = getLocationsArray();
  return locations.filter(loc => loc.type === type);
}

/**
 * Search locations by name
 * @param {string} query - Search query
 * @returns {Array} Array of matching locations
 */
function searchLocations(query) {
  const locations = getLocationsArray();
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return locations;
  }

  return locations.filter(loc =>
    loc.name.toLowerCase().includes(lowerQuery) ||
    loc.address.toLowerCase().includes(lowerQuery)
  );
}

// ============ Helper Functions ============

/**
 * Unset default flag from all locations
 */
function unsetAllDefaultLocations() {
  const locations = getLocationsArray();
  locations.forEach(loc => {
    loc.isDefault = false;
  });
}

/**
 * Set a location as the default
 * @param {string} id - Location ID
 * @returns {boolean} Success
 */
function setDefaultLocation(id) {
  const location = getLocationById(id);
  if (!location) return false;

  unsetAllDefaultLocations();
  const result = updateLocationCRUD(id, { isDefault: true });
  return result.success;
}

/**
 * Check if a location has stock
 * @param {string} locationId - Location ID
 * @returns {boolean} True if location has stock
 */
function hasStockInLocation(locationId) {
  if (!window.data) return false;

  return window.data.some(product => {
    if (!product.stockByLocation) return false;
    const stock = product.stockByLocation[locationId];
    return stock && (stock.qty > 0 || stock.looseUnits > 0);
  });
}

/**
 * Check if a location has pending transfers
 * @param {string} locationId - Location ID
 * @returns {boolean} True if location has pending transfers
 */
function hasPendingTransfers(locationId) {
  if (!window.transfers) return false;

  return window.transfers.some(transfer =>
    transfer.status === 'pending' &&
    (transfer.fromLocationId === locationId || transfer.toLocationId === locationId)
  );
}

/**
 * Get stock summary for a location
 * @param {string} locationId - Location ID
 * @returns {object} Stock summary
 */
function getLocationStockSummary(locationId) {
  if (!window.data) {
    return {
      totalProducts: 0,
      totalValue: 0,
      totalUnits: 0
    };
  }

  let totalProducts = 0;
  let totalValue = 0;
  let totalUnits = 0;

  window.data.forEach(product => {
    if (!product.stockByLocation) return;

    const stock = product.stockByLocation[locationId];
    if (!stock) return;

    const qty = stock.qty || 0;
    const loose = stock.looseUnits || 0;

    if (qty > 0 || loose > 0) {
      totalProducts++;

      // Calculate total units
      const unitsPerCase = product.unitsPerCase || 1;
      const units = (qty * unitsPerCase) + loose;
      totalUnits += units;

      // Calculate value
      const unitPrice = product.pricePerUnit || 0;
      totalValue += units * unitPrice;
    }
  });

  return {
    totalProducts,
    totalValue,
    totalUnits
  };
}

// ============ Storage Integration ============

/**
 * Save locations to localStorage
 */
function saveLocationsToStorage() {
  if (typeof window.Storage !== 'undefined' && typeof window.Storage.saveLocations === 'function') {
    window.Storage.saveLocations(window.locations);
  } else if (typeof saveLocations === 'function') {
    saveLocations(window.locations);
  } else {
    console.warn('Storage.saveLocations not available');
  }
}

/**
 * Load locations from localStorage
 * @returns {Array} Locations array
 */
function loadLocationsFromStorage() {
  let locations = [];

  if (typeof window.Storage !== 'undefined' && typeof window.Storage.loadLocations === 'function') {
    locations = window.Storage.loadLocations();
  } else if (typeof loadLocations === 'function') {
    locations = loadLocations();
  }

  window.locations = locations;

  // Initialize default locations if empty
  if (locations.length === 0) {
    initializeLocations();
  }

  return window.locations;
}

// ============ Exports ============

if (typeof window !== 'undefined') {
  window.Locations = {
    // Factory
    createLocation,
    createDefaultLocations,
    initializeLocations,

    // Validation
    validateLocation,
    isDuplicateLocationName,

    // CRUD
    createLocationCRUD,
    updateLocationCRUD,
    deleteLocationCRUD,

    // Query
    getAllLocations,
    getLocationById,
    getDefaultLocation,
    getLocationsByType,
    searchLocations,

    // Helpers
    setDefaultLocation,
    hasStockInLocation,
    hasPendingTransfers,
    getLocationStockSummary,

    // Storage
    saveLocationsToStorage,
    loadLocationsFromStorage
  };
}
