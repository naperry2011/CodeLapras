/**
 * CodeLapras - Shipment UI Layer
 *
 * Handles all shipment UI rendering: tables, dialogs, forms, and metrics.
 *
 * Day 18: Shipments Module
 */

import * as Shipments from './shipments.js';
import * as Tracking from './tracking.js';
import { getAllCarriers, getCarrierOptions, getCarrierIcon } from '../../../config/carriers.js';
import { $ } from '../../core/utils.js';
import { showDialog, hideDialog } from '../../ui/dialogs.js';
import { renderTable } from '../../ui/tables.js';
import { showNotification } from '../../ui/notifications.js';
import { populateForm, extractFormData } from '../../ui/form-builders.js';
import EventBus from '../../core/eventBus.js';

// Module state
let currentShipmentId = null;
let allShipments = [];
let filteredShipments = [];
let currentFilters = {
  status: 'all',
  carrier: 'all',
  search: ''
};

/**
 * Initialize shipment UI
 */
export function initializeShipmentUI() {
  console.log('[Shipment UI] Initializing...');

  // Load initial data
  refreshShipmentData();

  // Set up event listeners
  setupEventListeners();

  // Listen for shipment events
  EventBus.on('shipment:created', handleShipmentCreated);
  EventBus.on('shipment:updated', handleShipmentUpdated);
  EventBus.on('shipment:deleted', handleShipmentDeleted);

  console.log('[Shipment UI] Initialized successfully');
}

/**
 * Setup event listeners for UI elements
 */
function setupEventListeners() {
  // New shipment button
  const btnNew = $('#btnNewShipment');
  if (btnNew) {
    btnNew.addEventListener('click', () => showShipmentDialog());
  }

  // Save shipment button
  const btnSave = $('#btnSaveShipment');
  if (btnSave) {
    btnSave.addEventListener('click', saveShipmentFromForm);
  }

  // Cancel button
  const btnCancel = $('#btnCancelShipment');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => hideDialog($('#shipmentDialog')));
  }

  // Delete shipment button
  const btnDelete = $('#btnDeleteShipment');
  if (btnDelete) {
    btnDelete.addEventListener('click', deleteCurrentShipment);
  }

  // Track package button
  const btnTrack = $('#btnTrackPackage');
  if (btnTrack) {
    btnTrack.addEventListener('click', trackCurrentShipment);
  }

  // Tracking number input - auto-detect carrier
  const trackingInput = $('#shipmentTrackingNumber');
  if (trackingInput) {
    trackingInput.addEventListener('blur', autoDetectCarrier);
  }

  // Status filter
  const statusFilter = $('#filterShipmentStatus');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilters.status = e.target.value;
      applyFilters();
    });
  }

  // Carrier filter
  const carrierFilter = $('#filterShipmentCarrier');
  if (carrierFilter) {
    carrierFilter.addEventListener('change', (e) => {
      currentFilters.carrier = e.target.value;
      applyFilters();
    });
  }

  // Search input
  const searchInput = $('#searchShipments');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      applyFilters();
    });
  }
}

/**
 * Refresh shipment data from storage
 */
function refreshShipmentData() {
  allShipments = Shipments.getAllShipments();
  applyFilters();
}

/**
 * Apply current filters and re-render
 */
function applyFilters() {
  let results = [...allShipments];

  // Filter by status
  if (currentFilters.status && currentFilters.status !== 'all') {
    results = results.filter(s => s.status === currentFilters.status);
  }

  // Filter by carrier
  if (currentFilters.carrier && currentFilters.carrier !== 'all') {
    results = results.filter(s => s.carrier === currentFilters.carrier);
  }

  // Filter by search
  if (currentFilters.search && currentFilters.search.trim().length > 0) {
    const query = currentFilters.search.toLowerCase();
    results = results.filter(s =>
      (s.trackingNumber && s.trackingNumber.toLowerCase().includes(query)) ||
      (s.orderId && s.orderId.toLowerCase().includes(query)) ||
      (s.recipientName && s.recipientName.toLowerCase().includes(query)) ||
      (s.carrier && s.carrier.toLowerCase().includes(query))
    );
  }

  filteredShipments = results;
  renderShipmentsTable();
  updateMetrics();
}

/**
 * Render shipments table
 */
