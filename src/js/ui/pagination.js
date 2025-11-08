/**
 * pagination.js - Pagination System
 *
 * Provides reusable pagination functionality with:
 * - Page slicing of data arrays
 * - Navigation controls (Previous, Next, page numbers)
 * - Page size selection
 * - "Showing X-Y of Z" display
 * - State management
 *
 * Usage:
 * const paginator = createPaginator(data, { pageSize: 25 });
 * const pageData = paginator.getPage(1);
 * renderPaginationControls('paginationContainer', paginator);
 */

// ============================================================================
// PAGINATION FUNCTIONS
// ============================================================================

/**
 * Paginate data array
 * @param {Array} data - Array to paginate
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {Array} Slice of data for the page
 */
function paginate(data, page = 1, pageSize = 25) {
  if (!data || data.length === 0) return [];

  const totalPages = Math.ceil(data.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return data.slice(startIndex, endIndex);
}

/**
 * Calculate pagination metadata
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {object} Pagination metadata
 */
function getPaginationMeta(totalItems, page = 1, pageSize = 25) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    startIndex,
    endIndex,
    startItem: startIndex + 1,
    endItem: endIndex,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages
  };
}

// ============================================================================
// PAGINATION CONTROLS RENDERING
// ============================================================================

/**
 * Render pagination controls
 * @param {string|HTMLElement} containerId - Container element or ID
 * @param {number} totalItems - Total number of items
 * @param {number} currentPage - Current page number
 * @param {number} pageSize - Items per page
 * @param {Function} onPageChange - Callback when page changes
 * @param {object} options - Rendering options
 */
function renderPaginationControls(containerId, totalItems, currentPage, pageSize, onPageChange, options = {}) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) {
    console.error(`Pagination container not found: ${containerId}`);
    return;
  }

  const {
    maxPageButtons = 7,
    showPageSize = true,
    pageSizeOptions = [10, 25, 50, 100],
    showInfo = true
  } = options;

  const meta = getPaginationMeta(totalItems, currentPage, pageSize);

  // Don't show pagination if only one page
  if (meta.totalPages === 1 && !showPageSize) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="pagination">';

  // Page info
  if (showInfo) {
    html += `
      <div class="pagination-info">
        Showing ${meta.startItem}-${meta.endItem} of ${meta.totalItems}
      </div>
    `;
  }

  // Page controls
  html += '<div class="pagination-controls">';

  // Previous button
  html += `
    <button
      class="btn pagination-btn"
      data-page="${meta.currentPage - 1}"
      ${!meta.hasPrevious ? 'disabled' : ''}
    >
      ← Previous
    </button>
  `;

  // Page number buttons
  const pageButtons = generatePageButtons(meta.currentPage, meta.totalPages, maxPageButtons);
  pageButtons.forEach(item => {
    if (item === '...') {
      html += '<span class="pagination-ellipsis">...</span>';
    } else {
      const isActive = item === meta.currentPage;
      html += `
        <button
          class="btn pagination-btn ${isActive ? 'active' : ''}"
          data-page="${item}"
          ${isActive ? 'disabled' : ''}
        >
          ${item}
        </button>
      `;
    }
  });

  // Next button
  html += `
    <button
      class="btn pagination-btn"
      data-page="${meta.currentPage + 1}"
      ${!meta.hasNext ? 'disabled' : ''}
    >
      Next →
    </button>
  `;

  html += '</div>'; // End pagination-controls

  // Page size selector
  if (showPageSize) {
    html += '<div class="pagination-size">';
    html += '<label>Per page: <select class="page-size-select">';
    pageSizeOptions.forEach(size => {
      const selected = size === pageSize ? 'selected' : '';
      html += `<option value="${size}" ${selected}>${size}</option>`;
    });
    html += '</select></label>';
    html += '</div>';
  }

  html += '</div>'; // End pagination

  container.innerHTML = html;

  // Setup event listeners
  if (onPageChange) {
    // Page button clicks
    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.target.dataset.page);
        if (!isNaN(page)) {
          onPageChange(page, pageSize);
        }
      });
    });

    // Page size change
    const sizeSelect = container.querySelector('.page-size-select');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value);
        // Reset to page 1 when changing page size
        onPageChange(1, newSize);
      });
    }
  }
}

