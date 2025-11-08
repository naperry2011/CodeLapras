/**
 * stock-levels.js - Stock Level Management and Alerts
 *
 * Provides stock monitoring and reorder management:
 * - Low stock detection
 * - Out of stock detection
 * - Reorder point management
 * - Reorder quantity calculations
 * - Stock alerts and warnings
 *
 * Usage:
 * const lowStock = getLowStockProducts(products);
 * const outOfStock = getOutOfStockProducts(products);
 * const reorderList = getReorderSuggestions(products);
 */

// ============================================================================
// STOCK LEVEL DETECTION
// ============================================================================

/**
 * Check if a product is low on stock
 * @param {object} product - Product object
 * @returns {boolean} True if stock is at or below reorder point
 */
function isLowStock(product) {
  if (!product) return false;

  const qty = Number(product.qty) || 0;
  const reorderAt = Number(product.reorderAt) || Number(product.reorderPoint) || 0;

  // Only flag as low stock if reorder point is set
  if (reorderAt <= 0) return false;

  return qty <= reorderAt;
}

/**
 * Check if a product is out of stock
 * @param {object} product - Product object
 * @returns {boolean} True if quantity is 0 or less
 */
function isOutOfStock(product) {
  if (!product) return false;

  const qty = Number(product.qty) || 0;
  const looseUnits = Number(product.looseUnits) || 0;

  return qty === 0 && looseUnits === 0;
}

/**
 * Get all low stock products
 * @param {Array<object>} products - Array of products
 * @param {number} threshold - Optional custom threshold multiplier (default: 1.0)
 * @returns {Array<object>} Low stock products
 */
function getLowStockProducts(products, threshold = 1.0) {
  if (!Array.isArray(products)) return [];

  return products.filter(product => {
    const qty = Number(product.qty) || 0;
    const reorderAt = Number(product.reorderAt) || Number(product.reorderPoint) || 0;

    if (reorderAt <= 0) return false;

    const adjustedThreshold = reorderAt * threshold;
    return qty <= adjustedThreshold;
  });
}

/**
 * Get all out of stock products
 * @param {Array<object>} products - Array of products
 * @returns {Array<object>} Out of stock products
 */
function getOutOfStockProducts(products) {
  if (!Array.isArray(products)) return [];

  return products.filter(product => isOutOfStock(product));
}

/**
 * Get products that need reordering
 * @param {Array<object>} products - Array of products
 * @returns {Array<object>} Products needing reorder with suggestions
 */
function getReorderSuggestions(products) {
  if (!Array.isArray(products)) return [];

  return products
    .filter(product => isLowStock(product) || isOutOfStock(product))
    .map(product => ({
      ...product,
      currentQty: Number(product.qty) || 0,
      reorderPoint: Number(product.reorderAt) || Number(product.reorderPoint) || 0,
      suggestedOrderQty: calculateReorderQuantity(product),
      stockLevel: getStockLevel(product),
      daysOfStock: estimateDaysOfStock(product)
    }))
    .sort((a, b) => {
      // Sort by urgency: out of stock first, then by stock level
      if (a.currentQty === 0 && b.currentQty > 0) return -1;
      if (a.currentQty > 0 && b.currentQty === 0) return 1;
      return a.currentQty - b.currentQty;
    });
}

// ============================================================================
// REORDER CALCULATIONS
// ============================================================================

/**
 * Calculate suggested reorder quantity
 * @param {object} product - Product object
 * @returns {number} Suggested quantity to order
 */
function calculateReorderQuantity(product) {
  if (!product) return 0;

  const currentQty = Number(product.qty) || 0;
  const reorderAt = Number(product.reorderAt) || Number(product.reorderPoint) || 0;

  // If no reorder point set, suggest 0
  if (reorderAt <= 0) return 0;

  // Calculate shortage
  const shortage = Math.max(0, reorderAt - currentQty);

  // Order enough to get back to 2x reorder point (safety stock)
  const targetQty = reorderAt * 2;
  const orderQty = Math.max(shortage, targetQty - currentQty);

  return Math.ceil(orderQty);
}

