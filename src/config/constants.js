/* ============================================
   CONSTANTS MODULE
   CodeLapras - Application Constants & Configuration
   ============================================ */

// ============ Storage Keys ============
/**
 * LocalStorage key constants
 * All application data is stored under 'inv.*' namespace
 */
export const STORAGE_KEYS = {
  // Core business data
  DATA: 'inv.data',                    // Products/inventory items
  ORDER: 'inv.order',                  // Current order being built
  PO: 'inv.po',                        // Purchase order
  DAMAGED: 'inv.damaged',              // Damaged/loss records
  INVOICES: 'inv.invoices',            // Invoice records
  KITS: 'inv.kits',                    // Product kits/bundles
  SETTINGS: 'inv.settings',            // App settings
  SNAPSHOTS: 'inv.snapshots',          // Monthly snapshots
  SNAPS: 'inv.snaps',                  // Snapshot history
  STATS_VIEW: 'inv.statsView',         // Statistics view mode
  BACKUPS: 'inv.backups',              // Backup history
  THEME: 'inv.theme',                  // Theme preference

  // Employee module
  EMPLOYEES: 'inv.employees',                  // Employee records
  SCHEDULES: 'inv.employeeSchedules',          // Work schedules
  TIMESHEETS: 'inv.employeeTimesheets',        // Clock in/out records
  TASKS: 'inv.employeeTasks',                  // Task assignments
  PAYROLL_PERIODS: 'inv.payrollPeriods',       // Payroll history
  DEDUCTIONS: 'inv.deductions',                // Tax/benefit deductions
  PAY_PERIOD: 'inv.payPeriod',                 // Pay period settings

  // Other business modules
  RENTALS: 'inv.rentals',                      // Equipment rentals
  SUBSCRIPTIONS: 'inv.subscriptions',          // Recurring subscriptions
  SHIPMENTS: 'inv.shipments',                  // Shipment tracking

  // Calendar module
  CALENDAR_EVENTS: 'inv.calendarEvents',       // Calendar events
  CALENDAR_NOTES: 'inv.calendarNotes'          // Daily notes (keyed by date)
};

// ============ Default Values ============

/**
 * Default settings object structure
 */
export const DEFAULT_SETTINGS = {
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
  sideOrder: [],
  themeTokens: null  // Will be initialized with DEFAULT_TOKENS if null
};

/**
 * Default theme tokens for different themes
 */
export const DEFAULT_TOKENS = {
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

/**
 * Default product object structure
 */
export const DEFAULT_PRODUCT = {
  id: '',
  name: '',
  sku: '',
  qty: 0,                    // Packages
  looseUnits: 0,             // Individual units
  unitsPerPackage: 1,
  cost: 0,                   // Per package
  price: 0,                  // Sell price per unit
  category: '',
  supplier: '',
  reorderPoint: 0,
  photo: '',                 // Data URI
  measurable: false,
  notes: '',
  createdAt: '',             // ISO string
  updatedAt: ''              // ISO string
};

/**
 * Default invoice object structure
 */
export const DEFAULT_INVOICE = {
  id: '',
  number: '',                // e.g., "INV-001"
  date: '',                  // ISO string
  items: [],                 // Array of line items
  subtotal: 0,
  tax: 0,
  total: 0,
  notes: '',
  customer: {                // Embedded customer info
    name: '',
    email: '',
    phone: '',
    address: ''
  }
};

/**
 * Default kit object structure
 */
export const DEFAULT_KIT = {
  id: '',
  name: '',
  sku: '',
  components: [],            // Array of {sku, qty}
  photo: '',
  cost: 0,                   // Auto-calculated or manual
  price: 0,
  notes: ''
};

/**
 * Default damaged/loss record structure
 */
export const DEFAULT_DAMAGED_RECORD = {
  id: '',
  sku: '',
  productName: '',
  qty: 0,
  reason: '',
  date: '',                  // ISO string
  notes: ''
};

/**
 * Default pay period settings
 */
export const DEFAULT_PAY_PERIOD = {
  frequency: 'biweekly',
  startDate: null,
  lastPayDate: null
};

/**
 * Default employee object structure
 */
export const DEFAULT_EMPLOYEE = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: '',
  hourlyRate: 0,
  hireDate: '',              // ISO string
  active: true,
  notes: ''
};

/**
 * Default rental object structure
 */
export const DEFAULT_RENTAL = {
  id: '',
  customerId: '',
  customerName: '',
  items: [],                 // Array of rental items
  startDate: '',             // ISO string
  endDate: '',               // ISO string
  returnDate: null,          // ISO string or null
  deposit: 0,
  rentalFee: 0,
  lateFee: 0,
  status: 'active',          // active, returned, overdue
  notes: ''
};

/**
 * Default subscription object structure
 */
export const DEFAULT_SUBSCRIPTION = {
  id: '',
  customerId: '',
  customerName: '',
  plan: '',
  frequency: 'monthly',      // monthly, quarterly, yearly
  amount: 0,
  startDate: '',             // ISO string
  nextBillingDate: '',       // ISO string
  status: 'active',          // active, paused, cancelled
  notes: ''
};

/**
 * Default shipment object structure
 */
export const DEFAULT_SHIPMENT = {
  id: '',
  orderId: '',
  trackingNumber: '',
  carrier: '',
  status: 'pending',         // pending, shipped, in_transit, delivered
  shippedDate: null,         // ISO string or null
  deliveredDate: null,       // ISO string or null
  notes: ''
};

// ============ Application Constants ============

/**
 * Application version for data migration
 */
export const APP_VERSION = '1.0.0';

/**
 * Data schema version for migration support
 */
export const DATA_VERSION = 1;

/**
 * Supported currencies
 */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

/**
 * Backup frequency options
 */
export const BACKUP_FREQUENCIES = ['off', 'daily', 'weekly', 'monthly'];

/**
 * Statistics view modes
 */
export const STATS_VIEW_MODES = ['all', 'week', 'month', 'quarter', 'year'];

/**
 * Subscription frequencies
 */
export const SUBSCRIPTION_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'];

/**
 * Pay period frequencies
 */
export const PAY_PERIOD_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly'];

/**
 * Shipment status options
 */
export const SHIPMENT_STATUSES = ['pending', 'shipped', 'in_transit', 'delivered', 'exception'];

/**
 * Rental status options
 */
export const RENTAL_STATUSES = ['active', 'returned', 'overdue', 'cancelled'];

/**
 * Subscription status options
 */
export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled'];

// ============ Validation Constants ============

/**
 * Validation rules for various fields
 */
export const VALIDATION_RULES = {
  SKU_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 200,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PATTERN: /^[\d\s\-\(\)\+]+$/,
  MIN_PRICE: 0,
  MAX_PRICE: 999999.99,
  MIN_QTY: 0,
  MAX_QTY: 999999
};

// ============ UI Constants ============

/**
 * Default pagination size
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum items to display before pagination
 */
export const MAX_ITEMS_NO_PAGINATION = 100;

/**
 * Debounce delay for search (ms)
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Toast notification duration (ms)
 */
export const TOAST_DURATION = 3000;
