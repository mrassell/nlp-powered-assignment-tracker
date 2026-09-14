/**
 * Parser for pasted Canvas "To Do List" text.
 * Turns the Canvas dashboard to-do dump into structured assignment rows.
 */

const MONTHS = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function stripMarkdownLink(text) {
  // "[Label](url)" -> { label, url }
  const match = text.match(/^\[(.+?)\]\((\S+)\)$/);
  if (match) return { label: match[1].trim(), url: match[2].trim() };
  return null;
}

function buildDate(monthNum, day, today) {
  let year = today.getFullYear();
  const date = new Date(year, monthNum, day);
  // If the resulting date is well before today, assume it's next year (e.g. list spans Dec -> Jan)
  if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)) {
    date.setFullYear(year + 1);
  }
  return date;
}

function parseMonthDay(text, today) {
  const match = text.trim().match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (!match) return null;
  const monthNum = MONTHS[match[1].toLowerCase()];
  if (monthNum === undefined) return null;
  return buildDate(monthNum, parseInt(match[2], 10), today);
}

/**
 * Try to pull an explicit date out of a date-header line.
 * Handles: "Today", "Tomorrow, September 15", "Wednesday, September 16",
 * "September 21 to September 23"
 */
function parseHeaderDate(line, today) {
  const trimmed = line.trim();

  if (/^today$/i.test(trimmed)) return today;
  if (/^tomorrow(,.*)?$/i.test(trimmed)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  // "Wednesday, September 16" / "Tomorrow, September 15"
  const commaMatch = trimmed.match(/,\s*([A-Za-z]+\s+\d{1,2})\s*$/);
  if (commaMatch) {
    const d = parseMonthDay(commaMatch[1], today);
    if (d) return d;
  }

  // "September 21 to September 23" -> use start date
  const rangeMatch = trimmed.match(/^([A-Za-z]+\s+\d{1,2})\s+to\s+([A-Za-z]+\s+\d{1,2})$/);
  if (rangeMatch) {
    const d = parseMonthDay(rangeMatch[1], today);
    if (d) return d;
  }

  // Bare "September 16"
  const bare = parseMonthDay(trimmed, today);
  if (bare) return bare;

  return null;
}

function isDateHeaderLine(line) {
  const trimmed = line.trim();
  if (/^today$/i.test(trimmed)) return true;
  if (/^tomorrow(,.*)?$/i.test(trimmed)) return true;
  if (/,\s*[A-Za-z]+\s+\d{1,2}\s*$/.test(trimmed)) return true;
  if (/^[A-Za-z]+\s+\d{1,2}\s+to\s+[A-Za-z]+\s+\d{1,2}$/.test(trimmed)) return true;
  return false;
}

function toISODate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/**
 * Score how well a raw course name matches an existing class.
 */
function scoreClassMatch(courseName, cls) {
  const keywords = cls.keywords && cls.keywords.length ? cls.keywords : [];
  const lowerCourse = courseName.toLowerCase();
  const lowerName = (cls.name || '').toLowerCase();

  if (lowerCourse === lowerName) return 100;
  if (lowerCourse.includes(lowerName) || lowerName.includes(lowerCourse)) return 60;

  // Ignore short generic tokens (e.g. "edu") that appear across many course names
  // and would otherwise cause false matches between unrelated classes.
  const words = lowerCourse.split(/[^a-z0-9]+/).filter(w => w.length > 3);
  let score = 0;
  for (const word of words) {
    for (const keyword of keywords) {
      if (keyword.length <= 3) continue;
      if (word === keyword) score += 10;
      else if (word.startsWith(keyword) || keyword.startsWith(word)) score += 4;
    }
  }
  return score;
}

/**
 * Find the best existing class match for a raw Canvas course name.
 * Returns the matching class, or null if nothing scored highly enough.
 */
export function matchClassForCourse(courseName, classes) {
  if (!courseName || !classes || classes.length === 0) return null;

  let best = null;
  let bestScore = 0;
  for (const cls of classes) {
    const score = scoreClassMatch(courseName, cls);
    if (score > bestScore) {
      bestScore = score;
      best = cls;
    }
  }

  return bestScore >= 10 ? best : null;
}

/**
 * Parse a pasted Canvas "To Do List" export into structured assignment rows.
 * Only "Assignment" entries are extracted; Calendar Events are skipped.
 *
 * Each returned row: { title, url, points, courseName, dueDate (ISO), classId, className, raw }
 */
export function parseCanvasTodoList(text, classes = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const results = [];

  let currentDate = null;
  let currentCourseName = null;
  let awaitingKind = null; // 'assignment' | 'event' | null
  let pendingTitle = null;
  let pendingUrl = null;
  let pendingPoints = null;

  const resetPending = () => {
    awaitingKind = null;
    pendingTitle = null;
    pendingUrl = null;
    pendingPoints = null;
  };

  for (const line of lines) {
    // Date header
    if (isDateHeaderLine(line)) {
      const date = parseHeaderDate(line, today);
      if (date) {
        currentDate = date;
        currentCourseName = null;
        resetPending();
        continue;
      }
    }

    if (/^nothing planned yet$/i.test(line)) {
      currentCourseName = null;
      resetPending();
      continue;
    }

    // Numbered item declaration, e.g. "1. EDU S997: Field Experience Assignment"
    const itemMatch = line.match(/^\d+\.\s+(.+)$/);
    if (itemMatch) {
      const desc = itemMatch[1];
      if (/calendar event$/i.test(desc)) {
        awaitingKind = 'event';
      } else if (/assignment$/i.test(desc) || /quiz$/i.test(desc) || /discussion$/i.test(desc)) {
        awaitingKind = 'assignment';
      } else {
        awaitingKind = 'assignment';
      }
      pendingTitle = null;
      pendingUrl = null;
      pendingPoints = null;
      continue;
    }

    // Points, e.g. "1 pts"
    const ptsMatch = line.match(/^(\d+)\s*pts?$/i);
    if (ptsMatch) {
      pendingPoints = parseInt(ptsMatch[1], 10);
      continue;
    }

    // Due line finalizes an assignment
    if (/^due:/i.test(line)) {
      if (awaitingKind === 'assignment' && currentDate) {
        results.push({
          title: pendingTitle || currentCourseName || 'Untitled assignment',
          url: pendingUrl || null,
          points: pendingPoints,
          courseName: currentCourseName,
          dueDate: toISODate(currentDate),
          raw: line,
        });
      }
      resetPending();
      continue;
    }

    // Markdown link line: either the course header or an assignment title
    const link = stripMarkdownLink(line);
    if (link) {
      if (awaitingKind === 'assignment' && !pendingTitle) {
        pendingTitle = link.label;
        pendingUrl = link.url;
      } else {
        currentCourseName = link.label;
      }
      continue;
    }

    // Anything else (event time ranges, locations, repeated course names) is ignored
  }

  // Attach class matches
  return results.map(item => {
    const matched = item.courseName ? matchClassForCourse(item.courseName, classes) : null;
    return {
      ...item,
      classId: matched ? matched.id : null,
      className: matched ? matched.name : item.courseName,
    };
  });
}
