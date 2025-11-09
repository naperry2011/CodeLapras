/* ============================================
   CUSTOMERS MODEL
   CodeLapras - Customer Data Utilities
   ============================================ */

/**
 * Customer Management Module
 *
 * Implements hybrid approach:
 * - Customers are stored as separate entities with unique IDs
 * - Orders/invoices maintain embedded customer data for backward compatibility
 * - Customer IDs link transactions to customer records
 */

// ============ Factory Functions ============

/**
 * Create a customer data object
 * @param {object} data - Customer data
 * @returns {object} Customer object
 */
function createCustomer(data = {}) {
  const now = new Date().toISOString();

  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'cust-' + Date.now()),
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    company: data.company || '',
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
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

// ============ CRUD Operations ============

/**
 * Get all customers from global array
 * @returns {Array} Customers array
 */
function getAllCustomers() {
  if (!window.customers || !Array.isArray(window.customers)) {
    window.customers = [];
  }
  return window.customers;
}

/**
 * Get customer by ID
 * @param {string} id - Customer ID
 * @returns {object|null} Customer object or null
 */
function getCustomer(id) {
  const customers = getAllCustomers();
  return customers.find(c => c.id === id) || null;
}

/**
 * Create and save new customer
 * @param {object} data - Customer data
 * @returns {object} Created customer
 */
function createCustomerCRUD(data) {
  const customer = createCustomer(data);
  const validation = validateCustomer(customer);

  if (!validation.isValid) {
    throw new Error('Invalid customer data: ' + validation.errors.join(', '));
  }

  const customers = getAllCustomers();
  customers.push(customer);

  saveToStorage();

  // Emit event if event bus available
  if (window.eventBus && typeof window.eventBus.emit === 'function') {
    window.eventBus.emit('customer:created', customer);
  }

  return customer;
}

/**
 * Update existing customer
 * @param {string} id - Customer ID
 * @param {object} updates - Updated fields
 * @returns {object|null} Updated customer or null if not found
 */
function updateCustomer(id, updates) {
  const customers = getAllCustomers();
  const index = customers.findIndex(c => c.id === id);

  if (index === -1) {
    return null;
  }

  // Merge updates
  const updated = {
    ...customers[index],
    ...updates,
    id: customers[index].id, // Preserve ID
    createdAt: customers[index].createdAt, // Preserve creation date
    updatedAt: new Date().toISOString() // Update timestamp
  };

  // Validate updated customer
  const validation = validateCustomer(updated);
  if (!validation.isValid) {
    throw new Error('Invalid customer data: ' + validation.errors.join(', '));
  }

  customers[index] = updated;
  saveToStorage();

  // Emit event
  if (window.eventBus && typeof window.eventBus.emit === 'function') {
    window.eventBus.emit('customer:updated', updated);
  }

  return updated;
}

/**
 * Delete customer
 * @param {string} id - Customer ID
 * @returns {boolean} True if deleted
 */
function deleteCustomer(id) {
  const customers = getAllCustomers();
  const index = customers.findIndex(c => c.id === id);

  if (index === -1) {
    return false;
  }

  const deleted = customers[index];
  customers.splice(index, 1);
  saveToStorage();

  // Emit event
  if (window.eventBus && typeof window.eventBus.emit === 'function') {
    window.eventBus.emit('customer:deleted', { id, customer: deleted });
  }

  return true;
}

/**
 * Save customers to localStorage
 */
function saveToStorage() {
  if (typeof window.saveCustomers === 'function') {
    window.saveCustomers(window.customers);
  } else if (typeof window.saveAll === 'function') {
    window.saveAll();
  }
}

/**
 * Load customers from localStorage
 * @returns {Array} Customers array
 */
function loadCustomersFromStorage() {
  if (typeof window.loadCustomers === 'function') {
    window.customers = window.loadCustomers();
  } else if (typeof window.Storage !== 'undefined' && window.Storage.loadCustomers) {
    window.customers = window.Storage.loadCustomers();
  } else {
    window.customers = [];
  }
  return window.customers;
}

