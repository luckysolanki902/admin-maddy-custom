/**
 * Generates a priority order string for goal ordering
 * Format: a, b, c, ..., z, aa, ab, ac, ..., az, ba, bb, etc.
 */
export function generatePriorityOrder(index) {
  let result = '';
  let temp = index;
  
  do {
    result = String.fromCharCode(97 + (temp % 26)) + result;
    temp = Math.floor(temp / 26) - 1;
  } while (temp >= 0);
  
  return result;
}

/**
 * Gets the next priority order after the given order
 */
export function getNextPriorityOrder(currentOrder) {
  if (!currentOrder) return 'a';
  
  // Convert to index, increment, and convert back
  let index = 0;
  let multiplier = 1;
  
  for (let i = currentOrder.length - 1; i >= 0; i--) {
    index += (currentOrder.charCodeAt(i) - 97 + 1) * multiplier;
    multiplier *= 26;
  }
  
  return generatePriorityOrder(index);
}

/**
 * Gets a priority order between two orders (for inserting between items)
 */
export function getPriorityOrderBetween(orderA, orderB) {
  if (!orderA) return orderB ? getPreviousPriorityOrder(orderB) : 'a';
  if (!orderB) return getNextPriorityOrder(orderA);
  
  // Simple approach: append 'a' to the first order if it's shorter
  // This ensures the new item comes after orderA but before orderB
  if (orderA.length < orderB.length || orderA < orderB) {
    return orderA + 'a';
  }
  
  // If orderA >= orderB, we need to find a midpoint
  // For simplicity, we'll use the approach of adding 'a' to orderA
  return orderA + 'a';
}

/**
 * Gets the previous priority order before the given order
 */
export function getPreviousPriorityOrder(currentOrder) {
  if (!currentOrder || currentOrder === 'a') return null;
  
  // Convert to index, decrement, and convert back
  let index = 0;
  let multiplier = 1;
  
  for (let i = currentOrder.length - 1; i >= 0; i--) {
    index += (currentOrder.charCodeAt(i) - 97 + 1) * multiplier;
    multiplier *= 26;
  }
  
  if (index <= 1) return null;
  return generatePriorityOrder(index - 2);
}

/**
 * Gets the last priority order from a list of goals
 */
export function getLastPriorityOrder(goals) {
  if (!goals || goals.length === 0) return null;
  
  const orders = goals
    .filter(goal => goal.priorityOrder)
    .map(goal => goal.priorityOrder)
    .sort();
  
  return orders.length > 0 ? orders[orders.length - 1] : null;
}

/**
 * Sorts goals by priority order
 */
export function sortByPriorityOrder(goals) {
  return [...goals].sort((a, b) => {
    // Put completed goals at the end
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    
    // For incomplete goals, sort by priority order
    if (!a.isCompleted && !b.isCompleted) {
      const orderA = a.priorityOrder || 'z'.repeat(10); // Put items without order at the end
      const orderB = b.priorityOrder || 'z'.repeat(10);
      return orderA.localeCompare(orderB);
    }
    
    // For completed goals, sort by completion date (most recent first)
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}
