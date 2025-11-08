/* ============================================
   CUSTOMERS MODEL
   CodeLapras - Customer Data Utilities
   ============================================ */

/**
 * Note: In CodeLapras, customer data is embedded in invoices/orders rather than
 * stored as separate entities. This module provides utility functions for working
 * with customer data embedded in other records.
 */

// ============ Factory Functions ============

/**
 * Create a customer data object
 * @param {object} data - Customer data
 * @returns {object} Customer object
 */
function createCustomer(data = {}) {
  return {
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    company: data.company || '',
    notes: data.notes || ''
  };
}

// ============ Validation ============

/**
 * Validate customer data
 * @param {object} customer - Customer to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateCustomer(customer) {
  const errors = [];

  if (!customer) {
    errors.push('Customer object is required');
    return { isValid: false, errors };
  }

  // Name is required
  if (!customer.name || typeof customer.name !== 'string' || customer.name.trim() === '') {
    errors.push('Customer name is required');
  }

  // Email validation (if provided)
  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('Invalid email format');
  }

  // Phone validation (if provided)
  if (customer.phone && !isValidPhone(customer.phone)) {
    errors.push('Invalid phone format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validate phone format
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Allow various phone formats: digits, spaces, dashes, parentheses, plus
  const phonePattern = /^[\d\s\-\(\)\+]+$/;
  return phonePattern.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// ============ Search Helpers ============

/**
 * Extract all unique customers from invoices
 * @param {Array} invoices - Array of invoices
 * @returns {Array} Array of unique customers
 */
function extractCustomersFromInvoices(invoices) {
  if (!Array.isArray(invoices)) return [];

  const customerMap = new Map();

  invoices.forEach(invoice => {
    if (invoice.customer && invoice.customer.name) {
      const key = normalizeString(invoice.customer.name);
      if (!customerMap.has(key)) {
        customerMap.set(key, { ...invoice.customer });
      }
    }

    // Also check billTo field for legacy invoices
    if (invoice.billTo && typeof invoice.billTo === 'string') {
      const key = normalizeString(invoice.billTo);
      if (!customerMap.has(key)) {
        customerMap.set(key, { name: invoice.billTo });
      }
    }
  });

  return Array.from(customerMap.values());
}

/**
 * Find customer by name
 * @param {Array} customers - Customers array
 * @param {string} name - Customer name
 * @returns {object|null} Customer or null
 */
function findCustomerByName(customers, name) {
  if (!Array.isArray(customers) || !name) return null;
  const normalized = normalizeString(name);
  return customers.find(c => normalizeString(c.name) === normalized) || null;
}

/**
 * Find customer by email
 * @param {Array} customers - Customers array
 * @param {string} email - Customer email
 * @returns {object|null} Customer or null
 */
function findCustomerByEmail(customers, email) {
  if (!Array.isArray(customers) || !email) return null;
  const normalized = normalizeString(email);
  return customers.find(c => normalizeString(c.email) === normalized) || null;
}

/**
 * Find customer by phone
 * @param {Array} customers - Customers array
 * @param {string} phone - Customer phone
 * @returns {object|null} Customer or null
 */
function findCustomerByPhone(customers, phone) {
  if (!Array.isArray(customers) || !phone) return null;
  // Normalize phone: remove all non-digits
  const normalized = phone.replace(/\D/g, '');
  return customers.find(c => {
    if (!c.phone) return false;
    return c.phone.replace(/\D/g, '') === normalized;
  }) || null;
}

/**
 * Search customers by query
 * @param {Array} customers - Customers array
 * @param {string} query - Search query
 * @returns {Array} Matching customers
 */
function searchCustomers(customers, query) {
  if (!Array.isArray(customers) || !query) return customers;

  const queryLower = query.toLowerCase();

  return customers.filter(customer => {
    const nameMatch = customer.name && customer.name.toLowerCase().includes(queryLower);
    const emailMatch = customer.email && customer.email.toLowerCase().includes(queryLower);
    const phoneMatch = customer.phone && customer.phone.includes(queryLower);
    const companyMatch = customer.company && customer.company.toLowerCase().includes(queryLower);

    return nameMatch || emailMatch || phoneMatch || companyMatch;
  });
}

// ============ Duplicate Detection ============

/**
 * Detect potential duplicate customers
 * @param {Array} customers - Customers array
 * @param {object} customer - Customer to check
 * @returns {Array} Array of potential duplicates
 */
