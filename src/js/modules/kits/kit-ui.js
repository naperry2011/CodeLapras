/**
 * CodeLapras - Kit UI Layer
 *
 * Handles all kit/bundle UI rendering: tables, dialogs, forms, and component management.
 *
 * Day 19: Kits Module
 */

import { $ } from '../../core/utils.js';
import { showDialog, hideDialog } from '../../ui/dialogs.js';
import { renderTable } from '../../ui/tables.js';
import { showNotification } from '../../ui/notifications.js';
import EventBus from '../../core/eventBus.js';

// Module state
let currentKitId = null;
let allKits = [];
let filteredKits = [];
let allProducts = []; // For component selection
let currentFilters = {
  search: '',
  inStock: false
};
let kitComponents = []; // Components being edited in dialog

/**
 * Initialize kit UI
 */
export function initializeKitUI() {
  console.log('[Kit UI] Initializing...');

  // Load initial data
  refreshKitData();
  loadProducts();

  // Set up event listeners
  setupEventListeners();

  // Listen for kit events
  EventBus.on('kit:created', handleKitCreated);
  EventBus.on('kit:updated', handleKitUpdated);
  EventBus.on('kit:deleted', handleKitDeleted);

  console.log('[Kit UI] Initialized successfully');
}

/**
 * Setup event listeners for UI elements
 */
function setupEventListeners() {
  // Simple kit form (on main view)
  const btnAddKit = $('#btnAddKit');
  if (btnAddKit) {
    btnAddKit.addEventListener('click', saveKitFromSimpleForm);
  }

  // Kit dialog buttons
  const btnKitSave = $('#btnKitSave');
  if (btnKitSave) {
    btnKitSave.addEventListener('click', saveKitFromDialog);
  }

  const btnKitCancel = $('#btnKitCancel');
  if (btnKitCancel) {
    btnKitCancel.addEventListener('click', () => hideDialog($('#dlgKit')));
  }

  // Search input
  const searchInput = $('#searchKits');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      applyFilters();
    });
  }

  // In stock filter
  const inStockFilter = $('#filterInStockKits');
  if (inStockFilter) {
    inStockFilter.addEventListener('change', (e) => {
      currentFilters.inStock = e.target.checked;
      applyFilters();
    });
  }
}

/**
 * Refresh kit data from storage
 */
function refreshKitData() {
  allKits = window.getAllKits ? window.getAllKits() : [];
  applyFilters();
}

/**
 * Load products for component selection
 */
function loadProducts() {
  allProducts = window.products || [];
}

/**
 * Apply current filters and re-render
 */
function applyFilters() {
  let results = [...allKits];

  // Filter by search
  if (currentFilters.search && currentFilters.search.trim().length > 0) {
    const query = currentFilters.search.toLowerCase();
    results = results.filter(k =>
      (k.name && k.name.toLowerCase().includes(query)) ||
      (k.sku && k.sku.toLowerCase().includes(query)) ||
      (k.notes && k.notes.toLowerCase().includes(query))
    );
  }

  // Filter by in-stock
  if (currentFilters.inStock && typeof window.checkKitAvailability === 'function') {
    results = results.filter(k => {
      const availability = window.checkKitAvailability(k, allProducts);
      return availability.available;
    });
  }

  filteredKits = results;
  renderKitsTable();
}

/**
 * Render kits table
 */
