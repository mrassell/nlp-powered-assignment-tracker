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
 * Flexible date parser used by the Brightspace and generic fallback parsers.
 * Handles: "Mon D, YYYY", "Sept. 30, 2026", "Monday, Sep 30, 2026", "Mon D" (no
 * year — inferred), "M/D/YYYY", "M/D", and ISO "YYYY-MM-DD". Time components
 * are ignored — reminders are date-only.
 */
function parseFlexibleDate(text, today) {
  const cleaned = text.trim().replace(/^[A-Za-z]+day,?\s+/i, '');

  // "Sep 30, 2026" / "September 30 2026" / "Sept. 30, 2026"
  let m = cleaned.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m) {
    const monthNum = MONTHS[m[1].toLowerCase()];
    if (monthNum !== undefined) {
      return new Date(parseInt(m[3], 10), monthNum, parseInt(m[2], 10));
    }
  }

  // "Sep 30" (no year)
  m = cleaned.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (m) {
    const monthNum = MONTHS[m[1].toLowerCase()];
    if (monthNum !== undefined) {
      return buildDate(monthNum, parseInt(m[2], 10), today);
    }
  }

  // "9/30/2026", "9/30/26", "9/30"
  m = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) {
    const month = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    let year = m[3] ? parseInt(m[3], 10) : today.getFullYear();
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!m[3] && date < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  // ISO "2026-09-30"
  m = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  return null;
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

    // Item declaration, e.g. "1. EDU S997: Field Experience Assignment" — the
    // leading number is optional since some Canvas exports omit it.
    const itemMatch = line.match(/^(?:\d+\.\s+)?(.+(?:assignment|quiz|discussion|calendar event))$/i);
    if (itemMatch) {
      const desc = itemMatch[1];
      awaitingKind = /calendar event$/i.test(desc) ? 'event' : 'assignment';
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

    // Due line finalizes an assignment — accepts "Due:", "Due on", "Due by", "Due Date:"
    const dueMatch = line.match(/^due(?:\s*(?:on|by|date)?\s*:?)\s*(.*)$/i);
    if (dueMatch) {
      // If we have an explicit date on this line, prefer it over the date header
      // (some exports repeat the full date next to "Due" instead of relying on
      // the day header above).
      const explicitDate = dueMatch[1] ? parseFlexibleDate(dueMatch[1], today) : null;
      const effectiveDate = explicitDate || currentDate;

      if (awaitingKind === 'assignment' && effectiveDate) {
        results.push({
          title: pendingTitle || currentCourseName || 'Untitled assignment',
          url: pendingUrl || null,
          points: pendingPoints,
          courseName: currentCourseName,
          dueDate: toISODate(effectiveDate),
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

/**
 * Parse a pasted Brightspace "To Do" / grades list into structured assignment rows.
 * Format: a title line, then "Due on <date> <time>", then an "Available on ... until ..."
 * line (ignored — not the due date) and an optional score line like "0 / 1" (ignored).
 * Brightspace pastes don't carry a course name, so classId/className come back null.
 *
 * Each returned row: { title, url, points, courseName, dueDate (ISO), classId, className, raw }
 */
export function parseBrightspaceTodoList(text) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = [];

  let pendingTitle = null;

  for (const line of lines) {
    if (/^available/i.test(line)) continue;
    if (/^\d+\s*\/\s*\d+$/.test(line)) continue; // score, e.g. "0 / 1"

    const dueMatch = line.match(/^due(?:\s*(?:on|by|date)?\s*:?)\s+(.+)$/i);
    if (dueMatch) {
      const date = parseFlexibleDate(dueMatch[1], today);
      if (date && pendingTitle) {
        results.push({
          title: pendingTitle,
          url: null,
          points: null,
          courseName: null,
          dueDate: toISODate(date),
          raw: line,
        });
      }
      pendingTitle = null;
      continue;
    }

    // Any other non-empty line is a title candidate — the one immediately
    // preceding "Due on ..." is the one that gets used.
    pendingTitle = line;
  }

  return results.map(item => ({
    ...item,
    classId: null,
    className: null,
  }));
}

/**
 * Last-resort fallback for to-do formats that don't match the strict Canvas or
 * Brightspace shapes. Any line containing "due" followed by a recognizable
 * date is treated as finalizing an assignment, using the nearest preceding
 * non-empty, non-availability, non-score line as the title. Looser than the
 * dedicated parsers, so it's only used when they find nothing.
 */
export function parseGenericTodoList(text) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = [];

  let pendingTitle = null;

  for (const line of lines) {
    if (/^available/i.test(line)) continue;
    if (/^\d+\s*\/\s*\d+$/.test(line)) continue; // score, e.g. "0 / 1"
    if (/^nothing planned yet$/i.test(line)) continue;

    const dueMatch = line.match(/\bdue\b(?:\s*(?:on|by|date)?\s*:?)\s*(.*)$/i);
    if (dueMatch && dueMatch[1]) {
      const date = parseFlexibleDate(dueMatch[1], today);
      if (date && pendingTitle) {
        results.push({
          title: pendingTitle,
          url: null,
          points: null,
          courseName: null,
          dueDate: toISODate(date),
          raw: line,
        });
        pendingTitle = null;
        continue;
      }
    }

    const link = stripMarkdownLink(line);
    pendingTitle = link ? link.label : line;
  }

  return results.map(item => ({
    ...item,
    classId: null,
    className: null,
  }));
}

/**
 * Parse a pasted bulk to-do list, auto-detecting the source format
 * (Canvas, then Brightspace, then a generic date-scanning fallback).
 */
export function parseBulkTodoList(text, classes = []) {
  const canvasResults = parseCanvasTodoList(text, classes);
  if (canvasResults.length > 0) return canvasResults;

  const brightspaceResults = parseBrightspaceTodoList(text);
  if (brightspaceResults.length > 0) return brightspaceResults;

  return parseGenericTodoList(text);
}
