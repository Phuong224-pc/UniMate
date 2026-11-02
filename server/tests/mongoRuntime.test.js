import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'unimate-mongo-runtime-'));
process.env.DATA_MODE = 'demo';
process.env.DEMO_DATA_PATH = path.join(directory, 'store.json');
const provider = await import('../src/repositories/index.js');
const { composeAssistantPrompt, resolveChatStudent, handleChatMessage, buildAcademicReply } = await import('../src/controllers/chatController.js');
const { getAcademicProgress } = await import('../src/services/academicService.js');
await provider.initDataProvider();
after(() => {
  assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
  fs.rmSync(directory, { recursive: true, force: true });
});

async function freshProvider(mode, environment) {
  process.env.DATA_MODE = mode;
  process.env.NODE_ENV = environment;
  return import(`../src/repositories/index.js?runtime=${mode}-${environment}-${Date.now()}-${Math.random()}`);
}

test('explicit MongoDB outage never falls back to demo, including production', async () => {
  for (const environment of ['development', 'production']) {
    const isolated = await freshProvider('mongodb', environment);
    let demoInitializations = 0;
    await assert.rejects(isolated.initDataProvider({ connectDatabase: async () => false,
      storage: { ensureInitialized() { demoInitializations++; } } }), error => error.code === 'MONGODB_UNAVAILABLE');
    assert.equal(demoInitializations, 0);
    assert.equal(isolated.isDemoMode(), false);
    assert.throws(() => isolated.curriculumRepo.findMany(), /chưa khởi tạo/);
  }
});

test('production auto outage fails closed while development auto keeps its explicit demo behavior', async () => {
  const production = await freshProvider('auto', 'production');
  let starts = 0;
  const storage = { storePath: '(test double)', ensureInitialized() { starts++; } };
  await assert.rejects(production.initDataProvider({ connectDatabase: async () => false, storage }), { code: 'MONGODB_UNAVAILABLE' });
  assert.equal(starts, 0);
  const development = await freshProvider('auto', 'development');
  assert.deepEqual(await development.initDataProvider({ connectDatabase: async () => false, storage }), { mode: 'demo', isDemo: true });
  assert.equal(starts, 1);
});

test('successful Mongo selection does not initialize or copy anything into the demo store', async () => {
  const isolated = await freshProvider('mongodb', 'production');
  let starts = 0;
  const result = await isolated.initDataProvider({ connectDatabase: async () => true, storage: { ensureInitialized() { starts++; } } });
  assert.deepEqual(result, { mode: 'mongodb', isDemo: false });
  assert.equal(isolated.getDataMode(), 'mongodb');
  assert.equal(starts, 0);
});

test('assistant-specific Mongo prompt is retained when the frontend supplies a context snapshot', () => {
  const prompt = 'Cố vấn nghề nghiệp: đánh giá kỹ năng và đề xuất lộ trình nghề nghiệp riêng.';
  const context = '{"earnedCredits":12}';
  const composed = composeAssistantPrompt(prompt, context);
  assert.ok(composed.startsWith(prompt));
  assert.ok(composed.includes(context));
  assert.ok(composed.includes('không thay thế kết quả học vụ'));
  assert.equal(composeAssistantPrompt(prompt, ''), prompt);
});

test('chat finds an authenticated profile through userId/email when the user has no MSSV field', async () => {
  process.env.DATA_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  const userId = 'runtime-linked-user';
  const profile = await provider.studentRepo.create({ userId, mssv: '9912345678901', fullName: 'Runtime links', email: 'runtime-links@example.com',
    program: 'K30 CNTT', trainingCourse: 'K30', specialization: 'software', courses: [] });
  assert.equal((await resolveChatStudent({ _id: userId }, null))._id, profile._id);
  assert.equal((await resolveChatStudent({ email: profile.email }, null))._id, profile._id);
  const expected = await getAcademicProgress(profile);
  for (const content of ['GPA của tôi', `GPA ${profile.mssv}`]) {
    let result;
    const res = { status() { return this; }, json(value) { result = value; return this; } };
    await handleChatMessage({ user: { _id: userId, email: profile.email, role: 'student' }, body: { messages: [{ role: 'user', content }] } }, res);
    assert.equal(result.model, 'academic-service');
    assert.deepEqual(result.academicProgress, expected);
  }
});

test('academic chat does not describe inactive K30 requirements for a different program', () => {
  const progress = { earnedCredits: 3, totalCredits: 3, remainingCredits: 0, inProgressCredits: 0, calculatedGpa4: 3,
    sourceTotals: {}, groups: { commonRequired: { active: true, requiredCourses: 1, passedCoursesCount: 1, requiredCredits: 3, earnedCredits: 3, complete: true },
      TC209: { active: false }, TC309: { active: false }, TC002: { active: false }, TC102: { active: false }, defense: { active: false } },
    discrepancies: [], unmappedCourses: [], warnings: [], graduation: { message: 'Chưa đủ dữ liệu để kiểm tra' } };
  const reply = buildAcademicReply(progress);
  assert.ok(!reply.includes('TC209'));
  assert.ok(!reply.includes('TC309'));
  assert.ok(!reply.includes('Thể chất'));
});
