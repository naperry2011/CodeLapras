/* ============================================
   STORAGE MODULE
   CodeLapras - LocalStorage Wrapper & Persistence
   ============================================ */

// Import constants (will be available after module conversion)
// For now, we'll define STORAGE_KEYS locally and will refactor later

// ============ LocalStorage Wrapper ============
/**
 * LocalStorage wrapper with JSON serialization
 */
const LS = {
  /**
   * Check if localStorage is available
   * @returns {boolean}
   */
  ok() {
    try {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get and parse JSON from localStorage with default value
   * @param {string} k - Key
   * @param {*} d - Default value
   * @returns {*} Parsed value or default
   */
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },

  /**
   * Stringify and set to localStorage
   * @param {string} k - Key
   * @param {*} v - Value to store
   */
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (err) {
      console.error('localStorage.setItem failed:', err);
    }
  },

  /**
   * Delete from localStorage
   * @param {string} k - Key
   */
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
};

// ============ Data Validation ============

/**
 * Validate product object structure
 * @param {object} product - Product to validate
 * @returns {boolean} True if valid
 */
function validateProduct(product) {
  if (!product || typeof product !== 'object') return false;
  if (!product.id || typeof product.id !== 'string') return false;
  if (typeof product.name !== 'string') return false;
  if (typeof product.qty !== 'number' || product.qty < 0) return false;
  return true;
}

/**
 * Validate invoice object structure
 * @param {object} invoice - Invoice to validate
 * @returns {boolean} True if valid
 */
function validateInvoice(invoice) {
  if (!invoice || typeof invoice !== 'object') return false;
  if (!invoice.id || typeof invoice.id !== 'string') return false;
  if (!Array.isArray(invoice.items)) return false;
  if (typeof invoice.total !== 'number' || invoice.total < 0) return false;
  return true;
}

/**
 * Validate kit object structure
 * @param {object} kit - Kit to validate
 * @returns {boolean} True if valid
 */
function validateKit(kit) {
  if (!kit || typeof kit !== 'object') return false;
  if (!kit.id || typeof kit.id !== 'string') return false;
  if (!Array.isArray(kit.components)) return false;
  return true;
}

/**
 * Validate array data
 * @param {Array} arr - Array to validate
 * @param {Function} validator - Validation function for items
 * @returns {boolean} True if valid
 */
function validateArray(arr, validator) {
  if (!Array.isArray(arr)) return false;
  if (validator) {
    return arr.every(item => validator(item));
  }
  return true;
}

/**
 * Validate settings object
 * @param {object} settings - Settings to validate
 * @returns {boolean} True if valid
 */
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  // Settings can have various properties, just ensure it's an object
  return true;
}

/**
 * Sanitize and ensure data integrity before storage operations
 * @param {*} data - Data to sanitize
 * @param {string} type - Data type (product, invoice, etc.)
 * @returns {*} Sanitized data or null if invalid
 */
function sanitizeData(data, type) {
  try {
    if (data === null || data === undefined) return null;

    // Deep clone to avoid mutation
    const cloned = JSON.parse(JSON.stringify(data));

    switch (type) {
      case 'product':
        return validateProduct(cloned) ? cloned : null;
      case 'invoice':
        return validateInvoice(cloned) ? cloned : null;
      case 'kit':
        return validateKit(cloned) ? cloned : null;
      case 'array':
        return Array.isArray(cloned) ? cloned : [];
      case 'object':
        return typeof cloned === 'object' ? cloned : {};
      default:
        return cloned;
    }
  } catch (err) {
    console.error('Data sanitization error:', err);
    return null;
  }
}

// ============ Versioning & Migration ============

/**
 * Current data schema version
 */
const DATA_VERSION = 1;

/**
 * Application version
 */
const APP_VERSION = '1.0.0';

/**
 * Get stored data version
 * @returns {number} Data version
 */
function getDataVersion() {
  return LS.get('inv.dataVersion', 0);
}

/**
 * Set data version
 * @param {number} version - Version number
 */
