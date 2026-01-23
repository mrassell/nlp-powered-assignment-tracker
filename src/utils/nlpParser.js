/**
 * NLP Parser for Assignment Input
 * Parses shorthand like "pred ana hw 1 2/22" into structured data
 */

// Common assignment type patterns
const ASSIGNMENT_TYPES = {
  homework: ['hw', 'homework', 'homwork', 'hmwk', 'hmw', 'assignment', 'assgn', 'asgn', 'asgmt'],
  quiz: ['quiz', 'qz', 'quizz', 'pop quiz'],
  exam: ['exam', 'exm', 'midterm', 'mid', 'final', 'finals', 'test', 'tst'],
  project: ['project', 'proj', 'prj', 'pjt'],
  lab: ['lab', 'laboratory', 'labwork'],
  reading: ['reading', 'read', 'rd', 'chapter', 'chap', 'ch'],
  paper: ['paper', 'essay', 'report', 'rpt', 'write', 'writing'],
  presentation: ['presentation', 'pres', 'present', 'ppt', 'slides'],
  discussion: ['discussion', 'disc', 'db', 'post', 'forum'],
  worksheet: ['worksheet', 'ws', 'wksht', 'workbook'],
  practice: ['practice', 'prac', 'exercise', 'ex', 'exercises'],
};

// Date parsing patterns
const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const DAYS_OF_WEEK = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/**
 * Generate keyword variations for a class name
 */
export function generateKeywords(className) {
  const keywords = new Set();
  const lower = className.toLowerCase();
  
  // Full name
  keywords.add(lower);
  
  // Individual words
  const words = lower.split(/\s+/);
  words.forEach(word => {
    if (word.length > 2) keywords.add(word);
  });
  
  // First letters of each word (acronym)
  if (words.length > 1) {
    keywords.add(words.map(w => w[0]).join(''));
  }
  
  // First 3-4 letters of each significant word
  words.forEach(word => {
    if (word.length > 3) {
      keywords.add(word.substring(0, 3));
      keywords.add(word.substring(0, 4));
    }
  });
  
  // Common abbreviation patterns
  const abbrevPatterns = [
    // First word + first letter of rest
    words[0] + (words.slice(1).map(w => w[0]).join('')),
    // First 3 of first + first 3 of second
    words.length > 1 ? words[0].substring(0, 3) + words[1].substring(0, 3) : null,
    // Consonants only
    lower.replace(/[aeiou\s]/g, '').substring(0, 6),
  ].filter(Boolean);
  
  abbrevPatterns.forEach(p => {
    if (p.length >= 2) keywords.add(p);
  });
  
  return Array.from(keywords);
}

/**
 * Parse a date string into a Date object
 */
