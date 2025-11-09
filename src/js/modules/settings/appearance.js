/**
 * CodeLapras - Appearance Settings Module
 *
 * Manages theme preferences, UI preferences, and display options.
 *
 * Day 20: Settings Module
 */

import EventBus from '../../core/eventBus.js';

/**
 * Get current appearance settings
 * @returns {Object} Appearance settings
 */
export function getAppearanceSettings() {
  const settings = window.getSettings ? window.getSettings() : {};

  return {
    themeMode: settings.themeMode || 'dark',
    highContrast: settings.highContrast || false,
    compactRows: settings.compactRows || false,
    currency: settings.currency || 'USD',
    locale: settings.locale || 'en-US',
    dateFormat: settings.dateFormat || 'YYYY-MM-DD',
    display: settings.display || {
      showReorderLine: true,
      showUnitQtyLine: true,
      showTotalUnitsLine: true,
      hideZeroValues: false
    },
    tabVisibility: settings.tabVisibility || {},
    cardVisibility: settings.cardVisibility || {},
    sideOrder: settings.sideOrder || []
  };
}

/**
 * Update theme mode (dark, light, auto)
 * @param {string} mode - Theme mode
 */
export function updateThemeMode(mode) {
  if (!['dark', 'light', 'auto'].includes(mode)) {
    console.error('[Appearance] Invalid theme mode:', mode);
    return;
  }

  if (typeof window.updateThemeMode === 'function') {
    window.updateThemeMode(mode);
  }

  // Emit event
  EventBus.emit('settings:theme-updated', { themeMode: mode });
}

/**
 * Toggle high contrast mode
 * @returns {boolean} New high contrast state
 */
export function toggleHighContrast() {
  const current = getAppearanceSettings().highContrast;
  const newValue = !current;

  if (typeof window.toggleHighContrast === 'function') {
    window.toggleHighContrast();
  }

  // Emit event
  EventBus.emit('settings:theme-updated', { highContrast: newValue });

  return newValue;
}

/**
 * Toggle compact rows mode
 * @returns {boolean} New compact rows state
 */
export function toggleCompactRows() {
  const current = getAppearanceSettings().compactRows;
  const newValue = !current;

  if (typeof window.toggleCompactRows === 'function') {
    window.toggleCompactRows();
  }

  // Update CSS class
  if (newValue) {
    document.documentElement.classList.add('compact-rows');
  } else {
    document.documentElement.classList.remove('compact-rows');
  }

  // Emit event
  EventBus.emit('settings:theme-updated', { compactRows: newValue });

  return newValue;
}

/**
 * Update display options
 * @param {Object} options - Display options object
 */
export function updateDisplayOptions(options) {
  const settings = window.getSettings ? window.getSettings() : {};
  const currentDisplay = settings.display || {};

  const newDisplay = {
    ...currentDisplay,
    ...options
  };

  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ display: newDisplay });
  }

  // Emit event
  EventBus.emit('settings:updated', { display: newDisplay });
}

/**
 * Update tab visibility
 * @param {string} tabId - Tab identifier
 * @param {boolean} visible - Visibility state
 */
export function updateTabVisibility(tabId, visible) {
  const settings = window.getSettings ? window.getSettings() : {};
  const tabVisibility = { ...(settings.tabVisibility || {}) };

  tabVisibility[tabId] = visible;

  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ tabVisibility });
  }

  // Show/hide the tab element
  const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
  if (tabElement) {
    tabElement.style.display = visible ? '' : 'none';
  }

  // Emit event
  EventBus.emit('settings:updated', { tabVisibility });
}

/**
 * Update card visibility
 * @param {string} cardId - Card identifier
 * @param {boolean} visible - Visibility state
 */
export function updateCardVisibility(cardId, visible) {
  const settings = window.getSettings ? window.getSettings() : {};
  const cardVisibility = { ...(settings.cardVisibility || {}) };

  cardVisibility[cardId] = visible;

  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ cardVisibility });
  }

  // Show/hide the card element
  const cardElement = document.querySelector(`[data-card="${cardId}"]`);
  if (cardElement) {
    cardElement.style.display = visible ? '' : 'none';
  }

  // Emit event
  EventBus.emit('settings:updated', { cardVisibility });
}

/**
 * Update currency
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 */
export function updateCurrency(currency) {
  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ currency });
  }

  // Emit event
  EventBus.emit('settings:updated', { currency });
}

/**
 * Update locale
 * @param {string} locale - Locale code (e.g., 'en-US', 'fr-FR')
 */
export function updateLocale(locale) {
  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ locale });
  }

  // Emit event
  EventBus.emit('settings:updated', { locale });
}

/**
 * Update date format
 * @param {string} format - Date format string
 */
export function updateDateFormat(format) {
  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ dateFormat: format });
  }

  // Emit event
  EventBus.emit('settings:updated', { dateFormat: format });
}

/**
 * Apply appearance settings to UI
 */
export function applyAppearanceSettings() {
  const settings = getAppearanceSettings();

  // Apply theme mode
  if (typeof window.applyTheme === 'function') {
    window.applyTheme(settings.themeMode);
  }

  // Apply high contrast
  if (settings.highContrast) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }

  // Apply compact rows
  if (settings.compactRows) {
    document.documentElement.classList.add('compact-rows');
  } else {
    document.documentElement.classList.remove('compact-rows');
  }

  // Apply tab visibility
  Object.entries(settings.tabVisibility).forEach(([tabId, visible]) => {
    const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
    if (tabElement) {
      tabElement.style.display = visible ? '' : 'none';
    }
  });

  // Apply card visibility
  Object.entries(settings.cardVisibility).forEach(([cardId, visible]) => {
    const cardElement = document.querySelector(`[data-card="${cardId}"]`);
    if (cardElement) {
      cardElement.style.display = visible ? '' : 'none';
    }
  });
}

/**
 * Reset appearance settings to defaults
 */
export function resetAppearanceSettings() {
  const defaults = {
    themeMode: 'dark',
    highContrast: false,
    compactRows: false,
    currency: 'USD',
    locale: 'en-US',
    dateFormat: 'YYYY-MM-DD',
    display: {
      showReorderLine: true,
      showUnitQtyLine: true,
      showTotalUnitsLine: true,
      hideZeroValues: false
    },
    tabVisibility: {},
    cardVisibility: {}
  };

  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD(defaults);
  }

  // Apply to UI
  applyAppearanceSettings();

  // Emit event
  EventBus.emit('settings:theme-updated', defaults);
}

// Export public API
export default {
  getAppearanceSettings,
  updateThemeMode,
  toggleHighContrast,
  toggleCompactRows,
  updateDisplayOptions,
  updateTabVisibility,
  updateCardVisibility,
  updateCurrency,
  updateLocale,
  updateDateFormat,
  applyAppearanceSettings,
  resetAppearanceSettings
};