// ============ Relationship Queries ============

/**
 * Get customer orders
 * @param {string} customerId - Customer ID
 * @returns {Array} Orders for this customer
 */
function getCustomerOrders(customerId) {
  if (!window.orders || !Array.isArray(window.orders)) {
    return [];
  }
  return window.orders.filter(order => order.customerId === customerId);
}

/**
 * Get customer invoices
 * @param {string} customerId - Customer ID
 * @returns {Array} Invoices for this customer
 */
function getCustomerInvoices(customerId) {
  if (!window.invoices || !Array.isArray(window.invoices)) {
    return [];
  }
  return window.invoices.filter(invoice => invoice.customerId === customerId);
}

/**
 * Get customer rentals
 * @param {string} customerId - Customer ID
 * @returns {Array} Rentals for this customer
 */
function getCustomerRentals(customerId) {
  if (!window.rentals || !Array.isArray(window.rentals)) {
    return [];
  }
  return window.rentals.filter(rental => rental.customerId === customerId);
}

/**
 * Get customer subscriptions
 * @param {string} customerId - Customer ID
 * @returns {Array} Subscriptions for this customer
 */
function getCustomerSubscriptions(customerId) {
  if (!window.subscriptions || !Array.isArray(window.subscriptions)) {
    return [];
  }
  return window.subscriptions.filter(sub => sub.customerId === customerId);
}

/**
 * Get customer activity (all transactions)
 * @param {string} customerId - Customer ID
 * @returns {object} Activity summary
 */
function getCustomerActivity(customerId) {
  return {
    orders: getCustomerOrders(customerId),
    invoices: getCustomerInvoices(customerId),
    rentals: getCustomerRentals(customerId),
    subscriptions: getCustomerSubscriptions(customerId)
  };
}

/**
 * Calculate customer lifetime value
 * @param {string} customerId - Customer ID
 * @returns {number} Total value
 */
function getCustomerLifetimeValue(customerId) {
  const invoices = getCustomerInvoices(customerId);
  return invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  // Factory & validation
  window.createCustomer = createCustomer;
  window.validateCustomer = validateCustomer;
  window.isValidEmail = isValidEmail;
  window.isValidPhone = isValidPhone;

  // Search & utilities
  window.extractCustomersFromInvoices = extractCustomersFromInvoices;
  window.findCustomerByName = findCustomerByName;
  window.findCustomerByEmail = findCustomerByEmail;
  window.findCustomerByPhone = findCustomerByPhone;
  window.searchCustomers = searchCustomers;
  window.findPotentialDuplicates = findPotentialDuplicates;
  window.formatCustomerName = formatCustomerName;
  window.getCustomerDisplayText = getCustomerDisplayText;
  window.sortCustomers = sortCustomers;

  // CRUD operations
  window.getAllCustomers = getAllCustomers;
  window.getCustomer = getCustomer;
  window.createCustomerCRUD = createCustomerCRUD;
  window.updateCustomer = updateCustomer;
  window.deleteCustomer = deleteCustomer;
  window.loadCustomersFromStorage = loadCustomersFromStorage;

  // Relationship queries
  window.getCustomerOrders = getCustomerOrders;
  window.getCustomerInvoices = getCustomerInvoices;
  window.getCustomerRentals = getCustomerRentals;
  window.getCustomerSubscriptions = getCustomerSubscriptions;
  window.getCustomerActivity = getCustomerActivity;
  window.getCustomerLifetimeValue = getCustomerLifetimeValue;

  // Migration
  window.migrateExistingCustomers = migrateExistingCustomers;
  window.linkCustomerToTransaction = linkCustomerToTransaction;
}

// ============ Data Migration Utility ============

/**
 * Migrate existing customer data from invoices/orders to separate entities
 * This should be run once when upgrading to the new customer system
 * @returns {object} Migration results
 */
