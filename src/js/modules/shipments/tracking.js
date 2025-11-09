/**
 * CodeLapras - Shipment Tracking Utilities
 *
 * Enhanced tracking number detection, status updates, and delivery confirmation helpers.
 *
 * Day 18: Shipments Module
 */

import { CARRIERS, detectCarrierFromTracking, getTrackingUrl, validateTrackingNumber } from '../../../config/carriers.js';
import { SHIPMENT_STATUSES } from '../../../config/constants.js';

/**
 * Enhanced tracking number detection with confidence scoring
 * @param {string} trackingNumber - Tracking number to analyze
 * @returns {Object} Detection result with carrier, confidence, and suggestions
 */
export function detectTracking(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return {
      carrier: null,
      confidence: 0,
      valid: false,
      suggestions: ['Please enter a tracking number']
    };
  }

  const cleaned = trackingNumber.trim().toUpperCase();

  if (cleaned.length === 0) {
    return {
      carrier: null,
      confidence: 0,
      valid: false,
      suggestions: ['Please enter a tracking number']
    };
  }

  const detectedCarrier = detectCarrierFromTracking(cleaned);

  if (detectedCarrier) {
    return {
      carrier: detectedCarrier,
      confidence: 100,
      valid: true,
      trackingNumber: cleaned,
      url: getTrackingUrl(detectedCarrier, cleaned),
      suggestions: [`Detected as ${CARRIERS[detectedCarrier].fullName}`]
    };
  }

  // Partial pattern matching for suggestions
  const suggestions = [];

  if (/^1Z/i.test(cleaned)) {
    suggestions.push('Looks like UPS (needs 18 characters starting with 1Z)');
  }

  if (/^\d+$/.test(cleaned)) {
    if (cleaned.length >= 12 && cleaned.length <= 14) {
      suggestions.push('Could be FedEx (12-14 digits)');
    } else if (cleaned.length === 20 || cleaned.length === 22) {
      suggestions.push('Could be USPS (20-22 digits)');
    } else if (cleaned.length === 10 || cleaned.length === 11) {
      suggestions.push('Could be DHL (10-11 digits)');
    }
  }

  if (/^TBA/i.test(cleaned)) {
    suggestions.push('Looks like Amazon (needs TBA + 12 digits)');
  }

  if (/^C\d+/i.test(cleaned)) {
    suggestions.push('Looks like OnTrac (needs C + 14 digits)');
  }

  if (/^(1LS|LX)/i.test(cleaned)) {
    suggestions.push('Looks like LaserShip');
  }

  if (suggestions.length === 0) {
    suggestions.push('Could not detect carrier automatically. Please select manually.');
  }

  return {
    carrier: null,
    confidence: 0,
    valid: false,
    trackingNumber: cleaned,
    url: null,
    suggestions
  };
}

/**
 * Parse tracking number input (handles comma/space separated multiple numbers)
 * @param {string} input - Raw tracking number input
 * @returns {Array<string>} Array of cleaned tracking numbers
 */
export function parseTrackingNumbers(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }

  // Split by comma, semicolon, or newline
  const numbers = input.split(/[,;\n]+/)
    .map(num => num.trim())
    .filter(num => num.length > 0);

  return numbers;
}

/**
 * Validate tracking number with detailed error messages
 * @param {string} trackingNumber - Tracking number to validate
 * @param {string} carrierCode - Carrier code (optional, for specific validation)
 * @returns {Object} Validation result
 */
export function validateTracking(trackingNumber, carrierCode = null) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return {
      valid: false,
      error: 'Tracking number is required',
      field: 'trackingNumber'
    };
  }

  const cleaned = trackingNumber.trim();

  if (cleaned.length === 0) {
    return {
      valid: false,
      error: 'Tracking number cannot be empty',
      field: 'trackingNumber'
    };
  }

  if (cleaned.length < 6) {
    return {
      valid: false,
      error: 'Tracking number seems too short',
      field: 'trackingNumber'
    };
  }

  if (cleaned.length > 50) {
    return {
      valid: false,
      error: 'Tracking number seems too long',
      field: 'trackingNumber'
    };
  }

  // If carrier specified, validate against carrier pattern
  if (carrierCode) {
    const isValid = validateTrackingNumber(cleaned, carrierCode);

    if (!isValid) {
      const carrier = CARRIERS[carrierCode];
      return {
        valid: false,
        error: `Invalid tracking number format for ${carrier ? carrier.fullName : carrierCode}`,
        field: 'trackingNumber'
      };
    }
  }

  return {
    valid: true,
    trackingNumber: cleaned
  };
}

