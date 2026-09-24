/**
 * Generate Google Calendar event creation URLs
 * Uses the same timezone-safe date math as icsExport.js
 */

/**
 * Format date for Google Calendar URL (YYYYMMDD)
 * Same logic as formatICSDate from icsExport.js
 */
function formatGoogleCalendarDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

/**
 * Calculate next calendar day without timezone conversion
 * Same logic as DTEND calculation in icsExport.js
 */
function getNextDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * Generate Google Calendar URL for an assignment
 * @param {Object} assignment - Assignment object with title, dueDate, className, description
 * @returns {string} Google Calendar event creation URL
 */
export function generateGoogleCalendarURL(assignment) {
  if (!assignment.dueDate) {
    throw new Error('Assignment must have a dueDate');
  }

  // Build event title (same format as ICS export)
  const classSuffix = assignment.className ? ` (${assignment.className})` : '';
  const title = (assignment.title || 'Untitled') + classSuffix;

  // Format dates for Google Calendar (all-day event)
  const startDate = formatGoogleCalendarDate(assignment.dueDate);
  const endDate = formatGoogleCalendarDate(getNextDay(assignment.dueDate));
  const dates = `${startDate}/${endDate}`;

  // Build details (description)
  const details = assignment.description || '';

  // Build URL with properly encoded parameters
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dates,
    details: details
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
