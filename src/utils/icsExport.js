/**
 * Export assignments as an .ics file of VEVENT all-day calendar events.
 * Compatible with Apple Calendar, Google Calendar, Outlook, etc.
 */

function escapeICSText(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICSDate(dateStr) {
  // 'YYYY-MM-DD' -> 'YYYYMMDD'
  return dateStr.replace(/-/g, '');
}

function nowStampUTC() {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateCalendarICS(assignments) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Study Buddy//Assignment Tracker//EN',
    'CALSCALE:GREGORIAN',
  ];

  assignments
    .filter(a => a.dueDate)
    .forEach(a => {
      const classSuffix = a.className ? ` (${a.className})` : '';
      const summary = escapeICSText((a.title || 'Untitled') + classSuffix);
      const dueDate = formatICSDate(a.dueDate);
      
      // Calculate next calendar day for DTEND (all-day events are exclusive end)
      // Parse date components to avoid timezone issues
      const [year, month, day] = a.dueDate.split('-').map(Number);
      const dueDateObj = new Date(year, month - 1, day);
      dueDateObj.setDate(dueDateObj.getDate() + 1);
      const endYear = dueDateObj.getFullYear();
      const endMonth = String(dueDateObj.getMonth() + 1).padStart(2, '0');
      const endDay = String(dueDateObj.getDate()).padStart(2, '0');
      const endDate = `${endYear}${endMonth}${endDay}`;
      
      // Use stable UID based on assignment ID so reimports don't duplicate
      const uid = `assignment-${a.id || 'temp-' + summary.slice(0, 20)}@studybuddy.app`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowStampUTC()}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DTSTART;VALUE=DATE:${dueDate}`);
      lines.push(`DTEND;VALUE=DATE:${endDate}`);
      lines.push('STATUS:CONFIRMED');
      
      // Transparent for completed assignments
      if (a.status === 'completed' || a.completed) {
        lines.push('TRANSP:TRANSPARENT');
      }
      
      // Add assignment type and description
      if (a.type) lines.push(`CATEGORIES:${escapeICSText(a.type)}`);
      if (a.description) lines.push(`DESCRIPTION:${escapeICSText(a.description)}`);
      
      lines.push('END:VEVENT');
    });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendarICS(assignments, filename = 'study-buddy-calendar.ics') {
  const ics = generateCalendarICS(assignments);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

