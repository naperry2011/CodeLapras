/* ============================================
   COMPANY/SETTINGS MODEL
   CodeLapras - Application Settings Business Logic
   ============================================ */

// ============ Factory Functions ============

/**
 * Create settings object with defaults
 * @param {object} data - Settings data
 * @returns {object} Settings object
 */
function createSettings(data = {}) {
  return {
    // Tax & Invoice
    taxDefault: typeof data.taxDefault === 'number' ? data.taxDefault : 0,
    invPrefix: data.invPrefix || 'INV',

    // Company Info
    companyName: data.companyName || '',
    companyAddress: data.companyAddress || '',
    companyPhone: data.companyPhone || '',
    companyEmail: data.companyEmail || '',
    companyWebsite: data.companyWebsite || '',
    logo: data.logo || '',

    // Appearance
    themeMode: data.themeMode || 'dark',
    highContrast: !!data.highContrast,
    compactRows: !!data.compactRows,
    themeTokens: data.themeTokens || null,

    // Currency & Locale
    currency: data.currency || 'USD',
    locale: data.locale || 'en-US',
    dateFormat: data.dateFormat || 'YYYY-MM-DD',

    // Backup
    backupReminders: !!data.backupReminders,
    lastBackupAt: data.lastBackupAt || null,
    autoBackupFreq: data.autoBackupFreq || 'off',
    lastAutoBackupAt: data.lastAutoBackupAt || null,
    backupKeep: typeof data.backupKeep === 'number' ? data.backupKeep : 5,

    // Invoice Footer
    footerImage: data.footerImage || '',
    footerNotes: data.footerNotes || '',

    // UI Preferences
    tabVisibility: data.tabVisibility || {},
    sideOrder: data.sideOrder || [],

    // Notifications
    lowStockAlert: data.lowStockAlert !== undefined ? !!data.lowStockAlert : true,
    overdueRentalAlert: data.overdueRentalAlert !== undefined ? !!data.overdueRentalAlert : true,

    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

// ============ Validation ============

/**
 * Validate settings
 * @param {object} settings - Settings to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateSettings(settings) {
  const errors = [];

  if (!settings) {
    errors.push('Settings object is required');
    return { isValid: false, errors };
  }

  // Tax rate validation
  if (typeof settings.taxDefault !== 'number' || settings.taxDefault < 0 || settings.taxDefault > 1) {
    errors.push('Tax rate must be between 0 and 1 (e.g., 0.07 for 7%)');
  }

  // Invoice prefix validation
  if (settings.invPrefix && settings.invPrefix.length > 10) {
    errors.push('Invoice prefix must be 10 characters or less');
  }

  // Currency validation
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'];
  if (settings.currency && !validCurrencies.includes(settings.currency)) {
    errors.push(`Invalid currency. Supported: ${validCurrencies.join(', ')}`);
  }

  // Backup frequency validation
  const validFreqs = ['off', 'daily', 'weekly', 'monthly'];
  if (settings.autoBackupFreq && !validFreqs.includes(settings.autoBackupFreq)) {
    errors.push(`Invalid backup frequency. Supported: ${validFreqs.join(', ')}`);
  }

  // Backup keep count validation
  if (typeof settings.backupKeep !== 'number' || settings.backupKeep < 1 || settings.backupKeep > 100) {
    errors.push('Backup keep count must be between 1 and 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============ Update Helpers ============

/**
 * Update tax rate
 * @param {object} settings - Settings object
 * @param {number} rate - Tax rate (0-1)
 * @returns {object} Updated settings
 */
function updateTaxRate(settings, rate) {
  if (!settings || typeof rate !== 'number') return settings;

  return {
    ...settings,
    taxDefault: Math.max(0, Math.min(1, rate)),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Update invoice prefix
 * @param {object} settings - Settings object
 * @param {string} prefix - Invoice prefix
 * @returns {object} Updated settings
 */
function updateInvoicePrefix(settings, prefix) {
  if (!settings || typeof prefix !== 'string') return settings;

  return {
    ...settings,
    invPrefix: prefix.substring(0, 10),
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Update theme mode
 * @param {object} settings - Settings object
 * @param {string} mode - Theme mode ('dark', 'light', 'auto')
 * @returns {object} Updated settings
 */
function updateThemeMode(settings, mode) {
  if (!settings) return settings;

  const validModes = ['dark', 'light', 'auto'];
  if (!validModes.includes(mode)) return settings;

  return {
    ...settings,
    themeMode: mode,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Toggle high contrast mode
 * @param {object} settings - Settings object
 * @returns {object} Updated settings
 */
function toggleHighContrast(settings) {
  if (!settings) return settings;

  return {
    ...settings,
    highContrast: !settings.highContrast,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Toggle compact rows
 * @param {object} settings - Settings object
 * @returns {object} Updated settings
 */
function toggleCompactRows(settings) {
  if (!settings) return settings;

  return {
    ...settings,
    compactRows: !settings.compactRows,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Update theme tokens
 * @param {object} settings - Settings object
 * @param {object} tokens - Theme tokens
 * @returns {object} Updated settings
 */
function updateThemeTokens(settings, tokens) {
  if (!settings || !tokens) return settings;

  return {
    ...settings,
    themeTokens: tokens,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Update company info
 * @param {object} settings - Settings object
 * @param {object} companyInfo - Company information
 * @returns {object} Updated settings
 */
function updateCompanyInfo(settings, companyInfo) {
  if (!settings || !companyInfo) return settings;

  return {
    ...settings,
    companyName: companyInfo.companyName || settings.companyName,
    companyAddress: companyInfo.companyAddress || settings.companyAddress,
    companyPhone: companyInfo.companyPhone || settings.companyPhone,
    companyEmail: companyInfo.companyEmail || settings.companyEmail,
    companyWebsite: companyInfo.companyWebsite || settings.companyWebsite,
    updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString()
  };
}

/**
 * Update backup settings
 * @param {object} settings - Settings object
 * @param {object} backupSettings - Backup settings
 * @returns {object} Updated settings
 */
function updateBackupSettings(settings, backupSettings) {
  if (!settings || !backupSettings) return settings;

  const updated = { ...settings };

  if (backupSettings.autoBackupFreq !== undefined) {
    updated.autoBackupFreq = backupSettings.autoBackupFreq;
  }

  if (typeof backupSettings.backupKeep === 'number') {
    updated.backupKeep = Math.max(1, Math.min(100, backupSettings.backupKeep));
  }

  if (backupSettings.backupReminders !== undefined) {
    updated.backupReminders = !!backupSettings.backupReminders;
  }

  updated.updatedAt = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return updated;
}

/**
 * Record backup timestamp
 * @param {object} settings - Settings object
 * @param {boolean} isAuto - Whether this is an automatic backup
 * @returns {object} Updated settings
 */
function recordBackup(settings, isAuto = false) {
  if (!settings) return settings;

  const now = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();

  return {
    ...settings,
    lastBackupAt: now,
    lastAutoBackupAt: isAuto ? now : settings.lastAutoBackupAt,
    updatedAt: now
  };
}

// ============ Currency Formatting ============

/**
 * Format currency based on settings
 * @param {number} amount - Amount to format
 * @param {object} settings - Settings object
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, settings) {
  if (typeof amount !== 'number') return '';

  const currency = settings?.currency || 'USD';
  const locale = settings?.locale || 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  } catch (err) {
    // Fallback formatting
    const symbol = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'CA$',
      'AUD': 'AU$',
      'JPY': '¥',
      'CNY': '¥'
    }[currency] || '$';

    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format tax rate for display
 * @param {number} rate - Tax rate (0-1)
 * @returns {string} Formatted tax rate (e.g., "7.5%")
 */
function formatTaxRate(rate) {
  if (typeof rate !== 'number') return '0%';
  return `${(rate * 100).toFixed(2)}%`;
}

// ============ CRUD Operations ============

function getSettings() {
  if (!window.settings) {
    window.settings = createSettings();
  }
  return window.settings;
}

function updateSettingsCRUD(updates) {
  try {
    const current = getSettings();
    const updated = { ...current, ...updates, updatedAt: typeof nowISO === 'function' ? nowISO() : new Date().toISOString() };
    const validation = validateSettings(updated);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    window.settings = updated;
    saveSettingsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('settings:updated', { updates, settings: updated });
    }
    return { success: true, settings: updated };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function resetSettingsCRUD() {
  try {
    const defaultSettings = createSettings();
    window.settings = defaultSettings;
    saveSettingsToStorage();
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('settings:reset', { settings: defaultSettings });
    }
    return { success: true, settings: defaultSettings };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

function saveSettingsToStorage() {
  if (typeof saveSettings === 'function') {
    saveSettings(window.settings || createSettings());
  }
}

// ============ Exports (for window object) ============

if (typeof window !== 'undefined') {
  window.createSettings = createSettings;
  window.validateSettings = validateSettings;
  window.updateTaxRate = updateTaxRate;
  window.updateInvoicePrefix = updateInvoicePrefix;
  window.updateThemeMode = updateThemeMode;
  window.toggleHighContrast = toggleHighContrast;
  window.toggleCompactRows = toggleCompactRows;
  window.updateThemeTokens = updateThemeTokens;
  window.updateCompanyInfo = updateCompanyInfo;
  window.updateBackupSettings = updateBackupSettings;
  window.recordBackup = recordBackup;
  window.formatCurrency = formatCurrency;
  window.formatTaxRate = formatTaxRate;
  window.getSettings = getSettings;
  window.updateSettingsCRUD = updateSettingsCRUD;
  window.resetSettingsCRUD = resetSettingsCRUD;
  window.saveSettingsToStorage = saveSettingsToStorage;
}
