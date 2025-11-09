/**
 * CodeLapras - Settings Actions
 *
 * Handles settings actions, keyboard shortcuts, and quick commands.
 *
 * Day 20: Settings Module
 */

import * as SettingsUI from './settings-ui.js';
import * as Appearance from './appearance.js';
import * as ExportImport from './export-import.js';
import * as Backup from './backup.js';
import { ActionRegistry } from '../../ui/actions.js';
import { ShortcutManager } from '../../ui/shortcuts.js';
import { showNotification } from '../../ui/notifications.js';

/**
 * Initialize settings actions
 */
export function initializeSettingsActions() {
  console.log('[Settings Actions] Initializing...');

  registerActions();
  registerShortcuts();

  console.log('[Settings Actions] Initialized successfully');
}

/**
 * Register all settings actions
 */
function registerActions() {
  // Open Settings
  ActionRegistry.register('open-settings', {
    label: 'Open Settings',
    icon: '⚙️',
    category: 'settings',
    handler: () => {
      SettingsUI.showSettingsDialog();
    },
    description: 'Open settings dialog',
    shortcut: 'Ctrl+,'
  });

  // Export All Data (JSON)
  ActionRegistry.register('export-all-json', {
    label: 'Export All Data (JSON)',
    icon: '📥',
    category: 'settings',
    handler: () => {
      ExportImport.exportToJSON();
    },
    description: 'Export all data as JSON file',
    shortcut: 'Ctrl+Shift+J'
  });

  // Export Inventory (CSV)
  ActionRegistry.register('export-inventory-csv', {
    label: 'Export Inventory (CSV)',
    icon: '📊',
    category: 'settings',
    handler: () => {
      ExportImport.exportInventoryToCSV();
    },
    description: 'Export inventory to CSV file',
    shortcut: null
  });

  // Export Inventory (Excel)
  ActionRegistry.register('export-inventory-excel', {
    label: 'Export Inventory (Excel)',
    icon: '📗',
    category: 'settings',
    handler: () => {
      ExportImport.exportInventoryToExcel();
    },
    description: 'Export inventory to Excel file',
    shortcut: null
  });

  // Import from JSON
  ActionRegistry.register('import-from-json', {
    label: 'Import from JSON',
    icon: '📤',
    category: 'settings',
    handler: () => {
      ExportImport.selectFileForImport('json', (file) => ExportImport.importFromJSON(file));
    },
    description: 'Import data from JSON file',
    shortcut: null
  });

  // Import Inventory from CSV
  ActionRegistry.register('import-inventory-csv', {
    label: 'Import Inventory (CSV)',
    icon: '📈',
    category: 'settings',
    handler: () => {
      ExportImport.selectFileForImport('csv', (file) => ExportImport.importInventoryFromCSV(file));
    },
    description: 'Import inventory from CSV file',
    shortcut: null
  });

  // Create Manual Backup
  ActionRegistry.register('create-manual-backup', {
    label: 'Create Backup',
    icon: '💾',
    category: 'settings',
    handler: () => {
      Backup.createBackup(true, true);
    },
    description: 'Create manual backup and download',
    shortcut: 'Ctrl+B'
  });

  // Toggle Theme (Dark/Light)
  ActionRegistry.register('toggle-theme', {
    label: 'Toggle Theme',
    icon: '🌓',
    category: 'settings',
    handler: () => {
      const current = Appearance.getAppearanceSettings().themeMode;
      const newMode = current === 'dark' ? 'light' : 'dark';
      Appearance.updateThemeMode(newMode);
      showNotification(`Theme switched to ${newMode}`, 'success');
    },
    description: 'Toggle between dark and light theme',
    shortcut: 'Ctrl+Shift+T'
  });

  // Toggle High Contrast
  ActionRegistry.register('toggle-high-contrast', {
    label: 'Toggle High Contrast',
    icon: '🔲',
    category: 'settings',
    handler: () => {
      const newValue = Appearance.toggleHighContrast();
      showNotification(`High contrast ${newValue ? 'enabled' : 'disabled'}`, 'success');
    },
    description: 'Toggle high contrast mode',
    shortcut: null
  });

  // Toggle Compact Rows
  ActionRegistry.register('toggle-compact-rows', {
    label: 'Toggle Compact Rows',
    icon: '📏',
    category: 'settings',
    handler: () => {
      const newValue = Appearance.toggleCompactRows();
      showNotification(`Compact rows ${newValue ? 'enabled' : 'disabled'}`, 'success');
    },
    description: 'Toggle compact rows mode',
    shortcut: null
  });

  // Reset Settings
  ActionRegistry.register('reset-settings', {
    label: 'Reset Settings',
    icon: '🔄',
    category: 'settings',
    handler: () => {
      if (!confirm('Reset all settings to defaults?\n\nThis will not affect your data (products, orders, etc.).')) {
        return;
      }

      if (typeof window.resetSettingsCRUD === 'function') {
        window.resetSettingsCRUD();
      }

      Appearance.resetAppearanceSettings();
      showNotification('Settings reset to defaults', 'success');

      // Reload to apply
      setTimeout(() => location.reload(), 1000);
    },
    description: 'Reset all settings to default values',
    shortcut: null
  });

  // View Backup Stats
  ActionRegistry.register('view-backup-stats', {
    label: 'Backup Statistics',
    icon: '📊',
    category: 'settings',
    handler: () => {
      const stats = Backup.getBackupStats();
      const message = `
Backup Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Backups: ${stats.total}
  - Manual: ${stats.manual}
  - Automatic: ${stats.automatic}

Auto-Backup: ${stats.autoBackupEnabled ? 'Enabled (' + stats.autoBackupFrequency + ')' : 'Disabled'}
Keep Last: ${stats.backupKeep} backups

Last Backup: ${stats.lastBackup ? new Date(stats.lastBackup).toLocaleString() : 'None'}
Oldest Backup: ${stats.oldestBackup ? new Date(stats.oldestBackup).toLocaleString() : 'None'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim();

      alert(message);
    },
    description: 'View backup statistics',
    shortcut: null
  });

  console.log('[Settings Actions] Registered 12 actions');
}

/**
 * Register keyboard shortcuts
 */
function registerShortcuts() {
  // Ctrl+,: Open Settings
  ShortcutManager.register('Ctrl+,', () => {
    ActionRegistry.execute('open-settings');
  }, 'Open Settings');

  // Ctrl+Shift+J: Export to JSON
  ShortcutManager.register('Ctrl+Shift+J', () => {
    ActionRegistry.execute('export-all-json');
  }, 'Export All Data (JSON)');

  // Ctrl+B: Create Backup
  ShortcutManager.register('Ctrl+B', () => {
    ActionRegistry.execute('create-manual-backup');
  }, 'Create Backup');

  // Ctrl+Shift+T: Toggle Theme
  ShortcutManager.register('Ctrl+Shift+T', () => {
    ActionRegistry.execute('toggle-theme');
  }, 'Toggle Theme');

  console.log('[Settings Actions] Registered 4 keyboard shortcuts');
}

// Export public API
export default {
  initializeSettingsActions
};