/**
 * Get stock level category
 * @param {object} product - Product object
 * @returns {string} Stock level: 'out', 'critical', 'low', 'adequate', 'good'
 */
function getStockLevel(product) {
  if (!product) return 'unknown';

  const qty = Number(product.qty) || 0;
  const reorderAt = Number(product.reorderAt) || Number(product.reorderPoint) || 0;

  if (qty === 0) return 'out';
  if (reorderAt <= 0) return 'adequate'; // No reorder point set

  const ratio = qty / reorderAt;

  if (ratio <= 0.5) return 'critical'; // 50% or less of reorder point
  if (ratio <= 1.0) return 'low';       // At or below reorder point
  if (ratio <= 2.0) return 'adequate';  // 1x to 2x reorder point
  return 'good';                        // Above 2x reorder point
}

/**
 * Estimate days of stock remaining (simplified)
 * @param {object} product - Product object
 * @param {number} avgDailyUsage - Average daily usage (optional)
 * @returns {number|null} Estimated days or null if unknown
 */
function estimateDaysOfStock(product, avgDailyUsage = null) {
  if (!product) return null;

  const qty = Number(product.qty) || 0;

  if (qty === 0) return 0;

  // If average daily usage is provided, use it
  if (avgDailyUsage && avgDailyUsage > 0) {
    return Math.floor(qty / avgDailyUsage);
  }

  // Otherwise, estimate based on reorder point
  // Assume reorder point represents ~7 days of stock
  const reorderAt = Number(product.reorderAt) || Number(product.reorderPoint) || 0;

  if (reorderAt <= 0) return null; // Unknown

  const estimatedDailyUsage = reorderAt / 7;
  if (estimatedDailyUsage === 0) return null;

  return Math.floor(qty / estimatedDailyUsage);
}

// ============================================================================
// STOCK ALERTS
// ============================================================================

/**
 * Get stock alert summary
 * @param {Array<object>} products - Array of products
 * @returns {object} Alert summary
 */
function getStockAlertSummary(products) {
  if (!Array.isArray(products)) {
    return {
      total: 0,
      outOfStock: 0,
      critical: 0,
      low: 0,
      adequate: 0,
      good: 0
    };
  }

  const summary = {
    total: products.length,
    outOfStock: 0,
    critical: 0,
    low: 0,
    adequate: 0,
    good: 0
  };

  products.forEach(product => {
    const level = getStockLevel(product);
    switch (level) {
      case 'out':
        summary.outOfStock++;
        break;
      case 'critical':
        summary.critical++;
        break;
      case 'low':
        summary.low++;
        break;
      case 'adequate':
        summary.adequate++;
        break;
      case 'good':
        summary.good++;
        break;
    }
  });

  return summary;
}

/**
 * Generate stock alert message
 * @param {Array<object>} products - Array of products
 * @returns {string} Alert message
 */
function getStockAlertMessage(products) {
  const summary = getStockAlertSummary(products);

  if (summary.outOfStock > 0) {
    return `⚠️ ${summary.outOfStock} product(s) out of stock!`;
  }

  if (summary.critical > 0) {
    return `⚠️ ${summary.critical} product(s) critically low!`;
  }

  if (summary.low > 0) {
    return `⚠️ ${summary.low} product(s) need reordering`;
  }

  return '✓ All products adequately stocked';
}

/**
 * Check if stock alerts should be shown
 * @param {Array<object>} products - Array of products
 * @returns {boolean} True if alerts needed
 */
function hasStockAlerts(products) {
  const summary = getStockAlertSummary(products);
  return summary.outOfStock > 0 || summary.critical > 0 || summary.low > 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make available globally or as module
if (typeof window !== 'undefined') {
  window.StockLevels = {
    isLowStock,
    isOutOfStock,
    getLowStockProducts,
    getOutOfStockProducts,
    getReorderSuggestions,
    calculateReorderQuantity,
    getStockLevel,
    estimateDaysOfStock,
    getStockAlertSummary,
    getStockAlertMessage,
    hasStockAlerts
  };
}
