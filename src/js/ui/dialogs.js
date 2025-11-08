/* ============================================
   DIALOG & MODAL SYSTEM
   CodeLapras - Centralized Dialog Management
   ============================================ */

/**
 * Dialog Management System
 * Provides consistent dialog behavior with animations, keyboard support,
 * and focus management across the application.
 */

// Stack to track open dialogs for proper layering and ESC key handling
const dialogStack = [];

// Store trigger elements to restore focus when closing
const triggerElements = new WeakMap();

/**
 * Show a dialog with animation and focus management
 * @param {HTMLElement|string} dialog - Dialog element or ID
 * @param {object} options - Configuration options
 * @param {HTMLElement} options.triggerElement - Element that opened the dialog (for focus restoration)
 * @param {boolean} options.closeOnBackdrop - Close dialog when clicking backdrop (default: true)
 * @param {boolean} options.closeOnEscape - Close dialog with ESC key (default: true)
 * @param {string} options.focusSelector - CSS selector for element to auto-focus
 * @returns {HTMLElement} The dialog element
 */
function showDialog(dialog, options = {}) {
  // Get dialog element
  const dlg = typeof dialog === 'string' ? document.getElementById(dialog) : dialog;

  if (!dlg) {
    console.error('Dialog not found:', dialog);
    return null;
  }

  // Store trigger element for focus restoration
  if (options.triggerElement) {
    triggerElements.set(dlg, options.triggerElement);
  } else if (document.activeElement) {
    triggerElements.set(dlg, document.activeElement);
  }

  // Set default options
  const config = {
    closeOnBackdrop: options.closeOnBackdrop !== false,
    closeOnEscape: options.closeOnEscape !== false,
    focusSelector: options.focusSelector || 'input:not([type="hidden"]), textarea, select, button'
  };

  // Add to dialog stack
  dialogStack.push(dlg);

  // Prevent body scrolling
  if (dialogStack.length === 1) {
    document.body.style.overflow = 'hidden';
  }

  // Add animation class
  dlg.classList.add('dialog-entering');

  // Show dialog using native API or fallback
  try {
    if (typeof dlg.showModal === 'function') {
      dlg.showModal();
    } else {
      dlg.setAttribute('open', 'true');
      dlg.style.display = 'block';
    }
  } catch (err) {
    console.warn('showModal failed, using fallback:', err);
    dlg.setAttribute('open', 'true');
    dlg.style.display = 'block';
  }

  // Set ARIA attributes
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('role', 'dialog');

  // Auto-focus first interactive element
  setTimeout(() => {
    dlg.classList.remove('dialog-entering');

    const focusTarget = config.focusSelector
      ? dlg.querySelector(config.focusSelector)
      : dlg.querySelector('input, textarea, select, button');

    if (focusTarget) {
      focusTarget.focus();
    }
  }, 50);

  // Setup backdrop click handler
  if (config.closeOnBackdrop) {
    dlg.addEventListener('click', handleBackdropClick);
  }

  // Setup focus trap
  dlg.addEventListener('keydown', handleFocusTrap);

  return dlg;
}

/**
 * Hide a dialog with animation
 * @param {HTMLElement|string} dialog - Dialog element or ID
 * @param {Function} callback - Optional callback after dialog closes
 */
function hideDialog(dialog, callback) {
  const dlg = typeof dialog === 'string' ? document.getElementById(dialog) : dialog;

  if (!dlg) {
    console.error('Dialog not found:', dialog);
    return;
  }

  // Add leaving animation class
  dlg.classList.add('dialog-leaving');

  // Wait for animation to complete
  setTimeout(() => {
    // Close dialog
    try {
      if (typeof dlg.close === 'function') {
        dlg.close();
      } else {
        dlg.removeAttribute('open');
        dlg.style.display = 'none';
      }
    } catch (err) {
      console.warn('close failed, using fallback:', err);
      dlg.removeAttribute('open');
      dlg.style.display = 'none';
    }

    // Remove animation class
    dlg.classList.remove('dialog-leaving', 'dialog-entering');

    // Remove from stack
    const index = dialogStack.indexOf(dlg);
    if (index > -1) {
      dialogStack.splice(index, 1);
    }

    // Restore body scrolling if no more dialogs
    if (dialogStack.length === 0) {
      document.body.style.overflow = '';
    }

    // Remove event listeners
    dlg.removeEventListener('click', handleBackdropClick);
    dlg.removeEventListener('keydown', handleFocusTrap);

    // Restore focus to trigger element
    const triggerElement = triggerElements.get(dlg);
    if (triggerElement && typeof triggerElement.focus === 'function') {
      setTimeout(() => triggerElement.focus(), 50);
    }
    triggerElements.delete(dlg);

    // Execute callback
    if (typeof callback === 'function') {
      callback();
    }
  }, 300); // Match CSS animation duration
}