function parseDate(input) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lower = input.toLowerCase().trim();
  
  // Relative dates
  if (lower === 'today' || lower === 'tdy' || lower === '2day') {
    return today;
  }
  
  if (lower === 'tomorrow' || lower === 'tmrw' || lower === 'tmr' || lower === '2moro' || lower === 'tom') {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return date;
  }
  
  // "next week", "next mon", etc.
  const nextMatch = lower.match(/^next\s+(\w+)$/);
  if (nextMatch) {
    const dayOrWeek = nextMatch[1];
    if (dayOrWeek === 'week') {
      const date = new Date(today);
      date.setDate(date.getDate() + 7);
      return date;
    }
    if (DAYS_OF_WEEK[dayOrWeek] !== undefined) {
      const targetDay = DAYS_OF_WEEK[dayOrWeek];
      const date = new Date(today);
      const currentDay = date.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      daysToAdd += 7; // "next" means the following week
      date.setDate(date.getDate() + daysToAdd);
      return date;
    }
  }
  
  // Day of week (this week or next occurrence)
  for (const [dayName, dayNum] of Object.entries(DAYS_OF_WEEK)) {
    if (lower === dayName || lower.startsWith(dayName)) {
      const date = new Date(today);
      const currentDay = date.getDay();
      let daysToAdd = dayNum - currentDay;
      if (daysToAdd < 0) daysToAdd += 7;
      if (daysToAdd === 0) daysToAdd = 7; // If today, assume next week
      date.setDate(date.getDate() + daysToAdd);
      return date;
    }
  }
  
  // MM/DD or M/D format (e.g., 2/4, 02/04, 2/4/25)
  const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]) - 1;
    const day = parseInt(slashMatch[2]);
    let year = slashMatch[3] ? parseInt(slashMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    
    const date = new Date(year, month, day);
    // If date is in the past, assume next year
    if (date < today && !slashMatch[3]) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }
  
  // MM-DD or M-D format
  const dashMatch = input.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?$/);
  if (dashMatch) {
    const month = parseInt(dashMatch[1]) - 1;
    const day = parseInt(dashMatch[2]);
    let year = dashMatch[3] ? parseInt(dashMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    
    const date = new Date(year, month, day);
    if (date < today && !dashMatch[3]) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }
  
  // "Feb 4", "February 4", "feb4" (no space)
  for (const [monthName, monthNum] of Object.entries(MONTHS)) {
    // With space: "feb 4", "february 22"
    const regex1 = new RegExp(`^${monthName}\\w*\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{2,4}))?$`, 'i');
    // Without space: "feb4"
    const regex2 = new RegExp(`^${monthName}(\\d{1,2})$`, 'i');
    // Reversed: "4 feb", "22 february"
    const regex3 = new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthName}\\w*(?:\\s+(\\d{2,4}))?$`, 'i');
    
    let match = lower.match(regex1) || lower.match(regex2) || lower.match(regex3);
    if (match) {
      const day = parseInt(match[1]);
      let year = match[2] ? parseInt(match[2]) : today.getFullYear();
      if (year < 100) year += 2000;
      
      const date = new Date(year, monthNum, day);
      if (date < today && !match[2]) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
  }
  
  // "in X days"
  const inDaysMatch = lower.match(/^in\s+(\d+)\s+days?$/);
  if (inDaysMatch) {
    const date = new Date(today);
    date.setDate(date.getDate() + parseInt(inDaysMatch[1]));
    return date;
  }
  
  return null;
}

/**
 * Find the best matching class for the input
 */
function findClass(tokens, classes) {
  if (!classes || classes.length === 0) return { class: null, matchedIndices: [] };
  
  let bestMatch = null;
  let bestScore = 0;
  let matchedTokenIndices = [];
  
  const inputLower = tokens.map(t => t.toLowerCase());
  
  for (const cls of classes) {
    const keywords = cls.keywords || generateKeywords(cls.name);
    
    for (let i = 0; i < inputLower.length; i++) {
      const token = inputLower[i];
      
      // Check single token match
      for (const keyword of keywords) {
        if (token === keyword || 
            token.startsWith(keyword) || 
            keyword.startsWith(token) ||
            levenshteinDistance(token, keyword) <= 1) {
          const score = keyword.length + (token === keyword ? 10 : 0);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = cls;
            matchedTokenIndices = [i];
          }
        }
      }
      
      // Check two-token combinations
      if (i < inputLower.length - 1) {
        const twoToken = inputLower[i] + inputLower[i + 1];
        const twoTokenSpace = inputLower[i] + ' ' + inputLower[i + 1];
        
        for (const keyword of keywords) {
          if (twoToken === keyword.replace(/\s/g, '') || 
              twoTokenSpace === keyword ||
              keyword.includes(twoTokenSpace)) {
            const score = keyword.length + 15;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = cls;
              matchedTokenIndices = [i, i + 1];
            }
          }
        }
      }
    }
  }
  
  return { class: bestMatch, matchedIndices: matchedTokenIndices };
}

/**
 * Find assignment type from tokens
 */
function findAssignmentType(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();
    
    for (const [type, patterns] of Object.entries(ASSIGNMENT_TYPES)) {
      for (const pattern of patterns) {
        if (token === pattern || token.startsWith(pattern)) {
          return { type, index: i, displayName: capitalizeFirst(type) };
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract number/identifier from tokens
 */
function findNumber(tokens, excludeIndices = []) {
  for (let i = 0; i < tokens.length; i++) {
    if (excludeIndices.includes(i)) continue;
    
    const token = tokens[i];
    // Match pure numbers or numbers with # prefix
    if (/^#?\d+$/.test(token)) {
      return { number: token.replace('#', ''), index: i };
    }
    // Match "ch1", "chapter5", etc.
    const numMatch = token.match(/(\d+)$/);
    if (numMatch && token.length <= 10) {
      return { number: numMatch[1], index: i };
    }
  }
  
  return null;
}

/**
 * Find date in tokens - improved version
 */
function findDate(tokens, excludeIndices = []) {
  // Try each token individually first for simple dates like "2/4"
  for (let i = 0; i < tokens.length; i++) {
    if (excludeIndices.includes(i)) continue;
    
    const date = parseDate(tokens[i]);
    if (date) {
      return { date, indices: [i] };
    }
  }
  
  // Try two-token combinations (e.g., "feb 4", "next monday")
  for (let i = 0; i < tokens.length - 1; i++) {
    if (excludeIndices.includes(i) || excludeIndices.includes(i + 1)) continue;
    
    const twoToken = tokens[i] + ' ' + tokens[i + 1];
    const date = parseDate(twoToken);
    if (date) {
      return { date, indices: [i, i + 1] };
    }
  }
  
  // Try token without space for things like "feb4"
  for (let i = 0; i < tokens.length; i++) {
    if (excludeIndices.includes(i)) continue;
    
    // Check if token might be a month+day combo
    const token = tokens[i].toLowerCase();
    for (const monthName of Object.keys(MONTHS)) {
      if (token.startsWith(monthName) && token.length > monthName.length) {
        const date = parseDate(token);
        if (date) {
          return { date, indices: [i] };
        }
      }
    }
  }
  
  return null;
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Main parsing function
 */
export function parseAssignmentInput(input, classes = []) {
  const result = {
    raw: input,
    title: '',
    classId: null,
    className: null,
    type: null,
    number: null,
    dueDate: null,
    confidence: 0,
    parsed: {
      class: null,
      type: null,
      number: null,
      date: null,
    }
  };
  
  if (!input || !input.trim()) return result;
  
  // Tokenize - split on spaces but keep date-like patterns together
  const tokens = input.trim().split(/\s+/);
  const usedIndices = new Set();
  
  // 1. Find date FIRST (higher priority)
  const dateMatch = findDate(tokens, []);
  if (dateMatch) {
    result.dueDate = dateMatch.date.toISOString().split('T')[0];
    result.parsed.date = dateMatch.date;
    dateMatch.indices.forEach(i => usedIndices.add(i));
    result.confidence += 25;
  }
  
  // 2. Find class match
  const classMatch = findClass(tokens, classes);
  if (classMatch.class) {
    result.classId = classMatch.class.id;
    result.className = classMatch.class.name;
    result.parsed.class = classMatch.class.name;
    classMatch.matchedIndices.forEach(i => usedIndices.add(i));
    result.confidence += 30;
  }
  
  // 3. Find assignment type
  const typeMatch = findAssignmentType(tokens);
  if (typeMatch) {
    result.type = typeMatch.displayName;
    result.parsed.type = typeMatch.displayName;
    usedIndices.add(typeMatch.index);
    result.confidence += 25;
  }
  
  // 4. Find number
  const numberMatch = findNumber(tokens, Array.from(usedIndices));
  if (numberMatch) {
    result.number = numberMatch.number;
    result.parsed.number = numberMatch.number;
    usedIndices.add(numberMatch.index);
    result.confidence += 20;
  }
  
  // 5. Build title - Show the TASK DESCRIPTION, not the class name
  // Get all tokens that aren't date or class (keep type, number, and description words)
  const titleTokens = tokens.filter((_, i) => {
    // Exclude date tokens
    if (dateMatch && dateMatch.indices.includes(i)) return false;
    // Exclude class match tokens (class shown in separate column)
    if (classMatch.matchedIndices && classMatch.matchedIndices.includes(i)) return false;
    return true;
  });
  
  if (titleTokens.length > 0) {
    // Join remaining tokens and capitalize first letter
    const rawTitle = titleTokens.join(' ');
    result.title = capitalizeFirst(rawTitle);
  } else {
    // Fallback: if everything was parsed out, build from type + number
    const fallbackParts = [];
    if (result.type) fallbackParts.push(result.type);
    if (result.number) fallbackParts.push(`#${result.number}`);
    result.title = fallbackParts.length > 0 
      ? fallbackParts.join(' ') 
      : capitalizeFirst(input.trim());
  }
  
  return result;
}

/**
 * Format date for display
 */
export function formatDateDisplay(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format date for spreadsheet (shorter)
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric' 
  });
}

/**
 * Get days until due
 */
export function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateStr + 'T00:00:00');
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
