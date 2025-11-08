/**
 * actions.js - Centralized Action Registry and Button Management
 *
 * Provides a unified system for:
 * - Registering and executing actions
 * - Button state management (loading, disabled, success)
 * - Confirmation dialogs for dangerous actions
 * - Bulk operations (select all, batch actions)
 * - Action permissions and visibility
 * - Integration with EventBus for cross-module communication
 *
 * Usage:
 * ActionRegistry.register('edit-product', {
 *   handler: (data) => editProduct(data.id),
 *   confirm: 'Edit this product?',
 *   permission: 'products.edit'
 * });
 *
 * ActionRegistry.execute('edit-product', { id: 123 });
 */

// ============================================================================
// ACTION REGISTRY
// ============================================================================

const ActionRegistry = (() => {
  const actions = new Map();
  const buttonStates = new Map();

  return {
    /**
     * Register an action
     * @param {string} name - Unique action name
     * @param {object} config - Action configuration
     */
    register(name, config) {
      if (actions.has(name)) {
        console.warn(`Action "${name}" is already registered. Overwriting.`);
      }

      const action = {
        handler: config.handler || (() => {}),
        label: config.label || name,
        icon: config.icon || null,
        confirm: config.confirm || null, // Confirmation message
        confirmType: config.confirmType || 'default', // 'default', 'typed', 'custom'
        confirmValue: config.confirmValue || null, // For typed confirmations
        permission: config.permission || null,
        visible: config.visible !== false,
        enabled: config.enabled !== false,
        danger: config.danger || false, // Dangerous action (shows warning)
        bulk: config.bulk || false, // Supports bulk operations
        onBefore: config.onBefore || null, // Called before handler
        onAfter: config.onAfter || null, // Called after handler
        onError: config.onError || null // Called on error
      };

      actions.set(name, action);
    },

    /**
     * Unregister an action
     * @param {string} name - Action name
     */
    unregister(name) {
      actions.delete(name);
    },

    /**
     * Check if action exists
     * @param {string} name - Action name
     * @returns {boolean}
     */
    has(name) {
      return actions.has(name);
    },

    /**
     * Get action configuration
     * @param {string} name - Action name
     * @returns {object|null}
     */
    get(name) {
      return actions.get(name) || null;
    },

    /**
     * Get all registered actions
     * @returns {Map}
     */
    getAll() {
      return new Map(actions);
    },

    /**
     * Execute an action
     * @param {string} name - Action name
     * @param {*} data - Data to pass to handler
     * @param {object} options - Execution options
     * @returns {Promise<*>}
     */
    async execute(name, data = null, options = {}) {
      const action = actions.get(name);

      if (!action) {
        console.error(`Action "${name}" not found`);
        return null;
      }

      // Check permission
      if (action.permission && !this.checkPermission(action.permission)) {
        console.warn(`Permission denied for action "${name}"`);
        return null;
      }

      // Check if enabled
      if (!action.enabled) {
        console.warn(`Action "${name}" is disabled`);
        return null;
      }

      // Get button if provided
      const button = options.button || null;

      try {
        // Set button to loading state
        if (button) {
          this.setButtonLoading(button, true);
        }

        // Show confirmation if needed
        if (action.confirm && !options.skipConfirm) {
          const confirmed = await this.confirm(action.confirm, action.confirmType, action.confirmValue);
          if (!confirmed) {
            if (button) this.setButtonLoading(button, false);
            return null;
          }
        }

        // Call onBefore hook
        if (action.onBefore) {
          const continueExecution = await action.onBefore(data);
          if (continueExecution === false) {
            if (button) this.setButtonLoading(button, false);
            return null;
          }
        }

        // Execute handler
        const result = await action.handler(data);

        // Call onAfter hook
        if (action.onAfter) {
          await action.onAfter(result, data);
        }

        // Show success state
        if (button) {
          this.setButtonSuccess(button);
          setTimeout(() => this.setButtonLoading(button, false), 1000);
        }

        // Emit event
        if (window.EventBus) {
          window.EventBus.emit(`action:${name}`, { data, result });
        }

        return result;
      } catch (error) {
        console.error(`Error executing action "${name}":`, error);

        // Call onError hook
        if (action.onError) {
          action.onError(error, data);
        }

        // Show error state
        if (button) {
          this.setButtonError(button);
          setTimeout(() => this.setButtonLoading(button, false), 2000);
        }

        // Show error notification
        if (window.Notifications) {
          window.Notifications.error(`Failed to ${action.label}: ${error.message}`);
        }

        throw error;
      }
    },

    /**
     * Execute bulk action on multiple items
     * @param {string} name - Action name
     * @param {Array} items - Array of items
     * @param {object} options - Options
     * @returns {Promise<Array>}
     */
    async executeBulk(name, items, options = {}) {
      const action = actions.get(name);

      if (!action) {
        console.error(`Action "${name}" not found`);
        return [];
      }

      if (!action.bulk) {
        console.warn(`Action "${name}" does not support bulk operations`);
        return [];
      }

      // Confirm bulk action
      const confirmMsg = `${action.label} ${items.length} items?`;
      const confirmed = await this.confirm(confirmMsg, 'default');
      if (!confirmed) return [];

      const results = [];
      const button = options.button || null;

      try {
        if (button) this.setButtonLoading(button, true);

        for (const item of items) {
          try {
            const result = await action.handler(item);
            results.push({ success: true, item, result });
          } catch (error) {
            results.push({ success: false, item, error });
          }
        }

        if (button) {
          this.setButtonSuccess(button);
          setTimeout(() => this.setButtonLoading(button, false), 1000);
        }

        // Show summary
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        if (window.Notifications) {
          if (failCount === 0) {
            window.Notifications.success(`${action.label}: ${successCount} items processed`);
          } else {
            window.Notifications.warning(`${action.label}: ${successCount} succeeded, ${failCount} failed`);
          }
        }

        return results;
      } catch (error) {
        if (button) {
          this.setButtonError(button);
          setTimeout(() => this.setButtonLoading(button, false), 2000);
        }
        throw error;
      }
    },

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} type - Confirmation type ('default', 'typed', 'custom')
     * @param {*} value - Expected value for typed confirmations
     * @returns {Promise<boolean>}
     */
    async confirm(message, type = 'default', value = null) {
      // Use custom confirmation dialog if available
      if (window.Dialogs && window.Dialogs.confirm) {
        return await window.Dialogs.confirm(message);
      }

      // Fall back to native dialogs
      if (type === 'typed') {
        const input = prompt(message);
        return input === value;
      }

      return confirm(message);
    },

    /**
     * Check if user has permission
     * @param {string} permission - Permission string
     * @returns {boolean}
     */
    checkPermission(permission) {
      // TODO: Implement actual permission checking
      // For now, return true (all permissions granted)
      return true;
    },

    /**
     * Set button loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Loading state
     */
    setButtonLoading(button, loading) {
      if (!button) return;

      if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.dataset.originalHTML = button.innerHTML;
        button.classList.add('loading');
        button.innerHTML = '<span class="spinner"></span> Loading...';
      } else {
        button.disabled = false;
        button.classList.remove('loading', 'success', 'error');
        if (button.dataset.originalHTML) {
          button.innerHTML = button.dataset.originalHTML;
        }
      }
    },

    /**
     * Set button success state
     * @param {HTMLElement} button - Button element
     */
    setButtonSuccess(button) {
      if (!button) return;
      button.classList.remove('loading', 'error');
      button.classList.add('success');
      const original = button.dataset.originalText || button.textContent;
      button.textContent = '✓ Done';
    },

    /**
     * Set button error state
     * @param {HTMLElement} button - Button element
     */
    setButtonError(button) {
      if (!button) return;
      button.classList.remove('loading', 'success');
      button.classList.add('error');
      button.textContent = '✗ Error';
    }
  };
})();

