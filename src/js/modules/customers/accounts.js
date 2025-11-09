/**
 * Customer Accounts Module
 * Manages customer credit, payment history, and account balances
 */

// ============ Factory Function ============

/**
 * Create a customer account object
 * @param {string} customerId - Customer ID
 * @param {object} data - Account data
 * @returns {object} Account object
 */
function createAccount(customerId, data = {}) {
  const now = new Date().toISOString();

  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'account-' + Date.now()),
    customerId: customerId,
    creditLimit: data.creditLimit || 0,
    currentBalance: data.currentBalance || 0,
    paymentTerms: data.paymentTerms || 'Net 30',
    paymentHistory: data.paymentHistory || [],
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Create a payment record
 * @param {object} data - Payment data
 * @returns {object} Payment object
 */
function createPayment(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'payment-' + Date.now()),
    date: data.date || new Date().toISOString(),
    amount: data.amount || 0,
    invoiceId: data.invoiceId || '',
    method: data.method || 'cash', // cash, check, card, transfer
    reference: data.reference || '',
    notes: data.notes || ''
  };
}

// ============ CRUD Operations ============

/**
 * Get all accounts from global array
 * @returns {Array} Accounts array
 */
function getAllAccounts() {
  if (!window.accounts || !Array.isArray(window.accounts)) {
    window.accounts = [];
  }
  return window.accounts;
}

/**
 * Get account by ID
 * @param {string} id - Account ID
 * @returns {object|null} Account or null
 */
function getAccount(id) {
  const accounts = getAllAccounts();
  return accounts.find(a => a.id === id) || null;
}

/**
 * Get account for a customer
 * @param {string} customerId - Customer ID
 * @returns {object|null} Customer account or null
 */
function getCustomerAccount(customerId) {
  const accounts = getAllAccounts();
  return accounts.find(a => a.customerId === customerId) || null;
}

/**
 * Create or get account for customer
 * @param {string} customerId - Customer ID
 * @param {object} data - Account data (optional)
 * @returns {object} Account object
 */
function ensureCustomerAccount(customerId, data = {}) {
  let account = getCustomerAccount(customerId);
  if (!account) {
    account = createAccount(customerId, data);
    const accounts = getAllAccounts();
    accounts.push(account);
    saveAccountsToStorage();
  }
  return account;
}

/**
 * Update account
 * @param {string} id - Account ID
 * @param {object} updates - Updated fields
 * @returns {object|null} Updated account or null
 */
function updateAccount(id, updates) {
  const accounts = getAllAccounts();
  const index = accounts.findIndex(a => a.id === id);

  if (index === -1) return null;

  const updated = {
    ...accounts[index],
    ...updates,
    id: accounts[index].id,
    customerId: accounts[index].customerId,
    createdAt: accounts[index].createdAt,
    updatedAt: new Date().toISOString()
  };

  accounts[index] = updated;
  saveAccountsToStorage();

  if (window.eventBus && typeof window.eventBus.emit === 'function') {
    window.eventBus.emit('account:updated', updated);
  }

  return updated;
}

/**
 * Update credit limit for customer
 * @param {string} customerId - Customer ID
 * @param {number} limit - New credit limit
 * @returns {object} Updated account
 */
function updateCreditLimit(customerId, limit) {
  const account = ensureCustomerAccount(customerId);
  return updateAccount(account.id, { creditLimit: limit });
}

/**
 * Record a payment
 * @param {string} customerId - Customer ID
 * @param {object} paymentData - Payment details
 * @returns {object} Updated account
 */
function recordPayment(customerId, paymentData) {
  const account = ensureCustomerAccount(customerId);
  const payment = createPayment(paymentData);

  // Add payment to history
  if (!Array.isArray(account.paymentHistory)) {
    account.paymentHistory = [];
  }
  account.paymentHistory.unshift(payment);

  // Update balance if linked to invoice
  if (payment.invoiceId && typeof window.getInvoice === 'function') {
    const invoice = window.getInvoice(payment.invoiceId);
    if (invoice && !invoice.paid) {
      // Mark invoice as paid if amount matches
      if (Math.abs(payment.amount - invoice.total) < 0.01) {
        invoice.paid = true;
        if (typeof window.saveInvoices === 'function') {
          window.saveInvoices(window.invoices);
        }
      }
    }
  }

  return updateAccount(account.id, {
    paymentHistory: account.paymentHistory,
    currentBalance: calculateBalance(customerId)
  });
}

