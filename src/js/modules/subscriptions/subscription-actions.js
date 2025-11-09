/**
 * Subscription Actions Module
 * Registers all subscription-related actions, shortcuts, and context menus
 */

(function () {
  'use strict';

  /**
   * Register all subscription actions
   */
  function registerSubscriptionActions() {
    if (typeof ActionRegistry === 'undefined') {
      console.warn('ActionRegistry not available, skipping subscription actions registration');
      return;
    }

    // New Subscription Action
    ActionRegistry.register('new-subscription', {
      label: 'New Subscription',
      icon: '➕',
      category: 'subscriptions',
      handler: () => {
        SubscriptionUI.showSubscriptionDialog();
      },
      description: 'Create a new subscription',
      enabled: () => true
    });

    // Edit Subscription Action
    ActionRegistry.register('edit-subscription', {
      label: 'Edit Subscription',
      icon: '✏️',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to edit', 'warning');
          return;
        }
        SubscriptionUI.showSubscriptionDialog(subscriptionId);
      },
      description: 'Edit selected subscription',
      enabled: (subscriptionId) => !!subscriptionId
    });

    // Delete Subscription Action
    ActionRegistry.register('delete-subscription', {
      label: 'Delete Subscription',
      icon: '🗑️',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to delete', 'warning');
          return;
        }
        SubscriptionUI.deleteSubscription(subscriptionId);
      },
      description: 'Delete selected subscription',
      enabled: (subscriptionId) => !!subscriptionId,
      confirmMessage: 'Are you sure you want to delete this subscription?'
    });

    // Pause Subscription Action
    ActionRegistry.register('pause-subscription', {
      label: 'Pause Subscription',
      icon: '⏸️',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to pause', 'warning');
          return;
        }
        SubscriptionUI.pauseSubscription(subscriptionId);
      },
      description: 'Pause active subscription',
      enabled: (subscriptionId) => {
        if (!subscriptionId) return false;
        const subscription = getSubscription(subscriptionId);
        return subscription && subscription.status === 'active';
      }
    });

    // Resume Subscription Action
    ActionRegistry.register('resume-subscription', {
      label: 'Resume Subscription',
      icon: '▶️',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to resume', 'warning');
          return;
        }
        SubscriptionUI.resumeSubscription(subscriptionId);
      },
      description: 'Resume paused subscription',
      enabled: (subscriptionId) => {
        if (!subscriptionId) return false;
        const subscription = getSubscription(subscriptionId);
        return subscription && subscription.status === 'paused';
      }
    });

    // Cancel Subscription Action
    ActionRegistry.register('cancel-subscription', {
      label: 'Cancel Subscription',
      icon: '🚫',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to cancel', 'warning');
          return;
        }
        SubscriptionUI.cancelSubscription(subscriptionId);
      },
      description: 'Cancel subscription',
      enabled: (subscriptionId) => {
        if (!subscriptionId) return false;
        const subscription = getSubscription(subscriptionId);
        return subscription && subscription.status !== 'cancelled';
      }
    });

    // Process Billing Action
    ActionRegistry.register('process-billing', {
      label: 'Process Billing',
      icon: '💰',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to bill', 'warning');
          return;
        }
        SubscriptionUI.processBilling(subscriptionId);
      },
      description: 'Process subscription billing',
      enabled: (subscriptionId) => {
        if (!subscriptionId) return false;
        const subscription = getSubscription(subscriptionId);
        return subscription && subscription.status === 'active';
      }
    });

    // Generate Invoice Action
    ActionRegistry.register('generate-subscription-invoice', {
      label: 'Generate Invoice',
      icon: '📄',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to invoice', 'warning');
          return;
        }
        SubscriptionUI.generateInvoice(subscriptionId);
      },
      description: 'Generate invoice from subscription',
      enabled: (subscriptionId) => !!subscriptionId
    });

    // View Subscription Action
    ActionRegistry.register('view-subscription', {
      label: 'View Subscription',
      icon: '👁️',
      category: 'subscriptions',
      handler: (subscriptionId) => {
        if (!subscriptionId) {
          showNotification('Please select a subscription to view', 'warning');
          return;
        }
        SubscriptionUI.showSubscriptionDialog(subscriptionId);
      },
      description: 'View subscription details',
      enabled: (subscriptionId) => !!subscriptionId
    });

    // Save Subscription Action (from dialog)
    ActionRegistry.register('save-subscription', {
      label: 'Save Subscription',
      icon: '💾',
      category: 'subscriptions',
      handler: () => {
        SubscriptionUI.saveSubscriptionFromForm();
      },
      description: 'Save subscription from form',
      enabled: () => {
        const dialog = $('#subscriptionDialog') || $('#dlgSubscription');
        return dialog && (dialog.open || dialog.style.display !== 'none');
      }
    });

    // Refresh Subscriptions Action
    ActionRegistry.register('refresh-subscriptions', {
      label: 'Refresh Subscriptions',
      icon: '🔄',
      category: 'subscriptions',
      handler: () => {
        SubscriptionUI.refreshSubscriptionTable();
        showNotification('Subscriptions refreshed', 'success');
      },
      description: 'Refresh subscriptions table',
      enabled: () => true
    });

    // Show Due Subscriptions Action
    ActionRegistry.register('show-due-subscriptions', {
      label: 'Show Due Subscriptions',
      icon: '⏰',
      category: 'subscriptions',
      handler: () => {
        SubscriptionUI.showDueSubscriptionsAlert();
      },
      description: 'Show subscriptions due for billing',
      enabled: () => true
    });

    // Export Subscriptions Action
    ActionRegistry.register('export-subscriptions', {
      label: 'Export Subscriptions',
      icon: '📥',
      category: 'subscriptions',
      handler: () => {
        exportSubscriptionsToCSV();
      },
      description: 'Export subscriptions to CSV',
      enabled: () => {
        const subscriptions = getAllSubscriptions();
        return subscriptions && subscriptions.length > 0;
      }
    });

    // Filter Active Subscriptions Action
    ActionRegistry.register('filter-active-subscriptions', {
      label: 'Filter Active Subscriptions',
      icon: '✅',
      category: 'subscriptions',
      handler: () => {
        const subscriptions = filterSubscriptions(getAllSubscriptions(), { status: 'active' });
        const container = $('#subscriptionsBody')?.parentElement || $('#subscriptionsTable');
        if (container) {
          SubscriptionUI.renderSubscriptionTable(container, subscriptions);
        }
        showNotification(`Showing ${subscriptions.length} active subscriptions`, 'info');
      },
      description: 'Show only active subscriptions',
      enabled: () => true
    });

    // Filter Paused Subscriptions Action
    ActionRegistry.register('filter-paused-subscriptions', {
      label: 'Filter Paused Subscriptions',
      icon: '⏸️',
      category: 'subscriptions',
      handler: () => {
        const subscriptions = filterSubscriptions(getAllSubscriptions(), { status: 'paused' });
        const container = $('#subscriptionsBody')?.parentElement || $('#subscriptionsTable');
        if (container) {
          SubscriptionUI.renderSubscriptionTable(container, subscriptions);
        }
        showNotification(`Showing ${subscriptions.length} paused subscriptions`, 'info');
      },
      description: 'Show only paused subscriptions',
      enabled: () => true
    });

    // Filter Cancelled Subscriptions Action
    ActionRegistry.register('filter-cancelled-subscriptions', {
      label: 'Filter Cancelled Subscriptions',
      icon: '🚫',
      category: 'subscriptions',
      handler: () => {
        const subscriptions = filterSubscriptions(getAllSubscriptions(), { status: 'cancelled' });
        const container = $('#subscriptionsBody')?.parentElement || $('#subscriptionsTable');
        if (container) {
          SubscriptionUI.renderSubscriptionTable(container, subscriptions);
        }
        showNotification(`Showing ${subscriptions.length} cancelled subscriptions`, 'info');
      },
      description: 'Show only cancelled subscriptions',
      enabled: () => true
    });

    // Filter Due for Billing Action
    ActionRegistry.register('filter-due-subscriptions', {
      label: 'Filter Due Subscriptions',
      icon: '💵',
      category: 'subscriptions',
      handler: () => {
        const subscriptions = getSubscriptionsDueForBilling(getAllSubscriptions());
        const container = $('#subscriptionsBody')?.parentElement || $('#subscriptionsTable');
        if (container) {
          SubscriptionUI.renderSubscriptionTable(container, subscriptions);
        }
        showNotification(`Showing ${subscriptions.length} subscriptions due for billing`, 'warning');
      },
      description: 'Show subscriptions due for billing',
      enabled: () => true
    });

    // Clear Filters Action
    ActionRegistry.register('clear-subscription-filters', {
      label: 'Clear Filters',
      icon: '🔍',
      category: 'subscriptions',
      handler: () => {
        SubscriptionUI.refreshSubscriptionTable();
        showNotification('Filters cleared', 'info');
      },
      description: 'Clear all subscription filters',
      enabled: () => true
    });

    // Show MRR Action
    ActionRegistry.register('show-mrr', {
      label: 'Show MRR',
      icon: '📊',
      category: 'subscriptions',
      handler: () => {
        const subscriptions = getAllSubscriptions();
        const mrr = calculateMRR(subscriptions);
        const activeCount = getActiveSubscriptions(subscriptions).length;

        alert(`Monthly Recurring Revenue (MRR)\n\n` +
          `Active Subscriptions: ${activeCount}\n` +
          `Total MRR: ${formatCurrency(mrr)}\n\n` +
          `This represents the expected monthly revenue from all active subscriptions.`);
      },
      description: 'Show Monthly Recurring Revenue',
      enabled: () => true
    });

    console.log('Subscription actions registered');
  }

  /**
   * Register subscription keyboard shortcuts
   */
  function registerSubscriptionShortcuts() {
    if (typeof ShortcutManager === 'undefined') {
      console.warn('ShortcutManager not available, skipping subscription shortcuts registration');
      return;
    }

    // Ctrl+Shift+S - New Subscription
    ShortcutManager.register('new-subscription', 'ctrl+shift+s', () => {
      ActionRegistry.execute('new-subscription');
    }, 'Create new subscription');

    // Ctrl+Shift+D - Show Due Subscriptions
    ShortcutManager.register('show-due', 'ctrl+shift+d', () => {
      ActionRegistry.execute('show-due-subscriptions');
    }, 'Show subscriptions due for billing');

    // Ctrl+Shift+M - Show MRR
    ShortcutManager.register('show-mrr', 'ctrl+shift+m', () => {
      ActionRegistry.execute('show-mrr');
    }, 'Show Monthly Recurring Revenue');

    console.log('Subscription shortcuts registered');
  }

  /**
   * Register subscription context menu
   */
  function registerSubscriptionContextMenu() {
    if (typeof ContextMenu === 'undefined') {
      console.warn('ContextMenu not available, skipping subscription context menu registration');
      return;
    }

    // Context menu for subscription rows
    document.addEventListener('contextmenu', (e) => {
      const row = e.target.closest('tr[data-subscription-id]');
      if (!row) return;

      e.preventDefault();

      const subscriptionId = row.dataset.subscriptionId;
      const subscription = getSubscription(subscriptionId);

      if (!subscription) return;

      const menuItems = [];

      // Status-specific actions
      if (subscription.status === 'active') {
        // Process Billing (if due)
        if (isBillingDue(subscription)) {
          menuItems.push({
            label: 'Process Billing',
            icon: '💰',
            action: () => ActionRegistry.execute('process-billing', subscriptionId)
          });
          menuItems.push({ separator: true });
        }

        // Pause
        menuItems.push({
          label: 'Pause',
          icon: '⏸️',
          action: () => ActionRegistry.execute('pause-subscription', subscriptionId)
        });
      } else if (subscription.status === 'paused') {
        // Resume
        menuItems.push({
          label: 'Resume',
          icon: '▶️',
          action: () => ActionRegistry.execute('resume-subscription', subscriptionId)
        });
      }

      // Edit
      menuItems.push({
        label: 'Edit',
        icon: '✏️',
        action: () => ActionRegistry.execute('edit-subscription', subscriptionId)
      });

      // Generate Invoice
      menuItems.push({
        label: 'Generate Invoice',
        icon: '📄',
        action: () => ActionRegistry.execute('generate-subscription-invoice', subscriptionId)
      });

      // Separator
      menuItems.push({ separator: true });

      // Cancel (if not already cancelled)
      if (subscription.status !== 'cancelled') {
        menuItems.push({
          label: 'Cancel Subscription',
          icon: '🚫',
          action: () => ActionRegistry.execute('cancel-subscription', subscriptionId),
          danger: true
        });
      }

      // Delete
      menuItems.push({
        label: 'Delete',
        icon: '🗑️',
        action: () => ActionRegistry.execute('delete-subscription', subscriptionId),
        danger: true
      });

      ContextMenu.show(e.clientX, e.clientY, menuItems);
    });

    console.log('Subscription context menu registered');
  }

  /**
   * Export subscriptions to CSV
   */
  function exportSubscriptionsToCSV() {
    const subscriptions = getAllSubscriptions();

    if (!subscriptions || subscriptions.length === 0) {
      showNotification('No subscriptions to export', 'warning');
      return;
    }

    // CSV headers
    const headers = [
      'ID',
      'Customer',
      'Customer ID',
      'Plan',
      'Amount',
      'Billing Cycle',
      'Start Date',
      'Next Billing Date',
      'Last Billing Date',
      'Status',
      'Auto Renew',
      'Notes',
      'Created At',
      'Updated At'
    ];

    // CSV rows
    const rows = subscriptions.map(subscription => [
      subscription.id,
      subscription.customer,
      subscription.customerId || '',
      subscription.plan,
      subscription.amount,
      subscription.billingCycle,
      subscription.startDate,
      subscription.nextBillingDate || '',
      subscription.lastBillingDate || '',
      subscription.status,
      subscription.autoRenew ? 'Yes' : 'No',
      (subscription.notes || '').replace(/"/g, '""'), // Escape quotes
      subscription.createdAt || '',
      subscription.updatedAt || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Exported ${subscriptions.length} subscriptions to CSV`, 'success');
  }

  /**
   * Initialize subscription actions
   */
  function init() {
    registerSubscriptionActions();
    registerSubscriptionShortcuts();
    registerSubscriptionContextMenu();
    console.log('Subscription actions module initialized');
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