/**
 * Generate page number buttons with ellipsis
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} maxButtons - Maximum number of buttons to show
 * @returns {Array} Array of page numbers and ellipsis
 */
function generatePageButtons(currentPage, totalPages, maxButtons = 7) {
  if (totalPages <= maxButtons) {
    // Show all pages
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const buttons = [];
  const sideButtons = Math.floor((maxButtons - 3) / 2); // Buttons on each side of current

  // Always show first page
  buttons.push(1);

  // Calculate range around current page
  let startPage = Math.max(2, currentPage - sideButtons);
  let endPage = Math.min(totalPages - 1, currentPage + sideButtons);

  // Adjust range if near start or end
  if (currentPage <= sideButtons + 2) {
    endPage = Math.min(totalPages - 1, maxButtons - 2);
  } else if (currentPage >= totalPages - sideButtons - 1) {
    startPage = Math.max(2, totalPages - maxButtons + 3);
  }

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    buttons.push('...');
  }

  // Add page range
  for (let i = startPage; i <= endPage; i++) {
    buttons.push(i);
  }

  // Add ellipsis before last page if needed
  if (endPage < totalPages - 1) {
    buttons.push('...');
  }

  // Always show last page
  if (totalPages > 1) {
    buttons.push(totalPages);
  }

  return buttons;
}

// ============================================================================
// PAGINATION CONTROLLER
// ============================================================================

/**
 * Create a pagination controller with state management
 * @param {Array} data - Data array to paginate
 * @param {object} options - Pagination options
 * @returns {object} Pagination controller
 */
function createPaginator(data = [], options = {}) {
  let currentPage = 1;
  let pageSize = options.pageSize || 25;
  let currentData = [...data];
  const listeners = [];

  const controller = {
    /**
     * Get current page data
     * @param {number} page - Page number (optional, uses current if not provided)
     * @returns {Array} Page data
     */
    getPage(page) {
      if (page !== undefined) {
        this.setPage(page);
      }
      return paginate(currentData, currentPage, pageSize);
    },

    /**
     * Set current page
     * @param {number} page - Page number
     */
    setPage(page) {
      const meta = getPaginationMeta(currentData.length, page, pageSize);
      currentPage = meta.currentPage;
      this.notify();
    },

    /**
     * Go to next page
     */
    nextPage() {
      const meta = this.getMeta();
      if (meta.hasNext) {
        this.setPage(currentPage + 1);
      }
    },

    /**
     * Go to previous page
     */
    previousPage() {
      const meta = this.getMeta();
      if (meta.hasPrevious) {
        this.setPage(currentPage - 1);
      }
    },

    /**
     * Set page size
     * @param {number} size - New page size
     */
    setPageSize(size) {
      pageSize = size;
      currentPage = 1; // Reset to first page
      this.notify();
    },

    /**
     * Get pagination metadata
     * @returns {object} Metadata
     */
    getMeta() {
      return getPaginationMeta(currentData.length, currentPage, pageSize);
    },

    /**
     * Update data source
     * @param {Array} newData - New data array
     */
    updateData(newData) {
      currentData = [...newData];
      const meta = getPaginationMeta(currentData.length, currentPage, pageSize);
      currentPage = meta.currentPage; // Adjust page if needed
      this.notify();
    },

    /**
     * Subscribe to pagination changes
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
      const pageData = this.getPage();
      const meta = this.getMeta();
      listeners.forEach(callback => callback(pageData, meta));
    },

    /**
     * Render controls to container
     * @param {string|HTMLElement} containerId - Container
     * @param {object} renderOptions - Rendering options
     */
    renderControls(containerId, renderOptions = {}) {
      const meta = this.getMeta();
      renderPaginationControls(
        containerId,
        meta.totalItems,
        meta.currentPage,
        meta.pageSize,
        (page, size) => {
          if (size !== pageSize) {
            this.setPageSize(size);
          } else {
            this.setPage(page);
          }
        },
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
window.Pagination = {
  paginate,
  getPaginationMeta,
  renderPaginationControls,
  generatePageButtons,
  createPaginator
};
