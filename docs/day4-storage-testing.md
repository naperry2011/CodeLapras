# Day 4: Storage Abstraction Layer - Testing Guide

## Overview
This guide provides instructions for testing the newly implemented storage abstraction layer.

## What Was Implemented

### 1. Constants Module (`src/config/constants.js`)
- ✅ Storage key constants (moved from storage.js for better organization)
- ✅ Default values for all entities (products, invoices, kits, settings, etc.)
- ✅ Validation constants
- ✅ Application constants (currencies, backup frequencies, status options)
- ✅ UI constants (pagination, debounce timing, etc.)

### 2. Enhanced Storage Module (`src/js/core/storage.js`)
- ✅ Data validation functions (validateProduct, validateInvoice, validateKit, etc.)
- ✅ Data sanitization function
- ✅ Versioning and migration system
- ✅ Complete save/load functions for all core entities:
  - Products: `loadProducts()`, `saveProducts()`
  - Invoices: `loadInvoices()`, `saveInvoices()`
  - Kits: `loadKits()`, `saveKits()`
  - Damaged: `loadDamaged()`, `saveDamaged()`
  - Settings: `loadSettings()`, `saveSettings()`
  - Snapshots: `loadSnapshots()`, `saveSnapshots()`
  - Snapshot history: `loadSnaps()`, `saveSnaps()`
  - Current order: `loadCurrentOrder()`, `saveCurrentOrder()`
  - Purchase order: `loadPO()`, `savePO()`
  - Stats view: `loadStatsView()`, `saveStatsView()`
- ✅ Refactored `saveAll()` to use individual save functions
- ✅ Enhanced error handling with try-catch blocks

### 3. Updated Initialization Module (`src/js/core/initialization.js`)
- ✅ Now uses new storage abstraction functions
- ✅ Initializes data versioning on startup
- ✅ Logs app info for debugging
- ✅ Maintains backward compatibility with existing code

## Testing Instructions

### Browser Console Testing

Open `index.html` in your browser and test the following in the browser console:

#### 1. Verify Storage Functions Are Available
```javascript
// Check that all new functions are available
console.log(typeof loadProducts); // should be "function"
console.log(typeof saveProducts); // should be "function"
console.log(typeof loadInvoices); // should be "function"
console.log(typeof saveInvoices); // should be "function"
console.log(typeof loadKits); // should be "function"
console.log(typeof saveKits); // should be "function"
console.log(typeof loadSettings); // should be "function"
console.log(typeof saveSettings); // should be "function"
console.log(typeof initializeDataVersion); // should be "function"
console.log(typeof getAppInfo); // should be "function"
```

#### 2. Check Application Info
```javascript
// View current app version and data version
getAppInfo();
// Should return: { appVersion: "1.0.0", dataVersion: 1, expectedDataVersion: 1, needsMigration: false, storageAvailable: true }
```

#### 3. Test Product Operations
```javascript
// Test loading products
const products = loadProducts();
console.log('Products loaded:', products.length);

// Test saving products
const testProduct = {
  id: 'test-123',
  name: 'Test Product',
  sku: 'TEST-001',
  qty: 10,
  looseUnits: 0,
  unitsPerPackage: 1,
  cost: 5.00,
  price: 10.00,
  category: 'Test',
  supplier: '',
  reorderPoint: 5,
  photo: '',
  measurable: false,
  notes: 'Test product',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Add test product
window.data.push(testProduct);
saveProducts(window.data);
console.log('Product saved');

// Reload and verify
window.data = loadProducts();
console.log('Products after reload:', window.data.length);
console.log('Test product exists:', window.data.find(p => p.id === 'test-123'));
```

#### 4. Test Invoice Operations
```javascript
// Test loading invoices
const invoices = loadInvoices();
console.log('Invoices loaded:', invoices.length);

// Test saving invoices
const testInvoice = {
  id: 'inv-test-123',
  number: 'INV-TEST-001',
  date: new Date().toISOString(),
  items: [
    { name: 'Test Item', qty: 2, price: 10, total: 20 }
  ],
  subtotal: 20,
  tax: 2,
  total: 22,
  notes: 'Test invoice',
  customer: {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '555-1234',
    address: '123 Test St'
  }
};

window.invoices.push(testInvoice);
saveInvoices(window.invoices);
console.log('Invoice saved');

// Reload and verify
window.invoices = loadInvoices();
console.log('Invoices after reload:', window.invoices.length);
console.log('Test invoice exists:', window.invoices.find(i => i.id === 'inv-test-123'));
```