export function renderKitsTable() {
  const container = $('#kitsTableContainer') || $('#kitList');
  if (!container) {
    console.warn('[Kit UI] Table container not found');
    return;
  }

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: 'Kit Name',
      sortable: true,
      formatter: (value, kit) => {
        return `<strong>${value || 'Unnamed Kit'}</strong>`;
      }
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      formatter: (value) => value || '-'
    },
    {
      key: 'components',
      label: 'Components',
      sortable: false,
      formatter: (value, kit) => {
        if (!value || value.length === 0) return '<em>No components</em>';

        const count = value.length;
        const preview = value.slice(0, 3).map(c => {
          const product = allProducts.find(p => p.id === c.productId);
          return product ? `${product.name} (×${c.qty})` : `Product ${c.productId} (×${c.qty})`;
        }).join(', ');

        const more = count > 3 ? ` +${count - 3} more` : '';
        return `<small>${count} items:</small><br>${preview}${more}`;
      }
    },
    {
      key: 'cost',
      label: 'Cost',
      sortable: true,
      formatter: (value, kit) => {
        const calculated = typeof window.calculateKitCost === 'function'
          ? window.calculateKitCost(kit, allProducts)
          : value || 0;
        return `$${calculated.toFixed(2)}`;
      }
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      formatter: (value) => `$${(value || 0).toFixed(2)}`
    },
    {
      key: 'availability',
      label: 'Stock Status',
      sortable: false,
      formatter: (value, kit) => {
        if (typeof window.checkKitAvailability !== 'function') {
          return '-';
        }

        const availability = window.checkKitAvailability(kit, allProducts);

        if (availability.available) {
          return '<span style="color: var(--success-color);">✅ Available</span>';
        } else if (availability.missing.length > 0) {
          const missingNames = availability.missing.map(m => {
            const product = allProducts.find(p => p.id === m.productId);
            return product ? product.name : m.productId;
          }).join(', ');
          return `<span style="color: var(--danger-color);" title="Missing: ${missingNames}">❌ Unavailable</span>`;
        } else if (availability.lowStock.length > 0) {
          const lowNames = availability.lowStock.map(m => {
            const product = allProducts.find(p => p.id === m.productId);
            return product ? product.name : m.productId;
          }).join(', ');
          return `<span style="color: var(--warning-color);" title="Low stock: ${lowNames}">⚠️ Low Stock</span>`;
        }

        return '-';
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      formatter: (value, kit) => {
        const availability = typeof window.checkKitAvailability === 'function'
          ? window.checkKitAvailability(kit, allProducts)
          : { available: false };

        const craftDisabled = !availability.available ? 'disabled' : '';

        return `
          <div class="btn-group-sm">
            <button class="btn btn-sm primary" onclick="window.kitUI.editKit('${kit.id}')" title="Edit">✏️</button>
            <button class="btn btn-sm" onclick="window.kitUI.craftKit('${kit.id}')" ${craftDisabled} title="Craft Kit">🔨</button>
            <button class="btn btn-sm" onclick="window.kitUI.addKitToOrder('${kit.id}')" title="Add to Order">🛒</button>
            <button class="btn btn-sm" onclick="window.kitUI.duplicateKit('${kit.id}')" title="Duplicate">📋</button>
            <button class="btn btn-sm danger" onclick="window.kitUI.deleteKit('${kit.id}')" title="Delete">🗑️</button>
          </div>
        `;
      }
    }
  ];

  // Render table
  renderTable('kitList', filteredKits, columns, {
    emptyMessage: 'No kits found. Create your first product kit!',
    sortBy: 'name',
    sortOrder: 'asc'
  });
}

/**
 * Show kit dialog (create or edit)
 * @param {string|null} kitId - Kit ID for editing, null for creating
 */
export function showKitDialog(kitId = null) {
  const dialog = $('#dlgKit');
  if (!dialog) {
    console.error('[Kit UI] Dialog not found');
    return;
  }

  currentKitId = kitId;
  kitComponents = [];

  // Update dialog title
  const title = dialog.querySelector('h2, strong');
  if (title) {
    title.textContent = kitId ? 'Edit Kit' : 'New Kit';
  }

  // Populate form if editing
  if (kitId) {
    const kit = window.getKit ? window.getKit(kitId) : null;
    if (kit) {
      populateKitForm(kit);
      kitComponents = [...(kit.components || [])];
    }
  } else {
    clearKitForm();
  }

  // Render component selector
  renderComponentSelector();

  // Show dialog
  showDialog(dialog);
}

/**
 * Populate kit form with data
 * @param {Object} kit - Kit object
 */
function populateKitForm(kit) {
  if (!kit) return;

  setValue('kitName', kit.name);
  setValue('kitSKU', kit.sku);
  setValue('kitCost', kit.cost);
  setValue('kitPrice', kit.price);
  setValue('kitPhoto', kit.photo);
  setValue('kitNotes', kit.notes);

  // Photo preview
  if (kit.photo) {
    const preview = $('#kitPhotoPreview');
    if (preview) {
      preview.src = kit.photo;
      preview.style.display = 'block';
    }
  }
}

/**
 * Clear kit form
 */