export function renderShipmentsTable() {
  const container = $('#shipmentsTableContainer');
  if (!container) {
    console.warn('[Shipment UI] Table container not found');
    return;
  }

  // Define table columns
  const columns = [
    {
      key: 'trackingNumber',
      label: 'Tracking Number',
      sortable: true,
      formatter: (value, row) => {
        const icon = getCarrierIcon(row.carrier);
        return `<span class="tracking-number">${icon} ${value || 'N/A'}</span>`;
      }
    },
    {
      key: 'carrier',
      label: 'Carrier',
      sortable: true,
      formatter: (value) => value || 'N/A'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      formatter: (value) => {
        const badge = Tracking.getStatusBadge(value);
        return `<span class="status-badge ${badge.class}" style="background-color: ${badge.color}22; color: ${badge.color}; border: 1px solid ${badge.color};">${badge.icon} ${badge.label}</span>`;
      }
    },
    {
      key: 'orderId',
      label: 'Order',
      sortable: true,
      formatter: (value) => value ? `<a href="#" class="link" data-order-id="${value}">${value}</a>` : '-'
    },
    {
      key: 'recipientName',
      label: 'Recipient',
      sortable: true,
      formatter: (value) => value || '-'
    },
    {
      key: 'shippedDate',
      label: 'Shipped',
      sortable: true,
      formatter: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'estimatedDelivery',
      label: 'Est. Delivery',
      sortable: true,
      formatter: (value, row) => {
        if (!value) return '-';

        const deliveryInfo = Tracking.getDeliveryDays(row);
        if (!deliveryInfo) return new Date(value).toLocaleDateString();

        const dateStr = new Date(value).toLocaleDateString();
        const className = deliveryInfo.overdue ? 'text-danger' : deliveryInfo.delivered ? 'text-success' : '';

        return `<span class="${className}">${dateStr}<br><small>${deliveryInfo.label}</small></span>`;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      formatter: (value, row) => {
        return `
          <div class="btn-group-sm">
            <button class="btn btn-sm primary" onclick="window.shipmentUI.editShipment('${row.id}')" title="Edit">✏️</button>
            <button class="btn btn-sm" onclick="window.shipmentUI.trackShipment('${row.id}')" title="Track">🔍</button>
            <button class="btn btn-sm" onclick="window.shipmentUI.printLabel('${row.id}')" title="Print Label">🖨️</button>
            <button class="btn btn-sm danger" onclick="window.shipmentUI.deleteShipment('${row.id}')" title="Delete">🗑️</button>
          </div>
        `;
      }
    }
  ];

  // Render table
  renderTable('shipmentsTableContainer', filteredShipments, columns, {
    emptyMessage: 'No shipments found. Create your first shipment!',
    sortBy: 'shippedDate',
    sortOrder: 'desc'
  });
}

/**
 * Update metrics/badges
 */
export function updateMetrics() {
  const summary = Tracking.getTrackingSummary(allShipments);

  // Update metric badges
  updateMetricBadge('metricTotalShipments', summary.total);
  updateMetricBadge('metricPendingShipments', summary.pending);
  updateMetricBadge('metricInTransitShipments', summary.inTransit);
  updateMetricBadge('metricDeliveredShipments', summary.delivered);
  updateMetricBadge('metricOverdueShipments', summary.overdue, summary.overdue > 0 ? 'danger' : '');
}

/**
 * Update individual metric badge
 */
function updateMetricBadge(elementId, value, className = '') {
  const element = $(`#${elementId}`);
  if (element) {
    element.textContent = value || 0;
    if (className) {
      element.className = `metric-value ${className}`;
    }
  }
}

/**
 * Show shipment dialog (create or edit)
 * @param {string|null} shipmentId - Shipment ID for editing, null for creating
 */
export function showShipmentDialog(shipmentId = null) {
  const dialog = $('#shipmentDialog');
  if (!dialog) {
    console.error('[Shipment UI] Dialog not found');
    return;
  }

  currentShipmentId = shipmentId;

  // Update dialog title
  const title = $('#shipmentDialogTitle');
  if (title) {
    title.textContent = shipmentId ? 'Edit Shipment' : 'New Shipment';
  }

  // Show/hide delete button
  const btnDelete = $('#btnDeleteShipment');
  if (btnDelete) {
    btnDelete.style.display = shipmentId ? 'inline-block' : 'none';
  }

  // Populate form if editing
  if (shipmentId) {
    const shipment = Shipments.getShipment(shipmentId);
    if (shipment) {
      populateShipmentForm(shipment);
    }
  } else {
    clearShipmentForm();
  }

  // Populate carrier dropdown
  populateCarrierDropdown();

  // Show dialog
  showDialog(dialog);
}

/**
 * Populate carrier dropdown
 */
function populateCarrierDropdown() {
  const select = $('#shipmentCarrier');
  if (!select) return;

  const options = getCarrierOptions(true);

  select.innerHTML = '<option value="">Select Carrier</option>' +
    options.map(opt => `<option value="${opt.value}">${opt.icon} ${opt.label}</option>`).join('');
}

/**
 * Populate shipment form with data
 * @param {Object} shipment - Shipment object
 */
function populateShipmentForm(shipment) {
  if (!shipment) return;

  // Basic fields
  setValue('shipmentTrackingNumber', shipment.trackingNumber);
  setValue('shipmentCarrier', shipment.carrier);
  setValue('shipmentStatus', shipment.status);
  setValue('shipmentOrderId', shipment.orderId);
  setValue('shipmentInvoiceId', shipment.invoiceId);

  // Recipient info
  setValue('shipmentRecipientName', shipment.recipientName);
  setValue('shipmentRecipientPhone', shipment.recipientPhone);
  setValue('shipmentRecipientEmail', shipment.recipientEmail);

  // Address
  if (shipment.recipientAddress) {
    setValue('shipmentAddressLine1', shipment.recipientAddress.line1);
    setValue('shipmentAddressLine2', shipment.recipientAddress.line2);
    setValue('shipmentCity', shipment.recipientAddress.city);
    setValue('shipmentState', shipment.recipientAddress.state);
    setValue('shipmentZip', shipment.recipientAddress.zip);
    setValue('shipmentCountry', shipment.recipientAddress.country);
  }

  // Dates
  setValue('shipmentShippedDate', shipment.shippedDate ? shipment.shippedDate.split('T')[0] : '');
  setValue('shipmentEstimatedDelivery', shipment.estimatedDelivery ? shipment.estimatedDelivery.split('T')[0] : '');
  setValue('shipmentDeliveredDate', shipment.deliveredDate ? shipment.deliveredDate.split('T')[0] : '');

  // Other fields
  setValue('shipmentWeight', shipment.weight);
  setValue('shipmentDimensions', shipment.dimensions);
  setValue('shipmentServiceLevel', shipment.serviceLevel);
  setValue('shipmentShippingCost', shipment.shippingCost);
  setValue('shipmentInsuranceValue', shipment.insuranceValue);
  setValue('shipmentNotes', shipment.notes);
}

/**
 * Clear shipment form
 */
function clearShipmentForm() {
  const form = $('#shipmentForm');
  if (form) {
    form.reset();
  }

  // Set default status to 'pending'
  setValue('shipmentStatus', 'pending');
}

/**
 * Extract shipment data from form
 * @returns {Object} Shipment data
 */
function extractShipmentFormData() {
  const data = {
    trackingNumber: getValue('shipmentTrackingNumber')?.trim(),
    carrier: getValue('shipmentCarrier'),
    status: getValue('shipmentStatus') || 'pending',
    orderId: getValue('shipmentOrderId')?.trim(),
    invoiceId: getValue('shipmentInvoiceId')?.trim(),

    recipientName: getValue('shipmentRecipientName')?.trim(),
    recipientPhone: getValue('shipmentRecipientPhone')?.trim(),
    recipientEmail: getValue('shipmentRecipientEmail')?.trim(),

    recipientAddress: {
      line1: getValue('shipmentAddressLine1')?.trim(),
      line2: getValue('shipmentAddressLine2')?.trim(),
      city: getValue('shipmentCity')?.trim(),
      state: getValue('shipmentState')?.trim(),
      zip: getValue('shipmentZip')?.trim(),
      country: getValue('shipmentCountry')?.trim() || 'US'
    },

    shippedDate: getValue('shipmentShippedDate') || null,
    estimatedDelivery: getValue('shipmentEstimatedDelivery') || null,
    deliveredDate: getValue('shipmentDeliveredDate') || null,

    weight: getValue('shipmentWeight') || null,
    dimensions: getValue('shipmentDimensions')?.trim(),
    serviceLevel: getValue('shipmentServiceLevel')?.trim(),
    shippingCost: parseFloat(getValue('shipmentShippingCost')) || 0,
    insuranceValue: parseFloat(getValue('shipmentInsuranceValue')) || 0,
    notes: getValue('shipmentNotes')?.trim()
  };

  return data;
}

/**
 * Validate shipment form data
 * @param {Object} data - Shipment data
 * @returns {Object} Validation result
 */
function validateShipmentData(data) {
  // Tracking number is required
  if (!data.trackingNumber || data.trackingNumber.length === 0) {
    return {
      valid: false,
      error: 'Tracking number is required',
      field: 'shipmentTrackingNumber'
    };
  }

  // Carrier is required
  if (!data.carrier || data.carrier.length === 0) {
    return {
      valid: false,
      error: 'Please select a carrier',
      field: 'shipmentCarrier'
    };
  }

  // Validate tracking number format if carrier supports it
  const validation = Tracking.validateTracking(data.trackingNumber, data.carrier);
  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
      field: 'shipmentTrackingNumber'
    };
  }

  // Recipient name required
  if (!data.recipientName || data.recipientName.length === 0) {
    return {
      valid: false,
      error: 'Recipient name is required',
      field: 'shipmentRecipientName'
    };
  }

  return { valid: true };
}

