/**
 * Rental Actions Module
 * Registers all rental-related actions, shortcuts, and context menus
 */

(function () {
  'use strict';

  /**
   * Register all rental actions
   */
  function registerRentalActions() {
    if (typeof ActionRegistry === 'undefined') {
      console.warn('ActionRegistry not available, skipping rental actions registration');
      return;
    }

    // New Rental Action
    ActionRegistry.register('new-rental', {
      label: 'New Rental',
      icon: '➕',
      category: 'rentals',
      handler: () => {
        RentalUI.showRentalDialog();
      },
      description: 'Create a new rental',
      enabled: () => true
    });

    // Edit Rental Action
    ActionRegistry.register('edit-rental', {
      label: 'Edit Rental',
      icon: '✏️',
      category: 'rentals',
      handler: (rentalId) => {
        if (!rentalId) {
          showNotification('Please select a rental to edit', 'warning');
          return;
        }
        RentalUI.showRentalDialog(rentalId);
      },
      description: 'Edit selected rental',
      enabled: (rentalId) => !!rentalId
    });

    // Delete Rental Action
    ActionRegistry.register('delete-rental', {
      label: 'Delete Rental',
      icon: '🗑️',
      category: 'rentals',
      handler: (rentalId) => {
        if (!rentalId) {
          showNotification('Please select a rental to delete', 'warning');
          return;
        }
        RentalUI.deleteRental(rentalId);
      },
      description: 'Delete selected rental',
      enabled: (rentalId) => !!rentalId,
      confirmMessage: 'Are you sure you want to delete this rental?'
    });

    // Return Rental Action
    ActionRegistry.register('return-rental', {
      label: 'Return Rental',
      icon: '↩️',
      category: 'rentals',
      handler: (rentalId) => {
        if (!rentalId) {
          showNotification('Please select a rental to return', 'warning');
          return;
        }
        RentalUI.showReturnDialog(rentalId);
      },
      description: 'Mark rental as returned',
      enabled: (rentalId) => {
        if (!rentalId) return false;
        const rental = getRental(rentalId);
        return rental && rental.status !== 'returned';
      }
    });

    // Generate Invoice Action
    ActionRegistry.register('generate-rental-invoice', {
      label: 'Generate Invoice',
      icon: '📄',
      category: 'rentals',
      handler: (rentalId) => {
        if (!rentalId) {
          showNotification('Please select a rental to invoice', 'warning');
          return;
        }
        RentalUI.generateInvoice(rentalId);
      },
      description: 'Generate invoice from rental',
      enabled: (rentalId) => !!rentalId
    });

    // View Rental Action
    ActionRegistry.register('view-rental', {
      label: 'View Rental',
      icon: '👁️',
      category: 'rentals',
      handler: (rentalId) => {
        if (!rentalId) {
          showNotification('Please select a rental to view', 'warning');
          return;
        }
        RentalUI.showRentalDialog(rentalId);
      },
      description: 'View rental details',
      enabled: (rentalId) => !!rentalId
    });

    // Save Rental Action (from dialog)
    ActionRegistry.register('save-rental', {
      label: 'Save Rental',
      icon: '💾',
      category: 'rentals',
      handler: () => {
        RentalUI.saveRentalFromForm();
      },
      description: 'Save rental from form',
      enabled: () => {
        const dialog = $('#rentalDialog');
        return dialog && dialog.open;
      }
    });

    // Refresh Rentals Action
    ActionRegistry.register('refresh-rentals', {
      label: 'Refresh Rentals',
      icon: '🔄',
      category: 'rentals',
      handler: () => {
        RentalUI.refreshRentalTable();
        showNotification('Rentals refreshed', 'success');
      },
      description: 'Refresh rentals table',
      enabled: () => true
    });

    // Show Overdue Rentals Action
    ActionRegistry.register('show-overdue-rentals', {
      label: 'Show Overdue Rentals',
      icon: '⚠️',
      category: 'rentals',
      handler: () => {
        RentalUI.showOverdueAlert();
      },
      description: 'Show overdue rentals alert',
      enabled: () => true
    });

    // Export Rentals Action
    ActionRegistry.register('export-rentals', {
      label: 'Export Rentals',
      icon: '📥',
      category: 'rentals',
      handler: () => {
        exportRentalsToCSV();
      },
      description: 'Export rentals to CSV',
      enabled: () => {
        const rentals = getAllRentals();
        return rentals && rentals.length > 0;
      }
    });

    // Filter Active Rentals Action
    ActionRegistry.register('filter-active-rentals', {
      label: 'Filter Active Rentals',
      icon: '✅',
      category: 'rentals',
      handler: () => {
        const rentals = filterRentals(getAllRentals(), { status: 'active' });
        const container = $('#rentalsBody')?.parentElement || $('#rentalsTable');
        if (container) {
          RentalUI.renderRentalTable(container, rentals);
        }
        showNotification(`Showing ${rentals.length} active rentals`, 'info');
      },
      description: 'Show only active rentals',
      enabled: () => true
    });

    // Filter Overdue Rentals Action
    ActionRegistry.register('filter-overdue-rentals', {
      label: 'Filter Overdue Rentals',
      icon: '⏰',
      category: 'rentals',
      handler: () => {
        const rentals = getOverdueRentals(getAllRentals());
        const container = $('#rentalsBody')?.parentElement || $('#rentalsTable');
        if (container) {
          RentalUI.renderRentalTable(container, rentals);
        }
        showNotification(`Showing ${rentals.length} overdue rentals`, 'warning');
      },
      description: 'Show only overdue rentals',
      enabled: () => true
    });

    // Filter Returned Rentals Action
    ActionRegistry.register('filter-returned-rentals', {
      label: 'Filter Returned Rentals',
      icon: '✔️',
      category: 'rentals',
      handler: () => {
        const rentals = filterRentals(getAllRentals(), { status: 'returned' });
        const container = $('#rentalsBody')?.parentElement || $('#rentalsTable');
        if (container) {
          RentalUI.renderRentalTable(container, rentals);
        }
        showNotification(`Showing ${rentals.length} returned rentals`, 'info');
      },
      description: 'Show only returned rentals',
      enabled: () => true
    });

    // Clear Filters Action
    ActionRegistry.register('clear-rental-filters', {
      label: 'Clear Filters',
      icon: '🔍',
      category: 'rentals',
      handler: () => {
        RentalUI.refreshRentalTable();
        showNotification('Filters cleared', 'info');
      },
      description: 'Clear all rental filters',
      enabled: () => true
    });

    console.log('Rental actions registered');
  }

  /**
   * Register rental keyboard shortcuts
   */
  function registerRentalShortcuts() {
    if (typeof ShortcutManager === 'undefined') {
      console.warn('ShortcutManager not available, skipping rental shortcuts registration');
      return;
    }

    // Ctrl+Shift+R - New Rental
    ShortcutManager.register('new-rental', 'ctrl+shift+r', () => {
      ActionRegistry.execute('new-rental');
    }, 'Create new rental');

    // Ctrl+Shift+O - Show Overdue Rentals
    ShortcutManager.register('show-overdue', 'ctrl+shift+o', () => {
      ActionRegistry.execute('show-overdue-rentals');
    }, 'Show overdue rentals');

    // Ctrl+Shift+E - Export Rentals
    ShortcutManager.register('export-rentals', 'ctrl+shift+e', () => {
      ActionRegistry.execute('export-rentals');
    }, 'Export rentals to CSV');

    console.log('Rental shortcuts registered');
  }

  /**
   * Register rental context menu
   */
  function registerRentalContextMenu() {
    if (typeof ContextMenu === 'undefined') {
      console.warn('ContextMenu not available, skipping rental context menu registration');
      return;
    }

    // Context menu for rental rows
    document.addEventListener('contextmenu', (e) => {
      const row = e.target.closest('tr[data-rental-id]');
      if (!row) return;

      e.preventDefault();

      const rentalId = row.dataset.rentalId;
      const rental = getRental(rentalId);

      if (!rental) return;

      const menuItems = [];

      // Return (if not returned)
      if (rental.status !== 'returned') {
        menuItems.push({
          label: 'Return',
          icon: '↩️',
          action: () => ActionRegistry.execute('return-rental', rentalId)
        });
      }

      // Edit
      menuItems.push({
        label: 'Edit',
        icon: '✏️',
        action: () => ActionRegistry.execute('edit-rental', rentalId)
      });

      // Generate Invoice
      menuItems.push({
        label: 'Generate Invoice',
        icon: '📄',
        action: () => ActionRegistry.execute('generate-rental-invoice', rentalId)
      });

      // Separator
      menuItems.push({ separator: true });

      // Delete
      menuItems.push({
        label: 'Delete',
        icon: '🗑️',
        action: () => ActionRegistry.execute('delete-rental', rentalId),
        danger: true
      });

      ContextMenu.show(e.clientX, e.clientY, menuItems);
    });

    console.log('Rental context menu registered');
  }

  /**
   * Export rentals to CSV
   */
  function exportRentalsToCSV() {
    const rentals = getAllRentals();

    if (!rentals || rentals.length === 0) {
      showNotification('No rentals to export', 'warning');
      return;
    }

    // CSV headers
    const headers = [
      'ID',
      'Customer',
      'Customer ID',
      'Equipment',
      'Equipment ID',
      'Qty',
      'Start Date',
      'Due Date',
      'Return Date',
      'Fee',
      'Deposit',
      'Paid',
      'Pay Date',
      'Late Fee',
      'Status',
      'Notes',
      'Created At',
      'Updated At'
    ];

    // CSV rows
    const rows = rentals.map(rental => [
      rental.id,
      rental.customer,
      rental.customerId || '',
      rental.equipment,
      rental.equipmentId || '',
      rental.qty,
      rental.startDate,
      rental.dueDate,
      rental.returnDate || '',
      rental.fee,
      rental.deposit,
      rental.paid,
      rental.payDate || '',
      rental.lateFee,
      rental.status,
      (rental.notes || '').replace(/"/g, '""'), // Escape quotes
      rental.createdAt || '',
      rental.updatedAt || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `rentals_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Exported ${rentals.length} rentals to CSV`, 'success');
  }

  /**
   * Initialize rental actions
   */
  function init() {
    registerRentalActions();
    registerRentalShortcuts();
    registerRentalContextMenu();
    console.log('Rental actions module initialized');
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
