/**
 * Validation test for ICS calendar export
 * Verifies that exported .ics files contain proper VEVENT all-day calendar events
 */

import ICAL from 'ical.js';
import { generateCalendarICS } from './src/utils/icsExport.js';

// Sample assignments for testing
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
  }
];

function validateCalendarExport() {
  console.log('🧪 Testing ICS calendar export...\n');
  
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
    
    // Check date matches
    const eventDate = event.startDate.toString(); // YYYY-MM-DD format
    if (eventDate !== assignment.dueDate) {
      console.error(`  ❌ Date mismatch: got "${eventDate}", expected "${assignment.dueDate}"`);
      process.exit(1);
    }
    console.log(`  ✓ Date: ${eventDate}`);
    
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
  console.log('Sample ICS output:');
  console.log('═'.repeat(60));
  console.log(icsContent);
  console.log('═'.repeat(60));
  
  return icsContent;
}

// Run validation
try {
  const icsContent = validateCalendarExport();
  
  // Write sample ICS to file
  import('fs').then(fs => {
    fs.writeFileSync('sample-calendar-export.ics', icsContent);
    console.log('\n✓ Sample ICS saved to sample-calendar-export.ics');
  });
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
