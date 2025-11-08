/**
 * product-actions.js - Product Action Registration
 *
 * Registers all product-related actions with the Day 10 ActionRegistry:
 * - CRUD operations (create, edit, delete, duplicate)
 * - Quantity adjustments
 * - Export/import
 * - Search/filter actions
 *
 * Also registers:
 * - Keyboard shortcuts (Day 10 ShortcutManager)
 * - Context menus (Day 10 ContextMenu)
 *
 * Usage:
 * Call registerProductActions() on app initialization
 */

// ============================================================================
// ACTION REGISTRATION
// ============================================================================

/**
 * Register all product actions
 */
function registerProductActions() {
  if (!window.ActionRegistry) {
    console.warn('ActionRegistry not available. Product actions not registered.');
    return;
  }

  const AR = window.ActionRegistry;

  // ============================================================================
  // CRUD ACTIONS
  // ============================================================================

  // New Product
  AR.register('new-product', {
    label: 'New Product',
    icon: '➕',
    handler: () => {
      if (window.ProductUI && window.ProductUI.openProductDialog) {
        window.ProductUI.openProductDialog(null);
      } else {
        console.error('ProductUI not available');
      }
    }
  });

  // Edit Product
  AR.register('edit-product', {
    label: 'Edit Product',
    icon: '✏️',
    handler: (data) => {
      if (!data || !data.id) {
        console.error('Product ID required for edit');
        return;
      }

      // Get product from global data or products.js
      let product = null;
      if (window.Products && window.Products.getProduct) {
        product = window.Products.getProduct(data.id);
      } else if (window.data) {
        product = window.data.find(p => p.id === data.id);
      }

      if (!product) {
        console.error('Product not found:', data.id);
        if (window.Notifications) {
          window.Notifications.error('Product not found');
        }
        return;
      }

      if (window.ProductUI && window.ProductUI.openProductDialog) {
        window.ProductUI.openProductDialog(product);
      }
    }
  });

  // Delete Product
  AR.register('delete-product', {
    label: 'Delete Product',
    icon: '🗑️',
    danger: true,
    confirm: 'Delete this product? This action cannot be undone.',
    bulk: true,
    handler: async (data) => {
      if (!data || !data.id) {
        console.error('Product ID required for delete');
        return;
      }

      // Call delete function from products.js
      if (window.Products && window.Products.deleteProduct) {
        const result = window.Products.deleteProduct(data.id);

        if (result.success) {
          // Refresh table if render function exists
          if (typeof render === 'function') {
            render();
          } else if (window.ProductUI && window.ProductUI.renderProductTable) {
            window.ProductUI.renderProductTable('rows', window.data || []);
          }

          if (window.Notifications) {
            window.Notifications.success('Product deleted successfully');
          }

          // Emit event
          if (window.EventBus) {
            window.EventBus.emit('product:deleted', { id: data.id });
          }
        }

        return result;
      } else {
        console.error('Products.deleteProduct not available');
      }
    }
  });

  // Duplicate Product
  AR.register('duplicate-product', {
    label: 'Duplicate Product',
    icon: '📋',
    handler: (data) => {
      if (!data || !data.id) {
        console.error('Product ID required for duplicate');
        return;
      }

      if (window.Products && window.Products.duplicateProduct) {
        const result = window.Products.duplicateProduct(data.id);

        if (result.success) {
          // Refresh table
          if (typeof render === 'function') {
            render();
          }

          if (window.Notifications) {
            window.Notifications.success('Product duplicated successfully');
          }

          // Emit event
          if (window.EventBus) {
            window.EventBus.emit('product:duplicated', { original: data.id, duplicate: result.product });
          }
        }

        return result;
      }
    }
  });

  // Save Product (from dialog)
  AR.register('save-product', {
    label: 'Save Product',
    icon: '💾',
    handler: async () => {
      // Validate form
      if (window.ProductUI && window.ProductUI.validateProductForm) {
        const validation = window.ProductUI.validateProductForm();
        if (!validation.valid) {
          if (window.Notifications) {
            window.Notifications.error('Please fix form errors');
          }
          return { success: false, errors: validation.errors };
        }
      }

      // Extract form data
      let productData = null;
      if (window.ProductUI && window.ProductUI.extractProductFormData) {
        productData = window.ProductUI.extractProductFormData();
      }

      if (!productData) {
        console.error('Could not extract product data');
        return { success: false };
      }

      // Check if creating or updating
      const isUpdate = productData.id && window.data && window.data.some(p => p.id === productData.id);

      // Save product
      let result = null;
      if (window.Products) {
        if (isUpdate && window.Products.updateProduct) {
          result = window.Products.updateProduct(productData.id, productData);
        } else if (window.Products.createProduct) {
          result = window.Products.createProduct(productData);
        }
      }

      if (result && result.success) {
        // Close dialog
        if (window.ProductUI && window.ProductUI.closeProductDialog) {
          window.ProductUI.closeProductDialog();
        }

        // Refresh table
        if (typeof render === 'function') {
          render();
        }

        if (window.Notifications) {
          window.Notifications.success(isUpdate ? 'Product updated' : 'Product created');
        }

        // Emit event
        if (window.EventBus) {
          window.EventBus.emit(isUpdate ? 'product:updated' : 'product:created', { product: result.product });
        }
      }

      return result || { success: false };
    }
  });

  // ============================================================================
  // QUANTITY ACTIONS
  // ============================================================================

  // Adjust Quantity Up
  AR.register('adjust-quantity-up', {
    label: 'Increase Quantity',
    icon: '➕',
    handler: (data) => {
      if (!data || !data.id) return;

      if (window.Products && window.Products.adjustQuantity) {
        const result = window.Products.adjustQuantity(data.id, 1);

        if (result.success) {
          // Refresh table
          if (typeof render === 'function') {
            render();
          }

          if (window.EventBus) {
            window.EventBus.emit('product:quantity-changed', { id: data.id, delta: 1 });
          }
        }

        return result;
      }
    }
  });

  // Adjust Quantity Down
  AR.register('adjust-quantity-down', {
    label: 'Decrease Quantity',
    icon: '➖',
    confirm: 'Decrease quantity by 1?',
    handler: (data) => {
      if (!data || !data.id) return;

      if (window.Products && window.Products.adjustQuantity) {
        const result = window.Products.adjustQuantity(data.id, -1);

        if (result.success) {
          // Refresh table
          if (typeof render === 'function') {
            render();
          }

          if (window.EventBus) {
            window.EventBus.emit('product:quantity-changed', { id: data.id, delta: -1 });
          }
        }

        return result;
      }
    }
  });

  // Use Units (for measurable products)
  AR.register('use-units', {
    label: 'Use Units',
    icon: '📦',
    handler: (data) => {
      if (!data || !data.id) return;

      // Open use units dialog
      if (typeof useUnits === 'function') {
        useUnits(data.id);
      } else {
        console.warn('useUnits function not available');
      }
    }
  });

  // ============================================================================
  // VIEW ACTIONS
  // ============================================================================

  // View Product Details
  AR.register('view-product', {
    label: 'View Details',
    icon: '👁️',
    handler: (data) => {
      if (!data || !data.id) return;

      // For now, just open edit dialog
      // In future, could show read-only detail view
      AR.execute('edit-product', data);
    }
  });

  // ============================================================================
  // EXPORT/IMPORT ACTIONS
  // ============================================================================

  // Export Products
  AR.register('export-products', {
    label: 'Export Products',
    icon: '⬇️',
    handler: () => {
      if (typeof downloadCSV === 'function') {
        downloadCSV();
        if (window.Notifications) {
          window.Notifications.success('Products exported successfully');
        }
      } else {
        console.warn('downloadCSV function not available');
      }
    }
  });

  // Import Products
  AR.register('import-products', {
    label: 'Import Products',
    icon: '⬆️',
    handler: () => {
      const fileInput = document.getElementById('importFile');
      if (fileInput) {
        fileInput.click();
      } else {
        console.warn('Import file input not found');
      }
    }
  });

  console.log('✅ Product actions registered');
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Register product keyboard shortcuts
 */
function registerProductShortcuts() {
  if (!window.ShortcutManager) {
    console.warn('ShortcutManager not available. Product shortcuts not registered.');
    return;
  }

  const SM = window.ShortcutManager;

  // Ctrl+N - New Product (override default)
  SM.register('Ctrl+N', {
    description: 'Create new product',
    category: 'Products',
    action: 'new-product',
    handler: () => {
      const btnAdd = document.getElementById('btnAdd');
      if (btnAdd) {
        btnAdd.click();
      } else if (window.ActionRegistry) {
        window.ActionRegistry.execute('new-product');
      }
    }
  });

  // Ctrl+E - Edit Product (when product selected)
  SM.register('Ctrl+E', {
    description: 'Edit selected product',
    category: 'Products',
    condition: () => {
      // Only if a product is selected (implement selection tracking)
      return window.selectedProductId !== undefined && window.selectedProductId !== null;
    },
    handler: () => {
      if (window.selectedProductId && window.ActionRegistry) {
        window.ActionRegistry.execute('edit-product', { id: window.selectedProductId });
      }
    }
  });

  // Ctrl+D - Duplicate Product
  SM.register('Ctrl+D', {
    description: 'Duplicate selected product',
    category: 'Products',
    condition: () => window.selectedProductId !== undefined && window.selectedProductId !== null,
    handler: () => {
      if (window.selectedProductId && window.ActionRegistry) {
        window.ActionRegistry.execute('duplicate-product', { id: window.selectedProductId });
      }
    }
  });

  console.log('✅ Product shortcuts registered');
}

// ============================================================================
// CONTEXT MENUS
// ============================================================================

/**
 * Register product context menus
 */
function registerProductContextMenus() {
  if (!window.ContextMenu) {
    console.warn('ContextMenu not available. Product context menus not registered.');
    return;
  }

  const CM = window.ContextMenu;

  // Product row context menu
  CM.register('product-row', [
    { label: 'Edit', action: 'edit-product', icon: '✏️', shortcut: 'Ctrl+E' },
    { label: 'Duplicate', action: 'duplicate-product', icon: '📋', shortcut: 'Ctrl+D' },
    { label: 'View Details', action: 'view-product', icon: '👁️' },
    { separator: true },
    { label: 'Increase Qty', action: 'adjust-quantity-up', icon: '➕' },
    { label: 'Decrease Qty', action: 'adjust-quantity-down', icon: '➖' },
    { label: 'Use Units', action: 'use-units', icon: '📦' },
    { separator: true },
    { label: 'Delete', action: 'delete-product', icon: '🗑️', danger: true }
  ]);

  // Attach to product table (if exists)
  const productTable = document.getElementById('rows');
  if (productTable) {
    CM.attach(productTable.parentElement, 'tr[data-id]', 'product-row', (row) => {
      return { id: row.dataset.id };
    });
  }

  console.log('✅ Product context menus registered');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all product actions, shortcuts, and menus
 */
function initializeProductActions() {
  registerProductActions();
  registerProductShortcuts();
  registerProductContextMenus();
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProductActions);
} else {
  initializeProductActions();
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.ProductActions = {
    registerProductActions,
    registerProductShortcuts,
    registerProductContextMenus,
    initializeProductActions
  };
}
