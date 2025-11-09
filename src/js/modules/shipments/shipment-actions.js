/**
 * CodeLapras - Shipment Actions
 *
 * Handles shipment actions, keyboard shortcuts, context menus, and bulk operations.
 *
 * Day 18: Shipments Module
 */

import * as Shipments from './shipments.js';
import * as ShipmentUI from './shipment-ui.js';
import * as Tracking from './tracking.js';
import { ActionRegistry } from '../../ui/actions.js';
import { ShortcutManager } from '../../ui/shortcuts.js';
import { ContextMenu } from '../../ui/context-menu.js';
import { showNotification } from '../../ui/notifications.js';

/**
 * Initialize shipment actions
 */
export function initializeShipmentActions() {
  console.log('[Shipment Actions] Initializing...');

  registerActions();
  registerShortcuts();
  registerContextMenus();

  console.log('[Shipment Actions] Initialized successfully');
}

/**
 * Register all shipment actions
 */
function registerActions() {
  // New Shipment
  ActionRegistry.register('new-shipment', {
    label: 'New Shipment',
    icon: '📦',
    category: 'shipments',
    handler: () => {
      ShipmentUI.showShipmentDialog();
    },
    description: 'Create a new shipment',
    shortcut: 'Ctrl+Shift+T'
  });

  // Refresh Shipments
  ActionRegistry.register('refresh-shipments', {
    label: 'Refresh Shipments',
    icon: '🔄',
    category: 'shipments',
    handler: () => {
      ShipmentUI.renderShipmentsTable();
      ShipmentUI.updateMetrics();
      showNotification('Shipments refreshed', 'success');
    },
    description: 'Refresh shipment list',
    shortcut: 'Ctrl+R'
  });

  // Export Shipments to CSV
  ActionRegistry.register('export-shipments-csv', {
    label: 'Export to CSV',
    icon: '📥',
    category: 'shipments',
    handler: () => {
      exportShipmentsToCSV();
    },
    description: 'Export shipments to CSV file',
    shortcut: 'Ctrl+Shift+E'
  });

  // Import Shipments from CSV
  ActionRegistry.register('import-shipments-csv', {
    label: 'Import from CSV',
    icon: '📤',
    category: 'shipments',
    handler: () => {
      importShipmentsFromCSV();
    },
    description: 'Import shipments from CSV file',
    shortcut: null
  });

  // Track Selected Shipment
  ActionRegistry.register('track-shipment', {
    label: 'Track Package',
    icon: '🔍',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment to track', 'warning');
        return;
      }
      ShipmentUI.trackShipment(shipmentId);
    },
    description: 'Open tracking page for shipment',
    shortcut: 'Ctrl+T'
  });

  // Print Shipping Label
  ActionRegistry.register('print-label', {
    label: 'Print Label',
    icon: '🖨️',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment to print', 'warning');
        return;
      }
      ShipmentUI.printLabel(shipmentId);
    },
    description: 'Print shipping label',
    shortcut: 'Ctrl+P'
  });

  // Mark as Shipped
  ActionRegistry.register('mark-shipped', {
    label: 'Mark as Shipped',
    icon: '📦',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment', 'warning');
        return;
      }
      markShipmentStatus(shipmentId, 'shipped');
    },
    description: 'Mark shipment as shipped',
    shortcut: null
  });

  // Mark as In Transit
  ActionRegistry.register('mark-in-transit', {
    label: 'Mark as In Transit',
    icon: '🚚',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment', 'warning');
        return;
      }
      markShipmentStatus(shipmentId, 'in_transit');
    },
    description: 'Mark shipment as in transit',
    shortcut: null
  });

  // Mark as Delivered
  ActionRegistry.register('mark-delivered', {
    label: 'Mark as Delivered',
    icon: '✅',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment', 'warning');
        return;
      }
      markShipmentStatus(shipmentId, 'delivered');
    },
    description: 'Mark shipment as delivered',
    shortcut: null
  });

  // Mark as Exception
  ActionRegistry.register('mark-exception', {
    label: 'Mark as Exception',
    icon: '⚠️',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment', 'warning');
        return;
      }
      markShipmentStatus(shipmentId, 'exception');
    },
    description: 'Mark shipment as exception',
    shortcut: null
  });

  // Delete Shipment
  ActionRegistry.register('delete-shipment', {
    label: 'Delete Shipment',
    icon: '🗑️',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment to delete', 'warning');
        return;
      }
      ShipmentUI.deleteShipment(shipmentId);
    },
    description: 'Delete shipment',
    shortcut: 'Delete'
  });

  // View Shipment Details
  ActionRegistry.register('view-shipment', {
    label: 'View Details',
    icon: '👁️',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment to view', 'warning');
        return;
      }
      ShipmentUI.editShipment(shipmentId);
    },
    description: 'View shipment details',
    shortcut: 'Enter'
  });

  // Copy Tracking Number
  ActionRegistry.register('copy-tracking-number', {
    label: 'Copy Tracking Number',
    icon: '📋',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment', 'warning');
        return;
      }
      copyTrackingNumber(shipmentId);
    },
    description: 'Copy tracking number to clipboard',
    shortcut: 'Ctrl+C'
  });

  // Copy Tracking URL
  ActionRegistry.register('copy-tracking-url', {
    label: 'Copy Tracking URL',
    icon: '🔗',
    category: 'shipments',
    handler: (shipmentId) => {
      if (!shipmentId) {
        showNotification('Please select a shipment', 'warning');
        return;
      }
      copyTrackingUrl(shipmentId);
    },
    description: 'Copy tracking URL to clipboard',
    shortcut: null
  });

  // Filter by Carrier
  ActionRegistry.register('filter-by-carrier', {
    label: 'Filter by Carrier',
    icon: '🔍',
    category: 'shipments',
    handler: (carrier) => {
      const filterSelect = document.getElementById('filterShipmentCarrier');
      if (filterSelect && carrier) {
        filterSelect.value = carrier;
        filterSelect.dispatchEvent(new Event('change'));
      }
    },
    description: 'Filter shipments by carrier',
    shortcut: null
  });

  // Filter by Status
  ActionRegistry.register('filter-by-status', {
    label: 'Filter by Status',
    icon: '🔍',
    category: 'shipments',
    handler: (status) => {
      const filterSelect = document.getElementById('filterShipmentStatus');
      if (filterSelect && status) {
        filterSelect.value = status;
        filterSelect.dispatchEvent(new Event('change'));
      }
    },
    description: 'Filter shipments by status',
    shortcut: null
  });

  // Clear Filters
  ActionRegistry.register('clear-shipment-filters', {
    label: 'Clear Filters',
    icon: '🔄',
    category: 'shipments',
    handler: () => {
      clearAllFilters();
    },
    description: 'Clear all shipment filters',
    shortcut: 'Ctrl+Shift+X'
  });

  // Show Overdue Shipments
  ActionRegistry.register('show-overdue-shipments', {
    label: 'Show Overdue',
    icon: '⚠️',
    category: 'shipments',
    handler: () => {
      showOverdueShipments();
    },
    description: 'Show only overdue shipments',
    shortcut: null
  });

  // Show Delivered Shipments
  ActionRegistry.register('show-delivered-shipments', {
    label: 'Show Delivered',
    icon: '✅',
    category: 'shipments',
    handler: () => {
      ActionRegistry.execute('filter-by-status', 'delivered');
    },
    description: 'Show only delivered shipments',
    shortcut: null
  });

  // Bulk Delete
  ActionRegistry.register('bulk-delete-shipments', {
    label: 'Bulk Delete',
    icon: '🗑️',
    category: 'shipments',
    handler: (shipmentIds) => {
      if (!shipmentIds || shipmentIds.length === 0) {
        showNotification('Please select shipments to delete', 'warning');
        return;
      }
      bulkDeleteShipments(shipmentIds);
    },
    description: 'Delete multiple shipments',
    shortcut: null
  });

  // Generate Shipping Report
  ActionRegistry.register('generate-shipping-report', {
    label: 'Generate Report',
    icon: '📊',
    category: 'shipments',
    handler: () => {
      generateShippingReport();
    },
    description: 'Generate shipping summary report',
    shortcut: null
  });

  console.log('[Shipment Actions] Registered 20 actions');
}

