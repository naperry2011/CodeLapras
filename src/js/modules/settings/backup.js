/**
 * CodeLapras - Backup Module
 *
 * Handles manual and automatic backups, backup history, and restore functionality.
 *
 * Day 20: Settings Module
 */

import { showNotification } from '../../ui/notifications.js';
import { downloadFile } from './export-import.js';
import EventBus from '../../core/eventBus.js';

// Auto-backup timer ID
let autoBackupTimer = null;

/**
 * Create backup payload object
 * @returns {Object} Backup data
 */
export function createBackupPayload() {
  const nowISO = typeof window.nowISO === 'function' ? window.nowISO() : new Date().toISOString();

  return {
    ts: nowISO,
    version: 1,
    appName: 'CodeLapras',
    data: window.data || [],           // products
    order: window.order || [],         // orders
    invoices: window.invoices || [],
    customers: window.customers || [],
    rentals: window.rentals || [],
    subscriptions: window.subscriptions || [],
    shipments: window.shipments || [],
    kits: window.kits || [],
    settings: window.getSettings ? window.getSettings() : {},
    // Legacy fields for compatibility
    po: window.po || [],
    damaged: window.damaged || [],
    snapshots: window.snapshots || [],
    snaps: window.snaps || []
  };
}

/**
 * Create and save backup
 * @param {boolean} manual - Whether this is a manual backup
 * @param {boolean} download - Whether to download the backup file
 * @returns {Object} Backup object
 */
export function createBackup(manual = true, download = true) {
  const timestamp = new Date();
  const stamp = formatTimestamp(timestamp);
  const name = `inv-backup-${stamp}.json`;
  const payload = createBackupPayload();

  const backup = {
    ts: payload.ts,
    name,
    manual,
    data: payload
  };

  // Get existing backups
  const backups = getBackupHistory();

  // Add new backup
  backups.push(backup);

  // Clean old backups
  const settings = window.getSettings ? window.getSettings() : {};
  const keep = Math.max(1, Number(settings.backupKeep || 5));
  const trimmedBackups = backups.slice(-keep);

  // Save to localStorage
  localStorage.setItem('inv.backups', JSON.stringify(trimmedBackups));

  // Download if manual or requested
  if (download && manual) {
    downloadFile(JSON.stringify(payload, null, 2), name, 'application/json');
  }

  // Update last backup timestamp
  if (!manual && typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ lastAutoBackupAt: payload.ts });
  }
  if (manual && typeof window.updateSettingsCRUD === 'function') {
    window.updateSettingsCRUD({ lastBackupAt: payload.ts });
  }

  // Emit event
  EventBus.emit('backup:created', { name, manual, timestamp: payload.ts });

  showNotification(`Backup created: ${name}`, 'success');

  return backup;
}

/**
 * Get backup history
 * @returns {Array} Array of backup objects
 */
export function getBackupHistory() {
  try {
    const stored = localStorage.getItem('inv.backups');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Backup] Error loading backup history:', error);
    return [];
  }
}

/**
 * Restore from backup
 * @param {number} backupIndex - Index of backup in history
 */
export function restoreFromBackup(backupIndex) {
  const backups = getBackupHistory();

  if (backupIndex < 0 || backupIndex >= backups.length) {
    showNotification('Backup not found', 'error');
    return;
  }

  const backup = backups[backupIndex];

  if (!backup || !backup.data) {
    showNotification('Invalid backup data', 'error');
    return;
  }

  const confirmed = confirm(
    `Restore backup from ${new Date(backup.ts).toLocaleString()}?\n\n` +
    `This will replace all current data!`
  );

  if (!confirmed) {
    return;
  }

  try {
    const obj = backup.data;

    // Restore data
    if (obj.data) window.data = obj.data;
    if (obj.order) window.order = obj.order;
    if (obj.invoices) window.invoices = obj.invoices;
    if (obj.customers) window.customers = obj.customers;
    if (obj.rentals) window.rentals = obj.rentals;
    if (obj.subscriptions) window.subscriptions = obj.subscriptions;
    if (obj.shipments) window.shipments = obj.shipments;
    if (obj.kits) window.kits = obj.kits;

    // Restore settings
    if (obj.settings && typeof window.updateSettingsCRUD === 'function') {
      window.updateSettingsCRUD(obj.settings);
    }

    // Legacy fields
    if (obj.po) window.po = obj.po;
    if (obj.damaged) window.damaged = obj.damaged;
    if (obj.snapshots) window.snapshots = obj.snapshots;
    if (obj.snaps) window.snaps = obj.snaps;

    // Save all to localStorage
    if (typeof window.saveAll === 'function') {
      window.saveAll();
    }

    // Emit event
    EventBus.emit('backup:restored', { name: backup.name, timestamp: backup.ts });

    showNotification('Backup restored successfully! Reloading...', 'success');

    // Reload page
    setTimeout(() => location.reload(), 1000);

  } catch (error) {
    console.error('[Backup] Error restoring backup:', error);
    showNotification(`Error restoring backup: ${error.message}`, 'error');
  }
}