function setDataVersion(version) {
  LS.set('inv.dataVersion', version);
}

/**
 * Check if data migration is needed
 * @returns {boolean} True if migration needed
 */
function needsMigration() {
  const currentVersion = getDataVersion();
  return currentVersion < DATA_VERSION;
}

/**
 * Migrate data from old version to current version
 * @param {number} fromVersion - Version to migrate from
 * @returns {boolean} Success
 */
function migrateData(fromVersion) {
  try {
    console.log(`Migrating data from version ${fromVersion} to ${DATA_VERSION}`);

    // Migration logic for different versions
    if (fromVersion < 1) {
      // Migration from version 0 to 1
      // For now, just ensure data version is set
      console.log('Migration v0 -> v1: Initializing data version');
    }

    // Add more migration steps as needed for future versions
    // if (fromVersion < 2) { ... }

    // Set current version
    setDataVersion(DATA_VERSION);
    console.log('Data migration completed successfully');
    return true;

  } catch (err) {
    console.error('Data migration failed:', err);
    return false;
  }
}

/**
 * Initialize or migrate data on app startup
 * @returns {boolean} Success
 */
function initializeDataVersion() {
  try {
    if (needsMigration()) {
      const currentVersion = getDataVersion();
      return migrateData(currentVersion);
    } else {
      // Ensure version is set even if no migration needed
      setDataVersion(DATA_VERSION);
      return true;
    }
  } catch (err) {
    console.error('Data version initialization failed:', err);
    return false;
  }
}

/**
 * Get application info for debugging
 * @returns {object} App info
 */
function getAppInfo() {
  return {
    appVersion: APP_VERSION,
    dataVersion: getDataVersion(),
    expectedDataVersion: DATA_VERSION,
    needsMigration: needsMigration(),
    storageAvailable: LS.ok()
  };
}

// ============ Storage Keys Constants ============
const STORAGE_KEYS = {
  DATA: 'inv.data',
  ORDER: 'inv.order',
  PO: 'inv.po',
  THEME: 'inv.theme',
  DAMAGED: 'inv.damaged',
  INVOICES: 'inv.invoices',
  KITS: 'inv.kits',
  SETTINGS: 'inv.settings',
  SNAPSHOTS: 'inv.snapshots',
  STATS_VIEW: 'inv.statsView',
  SNAPS: 'inv.snaps',
  BACKUPS: 'inv.backups',
  PAYROLL_PERIODS: 'inv.payrollPeriods',
  DEDUCTIONS: 'inv.deductions',
  EMPLOYEES: 'inv.employees',
  SCHEDULES: 'inv.employeeSchedules',
  TIMESHEETS: 'inv.employeeTimesheets',
  TASKS: 'inv.employeeTasks',
  RENTALS: 'inv.rentals',
  SUBSCRIPTIONS: 'inv.subscriptions',
  SHIPMENTS: 'inv.shipments',
  CALENDAR_EVENTS: 'inv.calendarEvents',
  CALENDAR_NOTES: 'inv.calendarNotes',
  PAY_PERIOD: 'inv.payPeriod'
};

// ============ Save All Data ============
/**
 * Save all app state to localStorage
 * Uses individual save functions for better organization and validation
 */
