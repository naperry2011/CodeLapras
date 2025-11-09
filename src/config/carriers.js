/**
 * CodeLapras - Carriers Configuration
 *
 * Centralized carrier configuration for shipment tracking.
 * Includes carrier information, tracking URL templates, and detection patterns.
 *
 * Day 18: Shipments Module
 */

export const CARRIERS = {
  UPS: {
    code: 'UPS',
    name: 'UPS',
    fullName: 'United Parcel Service',
    trackingUrlTemplate: 'https://www.ups.com/track?tracknum={trackingNumber}',
    icon: '📦',
    color: '#351c15',
    website: 'https://www.ups.com',
    // Pattern: 1Z followed by 16 alphanumeric characters
    trackingPattern: /^1Z[0-9A-Z]{16}$/i,
    // API integration point (future)
    apiEndpoint: null,
    supportedCountries: ['US', 'CA', 'MX', 'INTL']
  },

  FEDEX: {
    code: 'FEDEX',
    name: 'FedEx',
    fullName: 'Federal Express',
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?tracknumbers={trackingNumber}',
    icon: '✈️',
    color: '#4d148c',
    website: 'https://www.fedex.com',
    // Pattern: 12-14 digits or 20 digits
    trackingPattern: /^(\d{12}|\d{14}|\d{20})$/,
    apiEndpoint: null,
    supportedCountries: ['US', 'CA', 'MX', 'INTL']
  },

  USPS: {
    code: 'USPS',
    name: 'USPS',
    fullName: 'United States Postal Service',
    trackingUrlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}',
    icon: '🏣',
    color: '#004b87',
    website: 'https://www.usps.com',
    // Pattern: 20-22 digits, or 9420 followed by 27 digits
    trackingPattern: /^((\d{20})|(\d{22})|(9[23]\d{20})|(9[45]\d{20})|([A-Z]{2}\d{9}[A-Z]{2}))$/i,
    apiEndpoint: null,
    supportedCountries: ['US']
  },

  DHL: {
    code: 'DHL',
    name: 'DHL',
    fullName: 'DHL Express',
    trackingUrlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}',
    icon: '🌐',
    color: '#ffcc00',
    website: 'https://www.dhl.com',
    // Pattern: 10-11 digits
    trackingPattern: /^\d{10,11}$/,
    apiEndpoint: null,
    supportedCountries: ['INTL', 'US', 'CA', 'MX']
  },

  AMAZON: {
    code: 'AMAZON',
    name: 'Amazon',
    fullName: 'Amazon Logistics',
    trackingUrlTemplate: 'https://track.amazon.com/tracking/{trackingNumber}',
    icon: '📦',
    color: '#ff9900',
    website: 'https://www.amazon.com',
    // Pattern: TBA followed by 12 digits
    trackingPattern: /^TBA\d{12}$/i,
    apiEndpoint: null,
    supportedCountries: ['US', 'CA', 'MX', 'UK']
  },

  ONTRAC: {
    code: 'ONTRAC',
    name: 'OnTrac',
    fullName: 'OnTrac Logistics',
    trackingUrlTemplate: 'https://www.ontrac.com/tracking/?number={trackingNumber}',
    icon: '🚚',
    color: '#e31e24',
    website: 'https://www.ontrac.com',
    // Pattern: C followed by 14 digits
    trackingPattern: /^C\d{14}$/i,
    apiEndpoint: null,
    supportedCountries: ['US']
  },

  LASERSHIP: {
    code: 'LASERSHIP',
    name: 'LaserShip',
    fullName: 'LaserShip',
    trackingUrlTemplate: 'https://www.lasership.com/track/{trackingNumber}',
    icon: '⚡',
    color: '#0066cc',
    website: 'https://www.lasership.com',
    // Pattern: 1LS followed by 11 digits or LX followed by 9-11 digits
    trackingPattern: /^(1LS\d{11}|LX\d{9,11})$/i,
    apiEndpoint: null,
    supportedCountries: ['US']
  },

  // Generic/Other carrier for manual entry
  OTHER: {
    code: 'OTHER',
    name: 'Other',
    fullName: 'Other Carrier',
    trackingUrlTemplate: null,
    icon: '📮',
    color: '#6c757d',
    website: null,
    trackingPattern: null,
    apiEndpoint: null,
    supportedCountries: ['INTL']
  }
};

