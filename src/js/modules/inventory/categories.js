/**
 * categories.js - Category and Supplier Management
 *
 * Provides category and supplier utilities:
 * - Extract unique categories/suppliers
 * - Filter products by category/supplier
 * - Count products per category
 * - Category tree management (future)
 *
 * Usage:
 * const categories = getAllCategories(products);
 * const electronics = getProductsByCategory(products, 'Electronics');
 * const counts = getCategoryCounts(products);
 */

// ============================================================================
// CATEGORY EXTRACTION
// ============================================================================

/**
 * Get all unique categories from products
 * @param {Array<object>} products - Array of products
 * @param {object} options - Options
 * @returns {Array<string>} Sorted array of unique categories
 */
function getAllCategories(products, options = {}) {
  if (!Array.isArray(products)) return [];

  const {
    includeEmpty = false,  // Include products with no category
    sortAlpha = true       // Sort alphabetically
  } = options;

  const categories = new Set();

  products.forEach(product => {
    const category = product.category?.trim() || '';
    if (category || includeEmpty) {
      categories.add(category || '(Uncategorized)');
    }
  });

  let result = Array.from(categories);

  if (sortAlpha) {
    result.sort((a, b) => {
      // Put "(Uncategorized)" at the end
      if (a === '(Uncategorized)') return 1;
      if (b === '(Uncategorized)') return -1;
      return a.localeCompare(b);
    });
  }

  return result;
}

/**
 * Get all unique suppliers from products
 * @param {Array<object>} products - Array of products
 * @param {object} options - Options
 * @returns {Array<string>} Sorted array of unique suppliers
 */
function getAllSuppliers(products, options = {}) {
  if (!Array.isArray(products)) return [];

  const {
    includeEmpty = false,
    sortAlpha = true
  } = options;

  const suppliers = new Set();

  products.forEach(product => {
    const supplier = product.supplier?.trim() || '';
    if (supplier || includeEmpty) {
      suppliers.add(supplier || '(No Supplier)');
    }
  });

  let result = Array.from(suppliers);

  if (sortAlpha) {
    result.sort((a, b) => {
      if (a === '(No Supplier)') return 1;
      if (b === '(No Supplier)') return -1;
      return a.localeCompare(b);
    });
  }

  return result;
}

// ============================================================================
// CATEGORY FILTERING
// ============================================================================

/**
 * Get products by category
 * @param {Array<object>} products - Array of products
 * @param {string} category - Category name
 * @param {boolean} caseSensitive - Case sensitive matching
 * @returns {Array<object>} Filtered products
 */
function getProductsByCategory(products, category, caseSensitive = false) {
  if (!Array.isArray(products)) return [];
  if (!category && category !== '') return products;

  const searchCategory = caseSensitive ? category : category.toLowerCase();
  const isUncategorized = category === '(Uncategorized)';

  return products.filter(product => {
    const productCategory = product.category?.trim() || '';

    if (isUncategorized) {
      return productCategory === '';
    }

    const compareCategory = caseSensitive ? productCategory : productCategory.toLowerCase();
    return compareCategory === searchCategory;
  });
}

/**
 * Get products by supplier
 * @param {Array<object>} products - Array of products
 * @param {string} supplier - Supplier name
 * @param {boolean} caseSensitive - Case sensitive matching
 * @returns {Array<object>} Filtered products
 */
function getProductsBySupplier(products, supplier, caseSensitive = false) {
  if (!Array.isArray(products)) return [];
  if (!supplier && supplier !== '') return products;

  const searchSupplier = caseSensitive ? supplier : supplier.toLowerCase();
  const isNoSupplier = supplier === '(No Supplier)';

  return products.filter(product => {
    const productSupplier = product.supplier?.trim() || '';

    if (isNoSupplier) {
      return productSupplier === '';
    }

    const compareSupplier = caseSensitive ? productSupplier : productSupplier.toLowerCase();
    return compareSupplier === searchSupplier;
  });
}

// ============================================================================
// CATEGORY STATISTICS
// ============================================================================

/**
 * Get product counts per category
 * @param {Array<object>} products - Array of products
 * @returns {object} Map of category to count
 */
function getCategoryCounts(products) {
  if (!Array.isArray(products)) return {};

  const counts = {};

  products.forEach(product => {
    const category = product.category?.trim() || '(Uncategorized)';
    counts[category] = (counts[category] || 0) + 1;
  });

  return counts;
}

/**
 * Get product counts per supplier
 * @param {Array<object>} products - Array of products
 * @returns {object} Map of supplier to count
 */
