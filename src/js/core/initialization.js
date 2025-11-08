/* ============================================
   INITIALIZATION MODULE
   CodeLapras - App Startup & Initialization
   ============================================ */

/**
 * Initialize application state from localStorage
 */
function initializeAppState() {
  // Load all data from localStorage
  window.data = LS.get(STORAGE_KEYS.DATA, []);
  window.order = LS.get(STORAGE_KEYS.ORDER, {});
  window.po = LS.get(STORAGE_KEYS.PO, {});
  window.theme = LS.get(STORAGE_KEYS.THEME, 'dark');
  window.damaged = LS.get(STORAGE_KEYS.DAMAGED, []);
  window.invoices = LS.get(STORAGE_KEYS.INVOICES, []);
  window.kits = LS.get(STORAGE_KEYS.KITS, []);
  window.snapshots = LS.get(STORAGE_KEYS.SNAPSHOTS, {});
  window.statsView = LS.get(STORAGE_KEYS.STATS_VIEW, 'all');
  window.snaps = LS.get(STORAGE_KEYS.SNAPS, []);
  window.backups = LS.get(STORAGE_KEYS.BACKUPS, []);

  // Load settings with defaults
  window.settings = LS.get(STORAGE_KEYS.SETTINGS, {
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
    backupKeep: 5
  });

  // Initialize employees and related data
  window.employees = loadEmployees();
  window.employeeSchedules = loadEmployeeSchedules();
  window.employeeTimesheets = loadEmployeeTimesheets();
  window.employeeTasks = loadEmployeeTasks();
  window.payrollPeriods = loadPayrollPeriods();
  window.deductions = loadDeductions();

  // Initialize other modules
  window.rentals = loadRentals();
  window.subscriptions = loadSubscriptions();
  window.shipments = loadShipments();
  window.calendarEvents = loadCalendarEvents();
  window.calendarNotes = loadCalendarNotes();

  // Initialize dirty flag
  window.dirty = false;
}

/**
 * Mark data as modified (needs saving)
 */
function markDirty() {
  window.dirty = true;
}

/**
 * Mark data as saved
 */
function markSaved() {
  window.dirty = false;
  // Auto-export CSV if toggle is enabled
  if (typeof downloadCSV === 'function' && $('#autoExport')?.checked) {
    downloadCSV();
  }
}

/**
 * Apply compact mode to body
 */
function applyCompactMode() {
  if (window.settings) {
    document.body.classList.toggle('compact', !!window.settings.compactRows);
  }
}

/**
 * Initialize application on DOMContentLoaded
 */
function initializeApp() {
  // Initialize app state
  initializeAppState();

  // Initialize theme tokens
  if (typeof initializeThemeTokens === 'function') {
    initializeThemeTokens();
  }

  // Apply theme and high-contrast
  if (window.settings) {
    document.documentElement.classList.toggle('hc', !!window.settings.highContrast);
  }

  applyCompactMode();

  if (typeof applyTheme === 'function') {
    applyTheme();
  }

  if (typeof syncThemeEditorUI === 'function') {
    syncThemeEditorUI();
  }

  // Initialize system theme listener
  if (typeof initSystemThemeListener === 'function') {
    initSystemThemeListener();
  }

  // Initialize calendar state (if needed)
  if (typeof initCalendarState === 'function') {
    initCalendarState();
  }

  // Initialize schedule calendar (if needed)
  if (typeof initScheduleCalendarState === 'function') {
    initScheduleCalendarState();
  }

  // Maybe perform auto-backup
  if (typeof maybeAutoBackup === 'function') {
    maybeAutoBackup();
  }

  console.log('CodeLapras initialized successfully');
}

// Export functions
if (typeof window !== 'undefined') {
  window.initializeAppState = initializeAppState;
  window.initializeApp = initializeApp;
  window.markDirty = markDirty;
  window.markSaved = markSaved;
  window.applyCompactMode = applyCompactMode;
}

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}
