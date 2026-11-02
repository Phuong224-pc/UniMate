import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// A separate store prevents tests from touching a user's persisted demo data.
const testDirectory = mkdtempSync(path.join(tmpdir(), 'unimate-specialization-'));
process.env.DATA_MODE = 'demo';
process.env.DEMO_DATA_PATH = path.join(testDirectory, 'store.json');
const { initDataProvider, studentRepo, userRepo, curriculumRepo } = await import('../src/repositories/index.js');
const { generateToken } = await import('../src/utils/tokenUtils.js');
const { normalizeTranscriptCourse, normalizeSemester } = await import('../src/services/studentService.js');
const { StudentProfile } = await import('../src/models/StudentProfile.js');
const { default: express } = await import('express');
const { default: profileRoutes } = await import('../src/routes/profile.js');
const { default: studentRoutes } = await import('../src/routes/students.js');
const { default: chatRoutes } = await import('../src/routes/chat.js');
const { errorHandler } = await import('../src/middlewares/errorMiddleware.js');
let server, base, token, adminToken;
const mssv = 'TEST_SPECIALIZATION_STUDENT';
const course = (code, metadata = {}) => ({ code, name: code, credits: 3, groupCode: 'BB', required: true, prerequisites: [], priorCourses: [], ...metadata });

before(async () => {
  await initDataProvider();
  const curriculum = await curriculumRepo.upsert({
    program: 'Specialization test', scope: { schoolId: 'test', majorCode: 'it', cohort: 'test', version: 'v1' }, totalCredits: 12,
    rules: { policies: { passScore10: 4, retake: 'highest' }, groups: {
      commonRequired: { requiredCredits: 3, requiredCourses: 1 }, specializationRequired: { requiredCredits: 3, requiredCourses: 1 },
      TC209: { requiredCredits: 3, requiredCourses: 1 }, TC309: { requiredCredits: 3, requiredCourses: 1 }
    } },
    sections: [{ name: 'Test', courses: [course('G1'), course('S1', { specialization: 'software' }), course('D1', { specialization: 'data' }), course('A1', { specialization: 'ai' }),
      course('E1', { groupCode: 'TC309', specialization: 'data', required: false }),
      course('P1'), course('T1', { priorCourses: ['P1'] }), course('Q1', { prerequisites: ['P1'] })] }]
  });
  const user = await userRepo.create({ email: 'specialization-test@example.com', mssv, role: 'student', status: 'active', passwordHash: 'not-used-by-this-test' });
  const admin = await userRepo.create({ email: 'specialization-admin@example.com', role: 'admin', status: 'active', passwordHash: 'not-used-by-this-test' });
  token = generateToken({ userId: user._id });
  adminToken = generateToken({ userId: admin._id });
  await studentRepo.create({ userId: user._id, mssv, fullName: 'Specialization test', email: user.email, curriculumId: String(curriculum._id), specialization: null,
    officialCumulativeCredits: 42, officialCumulativeGpa4: 3.5,
    courses: [{ code: 'G1', name: 'G1', credits: 3, score: 8, point4: 3.2, letter: 'B', status: 'Đạt', semester: '2024-2025 HK01' },
      { code: 'P1', name: 'P1', credits: 3, score: 2, point4: 0, letter: 'F', status: 'Không đạt', semester: '2024-2025 HK01' }] });
  const app = express();
  app.use(express.json()); app.use('/api/profile', profileRoutes); app.use('/api/students', studentRoutes); app.use('/api/chat', chatRoutes); app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  rmSync(testDirectory, { recursive: true, force: true });
});

