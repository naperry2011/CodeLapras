/* ============================================
   SHIPMENTS MODEL
   CodeLapras - Shipment Tracking Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create a new shipment
 * @param {object} data - Shipment data
 * @returns {object} Shipment object
 */
function createShipment(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'ship-' + Date.now()),
    orderId: data.orderId || '',
    invoiceId: data.invoiceId || '',
    trackingNumber: data.trackingNumber || '',
    carrier: data.carrier || '',
    status: data.status || 'pending',
    shippedDate: data.shippedDate || null,
    deliveredDate: data.deliveredDate || null,
    estimatedDelivery: data.estimatedDelivery || null,
    recipient: data.recipient || '',
    address: data.address || '',
    notes: data.notes || '',
    createdAt: data.createdAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Validation ============

/**
 * Validate shipment
 * @param {object} shipment - Shipment to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateShipment(shipment) {
  const errors = [];

  if (!shipment) {
    errors.push('Shipment object is required');
    return { isValid: false, errors };
  }

  if (!shipment.trackingNumber || shipment.trackingNumber.trim() === '') {
    errors.push('Tracking number is required');
  }

  if (!shipment.carrier || shipment.carrier.trim() === '') {
    errors.push('Carrier is required');
  }

  const validStatuses = ['pending', 'shipped', 'in_transit', 'delivered', 'exception'];
  if (!validStatuses.includes(shipment.status)) {
    errors.push('Invalid shipment status');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============ Status Management ============

/**
 * Update shipment status
 * @param {object} shipment - Shipment object
 * @param {string} newStatus - New status
 * @returns {object} Updated shipment
 */
function updateShipmentStatus(shipment, newStatus) {
  if (!shipment) return shipment;

  const validStatuses = ['pending', 'shipped', 'in_transit', 'delivered', 'exception'];
  if (!validStatuses.includes(newStatus)) {
    console.warn(`Invalid shipment status: ${newStatus}`);
    return shipment;
  }

  const updated = {
    ...shipment,
    status: newStatus,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };

  // Auto-set shipped date when status changes to shipped
  if (newStatus === 'shipped' && !updated.shippedDate) {
    updated.shippedDate = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();
  }

  // Auto-set delivered date when status changes to delivered
  if (newStatus === 'delivered' && !updated.deliveredDate) {
    updated.deliveredDate = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();
  }

  return updated;
}

/**
 * Mark shipment as shipped
 * @param {object} shipment - Shipment object
 * @param {string} shippedDate - Shipped date (ISO string)
 * @returns {object} Updated shipment
 */
