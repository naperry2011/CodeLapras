/**
 * product-ui.js - Product UI Layer
 *
 * Provides UI rendering and interaction for products:
 * - Product table rendering (using Day 9 table system)
 * - Product dialog management (using Day 7 dialog system)
 * - Product form handling (using Day 8 form system)
 * - Search/filter integration (using Day 9 search system)
 *
 * Integrates with:
 * - products.js (business logic)
 * - stock-levels.js (stock utilities)
 * - categories.js (category utilities)
 * - Day 7-10 UI systems
 *
 * Usage:
 * renderProductTable('productTableBody', products);
 * openProductDialog(); // New product
 * openProductDialog(product); // Edit product
 */

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

/**
 * Get product table column definitions
 * @param {object} options - Column options
 * @returns {Array<object>} Column definitions
 */
function getProductColumns(options = {}) {
  const {
    showPhoto = true,
    showActions = true,
    showNotes = false
  } = options;

  const columns = [];

  // Photo column
  if (showPhoto) {
    columns.push({
      key: 'photo',
      label: 'Photo',
      sortable: false,
      formatter: window.TableRenderer?.formatters.photo || ((v) => v ? `<img src="${v}" width="40">` : '')
    });
  }

  // Name & SKU column
  columns.push({
    key: 'name',
    label: 'Product',
    sortable: true,
    formatter: (value, row) => {
      const esc = window.esc || ((s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[c]));

      const name = esc(value || 'Untitled');
      const sku = row.sku ? `<br><span class="muted">${esc(row.sku)}</span>` : '';
      return `<strong>${name}</strong>${sku}`;
    }
  });

  // Category & Supplier column
  columns.push({
    key: 'category',
    label: 'Category',
    sortable: true,
    formatter: (value, row) => {
      const esc = window.esc || ((s) => String(s || ''));
      const category = esc(value || '-');
      const supplier = row.supplier ? `<br><span class="muted">${esc(row.supplier)}</span>` : '';
      return `${category}${supplier}`;
    }
  });

  // Quantity column
  columns.push({
    key: 'qty',
    label: 'Stock',
    sortable: true,
    formatter: window.TableRenderer?.formatters.quantity || ((value, row) => {
      const qty = Number(value) || 0;
      const reorderAt = Number(row.reorderAt) || 0;
      const isLow = reorderAt > 0 && qty <= reorderAt;
      const cls = isLow ? 'qtychip warn' : 'qtychip';
      return `<span class="${cls}">${qty}</span>`;
    })
  });

  // Cost column
  columns.push({
    key: 'cost',
    label: 'Cost',
    sortable: true,
    formatter: window.TableRenderer?.formatters.currency || ((value) => {
      const num = parseFloat(value) || 0;
      return `$${num.toFixed(2)}`;
    })
  });

  // Price column
  columns.push({
    key: 'price',
    label: 'Price',
    sortable: true,
    formatter: window.TableRenderer?.formatters.currency || ((value) => {
      const num = parseFloat(value) || 0;
      return `$${num.toFixed(2)}`;
    })
  });

  // Notes column (optional)
  if (showNotes) {
    columns.push({
      key: 'notes',
      label: 'Notes',
      sortable: false,
      formatter: window.TableRenderer?.formatters.truncate?.(50) || ((value) => {
        if (!value) return '-';
        const str = String(value);
        return str.length > 50 ? str.slice(0, 50) + '...' : str;
      })
    });
  }

  // Updated column
  columns.push({
    key: 'updatedAt',
    label: 'Updated',
    sortable: true,
    formatter: window.TableRenderer?.formatters.date || ((value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleDateString();
    })
  });

  // Actions column
  if (showActions) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      sortable: false,
      formatter: window.TableRenderer?.formatters.actions?.(['edit', 'duplicate', 'delete']) ||
        ((value, row) => `
          <button class="btn-icon" data-action="edit-product" data-id="${row.id}" title="Edit">✏️</button>
          <button class="btn-icon" data-action="duplicate-product" data-id="${row.id}" title="Duplicate">📋</button>
          <button class="btn-icon" data-action="delete-product" data-id="${row.id}" title="Delete">🗑️</button>
        `)
    });
  }

  return columns;
}

// ============================================================================
// TABLE RENDERING
// ============================================================================

/**
 * Render product table
 * @param {string|HTMLElement} containerId - Table body container
 * @param {Array<object>} products - Products to display
 * @param {object} options - Rendering options
 */