function clearKitForm() {
  setValue('kitName', '');
  setValue('kitSKU', '');
  setValue('kitCost', 0);
  setValue('kitPrice', 0);
  setValue('kitPhoto', '');
  setValue('kitNotes', '');
  kitComponents = [];

  const preview = $('#kitPhotoPreview');
  if (preview) {
    preview.style.display = 'none';
  }
}

/**
 * Render component selector in dialog
 */
function renderComponentSelector() {
  const container = $('#kitEditComponents');
  if (!container) return;

  let html = '<div class="component-selector">';

  // Add component form
  html += `
    <div class="add-component-form" style="margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: 4px;">
      <h4>Add Component</h4>
      <div style="display: flex; gap: 0.5rem; align-items: end;">
        <label class="field" style="flex: 1;">
          Product
          <select id="componentProductSelect" style="width: 100%;">
            <option value="">Select product...</option>
            ${allProducts.map(p => `<option value="${p.id}">${p.name} - ${p.sku} (Stock: ${p.qty || 0})</option>`).join('')}
          </select>
        </label>
        <label class="field" style="width: 100px;">
          Quantity
          <input type="number" id="componentQty" min="1" value="1" style="width: 100%;">
        </label>
        <button class="btn primary" id="btnAddComponent" style="height: 38px;">Add</button>
      </div>
    </div>
  `;

  // Components list
  html += '<div class="components-list">';
  if (kitComponents.length === 0) {
    html += '<p><em>No components added yet</em></p>';
  } else {
    html += '<table class="table"><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Stock</th><th>Cost</th><th>Actions</th></tr></thead><tbody>';

    kitComponents.forEach((comp, index) => {
      const product = allProducts.find(p => p.id === comp.productId);
      if (product) {
        const stock = product.qty || 0;
        const cost = (product.cost || 0) * comp.qty;
        const stockWarning = stock < comp.qty ? 'style="color: var(--danger-color);"' : '';

        html += `
          <tr>
            <td>${product.name}</td>
            <td>${product.sku || '-'}</td>
            <td>
              <input type="number" min="1" value="${comp.qty}"
                     onchange="window.kitUI.updateComponentQty(${index}, parseInt(this.value))"
                     style="width: 60px;">
            </td>
            <td ${stockWarning}>${stock} ${stock < comp.qty ? '⚠️' : ''}</td>
            <td>$${cost.toFixed(2)}</td>
            <td>
              <button class="btn btn-sm danger" onclick="window.kitUI.removeComponent(${index})">Remove</button>
            </td>
          </tr>
        `;
      }
    });

    html += '</tbody></table>';

    // Calculate totals
    const totalCost = kitComponents.reduce((sum, comp) => {
      const product = allProducts.find(p => p.id === comp.productId);
      return sum + ((product?.cost || 0) * comp.qty);
    }, 0);

    html += `
      <div style="margin-top: 1rem; padding: 1rem; background: var(--bg2); border-radius: 4px;">
        <strong>Total Component Cost: $${totalCost.toFixed(2)}</strong>
        <button class="btn" onclick="window.kitUI.calculateSuggestedPrice()" style="margin-left: 1rem;">
          Calculate Suggested Price
        </button>
      </div>
    `;
  }
  html += '</div></div>';

  container.innerHTML = html;

  // Add event listener to add component button
  const btnAdd = $('#btnAddComponent');
  if (btnAdd) {
    btnAdd.addEventListener('click', addComponent);
  }
}

/**
 * Add component to kit
 */
function addComponent() {
  const productSelect = $('#componentProductSelect');
  const qtyInput = $('#componentQty');

  if (!productSelect || !qtyInput) return;

  const productId = productSelect.value;
  const qty = parseInt(qtyInput.value);

  if (!productId) {
    showNotification('Please select a product', 'error');
    return;
  }

  if (!qty || qty < 1) {
    showNotification('Quantity must be at least 1', 'error');
    return;
  }

  // Check if already added
  const existing = kitComponents.find(c => c.productId === productId);
  if (existing) {
    showNotification('Product already added. Update quantity in the list.', 'warning');
    return;
  }

  // Add component
  kitComponents.push({
    productId: productId,
    sku: allProducts.find(p => p.id === productId)?.sku || '',
    qty: qty
  });

  // Reset form
  productSelect.value = '';
  qtyInput.value = '1';

  // Re-render
  renderComponentSelector();
  showNotification('Component added', 'success');
}

