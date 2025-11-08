/**
 * transfer-actions.js - Transfer Action Registration
 *
 * Registers all transfer-related actions with the ActionRegistry
 */

/**
 * Register transfer actions with ActionRegistry
 */
function registerTransferActions() {
  if (!window.ActionRegistry) {
    console.warn('ActionRegistry not available');
    return;
  }

  const AR = window.ActionRegistry;

  // New Transfer
  AR.register('new-transfer', {
    label: 'New Transfer',
    icon: '🔄',
    handler: (productId = null) => {
      if (window.TransferUI) {
        window.TransferUI.openTransferDialog(null, productId);
      }
    },
    description: 'Create a new stock transfer'
  });

  // Edit Transfer
  AR.register('edit-transfer', {
    label: 'Edit Transfer',
    icon: '✏️',
    handler: (transferId) => {
      if (window.TransferUI && transferId) {
        window.TransferUI.editTransfer(transferId);
      }
    },
    description: 'Edit pending transfer'
  });

  // Complete Transfer
  AR.register('complete-transfer', {
    label: 'Complete Transfer',
    icon: '✓',
    handler: (transferId) => {
      if (window.TransferUI && transferId) {
        window.TransferUI.completeTransfer(transferId);
      }
    },
    description: 'Complete pending transfer',
    confirmMessage: 'Complete this transfer? Stock will be adjusted at both locations.'
  });

  // Cancel Transfer
  AR.register('cancel-transfer', {
    label: 'Cancel Transfer',
    icon: '✗',
    handler: (transferId) => {
      if (window.TransferUI && transferId) {
        window.TransferUI.cancelTransfer(transferId);
      }
    },
    description: 'Cancel pending transfer',
    confirmMessage: 'Are you sure you want to cancel this transfer?'
  });

  // View Transfer
  AR.register('view-transfer', {
    label: 'View Transfer',
    icon: '👁️',
    handler: (transferId) => {
      if (window.TransferUI && transferId) {
        window.TransferUI.viewTransfer(transferId);
      }
    },
    description: 'View transfer details'
  });

  // View Product Transfer History
  AR.register('view-product-transfers', {
    label: 'Transfer History',
    icon: '📜',
    handler: (productId) => {
      if (window.TransferUI && productId) {
        window.TransferUI.showProductTransferHistory(productId);
      }
    },
    description: 'View transfer history for product'
  });

  // Bulk Complete Pending Transfers
  AR.register('complete-all-pending-transfers', {
    label: 'Complete All Pending',
    icon: '✓✓',
    handler: () => {
      if (!window.Transfers) return;

      const pending = window.Transfers.getPendingTransfers();
      if (pending.length === 0) {
        alert('No pending transfers to complete');
        return;
      }

      if (!confirm(`Complete all ${pending.length} pending transfers?`)) {
        return;
      }

      let completed = 0;
      let failed = 0;

      pending.forEach(transfer => {
        const result = window.Transfers.completeTransfer(transfer.id);
        if (result.success) {
          completed++;
        } else {
          failed++;
          console.error(`Failed to complete transfer ${transfer.id}:`, result.error);
        }
      });

      alert(`Completed: ${completed}\nFailed: ${failed}`);

      if (typeof refreshTransferList === 'function') {
        refreshTransferList();
      }

      if (typeof refreshProductList === 'function') {
        refreshProductList();
      }
    },
    description: 'Complete all pending transfers at once',
    confirmMessage: 'Complete all pending transfers? This cannot be undone.'
  });
}

/**
 * Register transfer keyboard shortcuts
 */
function registerTransferShortcuts() {
  if (!window.ShortcutManager) {
    console.warn('ShortcutManager not available');
    return;
  }

  const SM = window.ShortcutManager;

  // Ctrl+Shift+T - New Transfer
  SM.register('ctrl+shift+t', () => {
    if (window.ActionRegistry) {
      window.ActionRegistry.execute('new-transfer');
    }
  }, 'Create new transfer');
}

/**
 * Register transfer context menu items
 */
function registerTransferContextMenus() {
  // Context menus for transfer table rows can be added here
  // This would require integration with the context-menu system
}

/**
 * Initialize all transfer actions
 */
function initializeTransferActions() {
  registerTransferActions();
  registerTransferShortcuts();
  registerTransferContextMenus();

  console.log('Transfer actions registered');
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTransferActions);
  } else {
    // DOM already loaded, initialize immediately
    initializeTransferActions();
  }

  // Export for manual initialization if needed
  window.TransferActions = {
    register: registerTransferActions,
    registerShortcuts: registerTransferShortcuts,
    registerContextMenus: registerTransferContextMenus,
    initialize: initializeTransferActions
  };
}
