/**
 * order-actions.js - Order Action Registration
 *
 * Registers all order-related actions with the Day 10 ActionRegistry:
 * - CRUD operations (create, edit, delete)
 * - Workflow actions (fulfill, cancel)
 * - Export/print actions
 *
 * Also registers:
 * - Keyboard shortcuts (Day 10 ShortcutManager)
 * - Context menus (Day 10 ContextMenu)
 *
 * Usage:
 * Call registerOrderActions() on app initialization
 */

// ============================================================================
// ACTION REGISTRATION
// ============================================================================

/**
 * Register all order actions
 */
function registerOrderActions() {
  if (!window.ActionRegistry) {
    console.warn('ActionRegistry not available. Order actions not registered.');
    return;
  }

  const AR = window.ActionRegistry;

  // ============================================================================
  // CRUD ACTIONS
  // ============================================================================

  // New Order
  AR.register('new-order', {
    label: 'New Order',
    icon: '➕',
    handler: () => {
      if (window.OrderUI && window.OrderUI.openOrderDialog) {
        window.OrderUI.openOrderDialog(null);
      } else {
        console.error('OrderUI not available');
      }
    }
  });

  // Edit Order
  AR.register('edit-order', {
    label: 'Edit Order',
    icon: '✏️',
    handler: (data) => {
      if (!data || !data.id) {
        console.error('Order ID required for edit');
        return;
      }

      // Get order from global data or orders.js
      let order = null;
      if (window.Orders && window.Orders.getOrderById) {
        order = window.Orders.getOrderById(data.id);
      } else if (window.orders) {
        order = window.orders.find(o => o.id === data.id);
      }

      if (!order) {
        console.error('Order not found:', data.id);
        if (window.Notifications) {
          window.Notifications.error('Order not found');
        }
        return;
      }

      if (window.OrderUI && window.OrderUI.openOrderDialog) {
        window.OrderUI.openOrderDialog(order);
      }
    }
  });

  // Delete Order
  AR.register('delete-order', {
    label: 'Delete Order',
    icon: '🗑️',
    danger: true,
    confirm: 'Delete this order? This action cannot be undone.',
    handler: async (data) => {
      if (!data || !data.id) {
        console.error('Order ID required for delete');
        return;
      }

      // Call delete function from orders.js
      if (window.Orders && window.Orders.deleteOrderCRUD) {
        const result = window.Orders.deleteOrderCRUD(data.id);

        if (result.success) {
          // Refresh order table
          if (window.OrderUI && window.OrderUI.renderOrderTable && window.orders) {
            window.OrderUI.renderOrderTable('orderTableBody', window.orders);
          }

          if (window.Notifications) {
            window.Notifications.success('Order deleted successfully');
          }

          // Emit event
          if (window.EventBus) {
            window.EventBus.emit('order:deleted', { id: data.id });
          }
        } else {
          if (window.Notifications) {
            window.Notifications.error(result.error || 'Failed to delete order');
          }
        }

        return result;
      } else {
        console.error('Orders.deleteOrderCRUD not available');
      }
    }
  });

  // Save Order (from dialog)
  AR.register('save-order', {
    label: 'Save Order',
    icon: '💾',
    handler: async () => {
      // Validate form
      if (window.OrderUI && window.OrderUI.validateOrderForm) {
        const validation = window.OrderUI.validateOrderForm();
        if (!validation.valid) {
          if (window.Notifications) {
            window.Notifications.error('Please fix form errors: ' + validation.errors.join(', '));
          }
          return { success: false, errors: validation.errors };
        }
      }

      // Extract form data
      let orderData = null;
      if (window.OrderUI && window.OrderUI.extractOrderFormData) {
        orderData = window.OrderUI.extractOrderFormData();
      }

      if (!orderData) {
        console.error('Could not extract order data');
        return { success: false };
      }

      // Check if creating or updating
      const isUpdate = orderData.id && window.orders && window.orders.some(o => o.id === orderData.id);

      // Save order
      let result = null;
      if (window.Orders) {
        if (isUpdate && window.Orders.updateOrderCRUD) {
          result = window.Orders.updateOrderCRUD(orderData.id, orderData);
        } else if (window.Orders.createOrderCRUD) {
          result = window.Orders.createOrderCRUD(orderData);
        }
      }

      if (result && result.success) {
        // Close dialog
        if (window.OrderUI && window.OrderUI.closeOrderDialog) {
          window.OrderUI.closeOrderDialog();
        }

        // Refresh table
        if (window.OrderUI && window.OrderUI.renderOrderTable && window.orders) {
          window.OrderUI.renderOrderTable('orderTableBody', window.orders);
        }

        if (window.Notifications) {
          window.Notifications.success(isUpdate ? 'Order updated' : 'Order created');
        }

        // Emit event
        if (window.EventBus) {
          window.EventBus.emit(isUpdate ? 'order:updated' : 'order:created', { order: result.order });
        }
      } else {
        if (window.Notifications) {
          window.Notifications.error(result?.error || 'Failed to save order');
        }
      }

      return result || { success: false };
    }
  });

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  // Fulfill Order
  AR.register('fulfill-order', {
    label: 'Fulfill Order',
    icon: '✅',
    confirm: 'Fulfill this order? Stock will be deducted.',
    handler: async (data) => {
      if (!data || !data.id) {
        console.error('Order ID required for fulfill');
        return;
      }

      if (window.Orders && window.Orders.fulfillOrder) {
        const result = window.Orders.fulfillOrder(data.id);

        if (result.success) {
          // Refresh table
          if (window.OrderUI && window.OrderUI.renderOrderTable && window.orders) {
            window.OrderUI.renderOrderTable('orderTableBody', window.orders);
          }

          // Refresh product table if visible
          if (typeof render === 'function') {
            render();
          }

          if (window.Notifications) {
            window.Notifications.success('Order fulfilled successfully. Stock deducted.');
          }

          // Emit event
          if (window.EventBus) {
            window.EventBus.emit('order:fulfilled', { id: data.id, order: result.order });
          }
        } else {
          if (window.Notifications) {
            window.Notifications.error(result.error || 'Failed to fulfill order');
          }
        }

        return result;
      } else {
        console.error('Orders.fulfillOrder not available');
      }
    }
  });

  // Cancel Order
  AR.register('cancel-order', {
    label: 'Cancel Order',
    icon: '❌',
    danger: true,
    confirm: 'Cancel this order?',
    handler: async (data) => {
      if (!data || !data.id) {
        console.error('Order ID required for cancel');
        return;
      }

      if (window.Orders && window.Orders.cancelOrder) {
        const result = window.Orders.cancelOrder(data.id);

        if (result.success) {
          // Refresh table
          if (window.OrderUI && window.OrderUI.renderOrderTable && window.orders) {
            window.OrderUI.renderOrderTable('orderTableBody', window.orders);
          }

          if (window.Notifications) {
            window.Notifications.success('Order cancelled');
          }

          // Emit event
          if (window.EventBus) {
            window.EventBus.emit('order:cancelled', { id: data.id });
          }
        } else {
          if (window.Notifications) {
            window.Notifications.error(result.error || 'Failed to cancel order');
          }
        }

        return result;
      } else {
        console.error('Orders.cancelOrder not available');
      }
    }
  });

  // ============================================================================
  // VIEW ACTIONS
  // ============================================================================

  // View Order Details
  AR.register('view-order', {
    label: 'View Details',
    icon: '👁️',
    handler: (data) => {
      if (!data || !data.id) return;

      // For now, just open edit dialog
      // In future, could show read-only detail view
      AR.execute('edit-order', data);
    }
  });

  // Print Order
  AR.register('print-order', {
    label: 'Print Order',
    icon: '🖨️',
    handler: (data) => {
      if (!data || !data.id) return;

      // Get order
      let order = null;
      if (window.Orders && window.Orders.getOrderById) {
        order = window.Orders.getOrderById(data.id);
      }

      if (!order) {
        if (window.Notifications) {
          window.Notifications.error('Order not found');
        }
        return;
      }

      // TODO: Implement print functionality
      console.log('Print order:', order);
      if (window.Notifications) {
        window.Notifications.info('Print functionality coming soon');
      }
    }
  });

  // ============================================================================
  // EXPORT ACTIONS
  // ============================================================================

  // Export Orders
  AR.register('export-orders', {
    label: 'Export Orders',
    icon: '⬇️',
    handler: () => {
      if (!window.orders || window.orders.length === 0) {
        if (window.Notifications) {
          window.Notifications.warning('No orders to export');
        }
        return;
      }

      // TODO: Implement CSV export
      console.log('Export orders:', window.orders);
      if (window.Notifications) {
        window.Notifications.info('Export functionality coming soon');
      }
    }
  });

  console.log('✅ Order actions registered');
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Register order keyboard shortcuts
 */
function registerOrderShortcuts() {
  if (!window.ShortcutManager) {
    console.warn('ShortcutManager not available. Order shortcuts not registered.');
    return;
  }

  const SM = window.ShortcutManager;

  // Ctrl+Shift+O - New Order
  SM.register('Ctrl+Shift+O', {
    description: 'Create new order',
    category: 'Orders',
    action: 'new-order',
    handler: () => {
      if (window.ActionRegistry) {
        window.ActionRegistry.execute('new-order');
      }
    }
  });

  console.log('✅ Order shortcuts registered');
}

// ============================================================================
// CONTEXT MENUS
// ============================================================================

/**
 * Register order context menus
 */
function registerOrderContextMenus() {
  if (!window.ContextMenu) {
    console.warn('ContextMenu not available. Order context menus not registered.');
    return;
  }

  const CM = window.ContextMenu;

  // Order row context menu
  CM.register('order-row', [
    { label: 'Edit', action: 'edit-order', icon: '✏️' },
    { label: 'View Details', action: 'view-order', icon: '👁️' },
    { separator: true },
    { label: 'Fulfill', action: 'fulfill-order', icon: '✅' },
    { label: 'Cancel', action: 'cancel-order', icon: '❌', danger: true },
    { separator: true },
    { label: 'Print', action: 'print-order', icon: '🖨️' },
    { separator: true },
    { label: 'Delete', action: 'delete-order', icon: '🗑️', danger: true }
  ]);

  // Attach to order table (if exists)
  const orderTable = document.getElementById('orderTableBody');
  if (orderTable) {
    CM.attach(orderTable.parentElement, 'tr[data-id]', 'order-row', (row) => {
      return { id: row.dataset.id };
    });
  }

  console.log('✅ Order context menus registered');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all order actions, shortcuts, and menus
 */
function initializeOrderActions() {
  registerOrderActions();
  registerOrderShortcuts();
  registerOrderContextMenus();
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOrderActions);
} else {
  initializeOrderActions();
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.OrderActions = {
    registerOrderActions,
    registerOrderShortcuts,
    registerOrderContextMenus,
    initializeOrderActions
  };
}