function markShipmentShipped(shipment, shippedDate = null) {
  if (!shipment) return shipment;

  return {
    ...shipment,
    status: 'shipped',
    shippedDate: shippedDate || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Mark shipment as delivered
 * @param {object} shipment - Shipment object
 * @param {string} deliveredDate - Delivered date (ISO string)
 * @returns {object} Updated shipment
 */
function markShipmentDelivered(shipment, deliveredDate = null) {
  if (!shipment) return shipment;

  return {
    ...shipment,
    status: 'delivered',
    deliveredDate: deliveredDate || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Carrier Tracking ============

/**
 * Get tracking URL for carrier
 * @param {object} shipment - Shipment object
 * @returns {string} Tracking URL
 */
function getTrackingUrl(shipment) {
  if (!shipment || !shipment.trackingNumber) return '';

  const trackingNumber = shipment.trackingNumber;
  const carrier = (shipment.carrier || '').toLowerCase();

  const trackingUrls = {
    'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'dhl': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    'amazon': `https://track.amazon.com/tracking/${trackingNumber}`,
    'ontrac': `https://www.ontrac.com/tracking/?number=${trackingNumber}`,
    'lasership': `https://www.lasership.com/track/${trackingNumber}`
  };

  // Try exact match first
  if (trackingUrls[carrier]) {
    return trackingUrls[carrier];
  }

  // Try partial match
  for (const [key, url] of Object.entries(trackingUrls)) {
    if (carrier.includes(key)) {
      return url;
    }
  }

  return '';
}

/**
 * Detect carrier from tracking number format
 * @param {string} trackingNumber - Tracking number
 * @returns {string} Detected carrier name
 */
function detectCarrier(trackingNumber) {
  if (!trackingNumber) return '';

  const patterns = {
    'UPS': /^1Z[A-Z0-9]{16}$/,
    'FedEx': /^[0-9]{12,14}$/,
    'USPS': /^(94|93|92|94|95)[0-9]{20}$/,
    'DHL': /^[0-9]{10,11}$/,
    'Amazon': /^TBA[0-9]{12}$/
  };

  for (const [carrier, pattern] of Object.entries(patterns)) {
    if (pattern.test(trackingNumber)) {
      return carrier;
    }
  }

  return '';
}

// ============ Query Helpers ============

/**
 * Filter shipments by criteria
 * @param {Array} shipments - Shipments array
 * @param {object} criteria - Filter criteria
 * @returns {Array} Filtered shipments
 */
function filterShipments(shipments, criteria = {}) {
  if (!Array.isArray(shipments)) return [];

  return shipments.filter(shipment => {
    if (criteria.status && shipment.status !== criteria.status) {
      return false;
    }

    if (criteria.carrier) {
      if (!shipment.carrier.toLowerCase().includes(criteria.carrier.toLowerCase())) {
        return false;
      }
    }

    if (criteria.trackingNumber) {
      if (!shipment.trackingNumber.includes(criteria.trackingNumber)) {
        return false;
      }
    }

    if (criteria.recipient) {
      if (!shipment.recipient.toLowerCase().includes(criteria.recipient.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get pending shipments
 * @param {Array} shipments - Shipments array
 * @returns {Array} Pending shipments
 */
function getPendingShipments(shipments) {
  return filterShipments(shipments, { status: 'pending' });
}

/**
 * Get in-transit shipments
 * @param {Array} shipments - Shipments array
 * @returns {Array} In-transit shipments
 */
function getInTransitShipments(shipments) {
  if (!Array.isArray(shipments)) return [];
  return shipments.filter(s => s.status === 'in_transit' || s.status === 'shipped');
}

/**
 * Sort shipments
 * @param {Array} shipments - Shipments array
 * @param {string} sortBy - Sort field
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted shipments
 */
function sortShipments(shipments, sortBy = 'createdAt', ascending = false) {
  if (!Array.isArray(shipments)) return [];

  const sorted = [...shipments].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'createdAt':
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
        break;
      case 'shippedDate':
        aVal = new Date(a.shippedDate || 0).getTime();
        bVal = new Date(b.shippedDate || 0).getTime();
        break;
      case 'deliveredDate':
        aVal = new Date(a.deliveredDate || 0).getTime();
        bVal = new Date(b.deliveredDate || 0).getTime();
        break;
      case 'carrier':
        aVal = (a.carrier || '').toLowerCase();
        bVal = (b.carrier || '').toLowerCase();
        break;
      case 'recipient':
        aVal = (a.recipient || '').toLowerCase();
        bVal = (b.recipient || '').toLowerCase();
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

// ============ CRUD Operations ============

function getAllShipments() {
  return window.shipments || [];
}

function getShipment(id) {
  if (!window.shipments) return null;
  return window.shipments.find(s => s.id === id) || null;
}

function createShipmentCRUD(shipmentData) {
  try {
    const shipment = createShipment(shipmentData);
    const validation = validateShipment(shipment);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    if (!window.shipments) window.shipments = [];
    window.shipments.push(shipment);
    saveShipmentsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('shipment:created', { id: shipment.id, shipment });
    }
    return { success: true, shipment };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function updateShipmentCRUD(id, updates) {
  try {
    const shipment = getShipment(id);
    if (!shipment) return { success: false, errors: ['Shipment not found'] };
    const updated = { ...shipment, ...updates, updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString() };
    const validation = validateShipment(updated);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    Object.assign(shipment, updated);
    saveShipmentsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('shipment:updated', { id, updates, shipment: updated });
    }
    return { success: true, shipment: updated };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function deleteShipmentCRUD(id) {
  try {
    const index = window.shipments.findIndex(s => s.id === id);
    if (index === -1) return { success: false, errors: ['Shipment not found'] };
    const deleted = window.shipments.splice(index, 1)[0];
    saveShipmentsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('shipment:deleted', { id, shipment: deleted });
    }
    return { success: true, shipment: deleted };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function markShipmentShippedCRUD(id, shippedDate = null) {
  try {
    const shipment = getShipment(id);
    if (!shipment) return { success: false, errors: ['Shipment not found'] };
    const shipped = markShipmentShipped(shipment, shippedDate);
    Object.assign(shipment, shipped);
    saveShipmentsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('shipment:shipped', { id, shippedDate: shipped.shippedDate, shipment: shipped });
    }
    return { success: true, shipment: shipped };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function markShipmentDeliveredCRUD(id, deliveredDate = null) {
  try {
    const shipment = getShipment(id);
    if (!shipment) return { success: false, errors: ['Shipment not found'] };
    const delivered = markShipmentDelivered(shipment, deliveredDate);
    Object.assign(shipment, delivered);
    saveShipmentsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('shipment:delivered', { id, deliveredDate: delivered.deliveredDate, shipment: delivered });
    }
    return { success: true, shipment: delivered };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function saveShipmentsToStorage() {
  if (typeof saveShipments === 'function') {
    saveShipments(window.shipments || []);
  }
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  window.createShipment = createShipment;
  window.validateShipment = validateShipment;
  window.updateShipmentStatus = updateShipmentStatus;
  window.markShipmentShipped = markShipmentShipped;
  window.markShipmentDelivered = markShipmentDelivered;
  window.getTrackingUrl = getTrackingUrl;
  window.detectCarrier = detectCarrier;
  window.filterShipments = filterShipments;
  window.getPendingShipments = getPendingShipments;
  window.getInTransitShipments = getInTransitShipments;
  window.sortShipments = sortShipments;
  window.getAllShipments = getAllShipments;
  window.getShipment = getShipment;
  window.createShipmentCRUD = createShipmentCRUD;
  window.updateShipmentCRUD = updateShipmentCRUD;
  window.deleteShipmentCRUD = deleteShipmentCRUD;
  window.markShipmentShippedCRUD = markShipmentShippedCRUD;
  window.markShipmentDeliveredCRUD = markShipmentDeliveredCRUD;
  window.saveShipmentsToStorage = saveShipmentsToStorage;
}
