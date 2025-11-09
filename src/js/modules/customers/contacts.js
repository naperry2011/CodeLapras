/**
 * Contacts Module
 * Manages multiple contacts per customer
 */

// ============ Factory Function ============

/**
 * Create a contact object
 * @param {string} customerId - Customer ID
 * @param {object} data - Contact data
 * @returns {object} Contact object
 */
function createContact(customerId, data = {}) {
  const now = new Date().toISOString();

  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'contact-' + Date.now()),
    customerId: customerId,
    name: data.name || '',
    title: data.title || '',
    email: data.email || '',
    phone: data.phone || '',
    isPrimary: data.isPrimary || false,
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

// ============ CRUD Operations ============

/**
 * Get all contacts from global array
 * @returns {Array} Contacts array
 */
function getAllContacts() {
  if (!window.contacts || !Array.isArray(window.contacts)) {
    window.contacts = [];
  }
  return window.contacts;
}

/**
 * Get contact by ID
 * @param {string} id - Contact ID
 * @returns {object|null} Contact or null
 */
function getContact(id) {
  const contacts = getAllContacts();
  return contacts.find(c => c.id === id) || null;
}

/**
 * Get all contacts for a customer
 * @param {string} customerId - Customer ID
 * @returns {Array} Customer contacts
 */
function getCustomerContacts(customerId) {
  const contacts = getAllContacts();
  return contacts.filter(c => c.customerId === customerId);
}

/**
 * Get primary contact for a customer
 * @param {string} customerId - Customer ID
 * @returns {object|null} Primary contact or null
 */
function getPrimaryContact(customerId) {
  const contacts = getCustomerContacts(customerId);
  return contacts.find(c => c.isPrimary) || contacts[0] || null;
}

/**
 * Create new contact
 * @param {string} customerId - Customer ID
 * @param {object} data - Contact data
 * @returns {object} Created contact
 */
function createContactCRUD(customerId, data) {
  const contact = createContact(customerId, data);
  const contacts = getAllContacts();
  contacts.push(contact);

  saveContactsToStorage();

  if (window.eventBus && typeof window.eventBus.emit === 'function') {
    window.eventBus.emit('contact:created', contact);
  }

  return contact;
}

/**
 * Update contact
 * @param {string} id - Contact ID
 * @param {object} updates - Updated fields
 * @returns {object|null} Updated contact or null
 */
function updateContact(id, updates) {
  const contacts = getAllContacts();
  const index = contacts.findIndex(c => c.id === id);

  if (index === -1) return null;

  const updated = {
    ...contacts[index],
    ...updates,
    id: contacts[index].id,
    customerId: contacts[index].customerId,
    createdAt: contacts[index].createdAt,
    updatedAt: new Date().toISOString()
  };

  contacts[index] = updated;
  saveContactsToStorage();

  if (window.eventBus && typeof window.eventBus.emit === 'function') {
    window.eventBus.emit('contact:updated', updated);
  }

  return updated;
}

/**
 * Delete contact
 * @param {string} id - Contact ID
 * @returns {boolean} True if deleted
 */
function deleteContact(id) {
  const contacts = getAllContacts();
  const index = contacts.findIndex(c => c.id === id);

  if (index === -1) return false;

  const deleted = contacts[index];
  contacts.splice(index, 1);
  saveContactsToStorage();

  if (window.eventBus && typeof window.eventBus.emit === 'function') {
    window.eventBus.emit('contact:deleted', { id, contact: deleted });
  }

  return true;
}

/**
 * Set primary contact for a customer
 * @param {string} customerId - Customer ID
 * @param {string} contactId - Contact ID to make primary
 * @returns {boolean} True if successful
 */
function setPrimaryContact(customerId, contactId) {
  const contacts = getAllContacts();
  let updated = false;

  // Remove primary flag from all customer contacts
  contacts.forEach(c => {
    if (c.customerId === customerId) {
      if (c.id === contactId) {
        c.isPrimary = true;
        updated = true;
      } else {
        c.isPrimary = false;
      }
      c.updatedAt = new Date().toISOString();
    }
  });

  if (updated) {
    saveContactsToStorage();
  }

  return updated;
}

/**
 * Save contacts to localStorage
 */
function saveContactsToStorage() {
  if (typeof window.saveContacts === 'function') {
    window.saveContacts(window.contacts);
  } else if (typeof window.saveAll === 'function') {
    window.saveAll();
  }
}

/**
 * Load contacts from localStorage
 * @returns {Array} Contacts array
 */
function loadContactsFromStorage() {
  if (typeof window.loadContacts === 'function') {
    window.contacts = window.loadContacts();
  } else if (typeof window.Storage !== 'undefined' && window.Storage.loadContacts) {
    window.contacts = window.Storage.loadContacts();
  } else {
    window.contacts = [];
  }
  return window.contacts;
}

// ============ Exports ============

if (typeof window !== 'undefined') {
  window.createContact = createContact;
  window.getAllContacts = getAllContacts;
  window.getContact = getContact;
  window.getCustomerContacts = getCustomerContacts;
  window.getPrimaryContact = getPrimaryContact;
  window.createContactCRUD = createContactCRUD;
  window.updateContact = updateContact;
  window.deleteContact = deleteContact;
  window.setPrimaryContact = setPrimaryContact;
  window.loadContactsFromStorage = loadContactsFromStorage;
}