function migrateExistingCustomers() {
  console.log('Starting customer migration...');

  const results = {
    customersCreated: 0,
    invoicesUpdated: 0,
    ordersUpdated: 0,
    rentalsUpdated: 0,
    subscriptionsUpdated: 0,
    duplicatesFound: 0
  };

  // Step 1: Extract customers from invoices
  const fromInvoices = extractCustomersFromInvoices(window.invoices || []);
  console.log(`Extracted ${fromInvoices.length} customers from invoices`);

  // Step 2: Extract customers from orders
  const fromOrders = (window.orders || [])
    .filter(o => o.customerName)
    .map(o => ({
      name: o.customerName,
      email: o.customerEmail || '',
      phone: o.customerPhone || ''
    }));
  console.log(`Extracted ${fromOrders.length} customers from orders`);

  // Step 3: Combine all customers
  const allExtracted = [...fromInvoices, ...fromOrders];

  // Step 4: Deduplicate by name/email
  const uniqueMap = new Map();
  allExtracted.forEach(cust => {
    const key = (cust.name || '').toLowerCase().trim();
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, cust);
    } else if (key && cust.email) {
      // If duplicate by name, check if email adds new info
      const existing = uniqueMap.get(key);
      if (!existing.email && cust.email) {
        existing.email = cust.email;
      }
      if (!existing.phone && cust.phone) {
        existing.phone = cust.phone;
      }
      results.duplicatesFound++;
    }
  });

  const uniqueCustomers = Array.from(uniqueMap.values());
  console.log(`Found ${uniqueCustomers.length} unique customers (${results.duplicatesFound} duplicates merged)`);

  // Step 5: Create customer entities with IDs
  const customers = uniqueCustomers.map(c => createCustomer(c));
  window.customers = customers;
  results.customersCreated = customers.length;

  // Step 6: Link invoices to customers
  if (window.invoices && Array.isArray(window.invoices)) {
    window.invoices.forEach(invoice => {
      if (invoice.customer && invoice.customer.name) {
        const customer = findCustomerByName(customers, invoice.customer.name);
        if (customer) {
          invoice.customerId = customer.id;
          results.invoicesUpdated++;
        }
      }
    });
  }

  // Step 7: Link orders to customers
  if (window.orders && Array.isArray(window.orders)) {
    window.orders.forEach(order => {
      if (order.customerName) {
        const customer = findCustomerByName(customers, order.customerName);
        if (customer) {
          order.customerId = customer.id;
          results.ordersUpdated++;
        }
      }
    });
  }

  // Step 8: Link rentals to customers (if they exist)
  if (window.rentals && Array.isArray(window.rentals)) {
    window.rentals.forEach(rental => {
      if (rental.customer) {
        const customer = findCustomerByName(customers, rental.customer);
        if (customer) {
          rental.customerId = customer.id;
          results.rentalsUpdated++;
        }
      }
    });
  }

  // Step 9: Link subscriptions to customers (if they exist)
  if (window.subscriptions && Array.isArray(window.subscriptions)) {
    window.subscriptions.forEach(sub => {
      if (sub.customer) {
        const customer = findCustomerByName(customers, sub.customer);
        if (customer) {
          sub.customerId = customer.id;
          results.subscriptionsUpdated++;
        }
      }
    });
  }

  // Step 10: Save everything
  saveToStorage();
  if (typeof saveAll === 'function') {
    saveAll();
  }

  console.log('Migration complete:', results);
  return results;
}

/**
 * Link a customer to a transaction by adding customerId field
 * @param {object} transaction - Order, invoice, rental, or subscription
 * @param {string} customerName - Customer name to search for
 * @returns {boolean} True if linked successfully
 */
function linkCustomerToTransaction(transaction, customerName) {
  if (!customerName) return false;

  const customers = getAllCustomers();
  const customer = findCustomerByName(customers, customerName);

  if (customer) {
    transaction.customerId = customer.id;
    return true;
  }

  return false;
}