function saveAll() {
  if (!window.data) return;

  try {
    // Save core business data using individual functions
    saveProducts(window.data);
    saveCurrentOrder(window.order || {});
    savePO(window.po || {});
    saveDamaged(window.damaged || []);
    saveInvoices(window.invoices || []);
    saveKits(window.kits || []);
    saveSettings(window.settings || {});
    saveSnapshots(window.snapshots || {});
    saveSnaps(window.snaps || []);
    saveStatsView(window.statsView || 'all');

    // Save employee data
    if (window.employees) saveEmployees(window.employees);
    if (window.employeeSchedules) saveEmployeeSchedules(window.employeeSchedules);
    if (window.employeeTimesheets) saveEmployeeTimesheets(window.employeeTimesheets);
    if (window.employeeTasks) saveEmployeeTasks(window.employeeTasks);
    if (window.payrollPeriods) savePayrollPeriods(window.payrollPeriods);
    if (window.deductions) saveDeductions(window.deductions);
    if (window.payPeriod) updatePayPeriod(window.payPeriod);

    // Save other business data
    if (window.rentals) saveRentals(window.rentals);
    if (window.subscriptions) saveSubscriptions(window.subscriptions);
    if (window.shipments) saveShipments(window.shipments);

    // Save calendar data
    if (window.calendarEvents) saveCalendarEvents(window.calendarEvents);
    if (window.calendarNotes) saveCalendarNotes(window.calendarNotes);

    // Mark as saved and trigger related actions
    if (typeof window.markSaved === 'function') {
      window.markSaved();
    }

    // Trigger snapshot if needed
    if (typeof window.snapshotThisMonthOnce === 'function') {
      window.snapshotThisMonthOnce();
    }

    // Refresh backup banner if needed
    if (typeof window.refreshBackupBanner === 'function') {
      window.refreshBackupBanner();
    }

    // Render stats if needed
    if (typeof window.renderStats === 'function') {
      window.renderStats();
    }

  } catch (err) {
    console.error('Error in saveAll:', err);
  }
}

// ============ Entity-Specific Save/Load Functions ============

/**
 * Load employees array from localStorage
 * @returns {Array} Employees array
 */
function loadEmployees() {
  return LS.get(STORAGE_KEYS.EMPLOYEES, []);
}

/**
 * Save employees array to localStorage
 * @param {Array} employees - Employees to save
 */
function saveEmployees(employees) {
  LS.set(STORAGE_KEYS.EMPLOYEES, employees);
}

/**
 * Load employee schedules from localStorage
 * @returns {Array} Schedules array
 */
function loadEmployeeSchedules() {
  return LS.get(STORAGE_KEYS.SCHEDULES, []);
}

/**
 * Save employee schedules to localStorage
 * @param {Array} schedules - Schedules to save
 */
function saveEmployeeSchedules(schedules) {
  LS.set(STORAGE_KEYS.SCHEDULES, schedules);
}

/**
 * Load employee timesheets from localStorage
 * @returns {Array} Timesheets array
 */
function loadEmployeeTimesheets() {
  return LS.get(STORAGE_KEYS.TIMESHEETS, []);
}

/**
 * Save employee timesheets to localStorage
 * @param {Array} timesheets - Timesheets to save
 */
function saveEmployeeTimesheets(timesheets) {
  LS.set(STORAGE_KEYS.TIMESHEETS, timesheets);
}

/**
 * Load employee tasks from localStorage
 * @returns {Array} Tasks array
 */
function loadEmployeeTasks() {
  return LS.get(STORAGE_KEYS.TASKS, []);
}

/**
 * Save employee tasks to localStorage
 * @param {Array} tasks - Tasks to save
 */
function saveEmployeeTasks(tasks) {
  LS.set(STORAGE_KEYS.TASKS, tasks);
}

/**
 * Load pay period settings from localStorage
 * @returns {object} Pay period settings
 */
function loadPayPeriod() {
  return LS.get(STORAGE_KEYS.PAY_PERIOD, {
    frequency: 'biweekly',
    startDate: null,
    lastPayDate: null
  });
}

/**
 * Update and save pay period settings
 * @param {object} period - Pay period settings
 */
function updatePayPeriod(period) {
  LS.set(STORAGE_KEYS.PAY_PERIOD, period);
}

/**
 * Load payroll periods from localStorage
 * @returns {Array} Payroll periods
 */
function loadPayrollPeriods() {
  return LS.get(STORAGE_KEYS.PAYROLL_PERIODS, []);
}

/**
 * Save payroll periods to localStorage
 * @param {Array} periods - Payroll periods to save
 */
function savePayrollPeriods(periods) {
  LS.set(STORAGE_KEYS.PAYROLL_PERIODS, periods);
}

/**
 * Load deductions from localStorage
 * @returns {Array} Deductions
 */
