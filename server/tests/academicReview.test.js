import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const testDirectory = mkdtempSync(path.join(tmpdir(), 'unimate-academic-review-'));
process.env.DATA_MODE = 'demo';
process.env.DEMO_DATA_PATH = path.join(testDirectory, 'store.json');
const { calculateAcademicStats } = await import('../src/utils/gradeUtils.js');
const { parseVluTranscriptText } = await import('../src/services/ocrService.js');
const { resolveStudentCurriculum } = await import('../src/services/academicService.js');
const { Curriculum } = await import('../src/models/Curriculum.js');
const { StudentProfile } = await import('../src/models/StudentProfile.js');
const { initDataProvider, curriculumRepo } = await import('../src/repositories/index.js');

before(async () => initDataProvider());
after(() => rmSync(testDirectory, { recursive: true, force: true }));

const membership = (code, extra = {}) => ({ code, name: code, credits: 3, groupCode: 'BB', required: true, ...extra });
const result = (code, extra = {}) => ({ code, name: code, credits: 3, score: 8, point4: 3.2, letter: 'B', status: 'Đạt', semester: '2024-2025 HK01', ...extra });
const program = (courses, groups, policies = {}) => ({ program: 'Generic scoped program', totalCredits: 3,
  scope: { schoolId: 'OTHER', majorCode: 'OTHER', cohort: 'A', version: 'v1' },
  rules: { groups, policies }, sections: [{ name: 'Courses', courses }] });

test('other programs do not inherit K30 specialization, elective, PE or defense requirements', () => {
  const curriculum = program([membership('C1')], { commonRequired: { requiredCredits: 3, requiredCourses: 1 } });
  const progress = calculateAcademicStats([result('C1')], { curriculum });
  assert.equal(progress.earnedCredits, 3);
  assert.equal(progress.totalCredits, 3);
  assert.deepEqual(progress.graduation.incompleteGroups, []);
  assert.ok(!progress.warnings.some(warning => /chưa chọn chuyên ngành/i.test(warning)));
  for (const group of ['TC209', 'TC309', 'TC406', 'TC002', 'TC102', 'defense', 'specializationRequired']) assert.equal(progress.groups[group].active, false);
});

test('excluded memberships never leak degree credits through a shared compulsory group', () => {
  const curriculum = program([membership('C1'), membership('X1', { countsTowardDegree: false })], { commonRequired: { requiredCredits: 3, requiredCourses: 1 } });
  const excluded = calculateAcademicStats([result('X1')], { curriculum });
  assert.equal(excluded.earnedCredits, 0);
  assert.equal(excluded.groups.commonRequired.complete, false);
  const regular = calculateAcademicStats([result('X1'), result('C1')], { curriculum });
  assert.equal(regular.earnedCredits, 3);
  assert.equal(regular.gpaCredits, 3);
});

test('one valid replacement subject earns partial graduation credits without completing its alternative', () => {
  const courses = [membership('CAPSTONE', { credits: 6, groupCode: 'TC406', required: false }), membership('TOPIC1', { groupCode: 'TC406', required: false }), membership('TOPIC2', { groupCode: 'TC406', required: false })];
  const curriculum = program(courses, { TC406: { requiredCredits: 6, options: [['CAPSTONE'], ['TOPIC1', 'TOPIC2']] } });
  const partial = calculateAcademicStats([result('TOPIC1')], { curriculum });
  assert.equal(partial.groups.TC406.complete, false);
  assert.equal(partial.groups.TC406.earnedCredits, 3);
  assert.equal(partial.groups.TC406.remainingCredits, 3);
  const both = calculateAcademicStats([result('TOPIC1'), result('TOPIC2'), result('CAPSTONE', { credits: 6 })], { curriculum });
  assert.equal(both.groups.TC406.complete, true);
  assert.equal(both.groups.TC406.earnedCredits, 6);
});

test('passing letter alone earns credits while missing numeric grade never fabricates GPA', () => {
  const curriculum = program([membership('C1')], { commonRequired: { requiredCredits: 3, requiredCourses: 1 } });
  const progress = calculateAcademicStats([result('C1', { score: null, point4: null, letter: 'B' })], { curriculum });
  assert.equal(progress.earnedCredits, 3);
  assert.equal(progress.inProgressCredits, 0);
  assert.equal(progress.calculatedGpa4, null);
  assert.ok(progress.warnings.some(warning => /thiếu điểm hệ 4/i.test(warning)));
  const pending = calculateAcademicStats([result('C1', { score: null, point4: null, letter: '', status: 'Đang học' })], { curriculum });
  assert.equal(pending.earnedCredits, 0);
  assert.equal(pending.inProgressCredits, 3);
});

