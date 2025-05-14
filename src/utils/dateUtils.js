import dayjs from 'dayjs';

/**
 * Safely convert any date to a dayjs object
 * @param {Date|Object|String} date - Any date-like value
 * @returns {Object|null} Dayjs object or null if invalid
 */
export function toDayjs(date) {
  if (!date) return null;
  
  // If it's already a dayjs object
  if (date && typeof date === 'object' && typeof date.format === 'function') {
    return date;
  }
  
  // Otherwise convert to dayjs
  const dayjsDate = dayjs(date);
  return dayjsDate.isValid() ? dayjsDate : null;
}

/**
 * Safely formats a date with dayjs
 * @param {Date|Object|String} date - Any date-like value
 * @param {String} format - Format string for dayjs
 * @param {String} defaultValue - Default value if date is invalid
 * @returns {String} Formatted date string
 */
export function formatDate(date, format = 'YYYY-MM-DD', defaultValue = '') {
  if (!date) return defaultValue;
  
  // If it's already a dayjs object
  if (date && typeof date === 'object' && typeof date.format === 'function') {
    return date.format(format);
  }
  
  // Otherwise convert to dayjs
  const dayjsDate = dayjs(date);
  return dayjsDate.isValid() ? dayjsDate.format(format) : defaultValue;
}

/**
 * For use in API calls - converts a date to ISO string format
 * @param {Date|dayjs|string|null} date - Date to convert
 * @returns {string|null} ISO string or null if invalid
 */
export const toISOString = (date) => {
  const d = toDayjs(date);
  if (!d) return null;
  
  // If it's a dayjs object with toDate
  if (typeof d.toDate === 'function') {
    return d.toDate().toISOString();
  }
  
  return d.toISOString();
};
