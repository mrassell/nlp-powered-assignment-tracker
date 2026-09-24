/**
 * Validation test for Google Calendar URL generation
 * Verifies correct dates, encoding, and timezone-safety
 */

import { generateGoogleCalendarURL } from '../src/utils/googleCalendar.js';

// Sample assignments including edge cases
const sampleAssignments = [
  {
    id: 'test-1',
    title: 'Calculus Homework 1',
    className: 'Calculus',
    dueDate: '2026-09-26',
    description: 'Chapter 3 problems'
  },
  {
    id: 'test-2',
    title: 'Essay Draft',
    className: 'English 101',
    dueDate: '2026-09-27'
  },
  {
    id: 'test-3',
    title: 'Month Rollover Test',
    className: 'Chemistry',
    dueDate: '2026-09-30'
  },
  {
    id: 'test-4',
    title: 'Year Rollover Test',
    dueDate: '2026-12-31'
  },
  {
    id: 'test-5',
    title: 'Title with special & chars # test',
    className: 'CS & Math',
    dueDate: '2026-10-01',
    description: 'Details with & and # symbols'
  }
];

function validateGoogleCalendarURLs() {
  const timezone = process.env.TZ || 'System';
  console.log(`🧪 Testing Google Calendar URL generation (Timezone: ${timezone})...\n`);

  // Expected date ranges (start/end for all-day events)
  const expectedDates = {
    '2026-09-26': '20260926/20260927',
    '2026-09-27': '20260927/20260928',
    '2026-09-30': '20260930/20261001', // Month rollover
    '2026-12-31': '20261231/20270101', // Year rollover
    '2026-10-01': '20261001/20261002'
  };

  sampleAssignments.forEach((assignment, i) => {
    console.log(`Test ${i + 1}: ${assignment.title}`);

    // Generate URL
    let url;
    try {
      url = generateGoogleCalendarURL(assignment);
    } catch (error) {
      console.error(`  ❌ Failed to generate URL: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ✓ URL generated`);

    // Parse URL
    const urlObj = new URL(url);
    
    // Check base URL
    if (!url.startsWith('https://calendar.google.com/calendar/render?')) {
      console.error(`  ❌ Invalid base URL: ${url}`);
      process.exit(1);
    }
    console.log(`  ✓ Correct base URL`);

    // Check action parameter
    const action = urlObj.searchParams.get('action');
    if (action !== 'TEMPLATE') {
      console.error(`  ❌ Wrong action: got "${action}", expected "TEMPLATE"`);
      process.exit(1);
    }
    console.log(`  ✓ Action: TEMPLATE`);

    // Check title (text parameter)
    const expectedTitle = assignment.className 
      ? `${assignment.title} (${assignment.className})`
      : assignment.title;
    const text = urlObj.searchParams.get('text');
    if (text !== expectedTitle) {
      console.error(`  ❌ Title mismatch: got "${text}", expected "${expectedTitle}"`);
      process.exit(1);
    }
    console.log(`  ✓ Title: "${text}"`);

    // Check dates (critical for timezone bug)
    const dates = urlObj.searchParams.get('dates');
    const expectedDate = expectedDates[assignment.dueDate];
    if (dates !== expectedDate) {
      console.error(`  ❌ Dates mismatch: got "${dates}", expected "${expectedDate}"`);
      console.error(`     (This indicates a timezone bug in date calculation)`);
      process.exit(1);
    }
    console.log(`  ✓ Dates: ${dates} (correctly rolled over)`);

    // Check description if present
    if (assignment.description) {
      const details = urlObj.searchParams.get('details');
      if (details !== assignment.description) {
        console.error(`  ❌ Details mismatch: got "${details}", expected "${assignment.description}"`);
        process.exit(1);
      }
      console.log(`  ✓ Details: "${details}"`);
    }

    // Verify URL encoding (check for special characters)
    if (assignment.title.includes('&') || assignment.title.includes('#')) {
      if (url.includes('&amp;') || url.includes('%23') === false && assignment.title.includes('#')) {
        console.error(`  ❌ Special characters not properly encoded`);
        process.exit(1);
      }
      console.log(`  ✓ Special characters properly encoded`);
    }

    console.log('');
  });

  console.log('✅ All tests passed!\n');
}

// Run validation
try {
  validateGoogleCalendarURLs();
  console.log('✅ Test completed successfully');
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
