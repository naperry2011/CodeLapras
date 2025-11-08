/* ============================================
   CORE UTILITIES
   CodeLapras - Utility Functions Module
   ============================================ */

// ============ DOM Manipulation ============
/**
 * DOM selector shorthand - querySelector
 * @param {string} s - CSS selector
 * @returns {Element|null}
 */
const $ = s => document.querySelector(s);

/**
 * DOM selector for multiple elements - querySelectorAll as array
 * @param {string} s - CSS selector
 * @returns {Array<Element>}
 */
const $$ = s => [...document.querySelectorAll(s)];

// ============ Dialog Functions ============
// NOTE: Dialog management functions have been moved to src/js/ui/dialogs.js
// This provides better animations, keyboard support, and focus management.
// Functions showDialog() and hideDialog() are now defined in dialogs.js
// and exported to the window object for backward compatibility.

// ============ Data Formatting ============
/**
 * Get current ISO timestamp
 * @returns {string} ISO date string
 */
const nowISO = () => new Date().toISOString();

/**
 * Generate unique ID combining random string + timestamp
 * @returns {string} Unique ID
 */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Format number as currency using locale and settings
 * @param {number} n - Number to format
 * @returns {string} Formatted currency string
 */
const fmt = n => Number(n || 0).toLocaleString(undefined, {
  style: 'currency',
  currency: (window.settings?.currency || 'USD'),
  maximumFractionDigits: 2
});

/**
 * Clamp number between min and max
 * @param {number} n - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Calculate days elapsed from ISO date to now
 * @param {string} iso - ISO date string
 * @returns {number} Days ago
 */
const daysAgo = iso => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

/**
 * HTML escape special characters
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;'
}[c]));

/**
 * Convert value to boolean with default
 * @param {*} v - Value to convert
 * @param {boolean} def - Default value if conversion fails
 * @returns {boolean}
 */
function toBool(v, def) {
  if (v === true || v === 'true' || v === 1 || v === '1' || v === 'yes') return true;
  if (v === false || v === 'false' || v === 0 || v === '0' || v === 'no') return false;
  return def;
}

// ============ Date/Time Utilities ============
/**
 * Get YYYY-MM key for date
 * @param {Date|string} d - Date object or ISO string
 * @returns {string} Month key in format YYYY-MM
 */
function monthKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Shift month key by offset
 * @param {number} offset - Months to shift (positive or negative)
 * @returns {string} Shifted month key
 */
function monthKeyShift(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return monthKey(d);
}

/**
 * Year-month key generation
 * @param {Date} d - Date object
 * @returns {string} YYYY-MM format
 */
function ymKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Convert frequency code to milliseconds
 * @param {string} code - Frequency code (daily, weekly, biweekly, monthly)
 * @returns {number} Milliseconds
 */
function freqMs(code) {
  const day = 86400000;
  switch (code) {
    case 'daily': return day;
    case 'weekly': return day * 7;
    case 'biweekly': return day * 14;
    case 'monthly': return day * 30;
    default: return 0;
  }
}

// ============ String Manipulation ============
/**
 * Normalize header text for CSV
 * @param {string} s - Header string
 * @returns {string} Normalized string
 */
