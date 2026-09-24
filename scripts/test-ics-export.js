/**
 * Validation test for ICS calendar export
 * Verifies that exported .ics files contain proper VEVENT all-day calendar events
 */

import ICAL from 'ical.js';
import { generateCalendarICS } from '../src/utils/icsExport.js';

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

function validateCalendarExport() {
  const timezone = process.env.TZ || 'System';
  console.log(`🧪 Testing ICS calendar export (Timezone: ${timezone})...\n`);
  
  // Generate ICS
  const icsContent = generateCalendarICS(sampleAssignments);
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
  const vevents = comp.getAllSubcomponents('vevent');
  
  console.log(`Found ${vevents.length} VEVENT components (expected ${sampleAssignments.length})`);
  
  if (vevents.length !== sampleAssignments.length) {
    console.error(`❌ Expected ${sampleAssignments.length} events, got ${vevents.length}`);
    process.exit(1);
  }
  console.log('✓ Correct number of events\n');
  
  // Expected DTEND values (next calendar day after DTSTART)
  const expectedEnds = {
    '2026-09-26': '2026-09-27',
    '2026-09-27': '2026-09-28',
    '2026-09-30': '2026-10-01', // Month rollover
    '2026-10-01': '2026-10-02',
    '2026-12-31': '2027-01-01'  // Year rollover
  };
  
  // Validate each event
  vevents.forEach((vevent, i) => {
    const assignment = sampleAssignments[i];
    const event = new ICAL.Event(vevent);
    
    console.log(`Event ${i + 1}: ${event.summary}`);
    
    // Check summary includes title and class
    const expectedSummary = assignment.className 
      ? `${assignment.title} (${assignment.className})`
      : assignment.title;
    
    if (event.summary !== expectedSummary) {
      console.error(`  ❌ Summary mismatch: got "${event.summary}", expected "${expectedSummary}"`);
      process.exit(1);
    }
    console.log(`  ✓ Summary: "${event.summary}"`);
    
    // Check it's an all-day event
    if (!event.startDate.isDate) {
      console.error(`  ❌ Not an all-day event (has time component)`);
      process.exit(1);
    }
    console.log(`  ✓ All-day event`);
    
    // Check DTSTART matches
    const eventDate = event.startDate.toString(); // YYYY-MM-DD format
    if (eventDate !== assignment.dueDate) {
      console.error(`  ❌ Start date mismatch: got "${eventDate}", expected "${assignment.dueDate}"`);
      process.exit(1);
    }
    console.log(`  ✓ Start date: ${eventDate}`);
    
    // Check DTEND is next calendar day (critical for timezone bug)
    const eventEndDate = event.endDate.toString();
    const expectedEndDate = expectedEnds[assignment.dueDate];
    if (eventEndDate !== expectedEndDate) {
      console.error(`  ❌ End date mismatch: got "${eventEndDate}", expected "${expectedEndDate}"`);
      console.error(`     (This indicates a timezone bug in DTEND calculation)`);
      process.exit(1);
    }
    console.log(`  ✓ End date: ${eventEndDate} (correctly rolled over)`);
    
    // Check UID is stable
    const expectedUidPrefix = `assignment-${assignment.id}@studybuddy.app`;
    if (event.uid !== expectedUidPrefix) {
      console.error(`  ❌ UID mismatch: got "${event.uid}", expected "${expectedUidPrefix}"`);
      process.exit(1);
    }
    console.log(`  ✓ Stable UID: ${event.uid}`);
    
    // Check category if present
    if (assignment.type) {
      const categories = vevent.getFirstPropertyValue('categories');
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

// Run validation
try {
  validateCalendarExport();
  console.log('✅ Test completed successfully');
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
