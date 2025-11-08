/* ============================================
   SUBSCRIPTIONS MODEL
   CodeLapras - Subscription Management Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create a new subscription
 * @param {object} data - Subscription data
 * @returns {object} Subscription object
 */
function createSubscription(data = {}) {
  return {
    id: data.id || (typeof uid === 'function' ? uid() : 'sub-' + Date.now()),
    customer: data.customer || '',
    customerId: data.customerId || '',
    plan: data.plan || '',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    cycle: data.cycle || data.frequency || 'monthly',
    startDate: data.startDate || data.start || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    nextPayDate: data.nextPayDate || data.nextPay || '',
    prevPayDate: data.prevPayDate || data.prevPay || null,
    status: data.status || 'active',
    autoRenew: data.autoRenew !== undefined ? !!data.autoRenew : true,
    notes: data.notes || '',
    createdAt: data.createdAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Validation ============

/**
 * Validate subscription
 * @param {object} subscription - Subscription to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateSubscription(subscription) {
  const errors = [];

  if (!subscription) {
    errors.push('Subscription object is required');
    return { isValid: false, errors };
  }

  if (!subscription.customer || subscription.customer.trim() === '') {
    errors.push('Customer is required');
  }

  if (!subscription.plan || subscription.plan.trim() === '') {
    errors.push('Plan is required');
  }

  if (typeof subscription.amount !== 'number' || subscription.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  const validCycles = ['weekly', 'monthly', 'quarterly', 'yearly'];
  if (!validCycles.includes(subscription.cycle)) {
    errors.push('Invalid billing cycle');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============ Billing Cycle Management ============

/**
 * Calculate next billing date
 * @param {object} subscription - Subscription object
 * @param {string} fromDate - Calculate from this date (ISO string)
 * @returns {string} Next billing date (ISO string)
 */
function calculateNextBillingDate(subscription, fromDate = null) {
  if (!subscription) return '';

  const baseDate = fromDate ? new Date(fromDate) : new Date(subscription.startDate);
  const nextDate = new Date(baseDate);

  switch (subscription.cycle) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate.toISOString();
}

/**
 * Check if billing is due
 * @param {object} subscription - Subscription object
 * @returns {boolean} True if billing is due
 */
function isBillingDue(subscription) {
  if (!subscription || subscription.status !== 'active') return false;
  if (!subscription.nextPayDate) return false;

  const now = Date.now();
  const nextPay = new Date(subscription.nextPayDate).getTime();

  return now >= nextPay;
}

// ============ Status Management ============

/**
 * Pause subscription
 * @param {object} subscription - Subscription object
 * @returns {object} Updated subscription
 */
function pauseSubscription(subscription) {
  if (!subscription) return subscription;

  return {
    ...subscription,
    status: 'paused',
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Resume subscription
 * @param {object} subscription - Subscription object
 * @returns {object} Updated subscription
 */
function resumeSubscription(subscription) {
  if (!subscription) return subscription;

  return {
    ...subscription,
    status: 'active',
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Cancel subscription
 * @param {object} subscription - Subscription object
 * @returns {object} Updated subscription
 */
function cancelSubscription(subscription) {
  if (!subscription) return subscription;

  return {
    ...subscription,
    status: 'cancelled',
    autoRenew: false,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Process billing (record payment and calculate next date)
 * @param {object} subscription - Subscription object
 * @param {string} paymentDate - Payment date (ISO string)
 * @returns {object} Updated subscription
 */
function processBilling(subscription, paymentDate = null) {
  if (!subscription) return subscription;

  const paidDate = paymentDate || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString());
  const nextBilling = calculateNextBillingDate(subscription, paidDate);

  return {
    ...subscription,
    prevPayDate: paidDate,
    nextPayDate: nextBilling,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Invoice Generation ============

/**
 * Generate invoice from subscription
 * @param {object} subscription - Subscription object
 * @param {object} settings - App settings
 * @returns {object} Invoice object
 */
function generateSubscriptionInvoice(subscription, settings = {}) {
  if (!subscription) return null;

  const cycleName = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly'
  }[subscription.cycle] || subscription.cycle;

  const items = [
    {
      name: `${cycleName} Subscription: ${subscription.plan}`,
      qty: 1,
      price: subscription.amount,
      total: subscription.amount
    }
  ];

  const invoice = {
    number: '', // Will be generated
    date: typeof nowISO === 'function' ? nowISO() : new Date().toISOString(),
    customer: { name: subscription.customer },
    items,
    subtotal: subscription.amount,
    taxRate: settings.taxDefault || 0,
    notes: `Subscription ID: ${subscription.id}\nBilling Cycle: ${cycleName}`
  };

  if (typeof calculateInvoiceTotals === 'function') {
    return calculateInvoiceTotals(invoice);
  }

  return invoice;
}

// ============ Metrics & Analytics ============

/**
 * Calculate Monthly Recurring Revenue (MRR)
 * @param {Array} subscriptions - Subscriptions array
 * @returns {number} MRR amount
 */
function calculateMRR(subscriptions) {
  if (!Array.isArray(subscriptions)) return 0;

  return subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((total, sub) => {
      let monthlyAmount = 0;

      switch (sub.cycle) {
        case 'weekly':
          monthlyAmount = sub.amount * 4.33; // Average weeks per month
          break;
        case 'monthly':
          monthlyAmount = sub.amount;
          break;
        case 'quarterly':
          monthlyAmount = sub.amount / 3;
          break;
        case 'yearly':
          monthlyAmount = sub.amount / 12;
          break;
      }

      return total + monthlyAmount;
    }, 0);
}

// ============ Query Helpers ============

/**
 * Filter subscriptions by criteria
 * @param {Array} subscriptions - Subscriptions array
 * @param {object} criteria - Filter criteria
 * @returns {Array} Filtered subscriptions
 */
function filterSubscriptions(subscriptions, criteria = {}) {
  if (!Array.isArray(subscriptions)) return [];

  return subscriptions.filter(sub => {
    if (criteria.status && sub.status !== criteria.status) {
      return false;
    }

    if (criteria.customer) {
      if (!sub.customer.toLowerCase().includes(criteria.customer.toLowerCase())) {
        return false;
      }
    }

    if (criteria.plan) {
      if (!sub.plan.toLowerCase().includes(criteria.plan.toLowerCase())) {
        return false;
      }
    }

    if (criteria.cycle && sub.cycle !== criteria.cycle) {
      return false;
    }

    if (criteria.billingDue && !isBillingDue(sub)) {
      return false;
    }

    return true;
  });
}

/**
 * Get active subscriptions
 * @param {Array} subscriptions - Subscriptions array
 * @returns {Array} Active subscriptions
 */
function getActiveSubscriptions(subscriptions) {
  return filterSubscriptions(subscriptions, { status: 'active' });
}

/**
 * Get subscriptions due for billing
 * @param {Array} subscriptions - Subscriptions array
 * @returns {Array} Subscriptions due for billing
 */
function getSubscriptionsDueForBilling(subscriptions) {
  return filterSubscriptions(subscriptions, { billingDue: true });
}

/**
 * Sort subscriptions
 * @param {Array} subscriptions - Subscriptions array
 * @param {string} sortBy - Sort field
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted subscriptions
 */
function sortSubscriptions(subscriptions, sortBy = 'nextPayDate', ascending = true) {
  if (!Array.isArray(subscriptions)) return [];

  const sorted = [...subscriptions].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'nextPayDate':
        aVal = new Date(a.nextPayDate || 0).getTime();
        bVal = new Date(b.nextPayDate || 0).getTime();
        break;
      case 'customer':
        aVal = (a.customer || '').toLowerCase();
        bVal = (b.customer || '').toLowerCase();
        break;
      case 'plan':
        aVal = (a.plan || '').toLowerCase();
        bVal = (b.plan || '').toLowerCase();
        break;
      case 'amount':
        aVal = a.amount || 0;
        bVal = b.amount || 0;
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
  window.createSubscription = createSubscription;
  window.validateSubscription = validateSubscription;
  window.calculateNextBillingDate = calculateNextBillingDate;
  window.isBillingDue = isBillingDue;
  window.pauseSubscription = pauseSubscription;
  window.resumeSubscription = resumeSubscription;
  window.cancelSubscription = cancelSubscription;
  window.processBilling = processBilling;
  window.generateSubscriptionInvoice = generateSubscriptionInvoice;
  window.calculateMRR = calculateMRR;
  window.filterSubscriptions = filterSubscriptions;
  window.getActiveSubscriptions = getActiveSubscriptions;
  window.getSubscriptionsDueForBilling = getSubscriptionsDueForBilling;
  window.sortSubscriptions = sortSubscriptions;
}
