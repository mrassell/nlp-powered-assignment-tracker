/**
 * Export assignments as an .ics file of VTODO items (not VEVENT).
 * Apple Calendar/Reminders route VTODO entries into the Reminders app
 * with a plain due date and no time — not an all-day calendar event.
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

export function generateRemindersICS(assignments) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Tracker//Assignment Tracker//EN',
    'CALSCALE:GREGORIAN',
  ];

  assignments
    .filter(a => a.dueDate)
    .forEach(a => {
      const classSuffix = a.className ? ` (${a.className})` : '';
      const summary = escapeICSText((a.title || 'Untitled') + classSuffix);
      // Stable UID based on assignment ID so re-importing doesn't duplicate reminders
      const uid = `assignment-${a.id || 'temp-' + summary.slice(0, 20)}@deadline-tracker.app`;

      lines.push('BEGIN:VTODO');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowStampUTC()}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DUE;VALUE=DATE:${formatICSDate(a.dueDate)}`);
      lines.push(`STATUS:${a.status === 'completed' || a.completed ? 'COMPLETED' : 'NEEDS-ACTION'}`);
      if (a.type) lines.push(`CATEGORIES:${escapeICSText(a.type)}`);
      if (a.description) lines.push(`DESCRIPTION:${escapeICSText(a.description)}`);
      lines.push('END:VTODO');
    });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadRemindersICS(assignments, filename = 'deadline-tracker-reminders.ics') {
  const ics = generateRemindersICS(assignments);
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