/**
 * Register keyboard shortcuts
 */
function registerShortcuts() {
  // Ctrl+Shift+T: New Shipment
  ShortcutManager.register('Ctrl+Shift+T', () => {
    ActionRegistry.execute('new-shipment');
  }, 'New Shipment');

  // Ctrl+R: Refresh
  ShortcutManager.register('Ctrl+R', (e) => {
    e.preventDefault();
    ActionRegistry.execute('refresh-shipments');
  }, 'Refresh Shipments');

  // Ctrl+Shift+E: Export to CSV
  ShortcutManager.register('Ctrl+Shift+E', () => {
    ActionRegistry.execute('export-shipments-csv');
  }, 'Export Shipments');

  // Ctrl+Shift+X: Clear Filters
  ShortcutManager.register('Ctrl+Shift+X', () => {
    ActionRegistry.execute('clear-shipment-filters');
  }, 'Clear Shipment Filters');

  console.log('[Shipment Actions] Registered 4 keyboard shortcuts');
}

/**
 * Register context menus
 */
function registerContextMenus() {
  // Context menu for shipment rows
  ContextMenu.register('shipment-row', [
    {
      label: 'View Details',
      icon: '👁️',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('view-shipment', context.shipmentId);
        }
      }
    },
    { separator: true },
    {
      label: 'Track Package',
      icon: '🔍',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('track-shipment', context.shipmentId);
        }
      }
    },
    {
      label: 'Print Label',
      icon: '🖨️',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('print-label', context.shipmentId);
        }
      }
    },
    { separator: true },
    {
      label: 'Mark as Shipped',
      icon: '📦',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('mark-shipped', context.shipmentId);
        }
      }
    },
    {
      label: 'Mark as Delivered',
      icon: '✅',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('mark-delivered', context.shipmentId);
        }
      }
    },
    { separator: true },
    {
      label: 'Copy Tracking Number',
      icon: '📋',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('copy-tracking-number', context.shipmentId);
        }
      }
    },
    {
      label: 'Copy Tracking URL',
      icon: '🔗',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('copy-tracking-url', context.shipmentId);
        }
      }
    },
    { separator: true },
    {
      label: 'Delete',
      icon: '🗑️',
      className: 'danger',
      action: (context) => {
        if (context.shipmentId) {
          ActionRegistry.execute('delete-shipment', context.shipmentId);
        }
      }
    }
  ]);

  console.log('[Shipment Actions] Registered context menus');
}

