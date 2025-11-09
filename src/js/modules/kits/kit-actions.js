/**
 * CodeLapras - Kit Actions
 *
 * Handles kit actions, keyboard shortcuts, context menus, and bulk operations.
 *
 * Day 19: Kits Module
 */

import * as KitUI from './kit-ui.js';
import { ActionRegistry } from '../../ui/actions.js';
import { ShortcutManager } from '../../ui/shortcuts.js';
import { ContextMenu } from '../../ui/context-menu.js';
import { showNotification } from '../../ui/notifications.js';

/**
 * Initialize kit actions
 */
export function initializeKitActions() {
  console.log('[Kit Actions] Initializing...');

  registerActions();
  registerShortcuts();
  registerContextMenus();

  console.log('[Kit Actions] Initialized successfully');
}

/**
 * Register all kit actions
 */
function registerActions() {
  // New Kit
  ActionRegistry.register('new-kit', {
    label: 'New Kit',
    icon: '📦',
    category: 'kits',
    handler: () => {
      KitUI.showKitDialog();
    },
    description: 'Create a new product kit/bundle',
    shortcut: 'Ctrl+Shift+K'
  });

  // Refresh Kits
  ActionRegistry.register('refresh-kits', {
    label: 'Refresh Kits',
    icon: '🔄',
    category: 'kits',
    handler: () => {
      KitUI.renderKitsTable();
      showNotification('Kits refreshed', 'success');
    },
    description: 'Refresh kit list',
    shortcut: 'Ctrl+R'
  });

  // Export Kits to CSV
  ActionRegistry.register('export-kits-csv', {
    label: 'Export to CSV',
    icon: '📥',
    category: 'kits',
    handler: () => {
      exportKitsToCSV();
    },
    description: 'Export kits to CSV file',
    shortcut: 'Ctrl+Shift+E'
  });

  // Edit Kit
  ActionRegistry.register('edit-kit', {
    label: 'Edit Kit',
    icon: '✏️',
    category: 'kits',
    handler: (kitId) => {
      if (!kitId) {
        showNotification('Please select a kit to edit', 'warning');
        return;
      }
      KitUI.editKit(kitId);
    },
    description: 'Edit kit details and components',
    shortcut: 'Enter'
  });

  // Delete Kit
  ActionRegistry.register('delete-kit', {
    label: 'Delete Kit',
    icon: '🗑️',
    category: 'kits',
    handler: (kitId) => {
      if (!kitId) {
        showNotification('Please select a kit to delete', 'warning');
        return;
      }
      KitUI.deleteKit(kitId);
    },
    description: 'Delete kit',
    shortcut: 'Delete'
  });

  // Duplicate Kit
  ActionRegistry.register('duplicate-kit', {
    label: 'Duplicate Kit',
    icon: '📋',
    category: 'kits',
    handler: (kitId) => {
      if (!kitId) {
        showNotification('Please select a kit to duplicate', 'warning');
        return;
      }
      KitUI.duplicateKit(kitId);
    },
    description: 'Create a copy of the kit',
    shortcut: 'Ctrl+D'
  });

  // Craft Kit
  ActionRegistry.register('craft-kit', {
    label: 'Craft Kit',
    icon: '🔨',
    category: 'kits',
    handler: (kitId) => {
      if (!kitId) {
        showNotification('Please select a kit to craft', 'warning');
        return;
      }
      KitUI.craftKit(kitId);
    },
    description: 'Craft kit (consume components)',
    shortcut: null
  });

  // Add Kit to Order
  ActionRegistry.register('add-kit-to-order', {
    label: 'Add to Order',
    icon: '🛒',
    category: 'kits',
    handler: (kitId) => {
      if (!kitId) {
        showNotification('Please select a kit to add to order', 'warning');
        return;
      }
      KitUI.addKitToOrder(kitId);
    },
    description: 'Add kit to current order',
    shortcut: null
  });

  // Check Kit Availability
  ActionRegistry.register('check-kit-availability', {
    label: 'Check Availability',
    icon: '✅',
    category: 'kits',
    handler: (kitId) => {
      if (!kitId) {
        showNotification('Please select a kit', 'warning');
        return;
      }
      checkKitAvailability(kitId);
    },
    description: 'Check if all components are in stock',
    shortcut: null
  });

  // Calculate Suggested Price
  ActionRegistry.register('calculate-kit-price', {
    label: 'Calculate Price',
    icon: '💰',
    category: 'kits',
    handler: () => {
      KitUI.calculateSuggestedPrice();
    },
    description: 'Calculate suggested price based on markup',
    shortcut: null
  });

  // View Kit Details
  ActionRegistry.register('view-kit', {
    label: 'View Details',
    icon: '👁️',
    category: 'kits',
    handler: (kitId) => {
      if (!kitId) {
        showNotification('Please select a kit to view', 'warning');
        return;
      }
      viewKitDetails(kitId);
    },
    description: 'View kit details',
    shortcut: null
  });

  // Clear Filters
  ActionRegistry.register('clear-kit-filters', {
    label: 'Clear Filters',
    icon: '🔄',
    category: 'kits',
    handler: () => {
      clearAllFilters();
    },
    description: 'Clear all kit filters',
    shortcut: 'Ctrl+Shift+X'
  });

  // Show Only In-Stock Kits
  ActionRegistry.register('show-in-stock-kits', {
    label: 'Show In-Stock',
    icon: '✅',
    category: 'kits',
    handler: () => {
      const filterCheckbox = document.getElementById('filterInStockKits');
      if (filterCheckbox) {
        filterCheckbox.checked = true;
        filterCheckbox.dispatchEvent(new Event('change'));
      }
    },
    description: 'Show only kits with all components in stock',
    shortcut: null
  });

  // Bulk Delete
  ActionRegistry.register('bulk-delete-kits', {
    label: 'Bulk Delete',
    icon: '🗑️',
    category: 'kits',
    handler: (kitIds) => {
      if (!kitIds || kitIds.length === 0) {
        showNotification('Please select kits to delete', 'warning');
        return;
      }
      bulkDeleteKits(kitIds);
    },
    description: 'Delete multiple kits',
    shortcut: null
  });

  console.log('[Kit Actions] Registered 13 actions');
}