async function request(endpoint, method = 'GET', body, auth = token) {
  const response = await fetch(`${base}/api${endpoint}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, json: await response.json() };
}

test('Mongo schema keeps missing grades null and has no default specialization', () => {
  const profile = new StudentProfile({ mssv: 'SCHEMA', email: 'schema@example.com', fullName: 'Schema', courses: [{ code: 'X1', name: 'X1', credits: 3 }] });
  assert.equal(profile.specialization, null);
  assert.equal(profile.courses[0].score, null);
  assert.equal(profile.courses[0].point4, null);
  assert.equal(profile.major, 'Công nghệ thông tin');
  assert.equal(normalizeTranscriptCourse({ code: ' X1 ', name: 'X1', credits: 3, score: '', point4: '' }).status, 'Đang học');
  assert.equal(normalizeTranscriptCourse({ code: 'X1', name: 'X1', credits: 3, score: '  ', point4: ' ' }).score, null);
  assert.throws(() => normalizeTranscriptCourse({ code: 'X1', name: 'X1', credits: ' ' }), /Thiếu số tín chỉ/);
  assert.equal(normalizeSemester('HK01 - 2024-2025'), '2024-2025 HK01');
  assert.throws(() => normalizeTranscriptCourse({ code: 'X1', name: 'X1', credits: 3, score: 'NaN' }), /không hợp lệ/);
  assert.throws(() => normalizeTranscriptCourse({ code: 'X1', name: 'X1', credits: 3, score: true }), /không hợp lệ/);
  assert.throws(() => normalizeTranscriptCourse(null), /không hợp lệ/);
  const recognition = { code: 'X1', name: 'X1', credits: 3, letter: 'MT', recognitionApproved: true };
  assert.equal(normalizeTranscriptCourse(recognition).recognitionApproved, undefined);
  assert.equal(normalizeTranscriptCourse(recognition, null, { allowRecognitionApproval: true }).recognitionApproved, true);
});

test('profile is private and no branch is assigned until explicit confirmation', async () => {
  assert.equal((await request(`/students/${mssv}`, 'GET', undefined, null)).status, 401);
  assert.equal((await request('/students/2474802010414')).status, 403);
  assert.equal((await request('/students')).status, 403);
  const profile = await request('/profile/me');
  assert.equal(profile.json.data.specialization, null);
  assert.equal((await request('/profile/me/specialization', 'PUT', { specialization: 'software' })).status, 400);
  assert.equal((await request('/profile/me', 'PUT', { specialization: 'software' })).status, 400);
  assert.equal((await request('/profile/me/specialization', 'PUT', { specialization: 'software', confirm: true })).status, 200);
});

test('direct plan API blocks other branch BB, permits a shared elective and distinguishes prior-course from prerequisite', async () => {
  const rejected = await request('/profile/me', 'PUT', { plannedCourses: ['D1'] });
  assert.equal(rejected.status, 403);
  assert.match(rejected.json.error, /Không thuộc chuyên ngành bạn đã chọn/);
  const allowed = await request('/profile/me', 'PUT', { plannedCourses: ['S1', 'E1', 'T1'] });
  assert.equal(allowed.status, 200);
  assert.deepEqual(allowed.json.data.plannedCourses, ['S1', 'E1', 'T1']);
  const unmet = await request('/profile/me', 'PUT', { plannedCourses: ['Q1'] });
  assert.equal(unmet.status, 400);
  assert.match(unmet.json.error, /tiên quyết/);
  assert.equal((await request('/profile/me', 'PUT', { completedCourses: ['D1'] })).status, 403);
});

test('specialization changes with academic data require admin and preserve transcript history', async () => {
  const before = await studentRepo.findByMssv(mssv);
  const denied = await request('/profile/me/specialization', 'PUT', { specialization: 'data', confirm: true, change: true });
  assert.equal(denied.status, 403);
  const changed = await request(`/students/${mssv}/specialization`, 'PUT', { specialization: 'data', confirm: true, change: true }, adminToken);
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.json.data.courses, before.courses);
  assert.equal(changed.json.data.specializationHistory.length, 2);
  assert.deepEqual(changed.json.data.specializationHistory[1].previousPlannedCourses, ['S1', 'E1', 'T1']);
  assert.deepEqual(changed.json.data.plannedCourses, []);
  const invalid = await request(`/students/${mssv}/specialization`, 'PUT', { specialization: 'unsupported', confirm: true, change: true }, adminToken);
  assert.equal(invalid.status, 400);
  const unchanged = await studentRepo.findByMssv(mssv);
  assert.deepEqual(unchanged.courses, before.courses);
  assert.equal(unchanged.specialization, 'data');
  assert.equal(unchanged.specializationHistory.length, 2);
});

test('transcript imports are idempotent, preserve official observations and never invent results', async () => {
  const body = { courses: [{ code: 'D1', name: 'D1', credits: 3, score: null, point4: null, semester: 'HK01 - 2025-2026' }], source: 'test_pdf' };
  const first = await request('/students/confirm-transcript', 'POST', body);
  const second = await request('/students/confirm-transcript', 'POST', body);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.json.data.addedCount, 0);
  assert.equal(second.json.data.totalCourses, first.json.data.totalCourses);
  assert.equal(second.json.data.student.officialCumulativeCredits, 42);
  assert.equal(second.json.data.student.officialCumulativeGpa4, 3.5);
  assert.equal(second.json.data.student.courses.find(course => course.code === 'D1').status, 'Đang học');
  assert.equal(second.json.data.student.academicProgress.inProgressCredits, 3);
  const record = await studentRepo.findByMssv(mssv);
  assert.equal(record.transcriptImportHistory.length, 1);
  const totals = { cumulativeCredits: 3, cumulativeGpa4: 3.2, source: { file: 'source.pdf', page: 1 } };
  const graded = await request('/students/confirm-transcript', 'POST', { ...body, courses: [{ ...body.courses[0], score: 8, point4: 3.2, letter: 'B', status: 'Đạt' }], sourceTotals: totals });
  assert.equal(graded.status, 200);
  assert.equal(graded.json.data.student.academicProgress.inProgressCredits, 0);
  assert.equal(graded.json.data.student.officialCumulativeCredits, totals.cumulativeCredits);
  assert.deepEqual(graded.json.data.student.transcriptSourceTotals, totals);
  const conflict = await request('/students/confirm-transcript', 'POST', {
    courses: [
      { ...body.courses[0], score: 8, point4: 3.2, letter: 'B', status: 'Đạt' },
      { ...body.courses[0], score: 2, point4: 0, letter: 'F', status: 'Không đạt' }
    ]
  });
  assert.equal(conflict.status, 409);
  const afterConflict = await studentRepo.findByMssv(mssv);
  assert.deepEqual(afterConflict.courses, graded.json.data.student.courses);
});

test('profile, academic endpoint and student lookup use identical progress', async () => {
  const profile = await request('/profile/me');
  const progress = await request('/profile/me/academic-progress');
  const student = await request(`/students/${mssv}`);
  assert.deepEqual(profile.json.data.academicProgress, progress.json.data);
  assert.deepEqual(student.json.data.academicProgress, progress.json.data);
  const chat = await request('/chat', 'POST', { messages: [{ role: 'user', content: 'Tín chỉ tích lũy và GPA của tôi là bao nhiêu?' }] });
  assert.equal(chat.status, 200);
  assert.equal(chat.json.model, 'academic-service');
  assert.deepEqual(chat.json.academicProgress, progress.json.data);
  const foreign = { messages: [{ role: 'user', content: 'Tín chỉ và GPA của 2474802010414?' }] };
  assert.equal((await request('/chat', 'POST', foreign)).status, 403);
  assert.equal((await request('/chat', 'POST', foreign, null)).status, 401);
});
