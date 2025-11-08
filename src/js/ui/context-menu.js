/**
 * context-menu.js - Right-Click Context Menu System
 *
 * Provides customizable context menus:
 * - Right-click menu on table rows and elements
 * - Contextual actions based on element type
 * - Menu positioning near cursor
 * - Keyboard navigation (arrow keys, Enter, Esc)
 * - Integration with ActionRegistry
 * - Submenu support
 *
 * Usage:
 * ContextMenu.register('product-row', [
 *   { label: 'Edit', action: 'edit-product', icon: '✏️' },
 *   { label: 'Delete', action: 'delete-product', icon: '🗑️', danger: true },
 *   { separator: true },
 *   { label: 'Duplicate', action: 'duplicate-product' }
 * ]);
 *
 * ContextMenu.attach('tableBody', 'tr', 'product-row');
 */

// ============================================================================
// CONTEXT MENU MANAGER
// ============================================================================

const ContextMenu = (() => {
  const menus = new Map();
  let currentMenu = null;
  let currentTarget = null;

  /**
   * Register a context menu configuration
   * @param {string} name - Menu name
   * @param {Array} items - Menu items
   */
  function register(name, items) {
    menus.set(name, items);
  }

  /**
   * Unregister a context menu
   * @param {string} name - Menu name
   */
  function unregister(name) {
    menus.delete(name);
  }

  /**
   * Show context menu
   * @param {string} menuName - Menu name
   * @param {MouseEvent} e - Mouse event
   * @param {*} data - Data to pass to actions
   */
  function show(menuName, e, data = null) {
    e.preventDefault();

    // Close existing menu
    close();

    const items = menus.get(menuName);
    if (!items) {
      console.warn(`Context menu "${menuName}" not found`);
      return;
    }

    // Filter visible items
    const visibleItems = items.filter(item => {
      if (item.separator) return true;
      if (item.visible === false) return false;
      if (typeof item.visible === 'function') return item.visible(data);
      return true;
    });

    if (visibleItems.length === 0) return;

    // Create menu element
    const menu = createMenuElement(visibleItems, data);
    document.body.appendChild(menu);
    currentMenu = menu;
    currentTarget = data;

    // Position menu
    positionMenu(menu, e.clientX, e.clientY);

    // Focus first non-separator item
    const firstItem = menu.querySelector('.context-menu-item:not(.separator):not(.disabled)');
    if (firstItem) firstItem.focus();

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', closeOnClickOutside);
      document.addEventListener('contextmenu', closeOnClickOutside);
    }, 0);
  }

  /**
   * Create menu element
   * @param {Array} items - Menu items
   * @param {*} data - Data
   * @returns {HTMLElement}
   */
  function createMenuElement(items, data) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.setAttribute('role', 'menu');

    items.forEach((item, index) => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        separator.setAttribute('role', 'separator');
        menu.appendChild(separator);
        return;
      }

      const menuItem = document.createElement('button');
      menuItem.className = 'context-menu-item';
      menuItem.setAttribute('role', 'menuitem');
      menuItem.setAttribute('tabindex', '0');

      // Add classes
      if (item.danger) menuItem.classList.add('danger');
      if (item.disabled) menuItem.classList.add('disabled');
      if (item.checked) menuItem.classList.add('checked');

      // Build content
      let content = '';
      if (item.icon) content += `<span class="menu-icon">${item.icon}</span>`;
      content += `<span class="menu-label">${item.label}</span>`;
      if (item.shortcut) content += `<span class="menu-shortcut">${item.shortcut}</span>`;
      if (item.checked) content += `<span class="menu-check">✓</span>`;

      menuItem.innerHTML = content;

      // Click handler
      if (!item.disabled) {
        menuItem.addEventListener('click', async (e) => {
          e.stopPropagation();

          // Execute handler or action
          if (item.handler) {
            await item.handler(data, e);
          } else if (item.action && window.ActionRegistry) {
            await window.ActionRegistry.execute(item.action, data);
          }

          close();
        });
      }

      // Keyboard navigation
      menuItem.addEventListener('keydown', (e) => handleMenuKeydown(e, menu));

      menu.appendChild(menuItem);
    });

    return menu;
  }

  /**
   * Position menu near cursor
   * @param {HTMLElement} menu - Menu element
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   */
  function positionMenu(menu, x, y) {
    // Initial position
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Adjust if menu goes off screen
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${x - rect.width}px`;
    }

    if (rect.bottom > viewportHeight) {
      menu.style.top = `${y - rect.height}px`;
    }
  }

  /**
   * Handle keyboard navigation in menu
   * @param {KeyboardEvent} e - Keyboard event
   * @param {HTMLElement} menu - Menu element
   */
  function handleMenuKeydown(e, menu) {
    const items = Array.from(menu.querySelectorAll('.context-menu-item:not(.disabled)'));
    const currentIndex = items.indexOf(e.target);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        e.target.click();
        break;

      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  }

  /**
   * Close menu on click outside
   * @param {Event} e - Event
   */
  function closeOnClickOutside(e) {
    if (currentMenu && !currentMenu.contains(e.target)) {
      close();
    }
  }

  /**
   * Close current menu
   */
  function close() {
    if (currentMenu) {
      document.removeEventListener('click', closeOnClickOutside);
      document.removeEventListener('contextmenu', closeOnClickOutside);
      currentMenu.remove();
      currentMenu = null;
      currentTarget = null;
    }
  }

  /**
   * Attach context menu to elements
   * @param {string|HTMLElement} containerId - Container element
   * @param {string} selector - Element selector within container
   * @param {string|function} menuNameOrGetter - Menu name or function that returns menu name
   * @param {function} dataGetter - Function to extract data from element
   */
  function attach(containerId, selector, menuNameOrGetter, dataGetter = null) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) {
      console.warn(`Container not found: ${containerId}`);
      return;
    }

    container.addEventListener('contextmenu', (e) => {
      const element = e.target.closest(selector);
      if (!element) return;

      // Get menu name
      const menuName = typeof menuNameOrGetter === 'function'
        ? menuNameOrGetter(element)
        : menuNameOrGetter;

      // Get data
      let data = null;
      if (dataGetter) {
        data = dataGetter(element);
      } else {
        // Default: extract data-* attributes
        data = { ...element.dataset };
      }

      show(menuName, e, data);
    });
  }

  /**
   * Disable native context menu
   * @param {string|HTMLElement} elementId - Element
   */
  function disableNative(elementId) {
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (element) {
      element.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  return {
    register,
    unregister,
    show,
    close,
    attach,
    disableNative
  };
})();

// ============================================================================
// DEFAULT CONTEXT MENUS
// ============================================================================

/**
 * Register default context menus for common use cases
 */
function registerDefaultContextMenus() {
  // Table row menu (generic)
  ContextMenu.register('table-row', [
    { label: 'Edit', action: 'edit', icon: '✏️' },
    { label: 'Duplicate', action: 'duplicate', icon: '📋' },
    { separator: true },
    { label: 'Delete', action: 'delete', icon: '🗑️', danger: true }
  ]);

  // Product row menu
  ContextMenu.register('product-row', [
    { label: 'Edit Product', action: 'edit-product', icon: '✏️' },
    { label: 'Duplicate', action: 'duplicate-product', icon: '📋' },
    { label: 'Add to Order', action: 'add-to-order', icon: '➕' },
    { separator: true },
    { label: 'View Details', action: 'view-product', icon: '👁️' },
    { label: 'Stock History', action: 'view-history', icon: '📊' },
    { separator: true },
    { label: 'Delete', action: 'delete-product', icon: '🗑️', danger: true }
  ]);

  // Order row menu
  ContextMenu.register('order-row', [
    { label: 'View Order', action: 'view-order', icon: '👁️' },
    { label: 'Edit Order', action: 'edit-order', icon: '✏️' },
    { label: 'Duplicate Order', action: 'duplicate-order', icon: '📋' },
    { separator: true },
    { label: 'Create Invoice', action: 'create-invoice', icon: '📄' },
    { label: 'Print Order', action: 'print-order', icon: '🖨️' },
    { separator: true },
    { label: 'Cancel Order', action: 'cancel-order', icon: '✕', danger: true }
  ]);

  // Customer row menu
  ContextMenu.register('customer-row', [
    { label: 'Edit Customer', action: 'edit-customer', icon: '✏️' },
    { label: 'View Orders', action: 'view-customer-orders', icon: '📦' },
    { label: 'View Invoices', action: 'view-customer-invoices', icon: '📄' },
    { separator: true },
    { label: 'Send Email', action: 'email-customer', icon: '📧' },
    { label: 'Call Customer', action: 'call-customer', icon: '📞' },
    { separator: true },
    { label: 'Delete', action: 'delete-customer', icon: '🗑️', danger: true }
  ]);
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Register default menus on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerDefaultContextMenus);
} else {
  registerDefaultContextMenus();
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally
window.ContextMenu = ContextMenu;
window.registerDefaultContextMenus = registerDefaultContextMenus;