function loadDeductions() {
  return LS.get(STORAGE_KEYS.DEDUCTIONS, []);
}

/**
 * Save deductions to localStorage
 * @param {Array} deductions - Deductions to save
 */
function saveDeductions(deductions) {
  LS.set(STORAGE_KEYS.DEDUCTIONS, deductions);
}

/**
 * Load rental records from localStorage
 * @returns {Array} Rentals
 */
function loadRentals() {
  return LS.get(STORAGE_KEYS.RENTALS, []);
}

/**
 * Save rental records to localStorage
 * @param {Array} rentals - Rentals to save
 */
function saveRentals(rentals) {
  LS.set(STORAGE_KEYS.RENTALS, rentals);
}

/**
 * Load subscriptions from localStorage
 * @returns {Array} Subscriptions
 */
function loadSubscriptions() {
  return LS.get(STORAGE_KEYS.SUBSCRIPTIONS, []);
}

/**
 * Save subscriptions to localStorage
 * @param {Array} subscriptions - Subscriptions to save
 */
function saveSubscriptions(subscriptions) {
  LS.set(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions);
}

/**
 * Load shipment tracking from localStorage
 * @returns {Array} Shipments
 */
function loadShipments() {
  return LS.get(STORAGE_KEYS.SHIPMENTS, []);
}

/**
 * Save shipment tracking to localStorage
 * @param {Array} shipments - Shipments to save
 */
function saveShipments(shipments) {
  LS.set(STORAGE_KEYS.SHIPMENTS, shipments);
}

/**
 * Load calendar events from localStorage
 * @returns {Array} Calendar events
 */
function loadCalendarEvents() {
  return LS.get(STORAGE_KEYS.CALENDAR_EVENTS, []);
}

/**
 * Save calendar events to localStorage
 * @param {Array} events - Calendar events to save
 */
function saveCalendarEvents(events) {
  LS.set(STORAGE_KEYS.CALENDAR_EVENTS, events);
}

/**
 * Load calendar notes from localStorage
 * @returns {object} Calendar notes
 */
function loadCalendarNotes() {
  return LS.get(STORAGE_KEYS.CALENDAR_NOTES, {});
}

/**
 * Save calendar notes to localStorage
 * @param {object} notes - Calendar notes to save
 */
function saveCalendarNotes(notes) {
  LS.set(STORAGE_KEYS.CALENDAR_NOTES, notes);
}

// ============ Core Business Entity Functions ============

/**
 * Load products/inventory data from localStorage
 * @returns {Array} Products array
 */
function loadProducts() {
  return LS.get(STORAGE_KEYS.DATA, []);
}

/**
 * Save products/inventory data to localStorage
 * @param {Array} products - Products to save
 */
function saveProducts(products) {
  try {
    // Normalize items before persisting
    if (Array.isArray(products) && typeof window.normalizeItemUnits === 'function') {
      for (const item of products) {
        window.normalizeItemUnits(item);
      }
    }
    LS.set(STORAGE_KEYS.DATA, products);
  } catch (err) {
    console.error('Failed to save products:', err);
  }
}

/**
 * Load invoices from localStorage
 * @returns {Array} Invoices array
 */
function loadInvoices() {
  return LS.get(STORAGE_KEYS.INVOICES, []);
}

/**
 * Save invoices to localStorage
 * @param {Array} invoices - Invoices to save
 */
function saveInvoices(invoices) {
  LS.set(STORAGE_KEYS.INVOICES, invoices);
}

/**
 * Load kits from localStorage
 * @returns {Array} Kits array
 */
function loadKits() {
  return LS.get(STORAGE_KEYS.KITS, []);
}

/**
 * Save kits to localStorage
 * @param {Array} kits - Kits to save
 */
function saveKits(kits) {
  LS.set(STORAGE_KEYS.KITS, kits);
}

/**
 * Load damaged/loss records from localStorage
 * @returns {Array} Damaged records array
 */
function loadDamaged() {
  return LS.get(STORAGE_KEYS.DAMAGED, []);
}

