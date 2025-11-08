/**
 * filters.js - Data Filtering System
 *
 * Provides reusable filtering functionality with:
 * - Multiple filter types (status, date range, numeric, multi-select)
 * - Filter composition (AND/OR logic)
 * - Filter state management
 * - Filter UI builder
 * - Saved filter presets
 *
 * Usage:
 * const filterConfig = [
 *   { key: 'status', type: 'select', values: ['Active', 'Inactive'] },
 *   { key: 'price', type: 'range', min: 0, max: 1000 }
 * ];
 * const filtered = applyFilters(data, filterConfig);
 */

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

/**
 * Apply filters to data array
 * @param {Array<object>} data - Data to filter
 * @param {Array<object>} filters - Array of filter configurations
 * @param {string} logic - 'AND' or 'OR' logic between filters
 * @returns {Array<object>} Filtered data
 */
function applyFilters(data, filters, logic = 'AND') {
  if (!filters || filters.length === 0) {
    return data;
  }

  // Remove inactive filters
  const activeFilters = filters.filter(f => f.active !== false);
  if (activeFilters.length === 0) {
    return data;
  }

  return data.filter(item => {
    const results = activeFilters.map(filter => checkFilter(item, filter));

    if (logic === 'OR') {
      return results.some(r => r); // At least one filter matches
    } else {
      return results.every(r => r); // All filters match
    }
  });
}

/**
 * Check if item matches a single filter
 * @param {object} item - Data item
 * @param {object} filter - Filter configuration
 * @returns {boolean} True if item matches filter
 */
function checkFilter(item, filter) {
  const value = getNestedValue(item, filter.key);

  switch (filter.type) {
    case 'equals':
      return value === filter.value;

    case 'not-equals':
      return value !== filter.value;

    case 'contains':
      return String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase());

    case 'select':
    case 'status':
      if (!filter.value) return true;
      return value === filter.value;

    case 'multi-select':
      if (!filter.values || filter.values.length === 0) return true;
      return filter.values.includes(value);

    case 'range':
    case 'numeric-range':
      const num = parseFloat(value);
      if (isNaN(num)) return false;
      const min = filter.min !== undefined ? filter.min : -Infinity;
      const max = filter.max !== undefined ? filter.max : Infinity;
      return num >= min && num <= max;

    case 'date-range':
      const date = new Date(value);
      if (isNaN(date.getTime())) return false;
      const start = filter.start ? new Date(filter.start) : new Date(-8640000000000000);
      const end = filter.end ? new Date(filter.end) : new Date(8640000000000000);
      return date >= start && date <= end;

    case 'boolean':
      return filter.value === undefined || Boolean(value) === Boolean(filter.value);

    case 'empty':
      return !value || (Array.isArray(value) && value.length === 0);

    case 'not-empty':
      return value && (!Array.isArray(value) || value.length > 0);

    case 'custom':
      return filter.predicate ? filter.predicate(value, item) : true;

    default:
      console.warn(`Unknown filter type: ${filter.type}`);
      return true;
  }
}

/**
 * Get nested value from object
 * @param {object} obj - Object
 * @param {string} path - Property path
 * @returns {*} Value
 */