/**
 * Register keyboard shortcuts
 */
function registerShortcuts() {
  // Ctrl+Shift+K: New Kit
  ShortcutManager.register('Ctrl+Shift+K', () => {
    ActionRegistry.execute('new-kit');
  }, 'New Kit');

  // Ctrl+R: Refresh
  ShortcutManager.register('Ctrl+R', (e) => {
    e.preventDefault();
    ActionRegistry.execute('refresh-kits');
  }, 'Refresh Kits');

  // Ctrl+Shift+E: Export to CSV
  ShortcutManager.register('Ctrl+Shift+E', () => {
    ActionRegistry.execute('export-kits-csv');
  }, 'Export Kits');

  // Ctrl+D: Duplicate Kit (when kit selected)
  ShortcutManager.register('Ctrl+D', (e) => {
    e.preventDefault();
    // Would need to get selected kit ID from UI context
    showNotification('Select a kit and use the duplicate button', 'info');
  }, 'Duplicate Kit');

  // Ctrl+Shift+X: Clear Filters
  ShortcutManager.register('Ctrl+Shift+X', () => {
    ActionRegistry.execute('clear-kit-filters');
  }, 'Clear Kit Filters');

  console.log('[Kit Actions] Registered 5 keyboard shortcuts');
}

/**
 * Register context menus
 */
function registerContextMenus() {
  // Context menu for kit rows
  ContextMenu.register('kit-row', [
    {
      label: 'View Details',
      icon: '👁️',
      action: (context) => {
        if (context.kitId) {
          ActionRegistry.execute('view-kit', context.kitId);
        }
      }
    },
    {
      label: 'Edit Kit',
      icon: '✏️',
      action: (context) => {
        if (context.kitId) {
          ActionRegistry.execute('edit-kit', context.kitId);
        }
      }
    },
    { separator: true },
    {
      label: 'Craft Kit',
      icon: '🔨',
      action: (context) => {
        if (context.kitId) {
          ActionRegistry.execute('craft-kit', context.kitId);
        }
      }
    },
    {
      label: 'Add to Order',
      icon: '🛒',
      action: (context) => {
        if (context.kitId) {
          ActionRegistry.execute('add-kit-to-order', context.kitId);
        }
      }
    },
    { separator: true },
    {
      label: 'Duplicate',
      icon: '📋',
      action: (context) => {
        if (context.kitId) {
          ActionRegistry.execute('duplicate-kit', context.kitId);
        }
      }
    },
    {
      label: 'Check Availability',
      icon: '✅',
      action: (context) => {
        if (context.kitId) {
          ActionRegistry.execute('check-kit-availability', context.kitId);
        }
      }
    },
    { separator: true },
    {
      label: 'Delete',
      icon: '🗑️',
      className: 'danger',
      action: (context) => {
        if (context.kitId) {
          ActionRegistry.execute('delete-kit', context.kitId);
        }
      }
    }
  ]);

  console.log('[Kit Actions] Registered context menus');
}

/**
 * Export kits to CSV
 */
