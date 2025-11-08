# Table System Quick Start Guide

Quick reference for using the Day 9 table system components.

---

## 1. Basic Table

```javascript
// Define columns
const columns = [
  { key: 'name', label: 'Product Name' },
  { key: 'price', label: 'Price', formatter: TableRenderer.formatters.currency },
  { key: 'qty', label: 'Stock', formatter: TableRenderer.formatters.quantity }
];

// Render table
TableRenderer.renderTable('tableBody', products, columns);
```

---

## 2. Add Sorting

```html
<table>
  <thead id="tableHead"></thead>
  <tbody id="tableBody"></tbody>
</table>
```

```javascript
let sortState = { key: null, direction: 'asc' };

function render() {
  const sorted = sortState.key
    ? TableRenderer.sortData(products, sortState.key, sortState.direction)
    : products;

  TableRenderer.renderTableHeader('tableHead', columns, sortState, (key, dir) => {
    sortState = { key, direction: dir };
    render();
  });

  TableRenderer.renderTable('tableBody', sorted, columns);
}

render();
```

---

## 3. Add Search

```html
<input type="text" id="searchInput" placeholder="Search...">
<table>
  <tbody id="tableBody"></tbody>
</table>
```

```javascript
Search.setupSearchInput(
  'searchInput',
  products,
  ['name', 'sku', 'category'],  // Fields to search
  (results) => {
    TableRenderer.renderTable('tableBody', results, columns);
  }
);
```

---

## 4. Add Pagination

```html
<table>
  <tbody id="tableBody"></tbody>
</table>
<div id="pagination"></div>
```

```javascript
const paginator = Pagination.createPaginator(products, { pageSize: 25 });

paginator.subscribe((pageData) => {
  TableRenderer.renderTable('tableBody', pageData, columns);
});

paginator.renderControls('pagination', {
  showPageSize: true,
  pageSizeOptions: [10, 25, 50, 100]
});
```

---

## 5. Add Filters

```html
<div id="filters"></div>
<table>
  <tbody id="tableBody"></tbody>
</table>
```

```javascript
const filters = [
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    options: ['Active', 'Inactive'],
    value: null
  },
  {
    key: 'price',
    type: 'numeric-range',
    label: 'Price',
    min: 0,
    max: 1000
  }
];

const filterCtrl = Filters.createFilterController(products, filters);

filterCtrl.subscribe((filtered) => {
  TableRenderer.renderTable('tableBody', filtered, columns);
});

filterCtrl.renderControls('filters');
```

---

## 6. Full Integration

```javascript
// Controllers
const searchCtrl = Search.createSearchController(products, ['name', 'sku']);
const filterCtrl = Filters.createFilterController(products, filters);
const paginator = Pagination.createPaginator([], { pageSize: 25 });
let sortState = { key: null, direction: 'asc' };

// Update function
function update() {
  // Pipeline: Filter → Search → Sort → Paginate → Render
  let data = products;

  data = filterCtrl.getFiltered();
  data = searchCtrl.getResults();

  if (sortState.key) {
    data = TableRenderer.sortData(data, sortState.key, sortState.direction);
  }

  paginator.updateData(data);
  const pageData = paginator.getPage();

  TableRenderer.renderTable('tableBody', pageData, columns);
  TableRenderer.renderTableHeader('tableHead', columns, sortState, (key, dir) => {
    sortState = { key, direction: dir };
    update();
  });
  paginator.renderControls('pagination');
}

// Subscribe
searchCtrl.subscribe(update);
filterCtrl.subscribe(update);
paginator.subscribe(update);

// Initial render
update();
```

---

## Common Formatters

```javascript
// Currency
{ key: 'price', formatter: TableRenderer.formatters.currency }
// Output: $123.45

// Date
{ key: 'createdAt', formatter: TableRenderer.formatters.date }
// Output: 1/15/2024

// Phone
{ key: 'phone', formatter: TableRenderer.formatters.phone }
// Output: (555) 123-4567

// Status badge
{ key: 'status', formatter: TableRenderer.formatters.status }
// Output: <span class="status-badge status-active">Active</span>

// Quantity with low-stock warning
{ key: 'qty', formatter: TableRenderer.formatters.quantity }
// Output: <span class="qtychip warn">5</span>

// Boolean (checkmark/dash)
{ key: 'active', formatter: TableRenderer.formatters.boolean }
// Output: ✓ or -

// Truncate long text
{ key: 'description', formatter: TableRenderer.formatters.truncate(50) }
// Output: "This is a long description that will be tru..."

// Action buttons
{ key: 'actions', formatter: TableRenderer.formatters.actions(['edit', 'delete']) }
// Output: <button data-action="edit" data-id="123">✏️</button>
```

---

## Event Handling

```javascript
// Listen for action button clicks
document.getElementById('tableBody').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) {
    const action = btn.dataset.action;  // 'edit', 'delete', etc.
    const id = btn.dataset.id;

    if (action === 'edit') editProduct(id);
    if (action === 'delete') deleteProduct(id);
  }
});
```

---

## Filter Presets

```javascript
// Pre-configured filters
const filters = [
  Filters.filterPresets.status('status', ['Active', 'Inactive']),
  Filters.filterPresets.dateRange('createdAt', 'Created Date'),
  Filters.filterPresets.priceRange('price', 0, 10000),
  Filters.filterPresets.lowStock(),
  Filters.filterPresets.outOfStock(),
  Filters.filterPresets.overdue('dueDate')
];
```

---

## Custom Formatter

```javascript
function customFormatter(value, row) {
  // value = cell value
  // row = entire row object

  if (value > 100) {
    return `<strong style="color: green">${value}</strong>`;
  }
  return value;
}

const columns = [
  { key: 'amount', label: 'Amount', formatter: customFormatter }
];
```

---

## Custom Filter

```javascript
{
  key: 'qty',
  type: 'custom',
  label: 'Low Stock Items',
  predicate: (value, item) => {
    const qty = parseInt(value) || 0;
    const reorderAt = parseInt(item.reorderAt) || 0;
    return reorderAt > 0 && qty <= reorderAt;
  },
  active: false
}
```

---

## Troubleshooting

### Table not showing?
```javascript
// Check container exists
console.log(document.getElementById('tableBody'));

// Check data is array
console.log(Array.isArray(data));

// Check columns defined
console.log(columns);
```

### Search not working?
```javascript
// Check field names match data
const product = data[0];
console.log(product.name);  // Does 'name' exist?

// Check search is being called
Search.setupSearchInput('searchInput', data, ['name'], (results) => {
  console.log('Search results:', results.length);
});
```

### Pagination shows wrong page?
```javascript
// Update paginator when data changes
paginator.updateData(filteredData);

// Check current page
console.log(paginator.getMeta());
```

---

## Performance Tips

1. **Use pagination** for > 100 items
2. **Debounce search** (already built-in at 300ms)
3. **Filter before search** (reduces search space)
4. **Cache sorted data** if sorting multiple times

---

## Complete Example

See `test-table-system.html` for a working demo with all features integrated.

---

For full API documentation, see `docs/table-system-guide.md`.