/**
 * Handle backdrop click to close dialog
 * @param {Event} event - Click event
 */
function handleBackdropClick(event) {
  const dlg = event.currentTarget;

  // Only close if clicking directly on dialog (backdrop), not dialog content
  if (event.target === dlg) {
    hideDialog(dlg);
  }
}

/**
 * Handle focus trapping within dialog
 * @param {Event} event - Keyboard event
 */
function handleFocusTrap(event) {
  const dlg = event.currentTarget;

  // Get all focusable elements
  const focusableElements = dlg.querySelectorAll(
    'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Trap focus with Tab key
  if (event.key === 'Tab') {
    if (event.shiftKey && document.activeElement === firstElement) {
      // Shift+Tab on first element - go to last
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      // Tab on last element - go to first
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Global ESC key handler to close topmost dialog
 * @param {Event} event - Keyboard event
 */
function handleEscapeKey(event) {
  if (event.key === 'Escape' && dialogStack.length > 0) {
    const topDialog = dialogStack[dialogStack.length - 1];
    hideDialog(topDialog);
  }
}

/**
 * Create a new dialog programmatically
 * @param {object} config - Dialog configuration
 * @param {string} config.id - Dialog ID
 * @param {string} config.title - Dialog title
 * @param {string} config.content - HTML content for dialog body
 * @param {Array} config.buttons - Array of button configs {text, class, onclick}
 * @param {string} config.className - Additional CSS class for dialog
 * @returns {HTMLElement} Created dialog element
 */
function createDialog(config) {
  const dlg = document.createElement('dialog');
  dlg.id = config.id || 'dlg_' + Date.now();

  if (config.className) {
    dlg.className = config.className;
  }

  // Create dialog header
  const header = document.createElement('div');
  header.className = 'dlg-head';

  if (config.title) {
    const title = document.createElement('strong');
    title.textContent = config.title;
    title.id = dlg.id + 'Title';
    header.appendChild(title);
    dlg.setAttribute('aria-labelledby', title.id);
  }

  // Create toolbar with buttons
  if (config.buttons && config.buttons.length > 0) {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    config.buttons.forEach(btnConfig => {
      const btn = document.createElement('button');
      btn.textContent = btnConfig.text || 'Button';
      btn.className = btnConfig.class || 'btn small';

      if (btnConfig.onclick) {
        btn.addEventListener('click', btnConfig.onclick);
      }

      toolbar.appendChild(btn);
    });

    header.appendChild(toolbar);
  }

  dlg.appendChild(header);

  // Create dialog body
  if (config.content) {
    const body = document.createElement('div');
    body.className = 'dlg-grid';
    body.innerHTML = config.content;
    dlg.appendChild(body);
  }

  // Add to document
  document.body.appendChild(dlg);

  return dlg;
}

/**
 * Get dialog template HTML for different dialog types
 * @param {string} type - Dialog type (product, customer, order, etc.)
 * @returns {string} HTML template
 */
function getDialogTemplate(type) {
  // This would return pre-defined HTML templates for common dialog types
  // For now, this is a placeholder for future enhancement
  const templates = {
    'simple': `
      <div class="dlg-head">
        <strong id="dlgTitle">Dialog</strong>
        <div class="toolbar">
          <button class="btn small" id="btnOk">OK</button>
          <button class="btn small" id="btnCancel">Cancel</button>
        </div>
      </div>
      <div class="dlg-grid">
        <div id="dlgContent"></div>
      </div>
    `
  };

  return templates[type] || templates.simple;
}

/**
 * Check if any dialog is currently open
 * @returns {boolean} True if at least one dialog is open
 */
function isDialogOpen() {
  return dialogStack.length > 0;
}

/**
 * Get the currently active (topmost) dialog
 * @returns {HTMLElement|null} The topmost dialog or null
 */
function getActiveDialog() {
  return dialogStack.length > 0 ? dialogStack[dialogStack.length - 1] : null;
}

/**
 * Close all open dialogs
 */
function closeAllDialogs() {
  while (dialogStack.length > 0) {
    hideDialog(dialogStack[dialogStack.length - 1]);
  }
}

// Initialize global ESC key handler
document.addEventListener('keydown', handleEscapeKey);

// Export functions to window object
if (typeof window !== 'undefined') {
  window.showDialog = showDialog;
  window.hideDialog = hideDialog;
  window.createDialog = createDialog;
  window.getDialogTemplate = getDialogTemplate;
  window.isDialogOpen = isDialogOpen;
  window.getActiveDialog = getActiveDialog;
  window.closeAllDialogs = closeAllDialogs;
}

console.log('Dialog system initialized');