function exportKitsToCSV() {
  const kits = window.getAllKits ? window.getAllKits() : [];
  if (kits.length === 0) {
    showNotification('No kits to export', 'warning');
    return;
  }

  const headers = [
    'Name',
    'SKU',
    'Components',
    'Component Count',
    'Cost',
    'Price',
    'Notes'
  ];

  const rows = kits.map(k => [
    k.name || '',
    k.sku || '',
    (k.components || []).map(c => `${c.productId}:${c.qty}`).join('; '),
    (k.components || []).length,
    k.cost || 0,
    k.price || 0,
    k.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kits-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification(`Exported ${kits.length} kits to CSV`, 'success');
}

/**
 * Check kit availability and show detailed report
 */
function checkKitAvailability(kitId) {
  const kit = window.getKit ? window.getKit(kitId) : null;
  if (!kit) {
    showNotification('Kit not found', 'error');
    return;
  }

  const products = window.products || [];
  const availability = typeof window.checkKitAvailability === 'function'
    ? window.checkKitAvailability(kit, products)
    : null;

  if (!availability) {
    showNotification('Availability check not available', 'error');
    return;
  }

  let message = `Kit: ${kit.name}\n\n`;

  if (availability.available) {
    message += '✅ All components are available!\n\n';
  } else {
    message += '❌ Some components are unavailable:\n\n';
  }

  message += 'Component Status:\n';
  kit.components.forEach(comp => {
    const product = products.find(p => p.id === comp.productId);
    if (product) {
      const stock = product.qty || 0;
      const status = stock >= comp.qty ? '✅' : stock > 0 ? '⚠️' : '❌';
      message += `${status} ${product.name}: Need ${comp.qty}, Have ${stock}\n`;
    } else {
      message += `❌ Product ${comp.productId}: Not found\n`;
    }
  });

  if (availability.missing.length > 0) {
    message += '\nMissing:\n';
    availability.missing.forEach(m => {
      const product = products.find(p => p.id === m.productId);
      message += `  - ${product?.name || m.productId}: Need ${m.needed}, Have ${m.available}\n`;
    });
  }

  if (availability.lowStock.length > 0) {
    message += '\nLow Stock:\n';
    availability.lowStock.forEach(m => {
      const product = products.find(p => p.id === m.productId);
      message += `  - ${product?.name || m.productId}: Need ${m.needed}, Have ${m.available}\n`;
    });
  }

  alert(message);
}

/**
 * View kit details in alert
 */
function viewKitDetails(kitId) {
  const kit = window.getKit ? window.getKit(kitId) : null;
  if (!kit) {
    showNotification('Kit not found', 'error');
    return;
  }

  const products = window.products || [];
  const componentDetails = kit.components.map(c => {
    const product = products.find(p => p.id === c.productId);
    const name = product?.name || c.productId;
    const cost = product ? (product.cost * c.qty).toFixed(2) : '0.00';
    return `  - ${name} × ${c.qty} ($${cost})`;
  }).join('\n');

  const totalCost = typeof window.calculateKitCost === 'function'
    ? window.calculateKitCost(kit, products)
    : kit.cost || 0;

  const message = `
Kit Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: ${kit.name}
SKU: ${kit.sku || 'N/A'}

Components (${kit.components.length}):
${componentDetails}

Total Cost: $${totalCost.toFixed(2)}
Price: $${(kit.price || 0).toFixed(2)}
Margin: $${((kit.price || 0) - totalCost).toFixed(2)} (${totalCost > 0 ? (((kit.price || 0) - totalCost) / totalCost * 100).toFixed(1) : 0}%)

${kit.notes ? `Notes: ${kit.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  alert(message);
}

/**
 * Clear all filters
 */
function clearAllFilters() {
  const searchInput = document.getElementById('searchKits');
  const inStockFilter = document.getElementById('filterInStockKits');

  if (searchInput) searchInput.value = '';
  if (inStockFilter) inStockFilter.checked = false;

  // Trigger change events
  if (searchInput) searchInput.dispatchEvent(new Event('input'));
  if (inStockFilter) inStockFilter.dispatchEvent(new Event('change'));

  showNotification('Filters cleared', 'success');
}

/**
 * Bulk delete kits
 */
function bulkDeleteKits(kitIds) {
  if (!confirm(`Are you sure you want to delete ${kitIds.length} kits?`)) {
    return;
  }

  let deleted = 0;
  kitIds.forEach(id => {
    try {
      if (typeof window.deleteKitCRUD === 'function') {
        window.deleteKitCRUD(id);
        deleted++;
      }
    } catch (error) {
      console.error('[Kit Actions] Error deleting kit:', id, error);
    }
  });

  showNotification(`Deleted ${deleted} kits`, 'success');
  KitUI.renderKitsTable();
}

// Export public API
export default {
  initializeKitActions
};