function renderProductTable(containerId, products, options = {}) {
  const {
    columns = null,
    emptyMessage = 'No products found',
    onRowClick = null
  } = options;

  const tableColumns = columns || getProductColumns(options);

  if (window.TableRenderer && window.TableRenderer.renderTable) {
    window.TableRenderer.renderTable(containerId, products, tableColumns, {
      emptyMessage,
      onRowClick
    });
  } else {
    // Fallback rendering
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    if (!products || products.length === 0) {
      container.innerHTML = `<tr><td colspan="${tableColumns.length}" style="text-align:center;padding:2rem;color:#999">${emptyMessage}</td></tr>`;
      return;
    }

    const html = products.map(product => {
      const cells = tableColumns.map(col => {
        const value = product[col.key];
        const formatted = col.formatter ? col.formatter(value, product) : (value || '');
        return `<td>${formatted}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    container.innerHTML = html;
  }
}

// ============================================================================
// PRODUCT DIALOG
// ============================================================================

/**
 * Open product dialog for create/edit
 * @param {object} product - Product to edit (null for new)
 */
function openProductDialog(product = null) {
  const dialog = document.getElementById('dlg');
  if (!dialog) {
    console.error('Product dialog not found (#dlg)');
    return;
  }

  // Set dialog title
  const title = document.getElementById('dlgTitle');
  if (title) {
    title.textContent = product ? 'Edit Product' : 'New Product';
  }

  // Populate form
  if (product) {
    populateProductForm(product);
  } else {
    clearProductForm();
  }

  // Show dialog
  if (window.Dialogs && window.Dialogs.show) {
    window.Dialogs.show(dialog);
  } else if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.style.display = 'block';
  }

  // Focus first input
  const firstInput = dialog.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Close product dialog
 */
function closeProductDialog() {
  const dialog = document.getElementById('dlg');
  if (!dialog) return;

  if (window.Dialogs && window.Dialogs.hide) {
    window.Dialogs.hide(dialog);
  } else if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.style.display = 'none';
  }
}

// ============================================================================
// FORM HANDLING
// ============================================================================

/**
 * Populate product form with data
 * @param {object} product - Product data
 */
function populateProductForm(product) {
  if (!product) return;

  const formFields = [
    'id', 'name', 'sku', 'category', 'supplier',
    'qty', 'reorderAt', 'cost', 'price',
    'packageCost', 'packageQty', 'unitsLoose',
    'unitLabel', 'notes', 'components'
  ];

  formFields.forEach(field => {
    const element = document.getElementById(field);
    if (!element) return;

    const value = product[field];
    if (value !== undefined && value !== null) {
      element.value = value;
    } else if (['qty', 'reorderAt', 'cost', 'price', 'packageCost', 'packageQty', 'unitsLoose'].includes(field)) {
      element.value = 0;
    } else {
      element.value = '';
    }
  });

  // Checkboxes
  const checkboxes = ['singleOnly', 'measurable', 'forSale', 'restockOnly'];
  checkboxes.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      element.checked = !!product[field];
    }
  });

  // Photo
  const photoData = document.getElementById('photoData');
  const photoUrl = document.getElementById('photoUrl');
  const photoPreview = document.getElementById('photoPreview');

  if (product.photo) {
    if (product.photo.startsWith('data:image/')) {
      if (photoData) photoData.value = product.photo;
      if (photoUrl) photoUrl.value = '';
    } else {
      if (photoUrl) photoUrl.value = product.photo;
      if (photoData) photoData.value = '';
    }

    if (photoPreview && typeof setPreviewSrc === 'function') {
      setPreviewSrc(product.photo);
    } else if (photoPreview) {
      photoPreview.src = product.photo;
      photoPreview.style.display = 'block';
    }
  }

  // Update package helper
  if (typeof updatePackHelper === 'function') {
    updatePackHelper();
  }

  // Handle For Sale / Restock Only exclusivity
  const forSale = document.getElementById('forSale');
  const restockOnly = document.getElementById('restockOnly');

  if (forSale && restockOnly) {
    forSale.onchange = () => {
      if (forSale.checked) restockOnly.checked = false;
    };
    restockOnly.onchange = () => {
      if (restockOnly.checked) forSale.checked = false;
    };
  }

  // Handle singleOnly -> packageQty = 1
  const singleOnly = document.getElementById('singleOnly');
  const packageQty = document.getElementById('packageQty');

  if (singleOnly && packageQty) {
    singleOnly.onchange = () => {
      packageQty.disabled = singleOnly.checked;
      if (singleOnly.checked) packageQty.value = 1;
    };
    packageQty.disabled = singleOnly.checked;
  }

  // Handle measurable -> qty step = 0.01
  const measurable = document.getElementById('measurable');
  const qtyInput = document.getElementById('qty');

  if (measurable && qtyInput) {
    measurable.onchange = () => {
      qtyInput.step = measurable.checked ? '0.01' : '1';
    };
    qtyInput.step = measurable.checked ? '0.01' : '1';
  }
}

/**
 * Clear product form
 */
function clearProductForm() {
  const formFields = [
    'id', 'name', 'sku', 'category', 'supplier',
    'qty', 'reorderAt', 'cost', 'price',
    'packageCost', 'packageQty', 'unitsLoose',
    'unitLabel', 'notes', 'components',
    'photoData', 'photoUrl'
  ];

  formFields.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      if (['qty', 'reorderAt', 'cost', 'price', 'packageCost', 'packageQty', 'unitsLoose'].includes(field)) {
        element.value = 0;
      } else {
        element.value = '';
      }
    }
  });

  // Checkboxes
  const checkboxes = ['singleOnly', 'measurable', 'restockOnly'];
  checkboxes.forEach(field => {
    const element = document.getElementById(field);
    if (element) element.checked = false;
  });

  // For Sale default to true
  const forSale = document.getElementById('forSale');
  if (forSale) forSale.checked = true;

  // Clear photo preview
  const photoPreview = document.getElementById('photoPreview');
  if (photoPreview) {
    photoPreview.src = '';
    photoPreview.style.display = 'none';
  }
}

/**
 * Extract product data from form
 * @returns {object} Product data object
 */
function extractProductFormData() {
  const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const getChecked = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  const getNumber = (id) => {
    const val = getValue(id);
    return val === '' ? 0 : parseFloat(val) || 0;
  };

  // Get photo (prefer data URI over URL)
  let photo = getValue('photoData');
  if (!photo) photo = getValue('photoUrl');

  return {
    id: getValue('id') || (window.uid ? window.uid() : Date.now().toString()),
    name: getValue('name'),
    sku: getValue('sku'),
    category: getValue('category'),
    supplier: getValue('supplier'),
    qty: getNumber('qty'),
    reorderAt: getNumber('reorderAt'),
    cost: getNumber('cost'),
    price: getNumber('price'),
    packageCost: getNumber('packageCost'),
    packageQty: getNumber('packageQty'),
    unitsLoose: getNumber('unitsLoose'),
    singleOnly: getChecked('singleOnly'),
    measurable: getChecked('measurable'),
    forSale: getChecked('forSale'),
    restockOnly: getChecked('restockOnly'),
    unitLabel: getValue('unitLabel'),
    notes: getValue('notes'),
    components: getValue('components'),
    photo,
    updatedAt: window.nowISO ? window.nowISO() : new Date().toISOString()
  };
}

/**
 * Validate product form
 * @returns {object} Validation result { valid, errors }
 */
function validateProductForm() {
  const errors = [];
  const name = document.getElementById('name')?.value?.trim();

  if (!name) {
    errors.push({ field: 'name', message: 'Product name is required' });
  }

  // Add more validation as needed
  const qty = document.getElementById('qty')?.value;
  if (qty && parseFloat(qty) < 0) {
    errors.push({ field: 'qty', message: 'Quantity cannot be negative' });
  }

  const cost = document.getElementById('cost')?.value;
  if (cost && parseFloat(cost) < 0) {
    errors.push({ field: 'cost', message: 'Cost cannot be negative' });
  }

  const price = document.getElementById('price')?.value;
  if (price && parseFloat(price) < 0) {
    errors.push({ field: 'price', message: 'Price cannot be negative' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// SEARCH & FILTER
// ============================================================================

/**
 * Initialize product search
 * @param {string|HTMLElement} searchInputId - Search input element
 * @param {function} onSearch - Callback when search changes
 */
function initProductSearch(searchInputId, onSearch) {
  const searchInput = typeof searchInputId === 'string' ? document.getElementById(searchInputId) : searchInputId;
  if (!searchInput) return;

  if (window.Search && window.Search.setupSearchInput) {
    // Use Day 9 search system
    window.Search.setupSearchInput(
      searchInput,
      window.data || [], // Global products array
      ['name', 'sku', 'category', 'supplier', 'notes'],
      onSearch
    );
  } else {
    // Fallback to simple search
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const products = window.data || [];
      const filtered = products.filter(p =>
        (p.name?.toLowerCase() || '').includes(query) ||
        (p.sku?.toLowerCase() || '').includes(query) ||
        (p.category?.toLowerCase() || '').includes(query) ||
        (p.supplier?.toLowerCase() || '').includes(query)
      );
      onSearch(filtered, query);
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally
if (typeof window !== 'undefined') {
  window.ProductUI = {
    getProductColumns,
    renderProductTable,
    openProductDialog,
    closeProductDialog,
    populateProductForm,
    clearProductForm,
    extractProductFormData,
    validateProductForm,
    initProductSearch
  };
}
