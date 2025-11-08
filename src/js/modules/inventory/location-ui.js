/**
 * location-ui.js - Location UI Layer
 *
 * Provides UI rendering and interaction for locations
 */

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

/**
 * Get location table column definitions
 * @param {object} options - Column options
 * @returns {Array<object>} Column definitions
 */
function getLocationColumns(options = {}) {
  const { showActions = true } = options;

  const columns = [
    {
      key: 'name',
      label: 'Location Name',
      sortable: true,
      formatter: (value, row) => {
        const esc = window.esc || ((s) => String(s).replace(/[&<>"']/g, (c) => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]));

        const name = esc(value || '');
        const isDefault = row.isDefault ? ' <span class="pill">Default</span>' : '';
        const isInactive = !row.isActive ? ' <span class="pill" style="background: var(--muted)">Inactive</span>' : '';
        return `<strong>${name}</strong>${isDefault}${isInactive}`;
      }
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      formatter: (value) => {
        const types = {
          warehouse: 'Warehouse',
          store: 'Store',
          vehicle: 'Vehicle',
          other: 'Other'
        };
        return types[value] || value;
      }
    },
    {
      key: 'address',
      label: 'Address',
      sortable: false,
      formatter: (value) => {
        const esc = window.esc || ((s) => String(s || ''));
        return value ? esc(value) : '<span class="muted">-</span>';
      }
    }
  ];

  if (showActions) {
    columns.push({
      key: 'id',
      label: 'Actions',
      sortable: false,
      formatter: (value, row) => {
        return `
          <button class="btn btn-sm" onclick="LocationUI.editLocation('${value}')" title="Edit">
            ✏️
          </button>
          <button class="btn btn-sm danger" onclick="LocationUI.deleteLocation('${value}')" title="Delete">
            🗑️
          </button>
        `;
      }
    });
  }

  return columns;
}

// ============================================================================
// TABLE RENDERING
// ============================================================================

/**
 * Render location table
 * @param {string} containerId - Container element ID
 * @param {Array} locations - Locations to render
 * @param {object} options - Render options
 */
function renderLocationTable(containerId, locations = [], options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found`);
    return;
  }

  const columns = getLocationColumns(options);

  if (window.TableRenderer && typeof window.TableRenderer.renderTable === 'function') {
    window.TableRenderer.renderTable(containerId, locations, columns, {
      emptyMessage: 'No locations found. Click "New Location" to create one.',
      ...options
    });
  } else {
    // Fallback: simple table rendering
    let html = '<table class="data-table"><thead><tr>';

    columns.forEach(col => {
      html += `<th>${col.label}</th>`;
    });

    html += '</tr></thead><tbody>';

    if (locations.length === 0) {
      html += `<tr><td colspan="${columns.length}" class="text-center muted">No locations found</td></tr>`;
    } else {
      locations.forEach(location => {
        html += '<tr>';
        columns.forEach(col => {
          const value = location[col.key];
          const formatted = col.formatter ? col.formatter(value, location) : (value || '-');
          html += `<td>${formatted}</td>`;
        });
        html += '</tr>';
      });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }
}

// ============================================================================
// DIALOG MANAGEMENT
// ============================================================================

/**
 * Open location dialog for create/edit
 * @param {object|null} location - Location to edit (null for new)
 */
function openLocationDialog(location = null) {
  const dialog = document.getElementById('locationDialog');
  if (!dialog) {
    console.error('Location dialog not found');
    return;
  }

  const isEdit = !!location;

  // Update dialog title
  const title = dialog.querySelector('.dialog-title');
  if (title) {
    title.textContent = isEdit ? 'Edit Location' : 'New Location';
  }

  // Populate form
  if (isEdit) {
    populateLocationForm(location);
  } else {
    clearLocationForm();
  }

  // Store current location ID in dialog
  dialog.dataset.locationId = location?.id || '';

  // Show dialog
  if (window.showDialog) {
    window.showDialog(dialog);
  } else {
    dialog.style.display = 'flex';
  }
}

/**
 * Close location dialog
 */
function closeLocationDialog() {
  const dialog = document.getElementById('locationDialog');
  if (!dialog) return;

  if (window.hideDialog) {
    window.hideDialog(dialog);
  } else {
    dialog.style.display = 'none';
  }

  clearLocationForm();
}

// ============================================================================
// FORM HANDLING
// ============================================================================

/**
 * Populate location form with data
 * @param {object} location - Location data
 */
function populateLocationForm(location) {
  if (!location) return;

  const form = document.getElementById('locationForm');
  if (!form) return;

  form.querySelector('#locationName').value = location.name || '';
  form.querySelector('#locationType').value = location.type || 'warehouse';
  form.querySelector('#locationAddress').value = location.address || '';
  form.querySelector('#locationNotes').value = location.notes || '';
  form.querySelector('#locationActive').checked = location.isActive !== false;
  form.querySelector('#locationDefault').checked = location.isDefault === true;
}

/**
 * Clear location form
 */
function clearLocationForm() {
  const form = document.getElementById('locationForm');
  if (!form) return;

  form.reset();
  form.querySelector('#locationActive').checked = true;
  form.querySelector('#locationDefault').checked = false;
}

/**
 * Extract data from location form
 * @returns {object} Location data
 */
function extractLocationFormData() {
  const form = document.getElementById('locationForm');
  if (!form) return null;

  return {
    name: form.querySelector('#locationName').value.trim(),
    type: form.querySelector('#locationType').value,
    address: form.querySelector('#locationAddress').value.trim(),
    notes: form.querySelector('#locationNotes').value.trim(),
    isActive: form.querySelector('#locationActive').checked,
    isDefault: form.querySelector('#locationDefault').checked
  };
}

/**
 * Save location from dialog
 */
function saveLocation() {
  const dialog = document.getElementById('locationDialog');
  if (!dialog) return;

  const locationId = dialog.dataset.locationId;
  const isEdit = !!locationId;

  // Extract form data
  const formData = extractLocationFormData();
  if (!formData) {
    alert('Could not read form data');
    return;
  }

  let result;

  if (isEdit) {
    // Update existing location
    result = window.Locations.updateLocationCRUD(locationId, formData);
  } else {
    // Create new location
    result = window.Locations.createLocationCRUD(formData);
  }

  if (result.success) {
    closeLocationDialog();

    // Refresh location list if the render function is available
    if (typeof refreshLocationList === 'function') {
      refreshLocationList();
    }

    // Show success message
    if (window.showToast) {
      window.showToast(`Location ${isEdit ? 'updated' : 'created'} successfully`, 'success');
    }
  } else {
    alert(result.error || 'Failed to save location');
  }
}

/**
 * Edit location by ID
 * @param {string} id - Location ID
 */
function editLocation(id) {
  if (!window.Locations) return;

  const location = window.Locations.getLocationById(id);
  if (!location) {
    alert('Location not found');
    return;
  }

  openLocationDialog(location);
}

/**
 * Delete location by ID
 * @param {string} id - Location ID
 */
function deleteLocation(id) {
  if (!window.Locations) return;

  const location = window.Locations.getLocationById(id);
  if (!location) {
    alert('Location not found');
    return;
  }

  if (!confirm(`Are you sure you want to delete location "${location.name}"?`)) {
    return;
  }

  const result = window.Locations.deleteLocationCRUD(id);

  if (result.success) {
    // Refresh location list if the render function is available
    if (typeof refreshLocationList === 'function') {
      refreshLocationList();
    }

    // Show success message
    if (window.showToast) {
      window.showToast('Location deleted successfully', 'success');
    }
  } else {
    alert(result.error || 'Failed to delete location');
  }
}

// ============================================================================
// LOCATION SELECTOR
// ============================================================================

/**
 * Render location selector dropdown
 * @param {string} selectId - Select element ID
 * @param {object} options - Options
 * @returns {void}
 */
function renderLocationSelector(selectId, options = {}) {
  const {
    includeInactive = false,
    selectedId = null,
    emptyOption = true
  } = options;

  const select = document.getElementById(selectId);
  if (!select) return;

  const locations = window.Locations
    ? window.Locations.getAllLocations(!includeInactive)
    : [];

  let html = '';

  if (emptyOption) {
    html += '<option value="">-- Select Location --</option>';
  }

  locations.forEach(loc => {
    const selected = loc.id === selectedId ? ' selected' : '';
    const label = loc.isDefault ? `${loc.name} (Default)` : loc.name;
    html += `<option value="${loc.id}"${selected}>${label}</option>`;
  });

  select.innerHTML = html;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.LocationUI = {
    // Table
    getLocationColumns,
    renderLocationTable,

    // Dialog
    openLocationDialog,
    closeLocationDialog,

    // Form
    populateLocationForm,
    clearLocationForm,
    extractLocationFormData,
    saveLocation,
    editLocation,
    deleteLocation,

    // Helpers
    renderLocationSelector
  };
}
