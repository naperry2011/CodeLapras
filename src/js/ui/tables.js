/**
 * tables.js - Generic Table Rendering and Management System
 *
 * Provides reusable table rendering with:
 * - Column definitions with custom formatters
 * - Built-in formatters (currency, date, phone, etc.)
 * - Sortable columns
 * - Event delegation for row actions
 * - Empty state handling
 * - Integration with search/filter/pagination
 *
 * Usage:
 * renderTable('myTableBody', data, [
 *   { key: 'name', label: 'Name', sortable: true },
 *   { key: 'price', label: 'Price', formatter: formatters.currency },
 *   { key: 'actions', label: 'Actions', formatter: formatters.actions(['edit', 'delete']) }
 * ]);
 */

// ============================================================================
// BUILT-IN FORMATTERS
// ============================================================================

const formatters = {
  /**
   * Format number as currency
   * @param {number} value - The numeric value
   * @param {object} row - The full row object (optional)
   * @returns {string} Formatted currency string
   */
  currency: (value, row) => {
    const num = parseFloat(value) || 0;
    return `$${num.toFixed(2)}`;
  },

  /**
   * Format date string to locale date
   * @param {string|Date} value - Date value
   * @returns {string} Formatted date
   */
  date: (value, row) => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  },

  /**
   * Format date string to locale date and time
   * @param {string|Date} value - Date value
   * @returns {string} Formatted date and time
   */
  datetime: (value, row) => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString();
  },

  /**
   * Format phone number
   * @param {string} value - Phone number
   * @returns {string} Formatted phone
   */
  phone: (value, row) => {
    if (!value) return '-';
    const cleaned = String(value).replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return value;
  },

  /**
   * Format photo thumbnail
   * @param {string} value - Photo URL or data URI
   * @returns {string} HTML for thumbnail
   */
  photo: (value, row) => {
    if (!value) return '<div class="photoThumb" style="background:#ddd"></div>';
    return `<div class="photoThumb" style="background-image:url('${value}')"></div>`;
  },

  /**
   * Format status badge
   * @param {string} value - Status text
   * @returns {string} HTML for status badge
   */
  status: (value, row) => {
    if (!value) return '-';
    const statusClass = value.toLowerCase().replace(/\s+/g, '-');
    return `<span class="status-badge status-${statusClass}">${value}</span>`;
  },

  /**
   * Format quantity chip
   * @param {number} value - Quantity value
   * @param {object} row - Row object (can check reorderAt)
   * @returns {string} HTML for quantity chip
   */
  quantity: (value, row) => {
    const qty = parseInt(value) || 0;
    const reorderAt = parseInt(row?.reorderAt) || 0;
    const isLow = reorderAt > 0 && qty <= reorderAt;
    const cls = isLow ? 'qtychip warn' : 'qtychip';
    return `<span class="${cls}">${qty}</span>`;
  },

  /**
   * Create action buttons formatter
   * @param {Array<string>} actions - Array of action names
   * @returns {Function} Formatter function
   */
  actions: (actions = ['edit', 'delete']) => {
    return (value, row) => {
      const buttons = actions.map(action => {
        const icons = {
          edit: '✏️',
          delete: '🗑️',
          view: '👁️',
          duplicate: '📋',
          download: '⬇️',
          print: '🖨️'
        };
        const icon = icons[action] || action;
        return `<button class="btn-icon" data-action="${action}" data-id="${row.id || ''}" title="${action}">${icon}</button>`;
      }).join(' ');
      return `<div class="row-actions">${buttons}</div>`;
    };
  },

  /**
   * Boolean formatter (checkmark or dash)
   * @param {boolean} value - Boolean value
   * @returns {string} Checkmark or dash
   */
  boolean: (value, row) => {
    return value ? '✓' : '-';
  },

  /**
   * Truncate text to specified length
   * @param {number} maxLength - Maximum length
   * @returns {Function} Formatter function
   */
  truncate: (maxLength = 50) => {
    return (value, row) => {
      if (!value) return '-';
      const str = String(value);
      if (str.length <= maxLength) return str;
      return `<span title="${str}">${str.slice(0, maxLength)}...</span>`;
    };
  }
};

// ============================================================================
// TABLE RENDERING
// ============================================================================

