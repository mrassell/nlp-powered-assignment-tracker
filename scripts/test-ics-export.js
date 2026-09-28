/**
 * Validation test for ICS Reminders export
 * Verifies that exported .ics files contain VTODO items (not VEVENT calendar
 * events) with a plain due date, so they land in Apple Reminders.
 */

import ICAL from 'ical.js';
import { generateRemindersICS } from '../src/utils/icsExport.js';

// Sample assignments for testing (including month and year rollovers)
const sampleAssignments = [
  {
    id: 'test-1',
    title: 'Calculus Homework 1',
    className: 'Calculus',
    type: 'Homework',
    dueDate: '2026-09-26',
    status: 'pending',
    completed: false,
    description: 'Chapter 3 problems'
  },
  {
    id: 'test-2',
    title: 'Essay Draft',
    className: 'English 101',
    type: 'Essay',
    dueDate: '2026-09-27',
    status: 'in_progress',
    completed: false
  },
  {
    id: 'test-3',
    title: 'Lab Report',
    className: 'Chemistry',
    type: 'Lab',
    dueDate: '2026-09-30',
    status: 'completed',
    completed: true
  },
  {
    id: 'test-4',
    title: 'Untitled Assignment',
    dueDate: '2026-10-01',
    status: 'pending',
    completed: false
  },
  {
    id: 'test-5',
    title: 'End of Year Project',
    className: 'Computer Science',
    type: 'Project',
    dueDate: '2026-12-31',
    status: 'pending',
    completed: false
  }
];

function validateRemindersExport() {
  console.log('🧪 Testing ICS Reminders export...\n');

  // Generate ICS
  const icsContent = generateRemindersICS(sampleAssignments);
  console.log('✓ Generated ICS content\n');

  // Parse with ical.js
  let jCalData;
  try {
    jCalData = ICAL.parse(icsContent);
  } catch (error) {
    console.error('❌ Failed to parse ICS:', error.message);
    process.exit(1);
  }
  console.log('✓ ICS parses successfully\n');

  const comp = new ICAL.Component(jCalData);
  const vtodos = comp.getAllSubcomponents('vtodo');

  console.log(`Found ${vtodos.length} VTODO components (expected ${sampleAssignments.length})`);

  if (vtodos.length !== sampleAssignments.length) {
    console.error(`❌ Expected ${sampleAssignments.length} VTODO items, got ${vtodos.length}`);
    process.exit(1);
  }
  console.log('✓ Correct number of reminders\n');

  // Reject any VEVENT — reminders must not be calendar events
  const vevents = comp.getAllSubcomponents('vevent');
  if (vevents.length > 0) {
    console.error(`❌ Found ${vevents.length} VEVENT components — reminders should be VTODO, not calendar events`);
    process.exit(1);
  }
  console.log('✓ No VEVENT components present\n');

  vtodos.forEach((vtodo, i) => {
    const assignment = sampleAssignments[i];

    const summary = vtodo.getFirstPropertyValue('summary');
    const expectedSummary = assignment.className
      ? `${assignment.title} (${assignment.className})`
      : assignment.title;

    console.log(`Reminder ${i + 1}: ${summary}`);

    if (summary !== expectedSummary) {
      console.error(`  ❌ Summary mismatch: got "${summary}", expected "${expectedSummary}"`);
      process.exit(1);
    }
    console.log(`  ✓ Summary: "${summary}"`);

    // DUE should be a date-only value (no time component)
    const dueProp = vtodo.getFirstProperty('due');
    const dueValue = dueProp.getFirstValue();
    if (!dueValue.isDate) {
      console.error('  ❌ DUE has a time component — reminders must be date-only');
      process.exit(1);
    }
    const dueDateStr = dueValue.toString();
    if (dueDateStr !== assignment.dueDate) {
      console.error(`  ❌ Due date mismatch: got "${dueDateStr}", expected "${assignment.dueDate}"`);
      process.exit(1);
    }
    console.log(`  ✓ Due date (no time): ${dueDateStr}`);

    // Status should map pending/in_progress -> NEEDS-ACTION, completed -> COMPLETED
    const status = vtodo.getFirstPropertyValue('status');
    const expectedStatus = assignment.status === 'completed' || assignment.completed ? 'COMPLETED' : 'NEEDS-ACTION';
    if (status !== expectedStatus) {
      console.error(`  ❌ Status mismatch: got "${status}", expected "${expectedStatus}"`);
      process.exit(1);
    }
    console.log(`  ✓ Status: ${status}`);

    // Stable UID
    const uid = vtodo.getFirstPropertyValue('uid');
    const expectedUid = `assignment-${assignment.id}@deadline-tracker.app`;
    if (uid !== expectedUid) {
      console.error(`  ❌ UID mismatch: got "${uid}", expected "${expectedUid}"`);
      process.exit(1);
    }
    console.log(`  ✓ Stable UID: ${uid}`);

    if (assignment.type) {
      const categories = vtodo.getFirstPropertyValue('categories');
      if (categories !== assignment.type) {
        console.error(`  ❌ Category mismatch: got "${categories}", expected "${assignment.type}"`);
        process.exit(1);
      }
      console.log(`  ✓ Category: ${categories}`);
    }

    console.log('');
  });

  console.log('✅ All tests passed!\n');

  return icsContent;
}

try {
  validateRemindersExport();
  console.log('✅ Test completed successfully');
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