function getNestedValue(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

// ============================================================================
// FILTER BUILDERS
// ============================================================================

/**
 * Common filter presets
 */
const filterPresets = {
  /**
   * Status filter
   * @param {string} key - Field key
   * @param {Array<string>} statuses - Status values
   * @returns {object} Filter config
   */
  status: (key, statuses) => ({
    key,
    type: 'select',
    label: 'Status',
    options: statuses,
    value: null,
    active: true
  }),

  /**
   * Date range filter
   * @param {string} key - Field key
   * @param {string} label - Label
   * @returns {object} Filter config
   */
  dateRange: (key, label = 'Date Range') => ({
    key,
    type: 'date-range',
    label,
    start: null,
    end: null,
    active: true
  }),

  /**
   * Price/amount range filter
   * @param {string} key - Field key
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {object} Filter config
   */
  priceRange: (key, min = 0, max = 10000) => ({
    key,
    type: 'numeric-range',
    label: 'Price Range',
    min,
    max,
    active: true
  }),

  /**
   * Boolean filter (yes/no, true/false)
   * @param {string} key - Field key
   * @param {string} label - Label
   * @returns {object} Filter config
   */
  boolean: (key, label) => ({
    key,
    type: 'boolean',
    label,
    value: null,
    active: true
  }),

  /**
   * Low stock filter
   * @returns {object} Filter config
   */
  lowStock: () => ({
    key: 'qty',
    type: 'custom',
    label: 'Low Stock',
    predicate: (value, item) => {
      const qty = parseInt(value) || 0;
      const reorderAt = parseInt(item.reorderAt) || 0;
      return reorderAt > 0 && qty <= reorderAt;
    },
    active: false
  }),

  /**
   * Out of stock filter
   * @returns {object} Filter config
   */
  outOfStock: () => ({
    key: 'qty',
    type: 'custom',
    label: 'Out of Stock',
    predicate: (value) => parseInt(value) === 0,
    active: false
  }),

  /**
   * Overdue filter (for rentals, tasks, etc.)
   * @param {string} dateKey - Date field key
   * @returns {object} Filter config
   */
  overdue: (dateKey = 'dueDate') => ({
    key: dateKey,
    type: 'custom',
    label: 'Overdue',
    predicate: (value) => {
      const date = new Date(value);
      return !isNaN(date.getTime()) && date < new Date();
    },
    active: false
  })
};

// ============================================================================
// FILTER UI RENDERING
// ============================================================================

/**
 * Render filter controls
 * @param {string|HTMLElement} containerId - Container element
 * @param {Array<object>} filters - Filter configurations
 * @param {Function} onChange - Callback when filters change
 * @param {object} options - Rendering options
 */
function renderFilterControls(containerId, filters, onChange, options = {}) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) {
    console.error(`Filter container not found: ${containerId}`);
    return;
  }

  const { showClearAll = true } = options;

  let html = '<div class="filters">';

  filters.forEach((filter, index) => {
    html += renderFilterControl(filter, index);
  });

  // Clear all button
  if (showClearAll) {
    html += '<button class="btn btn-secondary clear-filters">Clear All</button>';
  }

  html += '</div>';

  container.innerHTML = html;

  // Setup event listeners
  if (onChange) {
    // Individual filter changes
    filters.forEach((filter, index) => {
      const control = container.querySelector(`[data-filter-index="${index}"]`);
      if (!control) return;

      control.addEventListener('change', (e) => {
        updateFilterValue(filter, e.target);
        onChange(filters);
      });
    });

    // Clear all button
    const clearBtn = container.querySelector('.clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearAllFilters(filters);
        renderFilterControls(containerId, filters, onChange, options);
        onChange(filters);
      });
    }
  }
}

/**
 * Render a single filter control
 * @param {object} filter - Filter configuration
 * @param {number} index - Filter index
 * @returns {string} HTML for filter control
 */
function renderFilterControl(filter, index) {
  let html = `<div class="filter-control">`;
  html += `<label>${filter.label || filter.key}</label>`;

  switch (filter.type) {
    case 'select':
    case 'status':
      html += `<select data-filter-index="${index}">`;
      html += `<option value="">All</option>`;
      (filter.options || []).forEach(option => {
        const selected = filter.value === option ? 'selected' : '';
        html += `<option value="${option}" ${selected}>${option}</option>`;
      });
      html += `</select>`;
      break;

    case 'multi-select':
      // For simplicity, render as checkboxes
      (filter.options || []).forEach((option, i) => {
        const checked = (filter.values || []).includes(option) ? 'checked' : '';
        html += `
          <label class="checkbox-label">
            <input
              type="checkbox"
              data-filter-index="${index}"
              data-option="${option}"
              ${checked}
            />
            ${option}
          </label>
        `;
      });
      break;

    case 'numeric-range':
      html += `
        <div class="range-inputs">
          <input
            type="number"
            placeholder="Min"
            data-filter-index="${index}"
            data-range-type="min"
            value="${filter.min !== undefined ? filter.min : ''}"
          />
          <span>to</span>
          <input
            type="number"
            placeholder="Max"
            data-filter-index="${index}"
            data-range-type="max"
            value="${filter.max !== undefined ? filter.max : ''}"
          />
        </div>
      `;
      break;

    case 'date-range':
      html += `
        <div class="range-inputs">
          <input
            type="date"
            data-filter-index="${index}"
            data-range-type="start"
            value="${filter.start || ''}"
          />
          <span>to</span>
          <input
            type="date"
            data-filter-index="${index}"
            data-range-type="end"
            value="${filter.end || ''}"
          />
        </div>
      `;
      break;

    case 'boolean':
      html += `
        <select data-filter-index="${index}">
          <option value="">All</option>
          <option value="true" ${filter.value === true ? 'selected' : ''}>Yes</option>
          <option value="false" ${filter.value === false ? 'selected' : ''}>No</option>
        </select>
      `;
      break;

    case 'contains':
      html += `
        <input
          type="text"
          placeholder="Filter..."
          data-filter-index="${index}"
          value="${filter.value || ''}"
        />
      `;
      break;

    case 'custom':
      // Custom filters are typically toggle buttons
      html += `
        <label class="checkbox-label">
          <input
            type="checkbox"
            data-filter-index="${index}"
            ${filter.active ? 'checked' : ''}
          />
          ${filter.label}
        </label>
      `;
      break;
  }

  html += `</div>`;
  return html;
}