/**
 * Get status badge configuration
 * @param {string} status - Shipment status
 * @returns {Object} Badge configuration (class, label, icon)
 */
export function getStatusBadge(status) {
  const badges = {
    'pending': {
      class: 'status-pending',
      label: 'Pending',
      icon: '⏳',
      color: '#6c757d'
    },
    'shipped': {
      class: 'status-shipped',
      label: 'Shipped',
      icon: '📦',
      color: '#0d6efd'
    },
    'in_transit': {
      class: 'status-in-transit',
      label: 'In Transit',
      icon: '🚚',
      color: '#0dcaf0'
    },
    'out_for_delivery': {
      class: 'status-out-for-delivery',
      label: 'Out for Delivery',
      icon: '🚚',
      color: '#fd7e14'
    },
    'delivered': {
      class: 'status-delivered',
      label: 'Delivered',
      icon: '✅',
      color: '#198754'
    },
    'exception': {
      class: 'status-exception',
      label: 'Exception',
      icon: '⚠️',
      color: '#dc3545'
    },
    'returned': {
      class: 'status-returned',
      label: 'Returned',
      icon: '↩️',
      color: '#ffc107'
    }
  };

  return badges[status] || badges['pending'];
}

/**
 * Calculate estimated delivery date
 * @param {string} carrier - Carrier code
 * @param {Date} shippedDate - Date shipped
 * @param {string} serviceLevel - Service level (optional)
 * @returns {Date|null} Estimated delivery date
 */
export function estimateDeliveryDate(carrier, shippedDate, serviceLevel = 'standard') {
  if (!shippedDate) {
    return null;
  }

  const shipped = new Date(shippedDate);
  let daysToAdd = 5; // Default

  // Carrier-specific estimates
  const estimates = {
    'UPS': { ground: 5, express: 2, nextDay: 1 },
    'FEDEX': { ground: 5, express: 2, nextDay: 1 },
    'USPS': { ground: 7, priority: 3, express: 1 },
    'DHL': { standard: 7, express: 3, nextDay: 1 },
    'AMAZON': { standard: 5, prime: 2, nextDay: 1 },
    'ONTRAC': { standard: 3 },
    'LASERSHIP': { standard: 3 }
  };

  const carrierEstimates = estimates[carrier];
  if (carrierEstimates) {
    daysToAdd = carrierEstimates[serviceLevel] || carrierEstimates.standard || 5;
  }

  const estimated = new Date(shipped);
  estimated.setDate(estimated.getDate() + daysToAdd);

  return estimated;
}

/**
 * Check if shipment is overdue
 * @param {Object} shipment - Shipment object
 * @returns {boolean} True if overdue
 */
export function isOverdue(shipment) {
  if (!shipment || shipment.status === 'delivered') {
    return false;
  }

  if (!shipment.estimatedDelivery) {
    return false;
  }

  const estimated = new Date(shipment.estimatedDelivery);
  const now = new Date();

  return now > estimated;
}

/**
 * Get days until/since delivery
 * @param {Object} shipment - Shipment object
 * @returns {Object} Days info {days, label, overdue}
 */
export function getDeliveryDays(shipment) {
  if (!shipment) {
    return null;
  }

  if (shipment.status === 'delivered' && shipment.deliveredDate) {
    const delivered = new Date(shipment.deliveredDate);
    const now = new Date();
    const diffMs = now - delivered;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      days,
      label: days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`,
      overdue: false,
      delivered: true
    };
  }

  if (!shipment.estimatedDelivery) {
    return null;
  }

  const estimated = new Date(shipment.estimatedDelivery);
  const now = new Date();
  const diffMs = estimated - now;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      days: Math.abs(days),
      label: Math.abs(days) === 1 ? '1 day overdue' : `${Math.abs(days)} days overdue`,
      overdue: true,
      delivered: false
    };
  }

  return {
    days,
    label: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`,
    overdue: false,
    delivered: false
  };
}