function _normHeader(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Create canonical key from string
 * @param {string} s - String to convert
 * @returns {string} Canonical key
 */
function _canonKey(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Generate unique copy name
 * @param {string} n - Original name
 * @returns {string} Name with " (copy)" appended
 */
function uniqueNameCopy(n) {
  return `${n} (copy)`;
}

/**
 * Generate unique SKU copy
 * @param {string} s - Original SKU
 * @returns {string} SKU with "-COPY" appended
 */
function uniqueSkuCopy(s) {
  return `${s}-COPY`;
}

/**
 * XML/HTML escape for spreadsheet generation
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
function _xmlEsc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;'
  }[c]));
}

// ============ Array/Data Processing ============
/**
 * Find item by name or SKU key
 * @param {string} key - Name or SKU to search for
 * @returns {object|null} Found item or null
 */
function findItemByKey(key) {
  if (!window.data) return null;
  const k = String(key || '').trim().toLowerCase();
  return window.data.find(it =>
    String(it.name || '').trim().toLowerCase() === k ||
    String(it.sku || '').trim().toLowerCase() === k
  ) || null;
}

/**
 * Parse Bill of Materials string
 * @param {string} str - BOM string (format: "sku1:qty1, sku2:qty2")
 * @returns {Array} Array of {sku, qty} objects
 */
function parseBOM(str) {
  if (!str) return [];
  return str.split(',').map(p => {
    const [sku, qty] = p.split(':').map(x => x.trim());
    return { sku, qty: Number(qty) || 1 };
  }).filter(x => x.sku);
}

/**
 * Group items by supplier
 * @param {Array} entries - Array of items
 * @returns {object} Items grouped by supplier
 */
function groupBySupplier(entries) {
  const groups = {};
  entries.forEach(e => {
    const sup = e.supplier || 'No Supplier';
    if (!groups[sup]) groups[sup] = [];
    groups[sup].push(e);
  });
  return groups;
}

// ============ Calculation Helpers ============
/**
 * Calculate total units for item (packages + loose)
 * @param {object} it - Item object
 * @returns {number} Total units
 */
function totalUnits(it) {
  const perPack = Number(it.unitsPerPackage) || 1;
  const packs = Number(it.qty) || 0;
  const loose = Number(it.looseUnits) || 0;
  return (packs * perPack) + loose;
}

/**
 * Normalize loose units into full packages
 * @param {object} it - Item object (modified in place)
 */
function normalizeItemUnits(it) {
  const perPack = Number(it.unitsPerPackage) || 1;
  let loose = Number(it.looseUnits) || 0;
  let packs = Number(it.qty) || 0;

  if (loose >= perPack) {
    const fullPacks = Math.floor(loose / perPack);
    packs += fullPacks;
    loose = loose % perPack;
  }

  it.qty = packs;
  it.looseUnits = loose;
}

/**
 * Consume units from item stock
 * @param {object} it - Item object (modified in place)
 * @param {number} units - Units to consume
 * @returns {boolean} Success (true if enough stock)
 */
function consumeUnitsByUnits(it, units) {
  const total = totalUnits(it);
  if (total < units) return false;

  const perPack = Number(it.unitsPerPackage) || 1;
  let remaining = total - units;

  it.qty = Math.floor(remaining / perPack);
  it.looseUnits = remaining % perPack;

  return true;
}

/**
 * Calculate suggested reorder quantity
 * @param {object} it - Item object
 * @returns {number} Suggested quantity
 */
function suggestedQty(it) {
  const reorder = Number(it.reorderPoint) || 0;
  const current = totalUnits(it);
  return Math.max(0, reorder - current);
}

// ============ Validation Functions ============
/**
 * Validate and clean imported rows
 * @param {Array} rows - Array of row objects
 * @returns {Array} Cleaned rows
 */
function validateAndCleanRows(rows) {
  return rows.filter(row => {
    // Must have at least a name or SKU
    return row.name || row.sku;
  }).map(row => {
    // Ensure numeric fields are numbers
    const cleaned = { ...row };
    ['qty', 'cost', 'price', 'unitsPerPackage', 'looseUnits', 'reorderPoint'].forEach(field => {
      if (cleaned[field] !== undefined) {
        cleaned[field] = Number(cleaned[field]) || 0;
      }
    });
    return cleaned;
  });
}

// ============ Photo/Image Helpers ============
/**
 * Set photo preview source
 * @param {string} src - Image source URL or data URI
 */
function setPreviewSrc(src) {
  const preview = $('#photoPreview');
  if (preview) {
    preview.src = src;
    preview.style.display = src ? 'block' : 'none';
  }
}

/**
 * Clear photo input UI
 */
function clearPhotoUI() {
  const input = $('#photoFile');
  const preview = $('#photoPreview');
  if (input) input.value = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
}

/**
 * Set kit photo preview
 * @param {string} src - Image source URL or data URI
 */
function setKitPreview(src) {
  const preview = $('#kitPhotoPreview');
  if (preview) {
    preview.src = src;
    preview.style.display = src ? 'block' : 'none';
  }
}

/**
 * Clear kit photo UI
 */
function clearKitPhotoUI() {
  const input = $('#kitPhotoFile');
  const preview = $('#kitPhotoPreview');
  if (input) input.value = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
}

// ============ Package/Unit Helpers ============
/**
 * Update package helper display
 */
function updatePackHelper() {
  const perPack = Number($('#addUnitsPerPackage')?.value) || 1;
  const packCost = Number($('#addCost')?.value) || 0;
  const unitCost = packCost / perPack;
  const helper = $('#packHelper');
  if (helper) {
    helper.textContent = `≈ ${fmt(unitCost)} per unit`;
  }
}

/**
 * Auto-calculate per-unit cost from package cost
 */
function autoApplyPerUnit() {
  const perPack = Number($('#addUnitsPerPackage')?.value) || 1;
  const packCost = Number($('#addCost')?.value) || 0;
  const priceField = $('#addPrice');
  if (priceField && perPack > 0) {
    priceField.value = (packCost / perPack).toFixed(2);
  }
}

// ============ Miscellaneous Utilities ============
/**
 * Generate timestamp for export filenames
 * @returns {string} Timestamp in format YYYYMMDD_HHMMSS
 */
function _stamp() {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${Y}${M}${D}_${h}${m}${s}`;
}

/**
 * Generate calendar event unique ID
 * @returns {string} Unique calendar event ID
 */
function calendarUID() {
  return 'evt_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
