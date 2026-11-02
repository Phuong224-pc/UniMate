import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { calculateAcademicStats, classifyCourseResult, numericGrade } from '../src/utils/gradeUtils.js';
import { parseVluTranscriptText, extractTextFromPdf } from '../src/services/ocrService.js';
import { buildAcademicReply } from '../src/controllers/chatController.js';

const curriculum = JSON.parse(fs.readFileSync(new URL('../src/data/khungK30.json', import.meta.url), 'utf8'));
const text = fs.readFileSync(new URL('./fixtures/vlu-transcript.txt', import.meta.url), 'utf8');
const parsed = parseVluTranscriptText(text);
const courses = parsed.semesters.flatMap(s => s.courses);
const options = { curriculum, specialization: 'software', sourceTotals: parsed.sourceTotals };
const calculate = (rows = courses, overrides = {}) => calculateAcademicStats(rows, { ...options, ...overrides });
const passed = membership => ({ code: membership.code, name: membership.name, credits: membership.credits,
  score: 8, point4: 3.2, letter: 'B', status: 'Đạt', semester: '2027-2028 HK01' });
const members = curriculum.sections.flatMap(s => s.courses);

test('actual three-page PDF text yields 88 earned, 19 pending and explicit source GPA 3.28', () => {
  const result = calculate();
  assert.equal(courses.length, 45);
  assert.equal(result.earnedCredits, 88);
  assert.equal(result.totalCredits, 126);
  assert.equal(result.remainingCredits, 38);
  assert.equal(result.inProgressCredits, 19);
  assert.equal(result.inProgressCoursesCount, 7);
  assert.equal(result.sourceTotals.cumulativeCredits, 88);
  assert.equal(result.sourceTotals.cumulativeGpa4, 3.28);
  assert.equal(result.calculatedGpa4, 3.28);
  assert.deepEqual(parsed.semesters.filter(s => s.summary.earnedCredits !== undefined && s.summary.earnedCredits !== null).map(s => s.summary.earnedCredits), [12, 16, 14, 16, 14, 16]);
  assert.equal(result.discrepancies.length, 0);
  assert.ok(result.warnings.some(w => w.includes('quy tắc GPA')));
});

test('PE and defense have independent requirements outside the degree', () => {
  const result = calculate();
  assert.equal(result.physicalCredits, 4);
  assert.equal(result.defenseCredits, 11);
  for (const group of ['TC002', 'TC102', 'defense']) assert.equal(result.groups[group].complete, true);
  assert.equal(result.groups.defense.passedCoursesCount, 4);
  const noConditions = calculate(courses.filter(c => !/^71(?:PE|NAD)/.test(c.code)));
  assert.equal(noConditions.earnedCredits, result.earnedCredits);
  assert.equal(noConditions.calculatedGpa4, result.calculatedGpa4);
});

test('TC209 is 9/9 and TC309 is 3/9; ongoing Python is not earned', () => {
  const result = calculate();
  assert.equal(result.groups.TC209.earnedCredits, 9);
  assert.equal(result.groups.TC209.passedCoursesCount, 3);
  assert.equal(result.groups.TC309.earnedCredits, 3);
  assert.equal(result.groups.TC309.remainingCredits, 6);
  assert.equal(result.groups.TC309.inProgressCredits, 3);
});

test('duplicate pages and repeated imports never increase earned or pending credits', () => {
  const duplicateText = parseVluTranscriptText(text + '\n' + text);
  assert.equal(duplicateText.semesters.flatMap(s => s.courses).length, courses.length);
  const result = calculate([...courses, ...courses]);
  assert.equal(result.earnedCredits, 88);
  assert.equal(result.inProgressCredits, 19);
  assert.equal(result.calculatedGpa4, 3.28);
});

test('a retake earns a course only once and missing retake GPA policy is visible', () => {
  const original = courses.find(c => c.code === '71ITSE30403');
  const result = calculate([...courses, { ...original, score: 9.5, point4: 3.8, semester: '2027-2028 HK01' }]);
  assert.equal(result.earnedCredits, 88);
  assert.equal(result.calculatedGpa4, null);
  assert.ok(result.warnings.some(w => w.includes('học lại')));
});

test('changing one pending grade to a pass moves exactly its credits and group', () => {
  const changed = courses.map(c => c.code === '71ITSE31003' ? { ...c, score: 8.5, point4: 3.4, letter: 'B+', status: 'Đạt' } : c);
  const result = calculate(changed);
  assert.equal(result.earnedCredits, 91);
  assert.equal(result.inProgressCredits, 16);
  assert.equal(result.remainingCredits, 35);
  assert.equal(result.groups.TC309.earnedCredits, 6);
  assert.equal(result.groups.TC209.earnedCredits, 9);
});

test('two PE courses from TC002 cannot satisfy TC102', () => {
  const choices = members.filter(c => c.groupCode === 'TC002').slice(0, 2);
  assert.equal(choices.length, 2);
  const result = calculate(choices.map(passed));
  assert.equal(result.groups.TC002.earnedCredits, 2);
  assert.equal(result.groups.TC002.complete, true);
  assert.equal(result.groups.TC102.complete, false);
  assert.equal(result.physicalCredits, 2);
  assert.equal(result.earnedCredits, 0);
});