#### 5. Test Settings Operations
```javascript
// Test loading settings
const settings = loadSettings();
console.log('Settings loaded:', settings);
console.log('Theme tokens exist:', !!settings.themeTokens);

// Modify and save settings
settings.taxDefault = 8.5;
settings.currency = 'EUR';
saveSettings(settings);
console.log('Settings saved');

// Reload and verify
window.settings = loadSettings();
console.log('Tax default after reload:', window.settings.taxDefault);
console.log('Currency after reload:', window.settings.currency);
```

#### 6. Test saveAll() Function
```javascript
// Modify multiple entities
window.data[0].name = "Modified Product";
window.settings.compactRows = true;
window.statsView = 'month';

// Save all at once
saveAll();
console.log('All data saved');

// Refresh the page and verify changes persisted
location.reload();
// After reload, check in console:
// console.log(window.data[0].name); // should be "Modified Product"
// console.log(window.settings.compactRows); // should be true
// console.log(window.statsView); // should be "month"
```

#### 7. Test Data Validation
```javascript
// Test product validation
console.log('Valid product:', validateProduct({
  id: 'test',
  name: 'Test',
  qty: 5
})); // should be true

console.log('Invalid product (no id):', validateProduct({
  name: 'Test',
  qty: 5
})); // should be false

console.log('Invalid product (negative qty):', validateProduct({
  id: 'test',
  name: 'Test',
  qty: -5
})); // should be false
```

#### 8. Test Data Migration
```javascript
// Check current data version
console.log('Current data version:', getDataVersion()); // should be 1

// Check if migration is needed
console.log('Needs migration:', needsMigration()); // should be false

// View full app info
console.log(getAppInfo());
```

### Manual Testing Checklist

- [ ] Open index.html in browser
- [ ] No JavaScript errors in console
- [ ] App loads successfully
- [ ] Console shows "CodeLapras initialized successfully"
- [ ] Console shows "App Info:" with version information
- [ ] Create a new product and verify it persists after page refresh
- [ ] Create a new invoice and verify it persists after page refresh
- [ ] Modify settings and verify they persist after page refresh
- [ ] Export data and verify all entities are included
- [ ] Import data and verify all entities are restored correctly
- [ ] Check that theme switching still works
- [ ] Verify that all existing functionality still works

### Expected Console Output on Load

```
Migration v0 -> v1: Initializing data version
Data migration completed successfully
App Info: {
  appVersion: "1.0.0",
  dataVersion: 1,
  expectedDataVersion: 1,
  needsMigration: false,
  storageAvailable: true
}
CodeLapras initialized successfully
```

## Known Limitations

1. **No Customers Module**: The original application doesn't have a separate customers entity. Customer data is embedded in invoices/orders. This is by design.

2. **Global Variables**: We're still using `window.*` global variables for now. This will be refactored in later days when we create proper modules.

3. **Module System**: We're not using ES6 modules yet. Constants are defined in `constants.js` but not imported. This will be addressed in future phases.

## Data Integrity Checks

The new storage layer includes:
- ✅ Validation before saving
- ✅ Default values for missing fields
- ✅ Error handling with try-catch
- ✅ Data normalization (for products)
- ✅ Version tracking for future migrations

## Next Steps (Day 5)

Day 5 will focus on creating business objects and data models:
- Product data model with validation and helper methods
- Order model with line item handling
- Invoice model
- Rental, subscription, shipment models
- Settings model

## Troubleshooting

### Issue: Functions not available in console
**Solution**: Check that storage.js is loaded before initialization.js in index.html

### Issue: Data not persisting
**Solution**: Check browser console for localStorage errors. Verify localStorage is enabled.

### Issue: Migration errors
**Solution**: Check console for migration error messages. Verify data version in localStorage.

### Issue: "Cannot read property of undefined"
**Solution**: Ensure all dependent functions are defined before use. Check load order of scripts.

## Files Modified

1. ✅ `src/config/constants.js` - Created (new file)
2. ✅ `src/js/core/storage.js` - Enhanced with new functions
3. ✅ `src/js/core/initialization.js` - Updated to use new storage functions

## Summary

Day 4 successfully completed the storage abstraction layer with:
- Complete CRUD operations for all entities
- Data validation and sanitization
- Versioning and migration support
- Enhanced error handling
- Better code organization
- Full backward compatibility

All tasks from DEVELOPMENT_ROADMAP.md Day 4 are complete! ✅