/**
 * Delete backup from history
 * @param {number} backupIndex - Index of backup to delete
 */
export function deleteBackup(backupIndex) {
  const backups = getBackupHistory();

  if (backupIndex < 0 || backupIndex >= backups.length) {
    showNotification('Backup not found', 'error');
    return;
  }

  const backup = backups[backupIndex];

  const confirmed = confirm(`Delete backup from ${new Date(backup.ts).toLocaleString()}?`);

  if (!confirmed) {
    return;
  }

  backups.splice(backupIndex, 1);
  localStorage.setItem('inv.backups', JSON.stringify(backups));

  showNotification('Backup deleted', 'success');

  // Emit event
  EventBus.emit('backup:deleted', { name: backup.name });
}

/**
 * Download backup file
 * @param {number} backupIndex - Index of backup to download
 */
export function downloadBackup(backupIndex) {
  const backups = getBackupHistory();

  if (backupIndex < 0 || backupIndex >= backups.length) {
    showNotification('Backup not found', 'error');
    return;
  }

  const backup = backups[backupIndex];

  downloadFile(JSON.stringify(backup.data, null, 2), backup.name, 'application/json');

  showNotification(`Downloaded: ${backup.name}`, 'success');
}

/**
 * Schedule automatic backups
 * @param {string} frequency - Frequency code ('2m', '5m', '15m', '30m', '60m', 'daily', 'off')
 */
export function scheduleAutoBackup(frequency) {
  // Clear existing timer
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }

  const ms = getFrequencyMs(frequency);

  if (!ms) {
    // Auto-backup disabled
    return;
  }

  // Set up new timer
  autoBackupTimer = setInterval(() => {
    executeAutoBackup();
  }, ms);

  console.log(`[Backup] Auto-backup scheduled every ${frequency}`);
}

/**
 * Execute automatic backup
 */
export function executeAutoBackup() {
  const settings = window.getSettings ? window.getSettings() : {};
  const lastAutoBackup = settings.lastAutoBackupAt;
  const frequency = settings.autoBackupFreq || 'off';
  const ms = getFrequencyMs(frequency);

  if (!ms) {
    return; // Auto-backup disabled
  }

  // Check if enough time has passed
  const lastBackupTime = lastAutoBackup ? new Date(lastAutoBackup).getTime() : 0;
  const now = Date.now();

  if (now - lastBackupTime >= ms) {
    createBackup(false, false); // Automatic backup, don't download
    console.log('[Backup] Auto-backup executed');
  }
}

/**
 * Check if auto-backup is due and execute
 */
export function maybeAutoBackup() {
  const settings = window.getSettings ? window.getSettings() : {};
  const frequency = settings.autoBackupFreq || 'off';
  const ms = getFrequencyMs(frequency);

  if (!ms) {
    return;
  }

  const lastAutoBackup = settings.lastAutoBackupAt;
  const lastBackupTime = lastAutoBackup ? new Date(lastAutoBackup).getTime() : 0;
  const now = Date.now();

  if (now - lastBackupTime >= ms) {
    executeAutoBackup();
  }
}

/**
 * Convert frequency code to milliseconds
 * @param {string} code - Frequency code
 * @returns {number} Milliseconds
 */
export function getFrequencyMs(code) {
  switch (code) {
    case '2m': return 2 * 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '60m': return 60 * 60 * 1000;
    case 'daily': return 24 * 60 * 60 * 1000;
    default: return 0; // 'off' or invalid
  }
}

/**
 * Format timestamp for filename
 * @param {Date} date - Date object
 * @returns {string} Formatted timestamp (YYYYMMDD-HHMM)
 */
function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}${month}${day}-${hours}${minutes}`;
}

/**
 * Get backup statistics
 * @returns {Object} Backup stats
 */
export function getBackupStats() {
  const backups = getBackupHistory();
  const settings = window.getSettings ? window.getSettings() : {};

  return {
    total: backups.length,
    manual: backups.filter(b => b.manual).length,
    automatic: backups.filter(b => !b.manual).length,
    lastBackup: backups.length > 0 ? backups[backups.length - 1].ts : null,
    oldestBackup: backups.length > 0 ? backups[0].ts : null,
    autoBackupEnabled: (settings.autoBackupFreq && settings.autoBackupFreq !== 'off'),
    autoBackupFrequency: settings.autoBackupFreq || 'off',
    backupKeep: settings.backupKeep || 5
  };
}

/**
 * Initialize backup system
 */
export function initializeBackupSystem() {
  const settings = window.getSettings ? window.getSettings() : {};
  const frequency = settings.autoBackupFreq || 'off';

  // Schedule auto-backup
  scheduleAutoBackup(frequency);

  // Check if auto-backup is due
  maybeAutoBackup();

  console.log('[Backup] System initialized');
}

// Export public API
export default {
  createBackupPayload,
  createBackup,
  getBackupHistory,
  restoreFromBackup,
  deleteBackup,
  downloadBackup,
  scheduleAutoBackup,
  executeAutoBackup,
  maybeAutoBackup,
  getFrequencyMs,
  getBackupStats,
  initializeBackupSystem
};