// ============================================================================
// BUTTON BINDING
// ============================================================================

/**
 * Bind button to action
 * @param {string|HTMLElement} buttonId - Button element or ID
 * @param {string} actionName - Action name
 * @param {function} dataProvider - Function that returns data for action
 */
function bindButton(buttonId, actionName, dataProvider = null) {
  const button = typeof buttonId === 'string' ? document.getElementById(buttonId) : buttonId;
  if (!button) {
    console.warn(`Button not found: ${buttonId}`);
    return;
  }

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    const data = dataProvider ? dataProvider() : null;
    await ActionRegistry.execute(actionName, data, { button });
  });
}

/**
 * Bind multiple buttons to actions using data attributes
 * @param {string|HTMLElement} containerId - Container element
 */
function bindActionButtons(containerId = document.body) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return;

  // Event delegation for [data-action] buttons
  container.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const actionName = button.dataset.action;
    const dataId = button.dataset.id || null;
    const dataType = button.dataset.type || null;

    // Build data object from data attributes
    const data = {};
    if (dataId) data.id = dataId;
    if (dataType) data.type = dataType;

    // Add any other data-* attributes
    Object.keys(button.dataset).forEach(key => {
      if (key !== 'action' && key !== 'id' && key !== 'type') {
        data[key] = button.dataset[key];
      }
    });

    await ActionRegistry.execute(actionName, Object.keys(data).length ? data : null, { button });
  });
}