test('unselected and other branch compulsory courses never appear as missing requirements', () => {
  const result = calculate();
  assert.equal(result.groups.specializationRequired.requiredCourses, 6);
  assert.equal(result.groups.specializationRequired.missingCourseCodes.length, 5);
  assert.ok(result.courseStates.filter(c => c.locked).every(c => c.specialization !== 'software'));
  const unset = calculate(courses, { specialization: null });
  assert.equal(unset.specialization, null);
  assert.equal(unset.groups.specializationRequired.missingCourseCodes.length, 0);
  assert.equal(unset.groups.specializationRequired.complete, false);
});

test('extra TC209 credits do not compensate TC309; TC306 stays separate', () => {
  const elective209 = members.filter(c => c.groupCode === 'TC209').map(passed);
  const unconfirmed306 = members.filter(c => c.groupCode === 'TC306').map(passed);
  const result = calculate([...elective209, ...unconfirmed306]);
  assert.equal(result.groups.TC209.earnedCredits, 9);
  assert.equal(result.groups.TC309.earnedCredits, 0);
  assert.equal(result.groups.TC306.earnedCredits, 0);
  assert.equal(result.earnedCredits, 9);
});

test('graduation block accepts one six-credit project or both replacement subjects', () => {
  const choices = members.filter(c => c.groupCode === 'TC406');
  const thesis = choices.filter(c => c.credits === 6).map(passed);
  const seminars = choices.filter(c => c.credits === 3).map(passed);
  assert.equal(calculate(thesis).groups.TC406.complete, true);
  assert.equal(calculate(seminars).groups.TC406.complete, true);
  assert.equal(calculate(seminars.slice(0, 1)).groups.TC406.complete, false);
  assert.equal(calculate(seminars.slice(0, 1)).groups.TC406.earnedCredits, 3);
  assert.equal(calculate([...thesis, ...seminars]).groups.TC406.earnedCredits, 6);
});

test('source GPA is never inferred from a letter or forced onto computed totals', () => {
  const rows = [passed(members.find(c => c.groupCode === 'TC209'))];
  rows[0].point4 = null;
  const result = calculate(rows, { sourceTotals: { cumulativeCredits: 88, cumulativeGpa4: 3.28 } });
  assert.equal(result.calculatedGpa4, null);
  assert.equal(result.earnedCredits, 3);
  assert.equal(result.sourceTotals.cumulativeCredits, 88);
  assert.equal(result.discrepancies.length, 2);
  assert.equal(numericGrade(''), null);
  assert.equal(classifyCourseResult({ score: null, point4: null, status: 'Đạt' }), 'in_progress');
  assert.equal(classifyCourseResult({ score: 1, point4: 0, status: '', letter: '' }, { passScore10: null }), 'unverified');
});

test('source credits, including discrete mathematics, take precedence over code suffix', () => {
  const course = courses.find(c => c.code === '71ITMA10403');
  assert.equal(course.credits, 4);
  assert.equal(calculate([course]).earnedCredits, 4);
  const mismatch = calculate([{ ...course, credits: 3 }]);
  assert.equal(mismatch.earnedCredits, 3);
  assert.ok(mismatch.warnings.some(w => w.includes('Tín chỉ')));
});

test('AV0 exemption and zero-credit entry test never add degree credits', () => {
  const extras = courses.filter(c => ['71ENG010012', '71ENG010000'].includes(c.code));
  assert.equal(calculate(extras).earnedCredits, 0);
  assert.equal(calculate(extras).unmappedCourses.length, 2);
});

test('chat summary formats the shared result and does not introduce another calculation', () => {
  const result = calculate(), reply = buildAcademicReply(result);
  assert.ok(reply.includes('88/126'));
  assert.ok(reply.includes('19 tín chỉ'));
  assert.ok(reply.includes('3.28'));
  assert.ok(reply.includes('Chưa đủ dữ liệu để kiểm tra'));
});

test('full degree credits alone never establish graduation eligibility', () => {
  const rows = members.filter(c => !c.specialization || c.specialization === 'software').map(passed);
  const result = calculate(rows);
  assert.equal(result.earnedCredits, 126);
  assert.notEqual(result.graduation.status, 'eligible');
  assert.equal(result.graduation.message, 'Chưa đủ dữ liệu để kiểm tra');
});

test('original PDF text extraction matches stored source fixture when a path is supplied', { skip: !process.env.SAMPLE_TRANSCRIPT_PDF }, async () => {
  const extracted = await extractTextFromPdf(fs.readFileSync(process.env.SAMPLE_TRANSCRIPT_PDF));
  const source = parseVluTranscriptText(extracted);
  const result = calculate(source.semesters.flatMap(s => s.courses), { sourceTotals: source.sourceTotals });
  assert.equal(result.earnedCredits, 88);
  assert.equal(result.inProgressCredits, 19);
  assert.equal(result.calculatedGpa4, 3.28);
});