/**
 * Remove component from kit
 * @param {number} index - Component index
 */
export function removeComponent(index) {
  if (index >= 0 && index < kitComponents.length) {
    kitComponents.splice(index, 1);
    renderComponentSelector();
    showNotification('Component removed', 'success');
  }
}

/**
 * Update component quantity
 * @param {number} index - Component index
 * @param {number} qty - New quantity
 */
export function updateComponentQty(index, qty) {
  if (index >= 0 && index < kitComponents.length && qty >= 1) {
    kitComponents[index].qty = qty;
    renderComponentSelector();
  }
}

/**
 * Calculate suggested price based on markup
 */
export function calculateSuggestedPrice() {
  const totalCost = kitComponents.reduce((sum, comp) => {
    const product = allProducts.find(p => p.id === comp.productId);
    return sum + ((product?.cost || 0) * comp.qty);
  }, 0);

  // Get markup from settings or use default 50%
  const markup = parseInt(localStorage.getItem('inv.settings.kitMarkup')) || 50;
  const suggestedPrice = totalCost * (1 + markup / 100);

  setValue('kitPrice', suggestedPrice.toFixed(2));
  showNotification(`Suggested price calculated (${markup}% markup): $${suggestedPrice.toFixed(2)}`, 'success');
}

/**
 * Save kit from simple form (main view)
 */