function findPotentialDuplicates(customers, customer) {
  if (!Array.isArray(customers) || !customer) return [];

  const duplicates = [];

  customers.forEach(existing => {
    let matchScore = 0;

    // Exact name match
    if (customer.name && existing.name &&
        normalizeString(customer.name) === normalizeString(existing.name)) {
      matchScore += 3;
    }

    // Email match
    if (customer.email && existing.email &&
        normalizeString(customer.email) === normalizeString(existing.email)) {
      matchScore += 3;
    }

    // Phone match
    if (customer.phone && existing.phone &&
        customer.phone.replace(/\D/g, '') === existing.phone.replace(/\D/g, '')) {
      matchScore += 2;
    }

    // Similar name match (fuzzy)
    if (customer.name && existing.name &&
        areSimilarNames(customer.name, existing.name)) {
      matchScore += 1;
    }

    if (matchScore >= 2) {
      duplicates.push({
        customer: existing,
        matchScore,
        reason: getMatchReason(customer, existing)
      });
    }
  });

  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Check if two names are similar (fuzzy match)
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {boolean} True if similar
 */
function areSimilarNames(name1, name2) {
  if (!name1 || !name2) return false;

  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check Levenshtein distance for short strings
  if (n1.length <= 15 && n2.length <= 15) {
    return levenshteinDistance(n1, n2) <= 2;
  }

  return false;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get match reason for duplicate detection
 * @param {object} customer1 - First customer
 * @param {object} customer2 - Second customer
 * @returns {string} Match reason
 */
function getMatchReason(customer1, customer2) {
  const reasons = [];

  if (customer1.name && customer2.name &&
      normalizeString(customer1.name) === normalizeString(customer2.name)) {
    reasons.push('Same name');
  }

  if (customer1.email && customer2.email &&
      normalizeString(customer1.email) === normalizeString(customer2.email)) {
    reasons.push('Same email');
  }

  if (customer1.phone && customer2.phone &&
      customer1.phone.replace(/\D/g, '') === customer2.phone.replace(/\D/g, '')) {
    reasons.push('Same phone');
  }

  return reasons.join(', ') || 'Similar name';
}

// ============ Utility Functions ============

/**
 * Normalize string for comparison
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Format customer name with company
 * @param {object} customer - Customer object
 * @returns {string} Formatted name
 */
function formatCustomerName(customer) {
  if (!customer) return '';

  let name = customer.name || '';
  if (customer.company) {
    name += ` (${customer.company})`;
  }

  return name;
}

/**
 * Get customer display text
 * @param {object} customer - Customer object
 * @returns {string} Display text with name, email, phone
 */
function getCustomerDisplayText(customer) {
  if (!customer) return '';

  const parts = [];

  if (customer.name) parts.push(customer.name);
  if (customer.company) parts.push(`(${customer.company})`);
  if (customer.email) parts.push(`[${customer.email}]`);
  if (customer.phone) parts.push(`Tel: ${customer.phone}`);

  return parts.join(' ');
}

// ============ Sorting ============

/**
 * Sort customers
 * @param {Array} customers - Customers array
 * @param {string} sortBy - Sort field (name, email, company)
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted customers
 */
function sortCustomers(customers, sortBy = 'name', ascending = true) {
  if (!Array.isArray(customers)) return [];

  const sorted = [...customers].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'email':
        aVal = (a.email || '').toLowerCase();
        bVal = (b.email || '').toLowerCase();
        break;
      case 'company':
        aVal = (a.company || '').toLowerCase();
        bVal = (b.company || '').toLowerCase();
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

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  window.createCustomer = createCustomer;
  window.validateCustomer = validateCustomer;
  window.isValidEmail = isValidEmail;
  window.isValidPhone = isValidPhone;
  window.extractCustomersFromInvoices = extractCustomersFromInvoices;
  window.findCustomerByName = findCustomerByName;
  window.findCustomerByEmail = findCustomerByEmail;
  window.findCustomerByPhone = findCustomerByPhone;
  window.searchCustomers = searchCustomers;
  window.findPotentialDuplicates = findPotentialDuplicates;
  window.formatCustomerName = formatCustomerName;
  window.getCustomerDisplayText = getCustomerDisplayText;
  window.sortCustomers = sortCustomers;
}