test('a missing point4 in one graded course marks cumulative GPA as unverified', () => {
  const curriculum = program([membership('C1'), membership('C2')], { commonRequired: { requiredCredits: 6, requiredCourses: 2 } });
  const progress = calculateAcademicStats([result('C1'), result('C2', { point4: null })], { curriculum });
  assert.equal(progress.earnedCredits, 6);
  assert.equal(progress.calculatedGpa4, null);
});

test('other branch BB affects neither earned credits nor GPA without an explicit scoped policy', () => {
  const curriculum = program([membership('S1', { specialization: 'software' }), membership('D1', { specialization: 'data' })], { specializationRequired: { requiredCredits: 3, requiredCourses: 1 } });
  const rows = [result('S1', { point4: 4 }), result('D1', { point4: 0 })];
  const progress = calculateAcademicStats(rows, { curriculum, specialization: 'software' });
  assert.equal(progress.earnedCredits, 3);
  assert.equal(progress.gpaCredits, 3);
  assert.equal(progress.calculatedGpa4, 4);
  curriculum.rules.policies.gpaOtherSpecializations = 'include';
  const optedIn = calculateAcademicStats(rows, { curriculum, specialization: 'software' });
  assert.equal(optedIn.earnedCredits, 3);
  assert.equal(optedIn.gpaCredits, 6);
  assert.equal(optedIn.calculatedGpa4, 2);
});

test('curriculum resolution uses cohort and never silently selects a different version', async () => {
  const definition = { program: 'Review cohort resolver', sections: [], scope: { schoolId: 'OTHER', majorCode: 'TEST', cohort: 'K30', version: 'v1' } };
  const first = await curriculumRepo.upsert(definition);
  await curriculumRepo.upsert({ ...definition, scope: { ...definition.scope, cohort: 'K31' } });
  const student = { program: definition.program, schoolId: 'OTHER', majorCode: 'TEST', trainingCourse: 'K30', curriculumVersion: 'v1' };
  assert.equal((await resolveStudentCurriculum(student))._id, first._id);
  await curriculumRepo.upsert({ ...definition, scope: { ...definition.scope, version: 'v2' } });
  assert.equal(await resolveStudentCurriculum({ ...student, curriculumVersion: '' }), null);
});

test('actual PDF-derived rows produce identical academic decisions after Mongo schema serialization', async () => {
  const rawCurriculum = JSON.parse(readFileSync(new URL('../src/data/khungK30.json', import.meta.url), 'utf8'));
  rawCurriculum._id = '507f1f77bcf86cd799439011';
  const parsed = parseVluTranscriptText(readFileSync(new URL('./fixtures/vlu-transcript.txt', import.meta.url), 'utf8'));
  const rawProfile = { mssv: 'SCHEMA_PARITY', fullName: 'Schema parity', email: 'schema-parity@example.com', specialization: 'software', courses: parsed.semesters.flatMap(semester => semester.courses), transcriptSourceTotals: parsed.sourceTotals };
  const curriculumDocument = new Curriculum(rawCurriculum);
  const profileDocument = new StudentProfile(rawProfile);
  await Promise.all([curriculumDocument.validate(), profileDocument.validate()]);
  const mongoCurriculum = curriculumDocument.toObject();
  const mongoProfile = profileDocument.toObject();
  const calculate = (profile, curriculum) => calculateAcademicStats(profile.courses, { curriculum, specialization: profile.specialization, sourceTotals: profile.transcriptSourceTotals });
  const semantic = progress => {
    const copy = { ...progress };
    for (const key of ['unmappedCourses', 'unverifiedCourses']) copy[key] = progress[key].map(course => Object.fromEntries(['code', 'credits', 'score', 'point4', 'letter', 'semester', 'reason'].filter(field => course[field] !== undefined).map(field => [field, course[field]])));
    return JSON.parse(JSON.stringify(copy));
  };
  const demo = calculate(rawProfile, rawCurriculum);
  const mongo = calculate(mongoProfile, mongoCurriculum);
  assert.deepEqual(semantic(mongo), semantic(demo));
  assert.equal(mongo.earnedCredits, 88);
  assert.equal(mongo.inProgressCredits, 19);
  assert.equal(mongo.calculatedGpa4, 3.28);
});