function saveKitFromSimpleForm() {
  const name = getValue('kitNameSimple');
  const sku = getValue('kitSKUSimple');

  if (!name || name.trim() === '') {
    showNotification('Kit name is required', 'error');
    return;
  }

  try {
    const kitData = {
      name: name.trim(),
      sku: sku?.trim() || '',
      components: [],
      cost: 0,
      price: 0
    };

    const kit = typeof window.createKitCRUD === 'function'
      ? window.createKitCRUD(kitData)
      : null;

    if (kit) {
      showNotification('Kit created. Add components in edit dialog.', 'success');
      refreshKitData();

      // Clear form
      setValue('kitNameSimple', '');
      setValue('kitSKUSimple', '');
    } else {
      showNotification('Error creating kit', 'error');
    }
  } catch (error) {
    console.error('[Kit UI] Error saving kit:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Save kit from dialog
 */
function saveKitFromDialog() {
  const kitData = {
    name: getValue('kitName')?.trim(),
    sku: getValue('kitSKU')?.trim(),
    components: kitComponents,
    cost: parseFloat(getValue('kitCost')) || 0,
    price: parseFloat(getValue('kitPrice')) || 0,
    photo: getValue('kitPhoto')?.trim(),
    notes: getValue('kitNotes')?.trim()
  };

  // Validate
  if (!kitData.name || kitData.name === '') {
    showNotification('Kit name is required', 'error');
    $('#kitName')?.focus();
    return;
  }

  if (!kitData.components || kitData.components.length === 0) {
    showNotification('Kit must have at least one component', 'error');
    return;
  }

  try {
    let kit;

    if (currentKitId) {
      // Update existing
      kit = typeof window.updateKitCRUD === 'function'
        ? window.updateKitCRUD(currentKitId, kitData)
        : null;
      showNotification('Kit updated successfully', 'success');
    } else {
      // Create new
      kit = typeof window.createKitCRUD === 'function'
        ? window.createKitCRUD(kitData)
        : null;
      showNotification('Kit created successfully', 'success');
    }

    if (kit) {
      // Close dialog
      hideDialog($('#dlgKit'));

      // Refresh table
      refreshKitData();
    } else {
      showNotification('Error saving kit', 'error');
    }
  } catch (error) {
    console.error('[Kit UI] Error saving kit:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Edit kit (public API)
 * @param {string} kitId - Kit ID
 */
export function editKit(kitId) {
  showKitDialog(kitId);
}

/**
 * Delete kit (public API)
 * @param {string} kitId - Kit ID
 */
export function deleteKit(kitId) {
  if (!confirm('Are you sure you want to delete this kit?')) {
    return;
  }

  try {
    if (typeof window.deleteKitCRUD === 'function') {
      window.deleteKitCRUD(kitId);
      showNotification('Kit deleted successfully', 'success');
      refreshKitData();
    } else {
      showNotification('Delete function not available', 'error');
    }
  } catch (error) {
    console.error('[Kit UI] Error deleting kit:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Duplicate kit (public API)
 * @param {string} kitId - Kit ID
 */
export function duplicateKit(kitId) {
  const kit = window.getKit ? window.getKit(kitId) : null;
  if (!kit) {
    showNotification('Kit not found', 'error');
    return;
  }

  try {
    const newKit = {
      ...kit,
      name: `${kit.name} (Copy)`,
      sku: kit.sku ? `${kit.sku}-COPY` : ''
    };

    delete newKit.id;
    delete newKit.createdAt;
    delete newKit.updatedAt;

    if (typeof window.createKitCRUD === 'function') {
      window.createKitCRUD(newKit);
      showNotification('Kit duplicated successfully', 'success');
      refreshKitData();
    }
  } catch (error) {
    console.error('[Kit UI] Error duplicating kit:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Craft kit - consume components and optionally add finished kit to inventory
 * @param {string} kitId - Kit ID
 */
export function craftKit(kitId) {
  const kit = window.getKit ? window.getKit(kitId) : null;
  if (!kit) {
    showNotification('Kit not found', 'error');
    return;
  }

  // Check availability
  const availability = typeof window.checkKitAvailability === 'function'
    ? window.checkKitAvailability(kit, allProducts)
    : null;

  if (!availability || !availability.available) {
    showNotification('Cannot craft kit: components unavailable', 'error');
    return;
  }

  // Show confirmation
  const componentList = kit.components.map(c => {
    const product = allProducts.find(p => p.id === c.productId);
    return `  - ${product?.name || c.productId}: ${c.qty} units`;
  }).join('\n');

  if (!confirm(`Craft this kit?\n\nThis will deduct the following components:\n${componentList}\n\nContinue?`)) {
    return;
  }

  try {
    // Deduct components from inventory
    kit.components.forEach(comp => {
      const product = allProducts.find(p => p.id === comp.productId);
      if (product && typeof window.updateProduct === 'function') {
        const newQty = (product.qty || 0) - comp.qty;
        window.updateProduct(product.id, { qty: Math.max(0, newQty) });
      }
    });

    showNotification(`Kit "${kit.name}" crafted successfully! Components deducted from inventory.`, 'success');

    // Refresh data
    loadProducts();
    refreshKitData();
  } catch (error) {
    console.error('[Kit UI] Error crafting kit:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Add kit to order (public API)
 * @param {string} kitId - Kit ID
 */
export function addKitToOrder(kitId) {
  const kit = window.getKit ? window.getKit(kitId) : null;
  if (!kit) {
    showNotification('Kit not found', 'error');
    return;
  }

  showNotification('Add to order feature requires order module integration', 'info');

  // Future: Integrate with order module
  // const choice = confirm('Add as single item (OK) or expand to components (Cancel)?');
  // if (choice) {
  //   // Add kit as single line item
  // } else {
  //   // Expand and add individual components
  // }
}

/**
 * Event handlers
 */
function handleKitCreated(data) {
  console.log('[Kit UI] Kit created:', data);
  refreshKitData();
}

function handleKitUpdated(data) {
  console.log('[Kit UI] Kit updated:', data);
  refreshKitData();
}

function handleKitDeleted(data) {
  console.log('[Kit UI] Kit deleted:', data);
  refreshKitData();
}

/**
 * Helper: Get element value
 */
function getValue(id) {
  const element = $(`#${id}`);
  return element ? element.value : null;
}

/**
 * Helper: Set element value
 */
function setValue(id, value) {
  const element = $(`#${id}`);
  if (element) {
    element.value = value || '';
  }
}

// Export public API
export default {
  initializeKitUI,
  renderKitsTable,
  showKitDialog,
  editKit,
  deleteKit,
  duplicateKit,
  craftKit,
  addKitToOrder,
  removeComponent,
  updateComponentQty,
  calculateSuggestedPrice
};

// Expose to window for inline event handlers
window.kitUI = {
  editKit,
  deleteKit,
  duplicateKit,
  craftKit,
  addKitToOrder,
  removeComponent,
  updateComponentQty,
  calculateSuggestedPrice
};