// ============================================================================
// BULK SELECTION
// ============================================================================

const BulkSelector = (() => {
  const selections = new Map();

  return {
    /**
     * Initialize bulk selection for a table
     * @param {string} tableId - Table ID
     * @param {string} checkboxSelector - Checkbox selector
     */
    init(tableId, checkboxSelector = 'input[type="checkbox"][data-id]') {
      const table = document.getElementById(tableId);
      if (!table) return;

      selections.set(tableId, new Set());

      // Handle individual checkbox changes
      table.addEventListener('change', (e) => {
        const checkbox = e.target.closest(checkboxSelector);
        if (!checkbox) return;

        const id = checkbox.dataset.id;
        const selected = selections.get(tableId);

        if (checkbox.checked) {
          selected.add(id);
        } else {
          selected.delete(id);
        }

        this.updateSelectAllCheckbox(tableId);
      });
    },

    /**
     * Add "Select All" checkbox
     * @param {string} tableId - Table ID
     * @param {string|HTMLElement} checkboxId - Select all checkbox
     * @param {string} rowCheckboxSelector - Row checkbox selector
     */
    addSelectAll(tableId, checkboxId, rowCheckboxSelector = 'input[type="checkbox"][data-id]') {
      const selectAllCheckbox = typeof checkboxId === 'string' ? document.getElementById(checkboxId) : checkboxId;
      const table = document.getElementById(tableId);

      if (!selectAllCheckbox || !table) return;

      selectAllCheckbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const checkboxes = table.querySelectorAll(rowCheckboxSelector);
        const selected = selections.get(tableId) || new Set();

        checkboxes.forEach(cb => {
          cb.checked = checked;
          const id = cb.dataset.id;
          if (checked) {
            selected.add(id);
          } else {
            selected.delete(id);
          }
        });

        selections.set(tableId, selected);
      });
    },

    /**
     * Update select all checkbox state
     * @param {string} tableId - Table ID
     */
    updateSelectAllCheckbox(tableId) {
      // TODO: Implement tri-state checkbox (unchecked, checked, indeterminate)
    },

    /**
     * Get selected IDs
     * @param {string} tableId - Table ID
     * @returns {Array}
     */
    getSelected(tableId) {
      const selected = selections.get(tableId);
      return selected ? Array.from(selected) : [];
    },

    /**
     * Clear selections
     * @param {string} tableId - Table ID
     */
    clear(tableId) {
      const selected = selections.get(tableId);
      if (selected) selected.clear();

      const table = document.getElementById(tableId);
      if (table) {
        table.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
          cb.checked = false;
        });
      }
    },

    /**
     * Get selected count
     * @param {string} tableId - Table ID
     * @returns {number}
     */
    getCount(tableId) {
      const selected = selections.get(tableId);
      return selected ? selected.size : 0;
    }
  };
})();

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally
window.ActionRegistry = ActionRegistry;
window.bindButton = bindButton;
window.bindActionButtons = bindActionButtons;
window.BulkSelector = BulkSelector;