/**
 * Get payment history for customer
 * @param {string} customerId - Customer ID
 * @param {number} limit - Max number of payments to return
 * @returns {Array} Payment history
 */
function getPaymentHistory(customerId, limit = 0) {
  const account = getCustomerAccount(customerId);
  if (!account || !Array.isArray(account.paymentHistory)) {
    return [];
  }

  const history = [...account.paymentHistory];
  return limit > 0 ? history.slice(0, limit) : history;
}

/**
 * Calculate current balance for customer
 * @param {string} customerId - Customer ID
 * @returns {number} Current balance (unpaid invoice total)
 */
function calculateBalance(customerId) {
  if (!window.invoices || !Array.isArray(window.invoices)) {
    return 0;
  }

  const unpaidInvoices = window.invoices.filter(
    inv => inv.customerId === customerId && !inv.paid
  );

  return unpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
}

/**
 * Get account summary with credit info
 * @param {string} customerId - Customer ID
 * @returns {object} Account summary
 */
function getAccountSummary(customerId) {
  const account = getCustomerAccount(customerId);
  const balance = calculateBalance(customerId);
  const creditLimit = account ? account.creditLimit : 0;
  const available = creditLimit - balance;

  return {
    account: account,
    balance: balance,
    creditLimit: creditLimit,
    availableCredit: Math.max(0, available),
    isOverLimit: balance > creditLimit,
    paymentHistory: getPaymentHistory(customerId, 10)
  };
}

/**
 * Check if customer can make purchase
 * @param {string} customerId - Customer ID
 * @param {number} amount - Purchase amount
 * @returns {object} { allowed: boolean, reason: string }
 */
function canMakePurchase(customerId, amount) {
  const summary = getAccountSummary(customerId);

  if (!summary.account) {
    return { allowed: true, reason: 'No credit limit set' };
  }

  const newBalance = summary.balance + amount;

  if (newBalance <= summary.creditLimit) {
    return { allowed: true, reason: 'Within credit limit' };
  }

  return {
    allowed: false,
    reason: `Purchase would exceed credit limit. Available: $${summary.availableCredit.toFixed(2)}`
  };
}

/**
 * Save accounts to localStorage
 */
function saveAccountsToStorage() {
  if (typeof window.saveAccounts === 'function') {
    window.saveAccounts(window.accounts);
  } else if (typeof window.saveAll === 'function') {
    window.saveAll();
  }
}

/**
 * Load accounts from localStorage
 * @returns {Array} Accounts array
 */
function loadAccountsFromStorage() {
  if (typeof window.loadAccounts === 'function') {
    window.accounts = window.loadAccounts();
  } else if (typeof window.Storage !== 'undefined' && window.Storage.loadAccounts) {
    window.accounts = window.Storage.loadAccounts();
  } else {
    window.accounts = [];
  }
  return window.accounts;
}

// ============ Exports ============

if (typeof window !== 'undefined') {
  window.createAccount = createAccount;
  window.createPayment = createPayment;
  window.getAllAccounts = getAllAccounts;
  window.getAccount = getAccount;
  window.getCustomerAccount = getCustomerAccount;
  window.ensureCustomerAccount = ensureCustomerAccount;
  window.updateAccount = updateAccount;
  window.updateCreditLimit = updateCreditLimit;
  window.recordPayment = recordPayment;
  window.getPaymentHistory = getPaymentHistory;
  window.calculateBalance = calculateBalance;
  window.getAccountSummary = getAccountSummary;
  window.canMakePurchase = canMakePurchase;
  window.loadAccountsFromStorage = loadAccountsFromStorage;
}