/**
 * Update filter value from input element
 * @param {object} filter - Filter configuration
 * @param {HTMLElement} input - Input element
 */
function updateFilterValue(filter, input) {
  const rangeType = input.dataset.rangeType;
  const option = input.dataset.option;

  if (filter.type === 'multi-select' && option) {
    // Handle checkbox in multi-select
    if (!filter.values) filter.values = [];
    if (input.checked) {
      if (!filter.values.includes(option)) {
        filter.values.push(option);
      }
    } else {
      filter.values = filter.values.filter(v => v !== option);
    }
  } else if (rangeType) {
    // Handle range inputs
    const value = input.value ? (input.type === 'number' ? parseFloat(input.value) : input.value) : null;
    filter[rangeType] = value;
  } else if (filter.type === 'custom') {
    // Handle custom toggle
    filter.active = input.checked;
  } else if (filter.type === 'boolean') {
    // Handle boolean select
    filter.value = input.value === '' ? null : input.value === 'true';
  } else {
    // Handle simple inputs
    filter.value = input.value || null;
  }

  filter.active = true; // Activate filter when value changes
}

/**
 * Clear all filters
 * @param {Array<object>} filters - Filter configurations
 */
function clearAllFilters(filters) {
  filters.forEach(filter => {
    filter.value = null;
    filter.values = [];
    filter.min = undefined;
    filter.max = undefined;
    filter.start = null;
    filter.end = null;
    filter.active = false;
  });
}

// ============================================================================
// FILTER CONTROLLER
// ============================================================================

/**
 * Create a filter controller with state management
 * @param {Array} data - Data to filter
 * @param {Array<object>} filterConfigs - Initial filter configurations
 * @returns {object} Filter controller
 */
function createFilterController(data = [], filterConfigs = []) {
  let currentData = [...data];
  let filters = [...filterConfigs];
  let filteredData = [...data];
  const listeners = [];

  const controller = {
    /**
     * Apply current filters and get results
     * @returns {Array} Filtered data
     */
    getFiltered() {
      filteredData = applyFilters(currentData, filters);
      return filteredData;
    },

    /**
     * Get filter configurations
     * @returns {Array} Filter configs
     */
    getFilters() {
      return filters;
    },

    /**
     * Update a filter
     * @param {number} index - Filter index
     * @param {object} updates - Updates to apply
     */
    updateFilter(index, updates) {
      if (filters[index]) {
        Object.assign(filters[index], updates);
        this.apply();
      }
    },

    /**
     * Add a new filter
     * @param {object} filter - Filter configuration
     */
    addFilter(filter) {
      filters.push(filter);
      this.apply();
    },

    /**
     * Remove a filter
     * @param {number} index - Filter index
     */
    removeFilter(index) {
      filters.splice(index, 1);
      this.apply();
    },

    /**
     * Clear all filters
     */
    clearAll() {
      clearAllFilters(filters);
      this.apply();
    },

    /**
     * Apply filters and notify listeners
     */
    apply() {
      this.getFiltered();
      this.notify();
    },

    /**
     * Update data source
     * @param {Array} newData - New data
     */
    updateData(newData) {
      currentData = [...newData];
      this.apply();
    },

    /**
     * Subscribe to filter changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
      };
    },

    /**
     * Notify all subscribers
     */
    notify() {
      listeners.forEach(callback => callback(filteredData, filters));
    },

    /**
     * Render filter controls
     * @param {string|HTMLElement} containerId - Container
     * @param {object} renderOptions - Render options
     */
    renderControls(containerId, renderOptions = {}) {
      renderFilterControls(
        containerId,
        filters,
        () => this.apply(),
        renderOptions
      );
    }
  };

  return controller;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally
window.Filters = {
  applyFilters,
  checkFilter,
  filterPresets,
  renderFilterControls,
  clearAllFilters,
  createFilterController,
  getNestedValue
};
