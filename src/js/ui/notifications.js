/* ============================================
   NOTIFICATION SYSTEM
   CodeLapras - Toast & Alert Management
   ============================================ */

/**
 * Toast Notification System
 * Provides custom toast messages and confirmation dialogs
 * to replace native browser alert(), confirm(), and prompt()
 */

// Toast container reference
let toastContainer = null;

// Active toasts tracking
const activeToasts = new Map();

// Toast ID counter
let toastIdCounter = 0;

/**
 * Initialize toast container
 */
function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toastContainer');

    if (!toastContainer) {
      // Create container if it doesn't exist
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }

  return toastContainer;
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info' (default: 'info')
 * @param {number} duration - Duration in milliseconds (0 = no auto-dismiss, default: 4000)
 * @returns {string} Toast ID for manual dismissal
 */
function showToast(message, type = 'info', duration = 4000) {
  initToastContainer();

  // Generate unique ID
  const toastId = 'toast_' + (++toastIdCounter);

  // Create toast element
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast toast-${type} toast-entering`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  // Icon based on type
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const icon = icons[type] || icons.info;

  // Toast content
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  // Add close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toastId));

  // Add to container
  toastContainer.appendChild(toast);
  activeToasts.set(toastId, toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('toast-entering');
  }, 10);

  // Auto-dismiss if duration > 0
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(toastId);
    }, duration);
  }

  return toastId;
}

/**
 * Dismiss a toast notification
 * @param {string} toastId - Toast ID to dismiss
 */
function dismissToast(toastId) {
  const toast = activeToasts.get(toastId);

  if (!toast) return;

  // Add leaving animation
  toast.classList.add('toast-leaving');

  // Remove after animation
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    activeToasts.delete(toastId);
  }, 300);
}

/**
 * Show a confirmation dialog (replacement for confirm())
 * @param {string} message - Confirmation message
 * @param {object} options - Configuration options
 * @param {string} options.title - Dialog title (default: 'Confirm')
 * @param {string} options.confirmText - Confirm button text (default: 'OK')
 * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} options.confirmClass - Confirm button class (default: 'btn small')
 * @param {string} options.cancelClass - Cancel button class (default: 'btn small')
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const config = {
      title: options.title || 'Confirm',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      confirmClass: options.confirmClass || 'btn small',
      cancelClass: options.cancelClass || 'btn small'
    };

    // Create confirm dialog
    const dlg = createDialog({
      id: 'dlgConfirm_' + Date.now(),
      title: config.title,
      className: 'dialog-confirm',
      content: `<p class="confirm-message">${escapeHtml(message)}</p>`,
      buttons: [
        {
          text: config.confirmText,
          class: config.confirmClass,
          onclick: () => {
            hideDialog(dlg);
            resolve(true);
          }
        },
        {
          text: config.cancelText,
          class: config.cancelClass,
          onclick: () => {
            hideDialog(dlg);
            resolve(false);
          }
        }
      ]
    });

    // Show dialog
    showDialog(dlg, { closeOnBackdrop: false });

    // Handle ESC key as cancel
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        hideDialog(dlg);
        resolve(false);
        dlg.removeEventListener('keydown', escHandler);
      }
    };
    dlg.addEventListener('keydown', escHandler);

    // Clean up after close
    dlg.addEventListener('close', () => {
      setTimeout(() => {
        if (dlg.parentNode) {
          dlg.parentNode.removeChild(dlg);
        }
      }, 500);
    });
  });
}

/**
 * Show a prompt dialog (replacement for prompt())
 * @param {string} message - Prompt message
 * @param {string} defaultValue - Default input value
 * @param {object} options - Configuration options
 * @param {string} options.title - Dialog title (default: 'Input')
 * @param {string} options.confirmText - Confirm button text (default: 'OK')
 * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} options.inputType - Input type (default: 'text')
 * @param {string} options.placeholder - Input placeholder
 * @returns {Promise<string|null>} Resolves to input value or null if cancelled
 */
function showPrompt(message, defaultValue = '', options = {}) {
  return new Promise((resolve) => {
    const config = {
      title: options.title || 'Input',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      inputType: options.inputType || 'text',
      placeholder: options.placeholder || ''
    };

    const inputId = 'promptInput_' + Date.now();

    // Create prompt dialog
    const dlg = createDialog({
      id: 'dlgPrompt_' + Date.now(),
      title: config.title,
      className: 'dialog-prompt',
      content: `
        <p class="prompt-message">${escapeHtml(message)}</p>
        <input type="${config.inputType}"
               id="${inputId}"
               class="promptInput"
               value="${escapeHtml(defaultValue)}"
               placeholder="${escapeHtml(config.placeholder)}"
               autocomplete="off">
      `,
      buttons: [
        {
          text: config.confirmText,
          class: 'btn small',
          onclick: () => {
            const input = document.getElementById(inputId);
            const value = input ? input.value : null;
            hideDialog(dlg);
            resolve(value);
          }
        },
        {
          text: config.cancelText,
          class: 'btn small',
          onclick: () => {
            hideDialog(dlg);
            resolve(null);
          }
        }
      ]
    });

    // Show dialog
    showDialog(dlg, {
      closeOnBackdrop: false,
      focusSelector: '#' + inputId
    });

    // Handle Enter key as confirm
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          hideDialog(dlg);
          resolve(input.value);
        }
      });
    }

    // Handle ESC key as cancel
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        hideDialog(dlg);
        resolve(null);
        dlg.removeEventListener('keydown', escHandler);
      }
    };
    dlg.addEventListener('keydown', escHandler);

    // Clean up after close
    dlg.addEventListener('close', () => {
      setTimeout(() => {
        if (dlg.parentNode) {
          dlg.parentNode.removeChild(dlg);
        }
      }, 500);
    });
  });
}

/**
 * Show success toast
 * @param {string} message - Success message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
function showSuccess(message, duration = 4000) {
  return showToast(message, 'success', duration);
}

/**
 * Show error toast
 * @param {string} message - Error message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
function showError(message, duration = 5000) {
  return showToast(message, 'error', duration);
}

/**
 * Show warning toast
 * @param {string} message - Warning message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
function showWarning(message, duration = 4000) {
  return showToast(message, 'warning', duration);
}

/**
 * Show info toast
 * @param {string} message - Info message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
function showInfo(message, duration = 4000) {
  return showToast(message, 'info', duration);
}

/**
 * Dismiss all active toasts
 */
function dismissAllToasts() {
  const toastIds = Array.from(activeToasts.keys());
  toastIds.forEach(id => dismissToast(id));
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToastContainer);
} else {
  initToastContainer();
}

// Export functions to window object
if (typeof window !== 'undefined') {
  window.showToast = showToast;
  window.dismissToast = dismissToast;
  window.showConfirm = showConfirm;
  window.showPrompt = showPrompt;
  window.showSuccess = showSuccess;
  window.showError = showError;
  window.showWarning = showWarning;
  window.showInfo = showInfo;
  window.dismissAllToasts = dismissAllToasts;
}

console.log('Notification system initialized');
