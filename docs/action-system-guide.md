# Action & Shortcut System - Developer Guide

**Day 10 Deliverable** - Created: 2025-11-08

## Overview

This guide covers the three new UI components created for Day 10 of the CodeLapras refactoring project:

1. **actions.js** - Centralized action registry and button management
2. **shortcuts.js** - Keyboard shortcut system
3. **context-menu.js** - Right-click context menus

All systems work together to provide consistent, maintainable action handling across the application.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Action Registry API](#action-registry-api)
- [Shortcut Manager API](#shortcut-manager-api)
- [Context Menu API](#context-menu-api)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

---

## Quick Start

### Register an Action

```javascript
ActionRegistry.register('edit-product', {
  label: 'Edit Product',
  handler: (data) => editProduct(data.id),
  confirm: 'Edit this product?',
  icon: '✏️'
});
```

### Execute an Action

```javascript
// Direct execution
await ActionRegistry.execute('edit-product', { id: 123 });

// With button loading state
const button = document.getElementById('btnEdit');
await ActionRegistry.execute('edit-product', { id: 123 }, { button });
```

### Bind Button to Action

```javascript
// By button ID
bindButton('btnEdit', 'edit-product', () => ({ id: currentProductId }));

// Using data attributes
<button data-action="edit-product" data-id="123">Edit</button>
bindActionButtons(document.body);
```

### Register Keyboard Shortcut

```javascript
ShortcutManager.register('Ctrl+E', {
  description: 'Edit current item',
  category: 'Actions',
  action: 'edit-product'
});
```

### Create Context Menu

```javascript
ContextMenu.register('product-menu', [
  { label: 'Edit', action: 'edit-product', icon: '✏️' },
  { label: 'Delete', action: 'delete-product', icon: '🗑️', danger: true }
]);

ContextMenu.attach('tableBody', 'tr', 'product-menu');
```

---

## Action Registry API

### `ActionRegistry.register(name, config)`

Register an action in the global registry.

**Parameters:**
- `name` (string) - Unique action identifier
- `config` (object) - Action configuration

**Config Options:**
```javascript
{
  handler: function,        // Required: Action handler function
  label: string,           // Display label (default: name)
  icon: string,            // Icon/emoji
  confirm: string,         // Confirmation message
  confirmType: string,     // 'default', 'typed', 'custom'
  confirmValue: string,    // Expected value for typed confirmations
  permission: string,      // Required permission
  visible: boolean,        // Is action visible
  enabled: boolean,        // Is action enabled
  danger: boolean,         // Dangerous action (red styling)
  bulk: boolean,           // Supports bulk operations
  onBefore: function,      // Called before handler
  onAfter: function,       // Called after handler
  onError: function        // Called on error
}
```

**Example:**
```javascript
ActionRegistry.register('delete-product', {
  label: 'Delete Product',
  handler: async (data) => {
    await deleteProduct(data.id);
  },
  confirm: 'Delete this product permanently?',
  danger: true,
  onAfter: () => {
    // Refresh table
    renderProducts();
  }
});
```

### `ActionRegistry.execute(name, data, options)`

Execute a registered action.

**Parameters:**
- `name` (string) - Action name
- `data` (*) - Data to pass to handler
- `options` (object) - Execution options

**Options:**
```javascript
{
  button: HTMLElement,     // Button to show loading state
  skipConfirm: boolean     // Skip confirmation dialog
}
```

**Returns:** Promise with handler result

**Example:**
```javascript
const button = document.getElementById('btnSave');
const result = await ActionRegistry.execute('save-product',
  { id: 123, name: 'Product A' },
  { button }
);
```

### `ActionRegistry.executeBulk(name, items, options)`

Execute action on multiple items.

**Parameters:**
- `name` (string) - Action name (must have `bulk: true`)
- `items` (Array) - Array of data items
- `options` (object) - Options

**Returns:** Promise with array of results

**Example:**
```javascript
const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
const results = await ActionRegistry.executeBulk('delete-product', items, {
  button: document.getElementById('btnBulkDelete')
});

// results = [
//   { success: true, item: { id: 1 }, result: ... },
//   { success: false, item: { id: 2 }, error: ... },
//   { success: true, item: { id: 3 }, result: ... }
// ]
```

### Button State Management

```javascript
// Set loading state
ActionRegistry.setButtonLoading(button, true);

// Set success state (✓ Done)
ActionRegistry.setButtonSuccess(button);

// Set error state (✗ Error)
ActionRegistry.setButtonError(button);

// Reset button
ActionRegistry.setButtonLoading(button, false);
```

---

## Shortcut Manager API

### `ShortcutManager.register(combo, config)`

Register a keyboard shortcut.

**Parameters:**
- `combo` (string) - Key combination (e.g., 'Ctrl+S', 'Cmd+N', '?')
- `config` (object) - Shortcut configuration

**Config Options:**
```javascript
{
  handler: function,         // Handler function
  action: string,           // Action name from ActionRegistry
  description: string,      // Description for help modal
  category: string,         // Category for grouping
  preventDefault: boolean,  // Prevent default (default: true)
  allowInInput: boolean,    // Allow when focused on input (default: false)
  condition: function,      // Function returning true if shortcut should work
  global: boolean          // Global or context-specific (default: true)
}
```

**Example:**
```javascript
ShortcutManager.register('Ctrl+S', {
  description: 'Save current item',
  category: 'Data',
  action: 'save-product',
  preventDefault: true
});

ShortcutManager.register('Ctrl+Delete', {
  description: 'Delete current item',
  category: 'Actions',
  handler: () => {
    if (currentProductId) {
      ActionRegistry.execute('delete-product', { id: currentProductId });
    }
  },
  condition: () => currentProductId !== null
});
```

### Platform Detection

The system automatically handles Ctrl vs Cmd for Mac:

```javascript
// On Windows/Linux:
ShortcutManager.register('Ctrl+S', { ... });  // Works with Ctrl

// On Mac:
ShortcutManager.register('Ctrl+S', { ... });  // Automatically uses Cmd
// or explicitly:
ShortcutManager.register('Cmd+S', { ... });   // Works on Mac only
```

### Default Shortcuts

Built-in shortcuts (registered automatically):

| Shortcut | Description | Category |
|----------|-------------|----------|
| `?` | Show keyboard shortcuts | Help |
| `Esc` | Close dialog or cancel | Navigation |
| `Ctrl+S` | Quick save | Data |
| `Ctrl+Shift+S` | Export to CSV | Data |
| `Ctrl+N` | Create new item | Actions |
| `Ctrl+F` | Focus search box | Navigation |
| `Ctrl+R` | Refresh data | Data |

### Show Help Modal

```javascript
// Show help modal
ShortcutManager.showHelp();

// Users can also press '?' key
```

### Enable/Disable Shortcuts

```javascript
// Disable all shortcuts
ShortcutManager.setEnabled(false);

// Re-enable
ShortcutManager.setEnabled(true);

// Check status
if (ShortcutManager.isEnabled()) {
  console.log('Shortcuts are active');
}
```

---

## Context Menu API

### `ContextMenu.register(name, items)`

Register a context menu configuration.

**Parameters:**
- `name` (string) - Menu name
- `items` (Array) - Array of menu items

**Item Options:**
```javascript
{
  label: string,           // Menu item label
  action: string,         // Action name from ActionRegistry
  handler: function,      // Or custom handler
  icon: string,          // Icon/emoji
  shortcut: string,      // Keyboard shortcut to display
  danger: boolean,       // Dangerous action (red styling)
  disabled: boolean,     // Disabled state
  checked: boolean,      // Checkbox state
  visible: boolean|function,  // Visibility (can be function)
  separator: boolean     // If true, renders separator
}
```

**Example:**
```javascript
ContextMenu.register('product-menu', [
  { label: 'Edit', action: 'edit-product', icon: '✏️', shortcut: 'Ctrl+E' },
  { label: 'Duplicate', action: 'duplicate-product', icon: '📋' },
  { separator: true },
  { label: 'View Details', action: 'view-product', icon: '👁️' },
  { separator: true },
  { label: 'Delete', action: 'delete-product', icon: '🗑️', danger: true }
]);
```

### `ContextMenu.attach(containerId, selector, menuName, dataGetter)`

Attach context menu to elements.

**Parameters:**
- `containerId` (string|HTMLElement) - Container element
- `selector` (string) - CSS selector for target elements
- `menuName` (string|function) - Menu name or function returning menu name
- `dataGetter` (function) - Function to extract data from element

**Example:**
```javascript
// Simple attachment
ContextMenu.attach('tableBody', 'tr', 'product-menu', (element) => {
  return {
    id: element.dataset.id,
    name: element.dataset.name
  };
});

// Dynamic menu selection
ContextMenu.attach('container', '.item', (element) => {
  const type = element.dataset.type;
  return type === 'product' ? 'product-menu' : 'order-menu';
}, (element) => {
  return { id: element.dataset.id };
});
```

### `ContextMenu.show(menuName, event, data)`

Manually show context menu.

```javascript
element.addEventListener('contextmenu', (e) => {
  ContextMenu.show('product-menu', e, { id: 123, name: 'Product A' });
});
```

### Keyboard Navigation

Context menus support keyboard navigation:
- `Arrow Up/Down` - Navigate items
- `Enter` or `Space` - Execute action
- `Esc` - Close menu

---

## Bulk Selector API

### `BulkSelector.init(tableId, checkboxSelector)`

Initialize bulk selection for a table.

```javascript
BulkSelector.init('productTable', 'input[type="checkbox"][data-id]');
```

### `BulkSelector.addSelectAll(tableId, checkboxId, rowCheckboxSelector)`

Add "Select All" functionality.

```javascript
BulkSelector.addSelectAll('productTable', 'selectAllCheckbox');
```

### `BulkSelector.getSelected(tableId)`

Get array of selected IDs.

```javascript
const selectedIds = BulkSelector.getSelected('productTable');
// Returns: ['1', '3', '5']
```

### `BulkSelector.clear(tableId)`

Clear all selections.

```javascript
BulkSelector.clear('productTable');
```

### `BulkSelector.getCount(tableId)`

Get count of selected items.

```javascript
const count = BulkSelector.getCount('productTable');
console.log(`${count} items selected`);
```

---

## Integration Examples

### Complete Product Table Example

```javascript
// 1. Register actions
ActionRegistry.register('edit-product', {
  label: 'Edit Product',
  handler: (data) => {
    openProductDialog(data.id);
  }
});

ActionRegistry.register('delete-product', {
  label: 'Delete Product',
  confirm: 'Delete this product?',
  danger: true,
  bulk: true,
  handler: async (data) => {
    await deleteProduct(data.id);
    renderProducts();
  }
});

// 2. Register shortcuts
ShortcutManager.register('Ctrl+E', {
  description: 'Edit selected product',
  category: 'Actions',
  action: 'edit-product',
  condition: () => selectedProductId !== null
});

// 3. Register context menu
ContextMenu.register('product-menu', [
  { label: 'Edit', action: 'edit-product', icon: '✏️', shortcut: 'Ctrl+E' },
  { label: 'Duplicate', action: 'duplicate-product', icon: '📋' },
  { separator: true },
  { label: 'Delete', action: 'delete-product', icon: '🗑️', danger: true }
]);

// 4. Attach to table
ContextMenu.attach('productTable', 'tr[data-id]', 'product-menu', (row) => {
  return {
    id: row.dataset.id,
    name: row.dataset.name
  };
});

// 5. Initialize bulk selection
BulkSelector.init('productTable');
BulkSelector.addSelectAll('productTable', 'selectAll');

// 6. Bulk delete button
document.getElementById('btnBulkDelete').addEventListener('click', async (e) => {
  const ids = BulkSelector.getSelected('productTable');
  if (ids.length === 0) {
    alert('No items selected');
    return;
  }

  const items = ids.map(id => ({ id }));
  await ActionRegistry.executeBulk('delete-product', items, { button: e.target });
  BulkSelector.clear('productTable');
});
```

### Extracting Inline Handlers from Original Code

**Before (inline handlers):**
```html
<button onclick="editKit('${id}')">Edit</button>
<button onclick="deleteKit('${id}')">Delete</button>
```

**After (action registry):**
```html
<button data-action="edit-kit" data-id="${id}">Edit</button>
<button data-action="delete-kit" data-id="${id}">Delete</button>

<script>
// Register actions
ActionRegistry.register('edit-kit', {
  handler: (data) => editKit(data.id)
});

ActionRegistry.register('delete-kit', {
  confirm: 'Delete this kit?',
  danger: true,
  handler: (data) => deleteKit(data.id)
});

// Bind all data-action buttons
bindActionButtons(document.body);
</script>
```

---

## Best Practices

### 1. Action Naming

Use consistent naming convention:
- `{verb}-{entity}` format
- Examples: `edit-product`, `delete-customer`, `create-order`

### 2. Confirmation Messages

- Use clear, descriptive messages
- For dangerous actions, be explicit: "Delete this product permanently?"
- For typed confirmations, use ALL CAPS: "Type DELETE to confirm"

### 3. Button State Management

Always pass button to `execute()` for automatic loading states:

```javascript
button.addEventListener('click', async (e) => {
  await ActionRegistry.execute('save-product', data, { button: e.target });
});
```

### 4. Bulk Operations

- Always register actions with `bulk: true` if they support bulk operations
- Show count of selected items
- Clear selection after successful bulk operation

### 5. Keyboard Shortcuts

- Use platform conventions (Ctrl on Windows/Linux, Cmd on Mac)
- Don't override browser defaults unless necessary
- Group related shortcuts in same category
- Provide visual hints (show shortcuts in context menus)

### 6. Context Menus

- Keep menus focused (5-7 items max)
- Use separators to group related actions
- Show shortcuts next to menu items
- Mark dangerous actions with `danger: true`

### 7. Error Handling

Use `onError` hook for custom error handling:

```javascript
ActionRegistry.register('save-product', {
  handler: async (data) => {
    await saveProduct(data);
  },
  onError: (error, data) => {
    console.error('Failed to save:', error);
    showNotification('Save failed: ' + error.message, 'error');
  }
});
```

### 8. Event Bus Integration

Actions automatically emit events:

```javascript
// Listen for action completion
EventBus.on('action:save-product', ({ data, result }) => {
  console.log('Product saved:', result);
  refreshDashboard();
});
```

---

## Troubleshooting

### Action not executing?
```javascript
// Check if action is registered
console.log(ActionRegistry.has('edit-product'));

// Check action config
console.log(ActionRegistry.get('edit-product'));
```

### Shortcut not working?
```javascript
// Check if shortcut is registered
console.log(ShortcutManager.has('Ctrl+S'));

// Check if shortcuts are enabled
console.log(ShortcutManager.isEnabled());

// Make sure you're not in an input (unless allowInInput: true)
```

### Context menu not showing?
```javascript
// Check if menu is registered
console.log(ContextMenu has the menu);

// Make sure selector matches elements
document.querySelector('your-selector');

// Check browser console for warnings
```

### Button state stuck in loading?
```javascript
// Manually reset if needed
ActionRegistry.setButtonLoading(button, false);
```

---

## Migration Guide

### From Original CodeLapras Patterns

**Original keyboard handler:**
```javascript
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    quickSave();
  }
});
```

**New pattern:**
```javascript
ShortcutManager.register('Ctrl+S', {
  description: 'Quick save',
  category: 'Data',
  handler: () => quickSave()
});
```

**Original button handler:**
```javascript
$('#btnAdd').addEventListener('click', () => {
  openDialog(null);
});
```

**New pattern:**
```javascript
ActionRegistry.register('new-product', {
  label: 'New Product',
  handler: () => openDialog(null)
});

bindButton('btnAdd', 'new-product');
```

---

## Next Steps

- Day 11-20: Use these systems in module implementations
- Consider adding: action history/undo, custom confirmation dialogs, action chaining

---

**Version:** 1.0
**Last Updated:** Day 10
**Author:** CodeLapras Refactoring Team
