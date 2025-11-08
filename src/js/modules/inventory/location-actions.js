/**
 * location-actions.js - Location Action Registration
 *
 * Registers all location-related actions with the ActionRegistry
 */

/**
 * Register location actions with ActionRegistry
 */
function registerLocationActions() {
  if (!window.ActionRegistry) {
    console.warn('ActionRegistry not available');
    return;
  }

  const AR = window.ActionRegistry;

  // New Location
  AR.register('new-location', {
    label: 'New Location',
    icon: '📍',
    handler: () => {
      if (window.LocationUI) {
        window.LocationUI.openLocationDialog();
      }
    },
    description: 'Create a new inventory location'
  });

  // Edit Location
  AR.register('edit-location', {
    label: 'Edit Location',
    icon: '✏️',
    handler: (locationId) => {
      if (window.LocationUI && locationId) {
        window.LocationUI.editLocation(locationId);
      }
    },
    description: 'Edit location details'
  });

  // Delete Location
  AR.register('delete-location', {
    label: 'Delete Location',
    icon: '🗑️',
    handler: (locationId) => {
      if (window.LocationUI && locationId) {
        window.LocationUI.deleteLocation(locationId);
      }
    },
    description: 'Delete location',
    confirmMessage: 'Are you sure you want to delete this location?'
  });

  // Set as Default Location
  AR.register('set-default-location', {
    label: 'Set as Default',
    icon: '⭐',
    handler: (locationId) => {
      if (window.Locations && locationId) {
        const result = window.Locations.setDefaultLocation(locationId);
        if (result) {
          if (window.showToast) {
            window.showToast('Default location updated', 'success');
          }
          if (typeof refreshLocationList === 'function') {
            refreshLocationList();
          }
        }
      }
    },
    description: 'Set this location as the default'
  });

  // View Location Stock
  AR.register('view-location-stock', {
    label: 'View Stock',
    icon: '📦',
    handler: (locationId) => {
      if (window.Locations && locationId) {
        const summary = window.Locations.getLocationStockSummary(locationId);
        const location = window.Locations.getLocationById(locationId);

        if (location) {
          alert(
            `Stock Summary for ${location.name}\n\n` +
            `Total Products: ${summary.totalProducts}\n` +
            `Total Units: ${summary.totalUnits}\n` +
            `Total Value: $${summary.totalValue.toFixed(2)}`
          );
        }
      }
    },
    description: 'View stock summary for this location'
  });
}

/**
 * Register location keyboard shortcuts
 */
function registerLocationShortcuts() {
  if (!window.ShortcutManager) {
    console.warn('ShortcutManager not available');
    return;
  }

  const SM = window.ShortcutManager;

  // Ctrl+Shift+L - New Location
  SM.register('ctrl+shift+l', () => {
    if (window.ActionRegistry) {
      window.ActionRegistry.execute('new-location');
    }
  }, 'Create new location');
}

/**
 * Register location context menu items
 */
function registerLocationContextMenus() {
  // Context menus for location table rows can be added here
  // This would require integration with the context-menu system
}

/**
 * Initialize all location actions
 */
function initializeLocationActions() {
  registerLocationActions();
  registerLocationShortcuts();
  registerLocationContextMenus();

  console.log('Location actions registered');
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocationActions);
  } else {
    // DOM already loaded, initialize immediately
    initializeLocationActions();
  }

  // Export for manual initialization if needed
  window.LocationActions = {
    register: registerLocationActions,
    registerShortcuts: registerLocationShortcuts,
    registerContextMenus: registerLocationContextMenus,
    initialize: initializeLocationActions
  };
}