function getSupplierCounts(products) {
  if (!Array.isArray(products)) return {};

  const counts = {};

  products.forEach(product => {
    const supplier = product.supplier?.trim() || '(No Supplier)';
    counts[supplier] = (counts[supplier] || 0) + 1;
  });

  return counts;
}

/**
 * Get category statistics with totals
 * @param {Array<object>} products - Array of products
 * @returns {Array<object>} Category stats
 */
function getCategoryStats(products) {
  if (!Array.isArray(products)) return [];

  const counts = getCategoryCounts(products);
  const stats = [];

  // Calculate totals for each category
  products.forEach(product => {
    const category = product.category?.trim() || '(Uncategorized)';
    const qty = Number(product.qty) || 0;
    const value = qty * (Number(product.cost) || 0);

    const existing = stats.find(s => s.category === category);
    if (existing) {
      existing.totalQty += qty;
      existing.totalValue += value;
    } else {
      stats.push({
        category,
        count: counts[category] || 0,
        totalQty: qty,
        totalValue: value
      });
    }
  });

  // Sort by count descending
  stats.sort((a, b) => b.count - a.count);

  return stats;
}

/**
 * Get supplier statistics with totals
 * @param {Array<object>} products - Array of products
 * @returns {Array<object>} Supplier stats
 */
function getSupplierStats(products) {
  if (!Array.isArray(products)) return [];

  const counts = getSupplierCounts(products);
  const stats = [];

  // Calculate totals for each supplier
  products.forEach(product => {
    const supplier = product.supplier?.trim() || '(No Supplier)';
    const qty = Number(product.qty) || 0;
    const value = qty * (Number(product.cost) || 0);

    const existing = stats.find(s => s.supplier === supplier);
    if (existing) {
      existing.totalQty += qty;
      existing.totalValue += value;
    } else {
      stats.push({
        supplier,
        count: counts[supplier] || 0,
        totalQty: qty,
        totalValue: value
      });
    }
  });

  // Sort by count descending
  stats.sort((a, b) => b.count - a.count);

  return stats;
}

// ============================================================================
// CATEGORY TREE (FUTURE ENHANCEMENT)
// ============================================================================

/**
 * Parse category path into hierarchy
 * @param {string} category - Category path (e.g., "Electronics > Computers > Laptops")
 * @param {string} separator - Path separator (default: ">")
 * @returns {Array<string>} Category hierarchy
 */
function parseCategoryPath(category, separator = '>') {
  if (!category) return [];
  return category.split(separator).map(c => c.trim()).filter(c => c);
}

/**
 * Build category tree from flat category list
 * @param {Array<object>} products - Array of products
 * @param {string} separator - Path separator
 * @returns {object} Category tree
 */
function buildCategoryTree(products, separator = '>') {
  if (!Array.isArray(products)) return {};

  const tree = {};

  products.forEach(product => {
    const category = product.category?.trim() || '';
    if (!category) return;

    const path = parseCategoryPath(category, separator);
    let current = tree;

    path.forEach((segment, index) => {
      if (!current[segment]) {
        current[segment] = {
          name: segment,
          fullPath: path.slice(0, index + 1).join(` ${separator} `),
          children: {},
          products: []
        };
      }

      // Add product to leaf nodes
      if (index === path.length - 1) {
        current[segment].products.push(product);
      }

      current = current[segment].children;
    });
  });

  return tree;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate category name
 * @param {string} category - Category name
 * @param {object} options - Validation options
 * @returns {object} Validation result
 */
function validateCategory(category, options = {}) {
  const {
    maxLength = 100,
    allowEmpty = true,
    forbiddenChars = []
  } = options;

  const errors = [];

  if (!category || category.trim() === '') {
    if (!allowEmpty) {
      errors.push('Category name is required');
    }
    return { valid: allowEmpty, errors };
  }

  if (category.length > maxLength) {
    errors.push(`Category name too long (max ${maxLength} characters)`);
  }

  forbiddenChars.forEach(char => {
    if (category.includes(char)) {
      errors.push(`Category name cannot contain "${char}"`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally or as module
if (typeof window !== 'undefined') {
  window.Categories = {
    getAllCategories,
    getAllSuppliers,
    getProductsByCategory,
    getProductsBySupplier,
    getCategoryCounts,
    getSupplierCounts,
    getCategoryStats,
    getSupplierStats,
    parseCategoryPath,
    buildCategoryTree,
    validateCategory
  };
}
