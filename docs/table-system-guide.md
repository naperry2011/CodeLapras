# Table & Data Display System - Developer Guide

**Day 9 Deliverable** - Created: 2025-11-08

## Overview

This guide covers the four new UI components created for Day 9 of the CodeLapras refactoring project:

1. **tables.js** - Generic table rendering with formatters
2. **search.js** - Debounced search with multi-field support
3. **pagination.js** - Page controls and data slicing
4. **filters.js** - Advanced filtering with multiple filter types

All systems are designed to work together seamlessly for a complete data display solution.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Tables.js API](#tablesjs-api)
- [Search.js API](#searchjs-api)
- [Pagination.js API](#paginationjs-api)
- [Filters.js API](#filtersjs-api)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

---

## Quick Start

### Basic Table Rendering

```javascript
// Define your columns
const columns = [
  { key: 'name', label: 'Product Name', sortable: true },
  { key: 'price', label: 'Price', formatter: TableRenderer.formatters.currency },
  { key: 'actions', label: 'Actions', formatter: TableRenderer.formatters.actions(['edit', 'delete']) }
];

// Render the table
TableRenderer.renderTable('myTableBody', data, columns);

// Render header with sorting
TableRenderer.renderTableHeader('myTableHead', columns, sortState, (key, dir) => {
  sortState = { key, direction: dir };
  // Re-render with sorted data
});
```

### Adding Search

```javascript
// Setup search input with auto-update
Search.setupSearchInput('searchInput', data, ['name', 'sku', 'category'], (results) => {
  // Re-render table with search results
  TableRenderer.renderTable('myTableBody', results, columns);
});
```

### Adding Pagination

```javascript
// Create paginator
const paginator = Pagination.createPaginator(data, { pageSize: 25 });

// Render current page
TableRenderer.renderTable('myTableBody', paginator.getPage(), columns);

// Render pagination controls
paginator.renderControls('paginationContainer');

// Subscribe to page changes
paginator.subscribe((pageData, meta) => {
  TableRenderer.renderTable('myTableBody', pageData, columns);
});
```

### Adding Filters

```javascript
// Define filters
const filters = [
  { key: 'status', type: 'select', label: 'Status', options: ['Active', 'Inactive'] },
  { key: 'price', type: 'numeric-range', label: 'Price', min: 0, max: 1000 }
];

// Create filter controller
const filterController = Filters.createFilterController(data, filters);

// Render filter controls
filterController.renderControls('filterContainer');

// Subscribe to filter changes
filterController.subscribe((filtered) => {
  TableRenderer.renderTable('myTableBody', filtered, columns);
});
```

---

## Tables.js API

### `TableRenderer.renderTable(containerId, data, columns, options)`

Renders a table from data array and column definitions.

**Parameters:**
- `containerId` (string|HTMLElement) - tbody element or ID
- `data` (Array) - Array of objects to display
- `columns` (Array) - Column definitions
- `options` (object) - Optional configuration

**Column Definition:**
```javascript
{
  key: 'fieldName',           // Property key to display
  label: 'Column Header',     // Header text
  sortable: true,             // Enable sorting (default: true)
  formatter: function,        // Custom formatter function
  className: 'custom-class'   // Custom CSS class for cells
}
```

**Options:**
```javascript
{
  emptyMessage: 'No data',    // Message when data is empty
  onRowClick: function,       // Callback when row is clicked
  rowClassName: function,     // Function to add class to rows
  sortable: true              // Global sortable toggle
}
```

### `TableRenderer.renderTableHeader(theadId, columns, sortState, onSort)`

Renders table header with sortable columns.

**Parameters:**
- `theadId` (string|HTMLElement) - thead element or ID
- `columns` (Array) - Column definitions
- `sortState` (object) - Current sort state `{ key, direction }`
- `onSort` (function) - Callback when column header clicked

### `TableRenderer.sortData(data, key, direction)`

Sorts data array by property key.

**Parameters:**
- `data` (Array) - Data to sort
- `key` (string) - Property to sort by
- `direction` (string) - 'asc' or 'desc'

**Returns:** New sorted array

### Built-in Formatters

#### `formatters.currency(value, row)`
Formats number as currency: `$1,234.56`

#### `formatters.date(value, row)`
Formats date to locale date string

#### `formatters.datetime(value, row)`
Formats date and time to locale string

#### `formatters.phone(value, row)`
Formats 10-digit phone: `(555) 123-4567`

#### `formatters.photo(value, row)`
Renders photo thumbnail from URL

#### `formatters.status(value, row)`
Renders status badge with color

#### `formatters.quantity(value, row)`
Renders quantity chip with low-stock warning

#### `formatters.actions(actions)`
Returns formatter for action buttons
```javascript
formatters.actions(['edit', 'delete', 'view'])
```

#### `formatters.boolean(value, row)`
Renders checkmark or dash

#### `formatters.truncate(maxLength)`
Returns formatter that truncates text
```javascript
formatters.truncate(50)
```

### Custom Formatters

```javascript
function customFormatter(value, row) {
  // value = cell value
  // row = entire row object
  return `<span class="custom">${value}</span>`;
}

const columns = [
  { key: 'field', label: 'Field', formatter: customFormatter }
];
```

---

## Search.js API

### `Search.searchData(data, query, searchFields, options)`

Search array across multiple fields.

**Parameters:**
- `data` (Array) - Data to search
- `query` (string) - Search query
- `searchFields` (Array) - Field names to search in
- `options` (object) - Search options

**Options:**
```javascript
{
  caseSensitive: false,  // Case-sensitive search
  fuzzy: false,          // Fuzzy matching
  minLength: 0           // Minimum query length
}
```

**Returns:** Filtered array

**Example:**
```javascript
const results = Search.searchData(
  products,
  'laptop',
  ['name', 'sku', 'category', 'description']
);
```

### `Search.setupSearchInput(inputId, data, searchFields, onResults, options)`

Setup auto-updating search input.

**Parameters:**
- `inputId` (string|HTMLElement) - Input element or ID
- `data` (Array) - Data to search
- `searchFields` (Array) - Fields to search
- `onResults` (function) - Callback with results
- `options` (object) - Options

**Options:**
```javascript
{
  debounceDelay: 300,    // Debounce delay in ms
  caseSensitive: false,
  fuzzy: false,
  minLength: 0,
  placeholder: 'Search...'
}
```

**Returns:** Cleanup function

**Example:**
```javascript
const cleanup = Search.setupSearchInput(
  'searchInput',
  products,
  ['name', 'sku'],
  (results, query) => {
    console.log(`Found ${results.length} results for "${query}"`);
    renderTable('tableBody', results, columns);
  }
);

// Later, to cleanup:
cleanup();
```

### `Search.createSearchController(data, searchFields, options)`

Create search controller with state management.

**Methods:**
- `search(query)` - Perform search
- `getResults()` - Get current results
- `getQuery()` - Get current query
- `clear()` - Clear search
- `updateData(newData)` - Update data source
- `subscribe(callback)` - Subscribe to changes
- `notify()` - Notify subscribers

**Example:**
```javascript
const searchCtrl = Search.createSearchController(products, ['name', 'sku']);

searchCtrl.subscribe((results, query) => {
  renderTable('tableBody', results, columns);
});

searchCtrl.search('laptop');
```

### `Search.highlightMatches(text, query, options)`

Highlight search terms in text.

**Example:**
```javascript
const highlighted = Search.highlightMatches(
  'Product Laptop X200',
  'laptop',
  { className: 'highlight' }
);
// Returns: "Product <mark class="highlight">Laptop</mark> X200"
```

---

## Pagination.js API

### `Pagination.paginate(data, page, pageSize)`

Slice array for pagination.

**Parameters:**
- `data` (Array) - Array to paginate
- `page` (number) - Page number (1-indexed)
- `pageSize` (number) - Items per page

**Returns:** Array slice for the page

### `Pagination.getPaginationMeta(totalItems, page, pageSize)`

Calculate pagination metadata.

**Returns:**
```javascript
{
  totalItems: 100,
  totalPages: 10,
  currentPage: 1,
  pageSize: 10,
  startIndex: 0,
  endIndex: 10,
  startItem: 1,
  endItem: 10,
  hasPrevious: false,
  hasNext: true,
  isFirstPage: true,
  isLastPage: false
}
```

### `Pagination.renderPaginationControls(containerId, totalItems, currentPage, pageSize, onPageChange, options)`

Render pagination UI controls.

**Options:**
```javascript
{
  maxPageButtons: 7,                  // Max page number buttons
  showPageSize: true,                 // Show page size selector
  pageSizeOptions: [10, 25, 50, 100], // Page size options
  showInfo: true                      // Show "Showing X-Y of Z"
}
```

### `Pagination.createPaginator(data, options)`

Create pagination controller.

**Options:**
```javascript
{
  pageSize: 25  // Default page size
}
```

**Methods:**
- `getPage(page)` - Get page data
- `setPage(page)` - Set current page
- `nextPage()` - Go to next page
- `previousPage()` - Go to previous page
- `setPageSize(size)` - Change page size
- `getMeta()` - Get pagination metadata
- `updateData(newData)` - Update data source
- `subscribe(callback)` - Subscribe to changes
- `renderControls(containerId, options)` - Render controls

**Example:**
```javascript
const paginator = Pagination.createPaginator(products, { pageSize: 25 });

paginator.subscribe((pageData, meta) => {
  renderTable('tableBody', pageData, columns);
  console.log(`Page ${meta.currentPage} of ${meta.totalPages}`);
});

paginator.renderControls('paginationDiv', {
  maxPageButtons: 7,
  showPageSize: true
});
```

---

## Filters.js API

### `Filters.applyFilters(data, filters, logic)`

Apply filters to data.

**Parameters:**
- `data` (Array) - Data to filter
- `filters` (Array) - Filter configurations
- `logic` (string) - 'AND' or 'OR' (default: 'AND')

**Returns:** Filtered array

### Filter Types

#### 1. Select/Status Filter
```javascript
{
  key: 'status',
  type: 'select',
  label: 'Status',
  options: ['Active', 'Inactive', 'Pending'],
  value: null,  // Current selection
  active: true
}
```

#### 2. Multi-Select Filter
```javascript
{
  key: 'category',
  type: 'multi-select',
  label: 'Categories',
  options: ['Electronics', 'Furniture', 'Clothing'],
  values: [],  // Selected values
  active: true
}
```

#### 3. Numeric Range Filter
```javascript
{
  key: 'price',
  type: 'numeric-range',
  label: 'Price Range',
  min: 0,
  max: 1000,
  active: true
}
```

#### 4. Date Range Filter
```javascript
{
  key: 'createdAt',
  type: 'date-range',
  label: 'Created Date',
  start: '2024-01-01',
  end: '2024-12-31',
  active: true
}
```

#### 5. Boolean Filter
```javascript
{
  key: 'inStock',
  type: 'boolean',
  label: 'In Stock',
  value: true,
  active: true
}
```

#### 6. Custom Filter
```javascript
{
  key: 'qty',
  type: 'custom',
  label: 'Low Stock',
  predicate: (value, item) => {
    return parseInt(value) <= parseInt(item.reorderAt);
  },
  active: true
}
```

### Filter Presets

Pre-configured common filters:

```javascript
Filters.filterPresets.status('status', ['Active', 'Inactive'])
Filters.filterPresets.dateRange('createdAt', 'Created Date')
Filters.filterPresets.priceRange('price', 0, 10000)
Filters.filterPresets.boolean('featured', 'Featured')
Filters.filterPresets.lowStock()
Filters.filterPresets.outOfStock()
Filters.filterPresets.overdue('dueDate')
```

### `Filters.createFilterController(data, filterConfigs)`

Create filter controller with state.

**Methods:**
- `getFiltered()` - Get filtered data
- `getFilters()` - Get filter configs
- `updateFilter(index, updates)` - Update a filter
- `addFilter(filter)` - Add new filter
- `removeFilter(index)` - Remove filter
- `clearAll()` - Clear all filters
- `apply()` - Apply and notify
- `updateData(newData)` - Update data
- `subscribe(callback)` - Subscribe to changes
- `renderControls(containerId, options)` - Render UI

**Example:**
```javascript
const filterCtrl = Filters.createFilterController(products, [
  Filters.filterPresets.status('status', ['Active', 'Inactive']),
  Filters.filterPresets.priceRange('price', 0, 1000)
]);

filterCtrl.subscribe((filtered, filters) => {
  console.log(`Filtered to ${filtered.length} items`);
  renderTable('tableBody', filtered, columns);
});

filterCtrl.renderControls('filterContainer');
```

---

## Integration Examples

### Full Data Pipeline

```javascript
// 1. Setup all controllers
const searchCtrl = Search.createSearchController(allData, ['name', 'sku', 'description']);
const filterCtrl = Filters.createFilterController(allData, filterConfigs);
const paginator = Pagination.createPaginator([], { pageSize: 25 });

let sortState = { key: null, direction: 'asc' };

// 2. Create update pipeline
function updateDisplay() {
  // Pipeline: Filter → Search → Sort → Paginate → Render

  // Get filtered data
  let data = filterCtrl.getFiltered();

  // Get searched data
  data = searchCtrl.getResults();

  // Apply sort
  if (sortState.key) {
    data = TableRenderer.sortData(data, sortState.key, sortState.direction);
  }

  // Update paginator
  paginator.updateData(data);

  // Get page data
  const pageData = paginator.getPage();

  // Render table
  TableRenderer.renderTable('tableBody', pageData, columns);
  TableRenderer.renderTableHeader('tableHead', columns, sortState, (key, dir) => {
    sortState = { key, direction: dir };
    updateDisplay();
  });

  // Render pagination
  paginator.renderControls('paginationDiv');
}

// 3. Subscribe to all changes
searchCtrl.subscribe(updateDisplay);
filterCtrl.subscribe(updateDisplay);
paginator.subscribe(updateDisplay);

// 4. Initial render
updateDisplay();
```

### Inventory Table Example

```javascript
// Define columns for inventory
const inventoryColumns = [
  { key: 'photo', label: 'Photo', formatter: TableRenderer.formatters.photo, sortable: false },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'price', label: 'Price', formatter: TableRenderer.formatters.currency, sortable: true },
  { key: 'qty', label: 'Stock', formatter: TableRenderer.formatters.quantity, sortable: true },
  { key: 'updatedAt', label: 'Updated', formatter: TableRenderer.formatters.date, sortable: true },
  { key: 'actions', label: 'Actions', formatter: TableRenderer.formatters.actions(['edit', 'duplicate', 'delete']) }
];

// Setup filters
const inventoryFilters = [
  Filters.filterPresets.status('status', ['Active', 'Inactive']),
  { key: 'category', type: 'multi-select', label: 'Category', options: categories, values: [] },
  Filters.filterPresets.priceRange('price', 0, 10000),
  Filters.filterPresets.lowStock(),
  Filters.filterPresets.outOfStock()
];

// Initialize
const filterCtrl = Filters.createFilterController(products, inventoryFilters);
const paginator = Pagination.createPaginator(products, { pageSize: 50 });

Search.setupSearchInput('searchInput', products, ['name', 'sku', 'category', 'supplier'], (results) => {
  paginator.updateData(filterCtrl.getFiltered());
  renderInventoryTable();
});

filterCtrl.renderControls('filterPanel');

function renderInventoryTable() {
  const pageData = paginator.getPage();
  TableRenderer.renderTable('inventoryTableBody', pageData, inventoryColumns);
  paginator.renderControls('inventoryPagination');
}
```

---

## Best Practices

### 1. Performance

- **Use pagination** for datasets larger than 100 items
- **Debounce search** (default 300ms is good for most cases)
- **Cache sorted data** if sorting frequently
- **Use event delegation** for row actions (built-in to TableRenderer)

### 2. User Experience

- **Show loading states** during data operations
- **Preserve sort/filter/page state** when data updates
- **Reset to page 1** when filters or search change
- **Show empty states** with helpful messages

### 3. Data Flow

Recommended pipeline order:
1. **Filter** (reduce dataset first)
2. **Search** (search within filtered results)
3. **Sort** (sort the refined results)
4. **Paginate** (slice for display)
5. **Render** (display current page)

### 4. Memory Management

```javascript
// Clean up event listeners
const cleanup = Search.setupSearchInput(...);
// Later:
cleanup();

// Unsubscribe from controllers
const unsubscribe = controller.subscribe(...);
// Later:
unsubscribe();
```

### 5. Accessibility

- Use semantic HTML (already handled by TableRenderer)
- Add ARIA labels for screen readers
- Ensure keyboard navigation works
- Provide visual feedback for sorting/filtering

---

## Testing

Run the test file to see all systems in action:

```bash
# Open in browser
open test-table-system.html
```

Test checklist:
- ✅ Search filters results
- ✅ Sorting changes order (asc/desc)
- ✅ Filters narrow results
- ✅ Pagination shows correct pages
- ✅ Page size changes work
- ✅ All formatters display correctly
- ✅ Action buttons trigger events
- ✅ Empty states show properly

---

## Troubleshooting

### Table not rendering
- Check that container element exists
- Verify data is an array
- Check console for errors
- Ensure columns are properly defined

### Search not working
- Verify search fields exist in data
- Check debounce delay setting
- Ensure input element ID is correct
- Check that callback is defined

### Pagination shows wrong data
- Call `paginator.updateData()` after filtering/searching
- Verify `currentPage` is within valid range
- Check that `pageSize` is set correctly

### Filters not applying
- Set `active: true` on filters
- Ensure filter keys match data properties
- Check filter values are set correctly
- Verify `applyFilters()` is being called

---

## Migration from Original Code

If migrating from the original CodeLapras HTML:

### Before (inline HTML rendering):
```javascript
function render() {
  const html = data.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.price}</td>
      <td><button onclick="editItem(${item.id})">Edit</button></td>
    </tr>
  `).join('');
  document.getElementById('tbody').innerHTML = html;
}
```

### After (using TableRenderer):
```javascript
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price', formatter: TableRenderer.formatters.currency },
  { key: 'actions', label: 'Actions', formatter: TableRenderer.formatters.actions(['edit']) }
];

TableRenderer.renderTable('tbody', data, columns);

// Event delegation (no inline onclick)
document.getElementById('tbody').addEventListener('click', (e) => {
  if (e.target.dataset.action === 'edit') {
    editItem(e.target.dataset.id);
  }
});
```

---

## Next Steps

- Day 10: Create Action & Button Systems
- Day 11-20: Module Implementation using these table systems
- Consider adding: virtual scrolling, column resize, row selection

---

**Version:** 1.0
**Last Updated:** Day 9
**Author:** CodeLapras Refactoring Team
