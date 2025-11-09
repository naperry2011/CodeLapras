/**
 * Subscription UI Module
 * Handles all subscription-related UI rendering and interactions
 */

const SubscriptionUI = (function () {
  'use strict';

  /**
   * Get column definitions for subscription table
   */
  function getSubscriptionColumns(options = {}) {
    return [
      {
        key: 'customer',
        label: 'Customer',
        sortable: true,
        formatter: (value, subscription) => {
          if (subscription.customerId && typeof Customers !== 'undefined') {
            const customer = Customers.getCustomer(subscription.customerId);
            if (customer) {
              return `<a href="#" onclick="event.preventDefault(); CustomerUI.showCustomerDialog('${subscription.customerId}')">${value}</a>`;
            }
          }
          return value || '—';
        }
      },
      {
        key: 'plan',
        label: 'Plan',
        sortable: true
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        formatter: 'currency',
        align: 'right'
      },
      {
        key: 'billingCycle',
        label: 'Billing Cycle',
        sortable: true,
        formatter: (value) => {
          const cycleMap = {
            weekly: 'Weekly',
            monthly: 'Monthly',
            quarterly: 'Quarterly',
            yearly: 'Yearly'
          };
          return cycleMap[value] || value;
        }
      },
      {
        key: 'startDate',
        label: 'Start Date',
        sortable: true,
        formatter: 'date'
      },
      {
        key: 'nextBillingDate',
        label: 'Next Payment',
        sortable: true,
        formatter: (value, subscription) => {
          if (!value || subscription.status !== 'active') {
            return '<span style="color: var(--muted-color);">—</span>';
          }

          const formatted = formatDate(value);
          const isDue = isBillingDue(subscription);

          return isDue
            ? `<span style="color: var(--accent); font-weight: bold;">${formatted} (Due!)</span>`
            : formatted;
        }
      },
      {
        key: 'autoRenew',
        label: 'Auto-Renew',
        sortable: true,
        align: 'center',
        formatter: (value) => {
          return value
            ? '<span style="color: var(--success-color);">✓</span>'
            : '<span style="color: var(--muted-color);">✗</span>';
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        formatter: (value) => {
          const statusMap = {
            active: { label: 'Active', color: 'var(--success-color)' },
            paused: { label: 'Paused', color: 'var(--warning-color)' },
            cancelled: { label: 'Cancelled', color: 'var(--muted-color)' }
          };
          const status = statusMap[value] || { label: value, color: 'var(--text-color)' };
          return `<span class="badge" style="background: ${status.color};">${status.label}</span>`;
        }
      },
      {
        key: 'actions',
        label: 'Actions',
        formatter: (value, subscription) => {
          const actions = [];

          // Status-specific actions
          if (subscription.status === 'active') {
            // Check if billing is due
            if (isBillingDue(subscription)) {
              actions.push(`<button class="btn small" style="background: var(--accent);" onclick="SubscriptionUI.processBilling('${subscription.id}')" title="Process Billing">💰 Bill</button>`);
            }
            actions.push(`<button class="btn small" onclick="SubscriptionUI.pauseSubscription('${subscription.id}')" title="Pause Subscription">⏸ Pause</button>`);
          } else if (subscription.status === 'paused') {
            actions.push(`<button class="btn small" onclick="SubscriptionUI.resumeSubscription('${subscription.id}')" title="Resume Subscription">▶ Resume</button>`);
          }

          // Common actions
          actions.push(`<button class="btn small" onclick="SubscriptionUI.showSubscriptionDialog('${subscription.id}')" title="Edit Subscription">Edit</button>`);
          actions.push(`<button class="btn small" onclick="SubscriptionUI.generateInvoice('${subscription.id}')" title="Generate Invoice">Invoice</button>`);

          // Cancel/Delete
          if (subscription.status !== 'cancelled') {
            actions.push(`<button class="btn small" onclick="SubscriptionUI.cancelSubscription('${subscription.id}')" title="Cancel Subscription">Cancel</button>`);
          }
          actions.push(`<button class="btn small danger" onclick="SubscriptionUI.deleteSubscription('${subscription.id}')" title="Delete Subscription">Delete</button>`);

          return actions.join(' ');
        }
      }
    ];
  }

  /**
   * Render subscription table
   */
  function renderSubscriptionTable(containerId, subscriptions, options = {}) {
    const container = typeof containerId === 'string' ? $(containerId) : containerId;
    if (!container) {
      console.error('Subscription table container not found:', containerId);
      return;
    }

    // Apply filters if provided
    let filteredSubscriptions = [...subscriptions];

    if (options.status) {
      filteredSubscriptions = filterSubscriptions(filteredSubscriptions, { status: options.status });
    }

    if (options.customerId) {
      filteredSubscriptions = filteredSubscriptions.filter(s => s.customerId === options.customerId);
    }

    if (options.dueOnly) {
      filteredSubscriptions = getSubscriptionsDueForBilling(filteredSubscriptions);
    }

    // Get columns
    const columns = getSubscriptionColumns(options);

    // Render using table system
    renderTable(containerId, filteredSubscriptions, columns, {
      emptyMessage: 'No subscriptions found',
      sortable: true,
      defaultSort: { key: 'startDate', direction: 'desc' },
      ...options
    });

    // Update metrics
    updateMetricsBadges();
  }

  /**
   * Show subscription dialog (create or edit)
   */
  function showSubscriptionDialog(subscriptionId = null) {
    const dialog = $('#subscriptionDialog') || $('#dlgSubscription');
    if (!dialog) {
      console.error('Subscription dialog not found');
      return;
    }

    const isEdit = !!subscriptionId;
    const title = $('#subscriptionDialogTitle') || dialog.querySelector('h2');
    if (title) {
      title.textContent = isEdit ? 'Edit Subscription' : 'New Subscription';
    }

    // Populate customer dropdown
    populateCustomerDropdown();

    if (isEdit) {
      const subscription = getSubscription(subscriptionId);
      if (subscription) {
        populateSubscriptionForm(subscription);
      } else {
        showNotification('Subscription not found', 'error');
        return;
      }
    } else {
      clearSubscriptionForm();
      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      $('#subscriptionStartDate, #subStart').value = today;
      $('#subscriptionNextBillingDate, #subNextPay').value = nextMonth;
      $('#subscriptionAutoRenew, #subAutoRenew').checked = true;
    }

    showDialog(dialog);
  }

  /**
   * Populate customer dropdown
   */
  function populateCustomerDropdown() {
    const select = $('#subscriptionCustomerId') || $('#subCustomerId');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Customer --</option>';

    if (typeof Customers !== 'undefined') {
      const customers = Customers.getAllCustomers();
      customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        select.appendChild(option);
      });

      // Sync with text input
      select.addEventListener('change', function() {
        if (this.value) {
          const customer = Customers.getCustomer(this.value);
          if (customer) {
            const customerInput = $('#subscriptionCustomer') || $('#subCustomer');
            if (customerInput) {
              customerInput.value = customer.name;
            }
          }
        }
      });
    }
  }

  /**
   * Populate subscription form with data
   */
  function populateSubscriptionForm(subscription) {
    // Support both new and old field IDs
    const setField = (newId, oldId, value) => {
      const field = $(newId) || $(oldId);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = !!value;
        } else {
          field.value = value || '';
        }
      }
    };

    setField('#subscriptionId', '#subId', subscription.id);
    setField('#subscriptionCustomer', '#subCustomer', subscription.customer);
    setField('#subscriptionCustomerId', '#subCustomerId', subscription.customerId);
    setField('#subscriptionPlan', '#subPlan', subscription.plan);
    setField('#subscriptionAmount', '#subAmount', subscription.amount);
    setField('#subscriptionBillingCycle', '#subCycle', subscription.billingCycle);
    setField('#subscriptionStartDate', '#subStart', subscription.startDate ? subscription.startDate.split('T')[0] : '');
    setField('#subscriptionNextBillingDate', '#subNextPay', subscription.nextBillingDate ? subscription.nextBillingDate.split('T')[0] : '');
    setField('#subscriptionLastBillingDate', '#subPrevPay', subscription.lastBillingDate ? subscription.lastBillingDate.split('T')[0] : '');
    setField('#subscriptionStatus', '#subStatus', subscription.status);
    setField('#subscriptionAutoRenew', '#subAutoRenew', subscription.autoRenew);
    setField('#subscriptionNotes', '#subNotes', subscription.notes);
  }

  /**
   * Clear subscription form
   */
  function clearSubscriptionForm() {
    const clearField = (newId, oldId) => {
      const field = $(newId) || $(oldId);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = false;
        } else {
          field.value = '';
        }
      }
    };

    clearField('#subscriptionId', '#subId');
    clearField('#subscriptionCustomer', '#subCustomer');
    clearField('#subscriptionCustomerId', '#subCustomerId');
    clearField('#subscriptionPlan', '#subPlan');
    clearField('#subscriptionAmount', '#subAmount');
    clearField('#subscriptionBillingCycle', '#subCycle');
    clearField('#subscriptionStartDate', '#subStart');
    clearField('#subscriptionNextBillingDate', '#subNextPay');
    clearField('#subscriptionLastBillingDate', '#subPrevPay');
    clearField('#subscriptionStatus', '#subStatus');
    clearField('#subscriptionAutoRenew', '#subAutoRenew');
    clearField('#subscriptionNotes', '#subNotes');
  }

  /**
   * Extract subscription form data
   */
  function extractSubscriptionFormData() {
    const getField = (newId, oldId) => {
      return $(newId) || $(oldId);
    };

    const idField = getField('#subscriptionId', '#subId');
    const customerField = getField('#subscriptionCustomer', '#subCustomer');
    const customerIdField = getField('#subscriptionCustomerId', '#subCustomerId');
    const planField = getField('#subscriptionPlan', '#subPlan');
    const amountField = getField('#subscriptionAmount', '#subAmount');
    const cycleField = getField('#subscriptionBillingCycle', '#subCycle');
    const startDateField = getField('#subscriptionStartDate', '#subStart');
    const nextBillingField = getField('#subscriptionNextBillingDate', '#subNextPay');
    const lastBillingField = getField('#subscriptionLastBillingDate', '#subPrevPay');
    const statusField = getField('#subscriptionStatus', '#subStatus');
    const autoRenewField = getField('#subscriptionAutoRenew', '#subAutoRenew');
    const notesField = getField('#subscriptionNotes', '#subNotes');

    return {
      id: idField?.value || undefined,
      customer: customerField?.value.trim() || '',
      customerId: customerIdField?.value || undefined,
      plan: planField?.value.trim() || '',
      amount: parseFloat(amountField?.value) || 0,
      billingCycle: cycleField?.value || 'monthly',
      startDate: startDateField?.value ? new Date(startDateField.value).toISOString() : new Date().toISOString(),
      nextBillingDate: nextBillingField?.value ? new Date(nextBillingField.value).toISOString() : null,
      lastBillingDate: lastBillingField?.value ? new Date(lastBillingField.value).toISOString() : null,
      status: statusField?.value || 'active',
      autoRenew: autoRenewField?.checked || false,
      notes: notesField?.value.trim() || ''
    };
  }

  /**
   * Save subscription from form
   */
  function saveSubscriptionFromForm() {
    const data = extractSubscriptionFormData();
    const subscriptionId = data.id;

    // Validate
    if (!data.customer) {
      showNotification('Customer name is required', 'error');
      const customerField = $('#subscriptionCustomer') || $('#subCustomer');
      customerField?.focus();
      return;
    }

    if (!data.plan) {
      showNotification('Plan name is required', 'error');
      const planField = $('#subscriptionPlan') || $('#subPlan');
      planField?.focus();
      return;
    }

    if (data.amount <= 0) {
      showNotification('Amount must be greater than 0', 'error');
      const amountField = $('#subscriptionAmount') || $('#subAmount');
      amountField?.focus();
      return;
    }

    try {
      let subscription;
      if (subscriptionId) {
        // Update existing
        subscription = updateSubscriptionCRUD(subscriptionId, data);
        showNotification('Subscription updated successfully', 'success');
      } else {
        // Create new - calculate next billing date if not provided
        if (!data.nextBillingDate) {
          data.nextBillingDate = calculateNextBillingDate(data.startDate, data.billingCycle, new Date(data.startDate));
        }
        subscription = createSubscriptionCRUD(data);
        showNotification('Subscription created successfully', 'success');
      }

      // Hide dialog
      const dialog = $('#subscriptionDialog') || $('#dlgSubscription');
      hideDialog(dialog);

      // Refresh table
      refreshSubscriptionTable();

      return subscription;
    } catch (error) {
      showNotification(error.message || 'Failed to save subscription', 'error');
      console.error('Error saving subscription:', error);
    }
  }

  /**
   * Pause subscription
   */
  function pauseSubscription(subscriptionId) {
    const subscription = getSubscription(subscriptionId);
    if (!subscription) {
      showNotification('Subscription not found', 'error');
      return;
    }

    if (subscription.status !== 'active') {
      showNotification('Only active subscriptions can be paused', 'warning');
      return;
    }

    const confirmed = confirm(`Pause subscription for "${subscription.customer}" - "${subscription.plan}"?`);
    if (!confirmed) return;

    try {
      pauseSubscriptionCRUD(subscriptionId);
      showNotification('Subscription paused', 'success');
      refreshSubscriptionTable();
    } catch (error) {
      showNotification(error.message || 'Failed to pause subscription', 'error');
      console.error('Error pausing subscription:', error);
    }
  }

  /**
   * Resume subscription
   */
  function resumeSubscription(subscriptionId) {
    const subscription = getSubscription(subscriptionId);
    if (!subscription) {
      showNotification('Subscription not found', 'error');
      return;
    }

    if (subscription.status !== 'paused') {
      showNotification('Only paused subscriptions can be resumed', 'warning');
      return;
    }

    const confirmed = confirm(`Resume subscription for "${subscription.customer}" - "${subscription.plan}"?`);
    if (!confirmed) return;

    try {
      resumeSubscriptionCRUD(subscriptionId);
      showNotification('Subscription resumed', 'success');
      refreshSubscriptionTable();
    } catch (error) {
      showNotification(error.message || 'Failed to resume subscription', 'error');
      console.error('Error resuming subscription:', error);
    }
  }

  /**
   * Cancel subscription
   */
  function cancelSubscription(subscriptionId) {
    const subscription = getSubscription(subscriptionId);
    if (!subscription) {
      showNotification('Subscription not found', 'error');
      return;
    }

    if (subscription.status === 'cancelled') {
      showNotification('Subscription already cancelled', 'warning');
      return;
    }

    const confirmed = confirm(`Cancel subscription for "${subscription.customer}" - "${subscription.plan}"?\n\nThis will stop all future billing.`);
    if (!confirmed) return;

    try {
      cancelSubscriptionCRUD(subscriptionId);
      showNotification('Subscription cancelled', 'success');
      refreshSubscriptionTable();
    } catch (error) {
      showNotification(error.message || 'Failed to cancel subscription', 'error');
      console.error('Error cancelling subscription:', error);
    }
  }

  /**
   * Delete subscription
   */
  function deleteSubscription(subscriptionId) {
    const subscription = getSubscription(subscriptionId);
    if (!subscription) {
      showNotification('Subscription not found', 'error');
      return;
    }

    const confirmed = confirm(`Delete subscription for "${subscription.customer}" - "${subscription.plan}"?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    try {
      deleteSubscriptionCRUD(subscriptionId);
      showNotification('Subscription deleted successfully', 'success');
      refreshSubscriptionTable();
    } catch (error) {
      showNotification(error.message || 'Failed to delete subscription', 'error');
      console.error('Error deleting subscription:', error);
    }
  }

  /**
   * Process billing for subscription
   */
  function processBilling(subscriptionId) {
    const subscription = getSubscription(subscriptionId);
    if (!subscription) {
      showNotification('Subscription not found', 'error');
      return;
    }

    if (subscription.status !== 'active') {
      showNotification('Only active subscriptions can be billed', 'warning');
      return;
    }

    const billingDate = prompt(`Billing Date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
    if (!billingDate) return;

    try {
      const updatedSubscription = processBillingCRUD(subscriptionId, new Date(billingDate).toISOString());

      const nextPaymentDate = formatDate(updatedSubscription.nextBillingDate);
      showNotification(`Billing processed! Next payment: ${nextPaymentDate}`, 'success');

      // Optionally generate invoice
      const generateInv = confirm('Generate invoice for this billing?');
      if (generateInv) {
        generateInvoice(subscriptionId);
      }

      refreshSubscriptionTable();
    } catch (error) {
      showNotification(error.message || 'Failed to process billing', 'error');
      console.error('Error processing billing:', error);
    }
  }

  /**
   * Generate invoice from subscription
   */
  function generateInvoice(subscriptionId) {
    const subscription = getSubscription(subscriptionId);
    if (!subscription) {
      showNotification('Subscription not found', 'error');
      return;
    }

    try {
      // Get company settings
      const settings = typeof loadSettings === 'function' ? loadSettings() : {};

      // Generate invoice using subscription module function
      const invoice = generateSubscriptionInvoice(subscription, settings);

      if (typeof Invoices !== 'undefined' && typeof Invoices.createInvoice === 'function') {
        // Save invoice to invoices module
        const savedInvoice = Invoices.createInvoice(invoice);
        showNotification('Invoice created successfully', 'success');

        // Optionally open invoice
        if (typeof InvoiceUI !== 'undefined' && typeof InvoiceUI.showInvoiceDialog === 'function') {
          InvoiceUI.showInvoiceDialog(savedInvoice.id);
        }
      } else {
        // Fallback: just show the invoice data
        console.log('Generated Invoice:', invoice);
        showNotification('Invoice generated (Invoices module not available)', 'warning');
      }
    } catch (error) {
      showNotification(error.message || 'Failed to generate invoice', 'error');
      console.error('Error generating invoice:', error);
    }
  }

  /**
   * Refresh subscription table
   */
  function refreshSubscriptionTable() {
    const subscriptions = getAllSubscriptions();
    const container = $('#subscriptionsBody')?.parentElement || $('#subscriptionsTable');

    if (container) {
      renderSubscriptionTable(container, subscriptions);
    }
  }

  /**
   * Update metrics badges
   */
  function updateMetricsBadges() {
    const subscriptions = getAllSubscriptions();
    const activeSubscriptions = getActiveSubscriptions(subscriptions);
    const dueSubscriptions = getSubscriptionsDueForBilling(subscriptions);

    // Calculate MRR
    const mrr = calculateMRR(subscriptions);

    // Update active count badge
    const activeBadge = $('#activeSubscriptionsBadge');
    if (activeBadge) {
      activeBadge.textContent = activeSubscriptions.length;
      activeBadge.style.display = activeSubscriptions.length > 0 ? 'inline-block' : 'none';
    }

    // Update due for billing badge
    const dueBadge = $('#dueSubscriptionsBadge');
    if (dueBadge) {
      dueBadge.textContent = dueSubscriptions.length;
      dueBadge.style.display = dueSubscriptions.length > 0 ? 'inline-block' : 'none';
    }

    // Update MRR display
    const mrrDisplay = $('#mrrDisplay');
    if (mrrDisplay) {
      mrrDisplay.textContent = formatCurrency(mrr);
    }

    return { active: activeSubscriptions.length, due: dueSubscriptions.length, mrr };
  }

  /**
   * Show subscriptions due for billing alert
   */
  function showDueSubscriptionsAlert() {
    const dueSubscriptions = getSubscriptionsDueForBilling(getAllSubscriptions());

    if (dueSubscriptions.length === 0) {
      showNotification('No subscriptions due for billing', 'success');
      return;
    }

    const message = `${dueSubscriptions.length} subscription${dueSubscriptions.length > 1 ? 's' : ''} due for billing:\n\n` +
      dueSubscriptions.map(s => `• ${s.customer} - ${s.plan} (${formatCurrency(s.amount)})`).join('\n');

    alert(message);
  }

  /**
   * Initialize subscription UI
   */
  function init() {
    console.log('SubscriptionUI initialized');

    // Listen for subscription events
    if (typeof eventBus !== 'undefined') {
      eventBus.on('subscription:created', () => refreshSubscriptionTable());
      eventBus.on('subscription:updated', () => refreshSubscriptionTable());
      eventBus.on('subscription:deleted', () => refreshSubscriptionTable());
      eventBus.on('subscription:paused', () => refreshSubscriptionTable());
      eventBus.on('subscription:resumed', () => refreshSubscriptionTable());
      eventBus.on('subscription:cancelled', () => refreshSubscriptionTable());
      eventBus.on('subscription:billed', () => refreshSubscriptionTable());
    }

    // Update metrics on load
    updateMetricsBadges();
  }

  // Public API
  return {
    getSubscriptionColumns,
    renderSubscriptionTable,
    showSubscriptionDialog,
    populateSubscriptionForm,
    clearSubscriptionForm,
    extractSubscriptionFormData,
    saveSubscriptionFromForm,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    deleteSubscription,
    processBilling,
    generateInvoice,
    refreshSubscriptionTable,
    updateMetricsBadges,
    showDueSubscriptionsAlert,
    init
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', SubscriptionUI.init);
} else {
  SubscriptionUI.init();
}
