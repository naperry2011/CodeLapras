/**
 * search.js - Generic Search Functionality
 *
 * Provides reusable search capabilities with:
 * - Multi-field searching
 * - Case-insensitive matching
 * - Debounced input handling
 * - Optional fuzzy matching
 * - Search highlighting
 *
 * Usage:
 * const results = searchData(products, 'laptop', ['name', 'sku', 'category']);
 * setupSearchInput('searchInput', data, ['name', 'description'], (results) => {
 *   renderTable('tableBody', results, columns);
 * });
 */

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search data array across multiple fields
 * @param {Array<object>} data - Array of objects to search
 * @param {string} query - Search query string
 * @param {Array<string>} searchFields - Array of field names to search in
 * @param {object} options - Search options
 * @returns {Array<object>} Filtered array
 */
function searchData(data, query, searchFields, options = {}) {
  const {
    caseSensitive = false,
    fuzzy = false,
    minLength = 0
  } = options;

  // Empty query returns all data
  if (!query || query.trim().length < minLength) {
    return data;
  }

  const searchTerm = caseSensitive ? query.trim() : query.trim().toLowerCase();

  return data.filter(item => {
    // Check if any field matches
    return searchFields.some(field => {
      const value = getFieldValue(item, field);
      if (value == null) return false;

      const stringValue = caseSensitive ? String(value) : String(value).toLowerCase();

      if (fuzzy) {
        return fuzzyMatch(stringValue, searchTerm);
      } else {
        return stringValue.includes(searchTerm);
      }
    });
  });
}

/**
 * Get field value from object (supports nested paths)
 * @param {object} obj - Object to get value from
 * @param {string} field - Field name or path (e.g., 'user.name')
 * @returns {*} Field value
 */
function getFieldValue(obj, field) {
  if (!field) return obj;
  return field.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Simple fuzzy matching
 * @param {string} str - String to search in
 * @param {string} pattern - Pattern to search for
 * @returns {boolean} True if pattern matches
 */
function fuzzyMatch(str, pattern) {
  let patternIdx = 0;
  let strIdx = 0;

  while (patternIdx < pattern.length && strIdx < str.length) {
    if (pattern[patternIdx] === str[strIdx]) {
      patternIdx++;
    }
    strIdx++;
  }

  return patternIdx === pattern.length;
}

// ============================================================================
// DEBOUNCED SEARCH
// ============================================================================

/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Setup search input with debouncing
 * @param {string|HTMLElement} inputId - Input element or ID
 * @param {Array<object>} data - Data to search
 * @param {Array<string>} searchFields - Fields to search in
 * @param {Function} onResults - Callback with results
 * @param {object} options - Search options
 * @returns {Function} Cleanup function
 */
function setupSearchInput(inputId, data, searchFields, onResults, options = {}) {
  const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
  if (!input) {
    console.error(`Search input not found: ${inputId}`);
    return () => {};
  }

  const {
    debounceDelay = 300,
    caseSensitive = false,
    fuzzy = false,
    minLength = 0,
    placeholder = 'Search...'
  } = options;

  // Set placeholder
  if (placeholder && !input.placeholder) {
    input.placeholder = placeholder;
  }

  // Create debounced search handler
  const handleSearch = debounce((e) => {
    const query = e.target.value;
    const results = searchData(data, query, searchFields, { caseSensitive, fuzzy, minLength });
    onResults(results, query);
  }, debounceDelay);

  // Attach event listener
  input.addEventListener('input', handleSearch);

  // Return cleanup function
  return () => {
    input.removeEventListener('input', handleSearch);
  };
}

// ============================================================================
// SEARCH HIGHLIGHTING
// ============================================================================

/**
 * Highlight search term in text
 * @param {string} text - Original text
 * @param {string} query - Search query to highlight
 * @param {object} options - Highlighting options
 * @returns {string} HTML with highlighted matches
 */
function highlightMatches(text, query, options = {}) {
  if (!text || !query) return text;

  const {
    caseSensitive = false,
    className = 'search-highlight'
  } = options;

  const searchTerm = caseSensitive ? query : query.toLowerCase();
  const searchText = caseSensitive ? text : text.toLowerCase();

  // Find all match positions
  const matches = [];
  let index = searchText.indexOf(searchTerm);

  while (index !== -1) {
    matches.push({ start: index, end: index + searchTerm.length });
    index = searchText.indexOf(searchTerm, index + 1);
  }

  if (matches.length === 0) return text;

  // Build highlighted text
  let result = '';
  let lastEnd = 0;

  matches.forEach(match => {
    result += escapeHtml(text.slice(lastEnd, match.start));
    result += `<mark class="${className}">${escapeHtml(text.slice(match.start, match.end))}</mark>`;
    lastEnd = match.end;
  });

  result += escapeHtml(text.slice(lastEnd));
  return result;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// SEARCH STATE MANAGEMENT
// ============================================================================

/**
 * Create a search controller with state
 * @param {Array<object>} data - Data to search
 * @param {Array<string>} searchFields - Fields to search
 * @param {object} options - Search options
 * @returns {object} Search controller
 */
function createSearchController(data, searchFields, options = {}) {
  let currentQuery = '';
  let currentResults = [...data];
  const listeners = [];

  return {
    /**
     * Perform search and update state
     * @param {string} query - Search query
     */
    search(query) {
      currentQuery = query;
      currentResults = searchData(data, query, searchFields, options);
      this.notify();
    },

    /**
     * Get current search results
     * @returns {Array<object>} Current results
     */
    getResults() {
      return currentResults;
    },

    /**
     * Get current query
     * @returns {string} Current query
     */
    getQuery() {
      return currentQuery;
    },

    /**
     * Clear search
     */
    clear() {
      currentQuery = '';
      currentResults = [...data];
      this.notify();
    },

    /**
     * Update data source
     * @param {Array<object>} newData - New data array
     */
    updateData(newData) {
      data = newData;
      this.search(currentQuery); // Re-run search with new data
    },

    /**
     * Subscribe to search changes
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
      listeners.forEach(callback => callback(currentResults, currentQuery));
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally
window.Search = {
  searchData,
  setupSearchInput,
  highlightMatches,
  createSearchController,
  debounce,
  fuzzyMatch,
  getFieldValue
};