/**
 * Mark shipment with specific status
 */
function markShipmentStatus(shipmentId, status) {
  try {
    const updates = { status };

    // Set delivered date if marking as delivered
    if (status === 'delivered' && !Shipments.getShipment(shipmentId).deliveredDate) {
      updates.deliveredDate = new Date().toISOString();
    }

    // Set shipped date if marking as shipped
    if (status === 'shipped' && !Shipments.getShipment(shipmentId).shippedDate) {
      updates.shippedDate = new Date().toISOString();
    }

    Shipments.updateShipment(shipmentId, updates);

    const badge = Tracking.getStatusBadge(status);
    showNotification(`Shipment marked as ${badge.label}`, 'success');

    ShipmentUI.renderShipmentsTable();
    ShipmentUI.updateMetrics();
  } catch (error) {
    console.error('[Shipment Actions] Error updating status:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Copy tracking number to clipboard
 */
function copyTrackingNumber(shipmentId) {
  const shipment = Shipments.getShipment(shipmentId);
  if (!shipment || !shipment.trackingNumber) {
    showNotification('No tracking number to copy', 'warning');
    return;
  }

  navigator.clipboard.writeText(shipment.trackingNumber)
    .then(() => {
      showNotification('Tracking number copied to clipboard', 'success');
    })
    .catch((error) => {
      console.error('[Shipment Actions] Error copying to clipboard:', error);
      showNotification('Failed to copy to clipboard', 'error');
    });
}

/**
 * Copy tracking URL to clipboard
 */
function copyTrackingUrl(shipmentId) {
  const url = Shipments.getTrackingUrl(shipmentId);
  if (!url) {
    showNotification('No tracking URL available', 'warning');
    return;
  }

  navigator.clipboard.writeText(url)
    .then(() => {
      showNotification('Tracking URL copied to clipboard', 'success');
    })
    .catch((error) => {
      console.error('[Shipment Actions] Error copying to clipboard:', error);
      showNotification('Failed to copy to clipboard', 'error');
    });
}

/**
 * Export shipments to CSV
 */
function exportShipmentsToCSV() {
  const shipments = Shipments.getAllShipments();
  if (shipments.length === 0) {
    showNotification('No shipments to export', 'warning');
    return;
  }

  const csv = Tracking.exportTrackingToCsv(shipments);

  // Create download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shipments-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification(`Exported ${shipments.length} shipments to CSV`, 'success');
}

/**
 * Import shipments from CSV
 */
function importShipmentsFromCSV() {
  // Create file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');

        // Skip header row
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse CSV line (simple implementation)
          const values = line.split(',').map(v => v.replace(/^"|"$/g, ''));

          const shipmentData = {
            trackingNumber: values[0],
            carrier: values[1],
            status: values[2],
            orderId: values[3],
            recipientName: values[4],
            shippedDate: values[5] || null,
            estimatedDelivery: values[6] || null,
            deliveredDate: values[7] || null,
            notes: values[9]
          };

          if (shipmentData.trackingNumber && shipmentData.carrier) {
            Shipments.createShipment(shipmentData);
            imported++;
          }
        }

        showNotification(`Imported ${imported} shipments`, 'success');
        ShipmentUI.renderShipmentsTable();
        ShipmentUI.updateMetrics();
      } catch (error) {
        console.error('[Shipment Actions] Error importing CSV:', error);
        showNotification('Error importing CSV file', 'error');
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

/**
 * Clear all filters
 */
function clearAllFilters() {
  const statusFilter = document.getElementById('filterShipmentStatus');
  const carrierFilter = document.getElementById('filterShipmentCarrier');
  const searchInput = document.getElementById('searchShipments');

  if (statusFilter) statusFilter.value = 'all';
  if (carrierFilter) carrierFilter.value = 'all';
  if (searchInput) searchInput.value = '';

  // Trigger change events
  if (statusFilter) statusFilter.dispatchEvent(new Event('change'));
  if (carrierFilter) carrierFilter.dispatchEvent(new Event('change'));
  if (searchInput) searchInput.dispatchEvent(new Event('input'));

  showNotification('Filters cleared', 'success');
}

/**
 * Show overdue shipments
 */
function showOverdueShipments() {
  const allShipments = Shipments.getAllShipments();
  const overdueShipments = allShipments.filter(s => Tracking.isOverdue(s));

  if (overdueShipments.length === 0) {
    showNotification('No overdue shipments', 'info');
    return;
  }

  // This would ideally filter the table, but for now just show count
  showNotification(`Found ${overdueShipments.length} overdue shipments`, 'warning');
}

/**
 * Bulk delete shipments
 */
function bulkDeleteShipments(shipmentIds) {
  if (!confirm(`Are you sure you want to delete ${shipmentIds.length} shipments?`)) {
    return;
  }

  let deleted = 0;
  shipmentIds.forEach(id => {
    try {
      Shipments.deleteShipment(id);
      deleted++;
    } catch (error) {
      console.error('[Shipment Actions] Error deleting shipment:', id, error);
    }
  });

  showNotification(`Deleted ${deleted} shipments`, 'success');
  ShipmentUI.renderShipmentsTable();
  ShipmentUI.updateMetrics();
}

/**
 * Generate shipping report
 */
function generateShippingReport() {
  const summary = Tracking.getTrackingSummary(Shipments.getAllShipments());

  const report = `
Shipping Summary Report
Generated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Shipments: ${summary.total}

Status Breakdown:
  ⏳ Pending: ${summary.pending}
  📦 Shipped: ${summary.shipped}
  🚚 In Transit: ${summary.inTransit}
  ✅ Delivered: ${summary.delivered}
  ⚠️  Exception: ${summary.exception}

Performance:
  ⚠️  Overdue: ${summary.overdue}
  ✅ Delivered On Time: ${summary.deliveredOnTime}
  📊 Average Delivery Days: ${summary.averageDeliveryDays}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;

  console.log(report);

  // Show in alert
  alert(report);

  showNotification('Report generated', 'success');
}

// Export public API
export default {
  initializeShipmentActions
};
