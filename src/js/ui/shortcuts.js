/**
 * shortcuts.js - Keyboard Shortcut System
 *
 * Provides centralized keyboard shortcut management:
 * - Register shortcuts with key combinations
 * - Platform detection (Ctrl vs Cmd for Mac)
 * - Conflict detection and warnings
 * - Shortcut help modal (? key)
 * - Integration with action registry
 * - Context-aware shortcuts (only active in certain views)
 *
 * Usage:
 * ShortcutManager.register('Ctrl+N', {
 *   action: 'new-item',
 *   description: 'Create new item',
 *   preventDefault: true
 * });
 *
 * ShortcutManager.showHelp(); // Shows all shortcuts
 */

// ============================================================================
// SHORTCUT MANAGER
// ============================================================================

const ShortcutManager = (() => {
  const shortcuts = new Map();
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  let helpModalOpen = false;
  let enabled = true;

  /**
   * Normalize key combination for cross-platform
   * @param {string} combo - Key combination (e.g., 'Ctrl+S', 'Cmd+N')
   * @returns {string} Normalized combination
   */
  function normalizeCombo(combo) {
    // Replace 'Cmd' with 'Ctrl' on non-Mac, and vice versa
    let normalized = combo;

    if (isMac) {
      normalized = normalized.replace(/\bCtrl\+/gi, 'Cmd+');
    } else {
      normalized = normalized.replace(/\bCmd\+/gi, 'Ctrl+');
    }

    // Normalize case
    const parts = normalized.split('+').map(p => {
      const lower = p.toLowerCase();
      if (lower === 'ctrl' || lower === 'cmd' || lower === 'alt' || lower === 'shift') {
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return lower;
    });

    return parts.join('+');
  }

  /**
   * Get key combination from keyboard event
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {string} Key combination
   */
  function getComboFromEvent(e) {
    const parts = [];

    // Modifier keys
    if (e.ctrlKey && !isMac) parts.push('Ctrl');
    if (e.metaKey && isMac) parts.push('Cmd');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Main key
    const key = e.key?.toLowerCase() || '';

    // Ignore modifier-only keypresses
    if (['control', 'meta', 'alt', 'shift'].includes(key)) {
      return null;
    }

    // Special key names
    const keyMap = {
      ' ': 'Space',
      'escape': 'Esc',
      'arrowup': 'Up',
      'arrowdown': 'Down',
      'arrowleft': 'Left',
      'arrowright': 'Right'
    };

    const mappedKey = keyMap[key] || key;
    if (mappedKey) parts.push(mappedKey);

    return parts.length > 0 ? parts.join('+') : null;
  }

  /**
   * Check if target is an input element
   * @param {HTMLElement} target - Event target
   * @returns {boolean}
   */
  function isInputElement(target) {
    if (!target) return false;
    const tagName = target.tagName?.toLowerCase() || '';
    return ['input', 'textarea', 'select'].includes(tagName) ||
           target.isContentEditable;
  }

  return {
    /**
     * Register a keyboard shortcut
     * @param {string} combo - Key combination
     * @param {object} config - Shortcut configuration
     */
    register(combo, config) {
      const normalized = normalizeCombo(combo);

      if (shortcuts.has(normalized)) {
        console.warn(`Shortcut "${normalized}" is already registered. Overwriting.`);
      }

      const shortcut = {
        combo: normalized,
        handler: config.handler || null,
        action: config.action || null, // Action name from ActionRegistry
        description: config.description || combo,
        category: config.category || 'General',
        preventDefault: config.preventDefault !== false,
        allowInInput: config.allowInInput || false, // Allow when focused on input
        condition: config.condition || null, // Function that returns true if shortcut should work
        global: config.global !== false // Global or context-specific
      };

      shortcuts.set(normalized, shortcut);
    },

    /**
     * Unregister a shortcut
     * @param {string} combo - Key combination
     */
    unregister(combo) {
      const normalized = normalizeCombo(combo);
      shortcuts.delete(normalized);
    },

    /**
     * Check if shortcut exists
     * @param {string} combo - Key combination
     * @returns {boolean}
     */
    has(combo) {
      const normalized = normalizeCombo(combo);
      return shortcuts.has(normalized);
    },

    /**
     * Get shortcut configuration
     * @param {string} combo - Key combination
     * @returns {object|null}
     */
    get(combo) {
      const normalized = normalizeCombo(combo);
      return shortcuts.get(normalized) || null;
    },

    /**
     * Get all shortcuts
     * @returns {Map}
     */
    getAll() {
      return new Map(shortcuts);
    },

    /**
     * Get shortcuts by category
     * @param {string} category - Category name
     * @returns {Array}
     */
    getByCategory(category) {
      return Array.from(shortcuts.values()).filter(s => s.category === category);
    },

    /**
     * Handle keyboard event
     * @param {KeyboardEvent} e - Keyboard event
     */
    async handleKeydown(e) {
      if (!enabled) return;

      const combo = getComboFromEvent(e);
      if (!combo) return;

      const shortcut = shortcuts.get(combo);
      if (!shortcut) return;

      // Check if we're in an input element
      if (!shortcut.allowInInput && isInputElement(e.target)) {
        return;
      }

      // Check condition
      if (shortcut.condition && !shortcut.condition()) {
        return;
      }

      // Prevent default if configured
      if (shortcut.preventDefault) {
        e.preventDefault();
      }

      // Execute handler or action
      try {
        if (shortcut.handler) {
          await shortcut.handler(e);
        } else if (shortcut.action && window.ActionRegistry) {
          await window.ActionRegistry.execute(shortcut.action);
        }
      } catch (error) {
        console.error(`Error executing shortcut "${combo}":`, error);
      }
    },

    /**
     * Enable/disable shortcut system
     * @param {boolean} state - Enabled state
     */
    setEnabled(state) {
      enabled = state;
    },

    /**
     * Check if shortcuts are enabled
     * @returns {boolean}
     */
    isEnabled() {
      return enabled;
    },

    /**
     * Show help modal with all shortcuts
     */
    showHelp() {
      if (helpModalOpen) return;

      const modal = this.createHelpModal();
      document.body.appendChild(modal);
      helpModalOpen = true;

      // Show dialog
      if (window.Dialogs && window.Dialogs.show) {
        window.Dialogs.show(modal);
      } else {
        modal.style.display = 'block';
      }

      // Close on Escape or click outside
      const closeModal = () => {
        document.body.removeChild(modal);
        helpModalOpen = false;
      };

      modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
      modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);

      // Close on Escape
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    },

    /**
     * Create help modal HTML
     * @returns {HTMLElement}
     */
    createHelpModal() {
      const modal = document.createElement('div');
      modal.className = 'shortcut-help-modal';
      modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Keyboard Shortcuts</h2>
            <button class="close-btn">✕</button>
          </div>
          <div class="modal-body">
            ${this.renderShortcutList()}
          </div>
        </div>
      `;
      return modal;
    },

    /**
     * Render shortcut list HTML
     * @returns {string}
     */
    renderShortcutList() {
      // Group by category
      const categories = {};
      shortcuts.forEach(shortcut => {
        const cat = shortcut.category || 'General';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(shortcut);
      });

      let html = '';
      Object.keys(categories).sort().forEach(category => {
        html += `<div class="shortcut-category">`;
        html += `<h3>${category}</h3>`;
        html += `<table class="shortcut-table">`;

        categories[category].forEach(shortcut => {
          html += `<tr>`;
          html += `<td class="shortcut-key"><kbd>${this.formatCombo(shortcut.combo)}</kbd></td>`;
          html += `<td class="shortcut-desc">${shortcut.description}</td>`;
          html += `</tr>`;
        });

        html += `</table>`;
        html += `</div>`;
      });

      if (html === '') {
        html = '<p class="muted">No shortcuts registered.</p>';
      }

      return html;
    },

    /**
     * Format key combination for display
     * @param {string} combo - Key combination
     * @returns {string} Formatted combo
     */
    formatCombo(combo) {
      // Replace modifier names with symbols on Mac
      if (isMac) {
        return combo
          .replace(/Cmd/g, '⌘')
          .replace(/Alt/g, '⌥')
          .replace(/Shift/g, '⇧')
          .replace(/Ctrl/g, '⌃');
      }
      return combo;
    },

    /**
     * Initialize shortcut system
     */
    init() {
      document.addEventListener('keydown', (e) => this.handleKeydown(e));
      console.log('✅ Shortcut system initialized');
    }
  };
})();

// ============================================================================
// DEFAULT SHORTCUTS
// ============================================================================

/**
 * Register default application shortcuts
 */
function registerDefaultShortcuts() {
  // Help
  ShortcutManager.register('?', {
    description: 'Show keyboard shortcuts',
    category: 'Help',
    handler: () => ShortcutManager.showHelp(),
    allowInInput: false
  });

  // Close dialogs
  ShortcutManager.register('Esc', {
    description: 'Close dialog or cancel',
    category: 'Navigation',
    handler: () => {
      // Close topmost dialog
      if (window.Dialogs && window.Dialogs.closeCurrent) {
        window.Dialogs.closeCurrent();
      }
    },
    allowInInput: true,
    preventDefault: false
  });

  // Save (extract from original CodeLapras)
  ShortcutManager.register('Ctrl+S', {
    description: 'Quick save',
    category: 'Data',
    action: 'save',
    handler: () => {
      if (typeof quickSave === 'function') {
        quickSave();
      }
    }
  });

  // Export CSV (extract from original CodeLapras)
  ShortcutManager.register('Ctrl+Shift+S', {
    description: 'Export to CSV',
    category: 'Data',
    action: 'export-csv',
    handler: () => {
      if (typeof downloadCSV === 'function') {
        downloadCSV();
      }
    }
  });

  // New item
  ShortcutManager.register('Ctrl+N', {
    description: 'Create new item',
    category: 'Actions',
    action: 'new-item',
    handler: () => {
      const btnAdd = document.getElementById('btnAdd');
      if (btnAdd) btnAdd.click();
    }
  });

  // Focus search
  ShortcutManager.register('Ctrl+F', {
    description: 'Focus search box',
    category: 'Navigation',
    handler: () => {
      const searchInput = document.getElementById('search') ||
                         document.querySelector('input[type="search"]') ||
                         document.querySelector('input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // Refresh/reload
  ShortcutManager.register('Ctrl+R', {
    description: 'Refresh data',
    category: 'Data',
    action: 'refresh',
    preventDefault: true,
    handler: () => {
      if (typeof render === 'function') {
        render();
      }
    }
  });
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ShortcutManager.init();
    registerDefaultShortcuts();
  });
} else {
  ShortcutManager.init();
  registerDefaultShortcuts();
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally
window.ShortcutManager = ShortcutManager;
window.registerDefaultShortcuts = registerDefaultShortcuts;