/**
 * Save damaged/loss records to localStorage
 * @param {Array} damaged - Damaged records to save
 */
function saveDamaged(damaged) {
  LS.set(STORAGE_KEYS.DAMAGED, damaged);
}

/**
 * Load app settings from localStorage
 * @returns {object} Settings object
 */
function loadSettings() {
  const defaultSettings = {
    taxDefault: 0,
    invPrefix: 'INV-',
    highContrast: false,
    backupReminders: false,
    lastBackupAt: null,
    logo: '',
    themeMode: 'dark',
    currency: 'USD',
    compactRows: false,
    autoBackupFreq: 'off',
    lastAutoBackupAt: null,
    backupKeep: 5,
    footerImage: '',
    footerNotes: '',
    tabVisibility: {},
    sideOrder: []
  };

  const settings = LS.get(STORAGE_KEYS.SETTINGS, defaultSettings);

  // Initialize theme tokens if not present
  if (!settings.themeTokens) {
    settings.themeTokens = {
      dark: {
        bg: '#0b0e12',
        bg2: '#10151c',
        text: '#e7ecf2',
        muted: '#aab4c2',
        accent: '#18d47b',
        danger: '#ff5e6a',
        warn: '#ffb020',
        card: '#0f141b',
        border: '#233041',
        shadow: 'rgba(0,0,0,.35)'
      },
      light: {
        bg: '#f5f8fc',
        bg2: '#ffffff',
        text: '#0f1720',
        muted: '#4a5a6f',
        accent: '#09e3f3',
        danger: '#c62828',
        warn: '#b26a00',
        card: '#ffffff',
        border: '#d9e3ef',
        shadow: 'rgba(0,0,0,.12)'
      },
      hc: {
        border: '#4aa3ff',
        muted: '#dfe7f2'
      }
    };
  }

  return settings;
}

/**
 * Save app settings to localStorage
 * @param {object} settings - Settings to save
 */
