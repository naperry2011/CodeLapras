/* ============================================
   STORAGE MODULE
   CodeLapras - LocalStorage Wrapper & Persistence
   ============================================ */

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
 */
function saveAll() {
  if (!window.data) return;

  LS.set(STORAGE_KEYS.DATA, window.data);
  LS.set(STORAGE_KEYS.ORDER, window.order || {});
  LS.set(STORAGE_KEYS.PO, window.po || {});
  LS.set(STORAGE_KEYS.DAMAGED, window.damaged || []);
  LS.set(STORAGE_KEYS.INVOICES, window.invoices || []);
  LS.set(STORAGE_KEYS.KITS, window.kits || []);
  LS.set(STORAGE_KEYS.SETTINGS, window.settings || {});
  LS.set(STORAGE_KEYS.SNAPSHOTS, window.snapshots || {});
  LS.set(STORAGE_KEYS.STATS_VIEW, window.statsView || 'all');
  LS.set(STORAGE_KEYS.SNAPS, window.snaps || []);

  if (typeof window.markSaved === 'function') {
    window.markSaved();
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
