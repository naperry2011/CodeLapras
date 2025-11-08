/* ============================================
   INITIALIZATION MODULE
   CodeLapras - App Startup & Initialization
   ============================================ */

/**
 * Initialize application state from localStorage
 * Uses new storage abstraction layer functions
 */
function initializeAppState() {
  // Initialize data versioning and perform migrations if needed
  if (typeof initializeDataVersion === 'function') {
    initializeDataVersion();
  }

  // Load core business data using new storage functions
  window.data = loadProducts();
  window.order = loadCurrentOrder();
  window.po = loadPO();
  window.theme = LS.get(STORAGE_KEYS.THEME, 'dark');
  window.damaged = loadDamaged();
  window.invoices = loadInvoices();
  window.kits = loadKits();
  window.settings = loadSettings();
  window.snapshots = loadSnapshots();
  window.snaps = loadSnaps();
  window.statsView = loadStatsView();
  window.backups = LS.get(STORAGE_KEYS.BACKUPS, []);

  // Initialize employees and related data
  window.employees = loadEmployees();
  window.employeeSchedules = loadEmployeeSchedules();
  window.employeeTimesheets = loadEmployeeTimesheets();
  window.employeeTasks = loadEmployeeTasks();
  window.payrollPeriods = loadPayrollPeriods();
  window.deductions = loadDeductions();
  window.payPeriod = loadPayPeriod();

  // Initialize other business modules
  window.rentals = loadRentals();
  window.subscriptions = loadSubscriptions();
  window.shipments = loadShipments();

  // Initialize calendar module
  window.calendarEvents = loadCalendarEvents();
  window.calendarNotes = loadCalendarNotes();

  // Initialize dirty flag
  window.dirty = false;

  // Log app info for debugging (can be removed in production)
  if (typeof getAppInfo === 'function') {
    console.log('App Info:', getAppInfo());
  }
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