/**
 * Save shipment from form
 */
export function saveShipmentFromForm() {
  const data = extractShipmentFormData();

  // Validate
  const validation = validateShipmentData(data);
  if (!validation.valid) {
    showNotification(validation.error, 'error');
    const field = $(`#${validation.field}`);
    if (field) {
      field.focus();
      field.classList.add('error');
      setTimeout(() => field.classList.remove('error'), 3000);
    }
    return;
  }

  try {
    let shipment;

    if (currentShipmentId) {
      // Update existing
      shipment = Shipments.updateShipment(currentShipmentId, data);
      showNotification('Shipment updated successfully', 'success');
    } else {
      // Create new
      shipment = Shipments.createShipment(data);
      showNotification('Shipment created successfully', 'success');
    }

    // Close dialog
    hideDialog($('#shipmentDialog'));

    // Refresh table
    refreshShipmentData();

  } catch (error) {
    console.error('[Shipment UI] Error saving shipment:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Delete current shipment
 */
function deleteCurrentShipment() {
  if (!currentShipmentId) return;

  if (!confirm('Are you sure you want to delete this shipment?')) {
    return;
  }

  try {
    Shipments.deleteShipment(currentShipmentId);
    showNotification('Shipment deleted successfully', 'success');

    // Close dialog
    hideDialog($('#shipmentDialog'));

    // Refresh table
    refreshShipmentData();

  } catch (error) {
    console.error('[Shipment UI] Error deleting shipment:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Edit shipment (public API)
 * @param {string} shipmentId - Shipment ID
 */
export function editShipment(shipmentId) {
  showShipmentDialog(shipmentId);
}

/**
 * Delete shipment (public API)
 * @param {string} shipmentId - Shipment ID
 */
export function deleteShipment(shipmentId) {
  if (!confirm('Are you sure you want to delete this shipment?')) {
    return;
  }

  try {
    Shipments.deleteShipment(shipmentId);
    showNotification('Shipment deleted successfully', 'success');
    refreshShipmentData();
  } catch (error) {
    console.error('[Shipment UI] Error deleting shipment:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Track shipment (public API)
 * @param {string} shipmentId - Shipment ID
 */
export function trackShipment(shipmentId) {
  const shipment = Shipments.getShipment(shipmentId);
  if (!shipment) {
    showNotification('Shipment not found', 'error');
    return;
  }

  const url = Shipments.getTrackingUrl(shipmentId);
  if (url) {
    window.open(url, '_blank');
  } else {
    showNotification('Tracking URL not available for this carrier', 'warning');
  }
}

/**
 * Track current shipment
 */
function trackCurrentShipment() {
  if (!currentShipmentId) return;
  trackShipment(currentShipmentId);
}

/**
 * Print shipping label (public API)
 * @param {string} shipmentId - Shipment ID
 */
export function printLabel(shipmentId) {
  const shipment = Shipments.getShipment(shipmentId);
  if (!shipment) {
    showNotification('Shipment not found', 'error');
    return;
  }

  // This will be implemented in label-builder.js
  if (window.labelBuilder && window.labelBuilder.printLabel) {
    window.labelBuilder.printLabel(shipment);
  } else {
    showNotification('Label printing not available yet', 'warning');
  }
}

/**
 * Auto-detect carrier from tracking number
 */
function autoDetectCarrier() {
  const trackingInput = $('#shipmentTrackingNumber');
  const carrierSelect = $('#shipmentCarrier');

  if (!trackingInput || !carrierSelect) return;

  const trackingNumber = trackingInput.value.trim();
  if (!trackingNumber) return;

  const detection = Tracking.detectTracking(trackingNumber);

  if (detection.carrier) {
    carrierSelect.value = detection.carrier;
    showNotification(`Detected carrier: ${detection.suggestions[0]}`, 'info');
  } else if (detection.suggestions.length > 0) {
    showNotification(detection.suggestions[0], 'warning');
  }
}

/**
 * Event handlers
 */
function handleShipmentCreated(data) {
  console.log('[Shipment UI] Shipment created:', data);
  refreshShipmentData();
}

function handleShipmentUpdated(data) {
  console.log('[Shipment UI] Shipment updated:', data);
  refreshShipmentData();
}

function handleShipmentDeleted(data) {
  console.log('[Shipment UI] Shipment deleted:', data);
  refreshShipmentData();
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
  initializeShipmentUI,
  renderShipmentsTable,
  updateMetrics,
  showShipmentDialog,
  editShipment,
  deleteShipment,
  trackShipment,
  printLabel,
  saveShipmentFromForm
};

// Expose to window for inline event handlers
window.shipmentUI = {
  editShipment,
  deleteShipment,
  trackShipment,
  printLabel
};