function saveSettings(settings) {
  LS.set(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Load monthly snapshots from localStorage
 * @returns {object} Snapshots object
 */
function loadSnapshots() {
  return LS.get(STORAGE_KEYS.SNAPSHOTS, {});
}

/**
 * Save monthly snapshots to localStorage
 * @param {object} snapshots - Snapshots to save
 */
function saveSnapshots(snapshots) {
  LS.set(STORAGE_KEYS.SNAPSHOTS, snapshots);
}

/**
 * Load snapshot history from localStorage
 * @returns {Array} Snapshot history array
 */
function loadSnaps() {
  return LS.get(STORAGE_KEYS.SNAPS, []);
}

/**
 * Save snapshot history to localStorage
 * @param {Array} snaps - Snapshot history to save
 */
function saveSnaps(snaps) {
  LS.set(STORAGE_KEYS.SNAPS, snaps);
}

/**
 * Load current order from localStorage
 * @returns {object} Current order object
 */
function loadCurrentOrder() {
  return LS.get(STORAGE_KEYS.ORDER, {});
}

/**
 * Save current order to localStorage
 * @param {object} order - Order to save
 */
function saveCurrentOrder(order) {
  LS.set(STORAGE_KEYS.ORDER, order);
}

/**
 * Load purchase order from localStorage
 * @returns {object} Purchase order object
 */
function loadPO() {
  return LS.get(STORAGE_KEYS.PO, {});
}

/**
 * Save purchase order to localStorage
 * @param {object} po - Purchase order to save
 */
function savePO(po) {
  LS.set(STORAGE_KEYS.PO, po);
}

/**
 * Load statistics view mode from localStorage
 * @returns {string} Stats view mode
 */
function loadStatsView() {
  return LS.get(STORAGE_KEYS.STATS_VIEW, 'all');
}

/**
 * Save statistics view mode to localStorage
 * @param {string} view - Stats view mode
 */
function saveStatsView(view) {
  LS.set(STORAGE_KEYS.STATS_VIEW, view);
}

// ============ Backup & Restore ============

/**
 * Create backup payload object
 * @returns {object} Backup data
 */
function backupPayload() {
  return {
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: window.data || [],
    order: window.order || {},
    po: window.po || {},
    damaged: window.damaged || [],
    invoices: window.invoices || [],
    kits: window.kits || [],
    settings: window.settings || {},
    snapshots: window.snapshots || {},
    snaps: window.snaps || [],
    employees: window.employees || [],
    employeeSchedules: window.employeeSchedules || [],
    employeeTimesheets: window.employeeTimesheets || [],
    employeeTasks: window.employeeTasks || [],
    payrollPeriods: window.payrollPeriods || [],
    deductions: window.deductions || [],
    rentals: window.rentals || [],
    subscriptions: window.subscriptions || [],
    shipments: window.shipments || [],
    calendarEvents: window.calendarEvents || [],
    calendarNotes: window.calendarNotes || {}
  };
}

/**
 * Create and store backup
 * @param {boolean} manual - Whether this is a manual backup
 */
function saveBackup(manual = false) {
  const backup = backupPayload();
  backup.manual = manual;

  const backups = LS.get(STORAGE_KEYS.BACKUPS, []);
  backups.unshift(backup);

  // Keep only configured number of backups
  const keep = window.settings?.backupKeep || 5;
  if (backups.length > keep) {
    backups.splice(keep);
  }

  LS.set(STORAGE_KEYS.BACKUPS, backups);

  if (window.settings) {
    window.settings.lastBackupAt = new Date().toISOString();
    LS.set(STORAGE_KEYS.SETTINGS, window.settings);
  }
}

/**
 * Restore data from backup object
 * @param {object} obj - Backup data object
 * @returns {boolean} Success
 */
function restoreFromObject(obj) {
  if (!obj) return false;

  try {
    if (obj.data) window.data = obj.data;
    if (obj.order) window.order = obj.order;
    if (obj.po) window.po = obj.po;
    if (obj.damaged) window.damaged = obj.damaged;
    if (obj.invoices) window.invoices = obj.invoices;
    if (obj.kits) window.kits = obj.kits;
    if (obj.settings) window.settings = obj.settings;
    if (obj.snapshots) window.snapshots = obj.snapshots;
    if (obj.snaps) window.snaps = obj.snaps;
    if (obj.employees) window.employees = obj.employees;
    if (obj.employeeSchedules) window.employeeSchedules = obj.employeeSchedules;
    if (obj.employeeTimesheets) window.employeeTimesheets = obj.employeeTimesheets;
    if (obj.employeeTasks) window.employeeTasks = obj.employeeTasks;
    if (obj.payrollPeriods) window.payrollPeriods = obj.payrollPeriods;
    if (obj.deductions) window.deductions = obj.deductions;
    if (obj.rentals) window.rentals = obj.rentals;
    if (obj.subscriptions) window.subscriptions = obj.subscriptions;
    if (obj.shipments) window.shipments = obj.shipments;
    if (obj.calendarEvents) window.calendarEvents = obj.calendarEvents;
    if (obj.calendarNotes) window.calendarNotes = obj.calendarNotes;

    saveAll();
    return true;
  } catch (err) {
    console.error('Restore failed:', err);
    return false;
  }
}

/**
 * Check and perform auto-backup if needed
 */
function maybeAutoBackup() {
  if (!window.settings) return;

  const freq = window.settings.autoBackupFreq;
  if (freq === 'off') return;

  const lastBackup = window.settings.lastAutoBackupAt;
  if (!lastBackup) {
    saveBackup(false);
    return;
  }

  const now = Date.now();
  const last = new Date(lastBackup).getTime();
  const diff = now - last;

  const freqMs = {
    daily: 86400000,
    weekly: 604800000,
    monthly: 2592000000
  }[freq] || 0;

  if (diff >= freqMs) {
    saveBackup(false);
    window.settings.lastAutoBackupAt = new Date().toISOString();
    LS.set(STORAGE_KEYS.SETTINGS, window.settings);
  }
}
