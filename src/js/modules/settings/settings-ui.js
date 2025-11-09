/**
 * CodeLapras - Settings UI Layer
 *
 * Handles settings dialog management, form rendering, and user interactions.
 *
 * Day 20: Settings Module
 */

import { $ } from '../../core/utils.js';
import { showDialog, hideDialog } from '../../ui/dialogs.js';
import { showNotification } from '../../ui/notifications.js';
import * as Appearance from './appearance.js';
import * as ExportImport from './export-import.js';
import * as Backup from './backup.js';
import EventBus from '../../core/eventBus.js';

/**
 * Initialize settings UI
 */
export function initializeSettingsUI() {
  console.log('[Settings UI] Initializing...');

  // Setup event listeners
  setupEventListeners();

  // Listen for settings events
  EventBus.on('settings:updated', handleSettingsUpdated);
  EventBus.on('backup:created', handleBackupCreated);
  EventBus.on('backup:restored', handleBackupRestored);

  console.log('[Settings UI] Initialized successfully');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Save settings button
  const btnSaveSettings = $('#btnSaveSettings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', saveSettingsFromDialog);
  }

  // Cancel settings button
  const btnCancelSettings = $('#btnCancelSettings');
  if (btnCancelSettings) {
    btnCancelSettings.addEventListener('click', () => hideDialog($('#dlgSettings')));
  }

  // Export buttons
  const btnExportJSON = $('#btnExportJSON');
  if (btnExportJSON) {
    btnExportJSON.addEventListener('click', () => ExportImport.exportToJSON());
  }

  const btnExportCSV = $('#btnExportCSV');
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => ExportImport.exportInventoryToCSV());
  }

  const btnExportExcel = $('#btnExportExcel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => ExportImport.exportInventoryToExcel());
  }

  // Import buttons
  const btnImportJSON = $('#btnImportJSON');
  if (btnImportJSON) {
    btnImportJSON.addEventListener('click', () => {
      ExportImport.selectFileForImport('json', (file) => ExportImport.importFromJSON(file));
    });
  }

  const btnImportCSV = $('#btnImportCSV');
  if (btnImportCSV) {
    btnImportCSV.addEventListener('click', () => {
      ExportImport.selectFileForImport('csv', (file) => ExportImport.importInventoryFromCSV(file));
    });
  }

  // Backup buttons
  const btnManualBackup = $('#btnManualBackup');
  if (btnManualBackup) {
    btnManualBackup.addEventListener('click', () => Backup.createBackup(true, true));
  }

  // Auto-backup frequency
  const autoBackupFreq = $('#setAutoBackupFreq');
  if (autoBackupFreq) {
    autoBackupFreq.addEventListener('change', (e) => {
      const frequency = e.target.value;
      Backup.scheduleAutoBackup(frequency);
      if (typeof window.updateSettingsCRUD === 'function') {
        window.updateSettingsCRUD({ autoBackupFreq: frequency });
      }
      showNotification(`Auto-backup ${frequency === 'off' ? 'disabled' : `set to ${frequency}`}`, 'success');
    });
  }
}

/**
 * Show settings dialog
 * @param {string|null} section - Optional section to focus
 */
