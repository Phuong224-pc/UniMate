import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  extractCleanCourseCode, 
  getNextSemesters, 
  VLU_SHIFTS, 
  VLU_BREAKS 
} from '../src/services/scheduleRoadmapService.js';

test('scheduleRoadmapService: extractCleanCourseCode strips messy prefixes and suffixes', () => {
  assert.equal(extractCleanCourseCode(': 71ITSE41003 - Nhập môn CNPM'), '71ITSE41003');
  assert.equal(extractCleanCourseCode('71ITBS10103'), '71ITBS10103');
  assert.equal(extractCleanCourseCode('HP: 71ITIN40304'), '71ITIN40304');
  assert.equal(extractCleanCourseCode(''), '');
});

test('scheduleRoadmapService: getNextSemesters generates correct 3-term VLU progression', () => {
  const list = getNextSemesters('2026-2027 HK02', 4);
  assert.equal(list.length, 4);
  assert.equal(list[0].semester, '2026-2027 HK02');
  assert.equal(list[1].semester, '2026-2027 HK03');
  assert.equal(list[2].semester, '2027-2028 HK01');
  assert.equal(list[3].semester, '2027-2028 HK02');
});

test('scheduleRoadmapService: VLU shifts and break intervals meet specifications', () => {
  assert.equal(VLU_SHIFTS.length, 5);
  assert.equal(VLU_SHIFTS[0].startTime, '07:00');
  assert.equal(VLU_SHIFTS[0].endTime, '09:25');
  assert.equal(VLU_SHIFTS[1].startTime, '09:35');
  assert.equal(VLU_SHIFTS[1].endTime, '12:00');
  assert.equal(VLU_BREAKS.lunchBreak.start, '12:00');
  assert.equal(VLU_BREAKS.lunchBreak.end, '13:00');
  assert.equal(VLU_SHIFTS[4].startTime, '18:05');
  assert.equal(VLU_SHIFTS[4].endTime, '21:10');
});