/**
 * Render a table from data array and column definitions
 * @param {string} containerId - ID of tbody element
 * @param {Array<object>} data - Array of data objects
 * @param {Array<object>} columns - Column definitions
 * @param {object} options - Rendering options
 */
function renderTable(containerId, data, columns, options = {}) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) {
    console.error(`Table container not found: ${containerId}`);
    return;
  }

  const {
    emptyMessage = 'No data to display',
    onRowClick = null,
    rowClassName = null,
    sortable = true
  } = options;

  // Handle empty data
  if (!data || data.length === 0) {
    container.innerHTML = `<tr><td colspan="${columns.length}" style="text-align:center;padding:2rem;color:#999">${emptyMessage}</td></tr>`;
    return;
  }

  // Generate rows
  const html = data.map((row, rowIndex) => {
    const rowClass = rowClassName ? rowClassName(row, rowIndex) : '';
    const clickAttr = onRowClick ? `data-row-index="${rowIndex}"` : '';

    const cells = columns.map(col => {
      const value = getNestedValue(row, col.key);
      const formatted = col.formatter ? col.formatter(value, row) : escapeHtml(value);
      const cellClass = col.className ? ` class="${col.className}"` : '';
      return `<td${cellClass}>${formatted}</td>`;
    }).join('');

    return `<tr class="${rowClass}" ${clickAttr}>${cells}</tr>`;
  }).join('');

  container.innerHTML = html;

  // Setup event delegation for row clicks
  if (onRowClick) {
    container.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-row-index]');
      if (row) {
        const index = parseInt(row.dataset.rowIndex);
        onRowClick(data[index], index, e);
      }
    });
  }
}

/**
 * Render table header with sortable columns
 * @param {string} theadId - ID of thead element
 * @param {Array<object>} columns - Column definitions
 * @param {object} sortState - Current sort state { key, direction }
 * @param {Function} onSort - Callback when column header clicked
 */
function renderTableHeader(theadId, columns, sortState = {}, onSort = null) {
  const thead = typeof theadId === 'string' ? document.getElementById(theadId) : theadId;
  if (!thead) {
    console.error(`Table header not found: ${theadId}`);
    return;
  }

  const headers = columns.map(col => {
    const sortable = col.sortable !== false && onSort;
    const isSorted = sortState.key === col.key;
    const direction = isSorted ? sortState.direction : null;

    let sortIcon = '';
    if (sortable) {
      sortIcon = isSorted
        ? (direction === 'asc' ? ' ▲' : ' ▼')
        : ' ⇅';
    }

    const clickAttr = sortable ? `data-sort-key="${col.key}" style="cursor:pointer"` : '';
    const className = sortable ? 'sortable' : '';

    return `<th class="${className}" ${clickAttr}>${col.label}${sortIcon}</th>`;
  }).join('');

  thead.innerHTML = `<tr>${headers}</tr>`;

  // Setup sort click handlers
  if (onSort) {
    thead.addEventListener('click', (e) => {
      const th = e.target.closest('[data-sort-key]');
      if (th) {
        const key = th.dataset.sortKey;
        const currentDir = sortState.key === key ? sortState.direction : null;
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';
        onSort(key, newDir);
      }
    });
  }
}

/**
 * Sort data array by key
 * @param {Array<object>} data - Data to sort
 * @param {string} key - Property key to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array<object>} Sorted array (new array)
 */
function sortData(data, key, direction = 'asc') {
  const sorted = [...data].sort((a, b) => {
    const aVal = getNestedValue(a, key);
    const bVal = getNestedValue(b, key);

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Numeric comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }

    // Date comparison
    const aDate = new Date(aVal);
    const bDate = new Date(bVal);
    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      return aDate - bDate;
    }

    // String comparison
    return String(aVal).localeCompare(String(bVal));
  });

  return direction === 'desc' ? sorted.reverse() : sorted;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get nested property value from object
 * @param {object} obj - Object to get value from
 * @param {string} path - Property path (e.g., 'user.name')
 * @returns {*} Property value
 */
function getNestedValue(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Escape HTML to prevent XSS
 * @param {*} value - Value to escape
 * @returns {string} Escaped string
 */
function escapeHtml(value) {
  if (value == null) return '';
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally
window.TableRenderer = {
  renderTable,
  renderTableHeader,
  sortData,
  formatters,
  getNestedValue,
  escapeHtml
};