/**
 * Format tracking history event
 * @param {Object} event - Tracking event
 * @returns {string} Formatted event description
 */
export function formatTrackingEvent(event) {
  if (!event) {
    return '';
  }

  const parts = [];

  if (event.status) {
    const badge = getStatusBadge(event.status);
    parts.push(badge.label);
  }

  if (event.location) {
    parts.push(`at ${event.location}`);
  }

  if (event.timestamp) {
    const date = new Date(event.timestamp);
    parts.push(`on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
  }

  return parts.join(' ');
}

/**
 * Create tracking event object
 * @param {string} status - Event status
 * @param {string} location - Location (optional)
 * @param {string} description - Description (optional)
 * @returns {Object} Tracking event
 */
export function createTrackingEvent(status, location = null, description = null) {
  return {
    id: Date.now(),
    status,
    location,
    description,
    timestamp: new Date().toISOString()
  };
}

/**
 * Export tracking data to CSV format
 * @param {Array<Object>} shipments - Array of shipments
 * @returns {string} CSV string
 */
export function exportTrackingToCsv(shipments) {
  if (!shipments || shipments.length === 0) {
    return '';
  }

  const headers = [
    'Tracking Number',
    'Carrier',
    'Status',
    'Order ID',
    'Customer',
    'Shipped Date',
    'Estimated Delivery',
    'Delivered Date',
    'Destination',
    'Notes'
  ];

  const rows = shipments.map(s => [
    s.trackingNumber || '',
    s.carrier || '',
    s.status || '',
    s.orderId || '',
    s.recipientName || '',
    s.shippedDate || '',
    s.estimatedDelivery || '',
    s.deliveredDate || '',
    s.recipientAddress ? `${s.recipientAddress.city}, ${s.recipientAddress.state}` : '',
    s.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Generate tracking summary statistics
 * @param {Array<Object>} shipments - Array of shipments
 * @returns {Object} Summary statistics
 */
export function getTrackingSummary(shipments) {
  if (!shipments || shipments.length === 0) {
    return {
      total: 0,
      pending: 0,
      shipped: 0,
      inTransit: 0,
      delivered: 0,
      exception: 0,
      overdue: 0,
      deliveredOnTime: 0,
      averageDeliveryDays: 0
    };
  }

  const summary = {
    total: shipments.length,
    pending: 0,
    shipped: 0,
    inTransit: 0,
    delivered: 0,
    exception: 0,
    overdue: 0,
    deliveredOnTime: 0,
    averageDeliveryDays: 0
  };

  let totalDeliveryDays = 0;
  let deliveredCount = 0;

  shipments.forEach(s => {
    // Count by status
    if (s.status === 'pending') summary.pending++;
    else if (s.status === 'shipped') summary.shipped++;
    else if (s.status === 'in_transit') summary.inTransit++;
    else if (s.status === 'delivered') summary.delivered++;
    else if (s.status === 'exception') summary.exception++;

    // Count overdue
    if (isOverdue(s)) {
      summary.overdue++;
    }

    // Calculate average delivery time
    if (s.status === 'delivered' && s.shippedDate && s.deliveredDate) {
      const shipped = new Date(s.shippedDate);
      const delivered = new Date(s.deliveredDate);
      const diffMs = delivered - shipped;
      const days = diffMs / (1000 * 60 * 60 * 24);

      totalDeliveryDays += days;
      deliveredCount++;

      // Check if delivered on time
      if (s.estimatedDelivery) {
        const estimated = new Date(s.estimatedDelivery);
        if (delivered <= estimated) {
          summary.deliveredOnTime++;
        }
      }
    }
  });

  if (deliveredCount > 0) {
    summary.averageDeliveryDays = Math.round(totalDeliveryDays / deliveredCount);
  }

  return summary;
}

export default {
  detectTracking,
  parseTrackingNumbers,
  validateTracking,
  getStatusBadge,
  estimateDeliveryDate,
  isOverdue,
  getDeliveryDays,
  formatTrackingEvent,
  createTrackingEvent,
  exportTrackingToCsv,
  getTrackingSummary
};