/**
 * Get list of all carriers
 * @returns {Array} Array of carrier objects
 */
export function getAllCarriers() {
  return Object.values(CARRIERS);
}

/**
 * Get carrier by code
 * @param {string} code - Carrier code (e.g., 'UPS', 'FEDEX')
 * @returns {Object|null} Carrier object or null if not found
 */
export function getCarrier(code) {
  return CARRIERS[code?.toUpperCase()] || null;
}

/**
 * Get carrier name by code
 * @param {string} code - Carrier code
 * @returns {string} Carrier name or 'Unknown'
 */
export function getCarrierName(code) {
  const carrier = getCarrier(code);
  return carrier ? carrier.name : 'Unknown';
}

/**
 * Get tracking URL for a carrier and tracking number
 * @param {string} carrierCode - Carrier code
 * @param {string} trackingNumber - Tracking number
 * @returns {string|null} Tracking URL or null if template not available
 */
export function getTrackingUrl(carrierCode, trackingNumber) {
  const carrier = getCarrier(carrierCode);

  if (!carrier || !carrier.trackingUrlTemplate) {
    return null;
  }

  return carrier.trackingUrlTemplate.replace('{trackingNumber}', encodeURIComponent(trackingNumber));
}

/**
 * Detect carrier from tracking number using regex patterns
 * @param {string} trackingNumber - Tracking number to detect
 * @returns {string|null} Detected carrier code or null
 */
export function detectCarrierFromTracking(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return null;
  }

  const cleaned = trackingNumber.trim();

  // Check each carrier's pattern
  for (const [code, carrier] of Object.entries(CARRIERS)) {
    if (carrier.trackingPattern && carrier.trackingPattern.test(cleaned)) {
      return code;
    }
  }

  return null;
}

/**
 * Validate tracking number for specific carrier
 * @param {string} trackingNumber - Tracking number
 * @param {string} carrierCode - Carrier code
 * @returns {boolean} True if valid for carrier
 */
export function validateTrackingNumber(trackingNumber, carrierCode) {
  const carrier = getCarrier(carrierCode);

  if (!carrier || !carrier.trackingPattern) {
    // If no pattern, allow any non-empty string
    return trackingNumber && trackingNumber.trim().length > 0;
  }

  return carrier.trackingPattern.test(trackingNumber.trim());
}

/**
 * Get carrier options for dropdown/select
 * @param {boolean} includeOther - Include "Other" option
 * @returns {Array} Array of {value, label} objects
 */
export function getCarrierOptions(includeOther = true) {
  const carriers = Object.values(CARRIERS);

  const options = carriers
    .filter(c => includeOther || c.code !== 'OTHER')
    .map(c => ({
      value: c.code,
      label: c.name,
      icon: c.icon
    }));

  return options;
}

/**
 * Get carrier icon
 * @param {string} carrierCode - Carrier code
 * @returns {string} Emoji icon
 */
export function getCarrierIcon(carrierCode) {
  const carrier = getCarrier(carrierCode);
  return carrier ? carrier.icon : '📦';
}

/**
 * Get carrier color
 * @param {string} carrierCode - Carrier code
 * @returns {string} Hex color code
 */
export function getCarrierColor(carrierCode) {
  const carrier = getCarrier(carrierCode);
  return carrier ? carrier.color : '#6c757d';
}

/**
 * Check if carrier supports a country
 * @param {string} carrierCode - Carrier code
 * @param {string} countryCode - Country code (e.g., 'US', 'CA')
 * @returns {boolean} True if carrier supports country
 */
export function carrierSupportsCountry(carrierCode, countryCode) {
  const carrier = getCarrier(carrierCode);

  if (!carrier || !carrier.supportedCountries) {
    return false;
  }

  return carrier.supportedCountries.includes(countryCode) ||
         carrier.supportedCountries.includes('INTL');
}

// Export CARRIERS as default
export default CARRIERS;