export function showSettingsDialog(section = null) {
  const dialog = $('#dlgSettings');
  if (!dialog) {
    console.error('[Settings UI] Settings dialog not found');
    return;
  }

  // Populate form with current settings
  populateSettingsForm();

  // Render backup history
  renderBackupHistory();

  // Show dialog
  showDialog(dialog);

  // Scroll to section if specified
  if (section) {
    const sectionElement = dialog.querySelector(`[data-section="${section}"]`);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/**
 * Hide settings dialog
 */
export function hideSettingsDialog() {
  const dialog = $('#dlgSettings');
  if (dialog) {
    hideDialog(dialog);
  }
}

/**
 * Populate settings form with current values
 */
function populateSettingsForm() {
  const settings = window.getSettings ? window.getSettings() : {};

  // Tax & Invoice
  setValue('setTax', settings.taxDefault || 0);
  setValue('setInvPrefix', settings.invPrefix || 'INV-');
  setValue('setKitMarkup', settings.kitMarkup || 50);

  // Company info
  setValue('setCompanyName', settings.companyName || '');
  setValue('setCompanyAddress', settings.companyAddress || '');
  setValue('setCompanyPhone', settings.companyPhone || '');
  setValue('setCompanyEmail', settings.companyEmail || '');
  setValue('setCompanyWebsite', settings.companyWebsite || '');
  setValue('setLogo', settings.logo || '');
  setValue('setFooterImage', settings.footerImage || '');
  setValue('setFooterNotes', settings.footerNotes || '');

  // Appearance
  setValue('setThemeMode', settings.themeMode || 'dark');
  setValue('setCurrency', settings.currency || 'USD');
  setChecked('setCompactRows', settings.compactRows || false);
  setChecked('setHighContrast', settings.highContrast || false);

  // Display options
  if (settings.display) {
    setChecked('setShowReorderLine', settings.display.showReorderLine);
    setChecked('setShowUnitQtyLine', settings.display.showUnitQtyLine);
    setChecked('setShowTotalUnitsLine', settings.display.showTotalUnitsLine);
    setChecked('setHideZeroValues', settings.display.hideZeroValues);
  }

  // Backup
  setChecked('setBackupReminders', settings.backupReminders || false);
  setValue('setAutoBackupFreq', settings.autoBackupFreq || 'off');
  setValue('setBackupKeep', settings.backupKeep || 5);
}

/**
 * Save settings from dialog form
 */
function saveSettingsFromDialog() {
  const settings = {
    // Tax & Invoice
    taxDefault: parseFloat(getValue('setTax')) || 0,
    invPrefix: getValue('setInvPrefix') || 'INV-',
    kitMarkup: parseFloat(getValue('setKitMarkup')) || 50,

    // Company info
    companyName: getValue('setCompanyName') || '',
    companyAddress: getValue('setCompanyAddress') || '',
    companyPhone: getValue('setCompanyPhone') || '',
    companyEmail: getValue('setCompanyEmail') || '',
    companyWebsite: getValue('setCompanyWebsite') || '',
    logo: getValue('setLogo') || '',
    footerImage: getValue('setFooterImage') || '',
    footerNotes: getValue('setFooterNotes') || '',

    // Appearance
    themeMode: getValue('setThemeMode') || 'dark',
    currency: getValue('setCurrency') || 'USD',
    compactRows: getChecked('setCompactRows'),
    highContrast: getChecked('setHighContrast'),

    // Display options
    display: {
      showReorderLine: getChecked('setShowReorderLine'),
      showUnitQtyLine: getChecked('setShowUnitQtyLine'),
      showTotalUnitsLine: getChecked('setShowTotalUnitsLine'),
      hideZeroValues: getChecked('setHideZeroValues')
    },

    // Backup
    backupReminders: getChecked('setBackupReminders'),
    autoBackupFreq: getValue('setAutoBackupFreq') || 'off',
    backupKeep: parseInt(getValue('setBackupKeep')) || 5
  };

  // Save settings
  if (typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD(settings);
  }

  // Apply appearance settings
  Appearance.applyAppearanceSettings();

  // Schedule auto-backup
  Backup.scheduleAutoBackup(settings.autoBackupFreq);

  showNotification('Settings saved successfully', 'success');

  // Close dialog
  hideSettingsDialog();
}

/**
 * Render backup history list
 */
export function renderBackupHistory() {
  const container = $('#backupList');
  if (!container) return;

  const backups = Backup.getBackupHistory();

  if (backups.length === 0) {
    container.innerHTML = '<p class="muted">No backups yet.</p>';
    return;
  }

  let html = '<div class="backup-list">';

  backups.forEach((backup, index) => {
    const date = new Date(backup.ts);
    const typeLabel = backup.manual ? 'Manual' : 'Automatic';

    html += `
      <div class="backup-item" style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--border)">
        <div>
          <strong>${backup.name}</strong>
          <br>
          <span class="muted">${date.toLocaleString()} (${typeLabel})</span>
        </div>
        <button class="btn btn-sm" onclick="window.settingsUI.downloadBackup(${index})">Download</button>
        <button class="btn btn-sm" onclick="window.settingsUI.restoreBackup(${index})">Restore</button>
        <button class="btn btn-sm danger" onclick="window.settingsUI.deleteBackup(${index})">Delete</button>
      </div>
    `;
  });

  html += '</div>';

  container.innerHTML = html;
}

/**
 * Download backup (public API)
 * @param {number} index - Backup index
 */
export function downloadBackup(index) {
  Backup.downloadBackup(index);
}

/**
 * Restore backup (public API)
 * @param {number} index - Backup index
 */
export function restoreBackup(index) {
  Backup.restoreFromBackup(index);
}

/**
 * Delete backup (public API)
 * @param {number} index - Backup index
 */
export function deleteBackup(index) {
  Backup.deleteBackup(index);
  renderBackupHistory();
}

/**
 * Event handlers
 */
function handleSettingsUpdated(data) {
  console.log('[Settings UI] Settings updated:', data);
}

function handleBackupCreated(data) {
  console.log('[Settings UI] Backup created:', data);
  renderBackupHistory();
}

function handleBackupRestored(data) {
  console.log('[Settings UI] Backup restored:', data);
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
    element.value = value !== null && value !== undefined ? value : '';
  }
}

/**
 * Helper: Get checkbox checked state
 */
function getChecked(id) {
  const element = $(`#${id}`);
  return element ? element.checked : false;
}

/**
 * Helper: Set checkbox checked state
 */
function setChecked(id, checked) {
  const element = $(`#${id}`);
  if (element) {
    element.checked = !!checked;
  }
}

// Export public API
export default {
  initializeSettingsUI,
  showSettingsDialog,
  hideSettingsDialog,
  renderBackupHistory,
  downloadBackup,
  restoreBackup,
  deleteBackup
};

// Expose to window for inline event handlers
window.settingsUI = {
  downloadBackup,
  restoreBackup,
  deleteBackup
};
