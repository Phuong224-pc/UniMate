import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { parseCurriculumWorkbook } from '../src/utils/curriculumWorkbook.js';
import { parseExcelBuffer, autoMapColumns } from '../src/utils/excelParser.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'unimate-curriculum-test-'));
process.env.DEMO_DATA_PATH = path.join(directory, 'store.json');
process.env.DATA_MODE = 'demo';
const baseline = JSON.parse(fs.readFileSync(new URL('../src/data/demo_seed.json', import.meta.url), 'utf8'));
fs.writeFileSync(process.env.DEMO_DATA_PATH, JSON.stringify(baseline));
const { demoStorage } = await import('../src/repositories/demo/demoStorage.js');
const { curriculumRepo } = await import('../src/repositories/index.js');
const { previewCurriculumImport, confirmCurriculumImport } = await import('../src/services/curriculumImportService.js');
demoStorage.ensureInitialized();
const reset = () => { demoStorage.data = structuredClone(baseline); demoStorage.persistSync(); };
const course = code => baseline.curriculum[0].sections.flatMap(section => section.courses.map(c => ({ ...c, sectionName: section.name }))).find(c => c.code === code);

function mappedWorkbook(rows, headers = ['Chương Trình Đào Tạo', 'Khối Kiến Thức', 'Mã Môn Học', 'Tên Môn Học', 'Số Tín Chỉ', 'Môn Tiên Quyết', 'Môn Học Trước', 'Mã Nhóm']) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Mapped');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

test('Excel headers preserve blank column positions and ignore merged title rows', () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['BÁO CÁO'], [], ['Mã Môn Học', '', 'Tên Môn Học', 'Số Tín Chỉ'], ['71ITMA10403', '', 'Toán rời rạc', 4]]), 'Sparse');
  const parsed = parseExcelBuffer(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  assert.equal(parsed.rows[0]['Tên Môn Học'], 'Toán rời rạc');
  assert.equal(parsed.rows[0]['Số Tín Chỉ'], '4');
  assert.equal(autoMapColumns(['', 'Mã Môn Học'], 'courses').code, 'Mã Môn Học');
});

test('real K30 persisted source keeps 89 unique memberships, 4-credit discrete math and all separate group requirements', () => {
  const curriculum = baseline.curriculum[0];
  const courses = curriculum.sections.flatMap(section => section.courses);
  assert.equal(courses.length, 89);
  assert.equal(new Set(courses.map(c => c.code)).size, courses.length);
  assert.equal(course('71ITMA10403').credits, 4);
  assert.equal(course('71ITIS30203').groupCode, 'TC309');
  assert.equal(course('71ITIS30503').groupCode, 'TC306');
  assert.equal(course('71ITIS30503').countsTowardDegree, false);
  assert.deepEqual(course('71ITSE30103').prerequisites, []);
  assert.deepEqual(course('71ITSE30103').priorCourses, ['71ITBS10203']);
  assert.equal(curriculum.rules.groups.TC209.requiredCredits, 9);
  assert.equal(curriculum.rules.groups.TC309.requiredCredits, 9);
  assert.equal(courses.filter(c => c.conflicts.length).length, 8);
  assert.ok(course('71ITSE31003').semesterSources.some(s => s.value === '7'));
  assert.ok(course('71ITSE31003').semesterSources.some(s => s.value === '8'));
});

test('non-destructive update preserves grades, accounts, IDs, absent courses and blank/#N/A conditions; reimport is idempotent', async () => {
  reset();
  const oldCourse = course('71ITSE30103');
  const buffer = mappedWorkbook([['K30 CNTT', oldCourse.sectionName, oldCourse.code, oldCourse.name, '#N/A', '', '', 'BB']]);
  const before = await curriculumRepo.findById(baseline.curriculum[0]._id);
  const studentsBefore = structuredClone(demoStorage.data.students);
  const usersBefore = structuredClone(demoStorage.data.users);
  const preview = await previewCurriculumImport({ buffer, filename: 'fix.xlsx', curriculumId: before._id });
  assert.ok(preview.absentCourses.length > 0);
  assert.equal(preview.rows[0].data.credits, oldCourse.credits);
  assert.deepEqual(preview.rows[0].data.priorCourses, oldCourse.priorCourses);
  const result = await confirmCurriculumImport({ previewToken: preview.previewToken, selectedRowIndices: [1] });
  assert.equal(result.errorCount, 0);
  const after = await curriculumRepo.findById(before._id);
  assert.equal(after._id, before._id);
  assert.equal(after.sections.flatMap(s => s.courses).length, before.sections.flatMap(s => s.courses).length);
  assert.deepEqual(demoStorage.data.students, studentsBefore);
  assert.deepEqual(demoStorage.data.users, usersBefore);
  const second = await previewCurriculumImport({ buffer, filename: 'fix.xlsx', curriculumId: before._id });
  const repeat = await confirmCurriculumImport({ previewToken: second.previewToken, selectedRowIndices: [1] });
  assert.equal(repeat.addedCount, 0);
  assert.equal(repeat.updatedCount, 0);
  assert.deepEqual(await confirmCurriculumImport({ previewToken: second.previewToken, selectedRowIndices: [1] }), repeat);
});

test('updates are keyed by selected framework version and preserve the global course identity', async () => {
  reset();
  const first = baseline.curriculum[0];
  const second = await curriculumRepo.upsert({ ...structuredClone(first), _id: 'other_version', scope: { ...first.scope, version: 'future' } });
  const old = course('71ITMA10403');
  const buffer = mappedWorkbook([['K30 CNTT', old.sectionName, old.code, old.name, 5, '', '', 'BB']]);
  const catalogId = demoStorage.data.courses.find(c => c.code === old.code)._id;
  const preview = await previewCurriculumImport({ buffer, filename: 'version.xlsx', curriculumId: second._id });
  await confirmCurriculumImport({ previewToken: preview.previewToken, selectedRowIndices: [1] });
  assert.equal((await curriculumRepo.findById(first._id)).sections.flatMap(s => s.courses).find(c => c.code === old.code).credits, 4);
  assert.equal((await curriculumRepo.findById(second._id)).sections.flatMap(s => s.courses).find(c => c.code === old.code).credits, 5);
  assert.equal(demoStorage.data.courses.find(c => c.code === old.code)._id, catalogId);
  assert.equal(demoStorage.data.courses.find(c => c.code === old.code).credits, 4);
  assert.equal(demoStorage.data.curriculum.length, 2);
});

test('conflicting semester sources require explicit resolution and forged client course edits are ignored', async () => {
  reset();
  const wb = XLSX.utils.book_new();
  const headers = ['TT', 'Mã học phần', 'Tên học phần tiếng Việt', 'Tên học phần tiếng Anh', 'Số tín chỉ', 'LT', 'TH', 'ĐA', 'TT', 'BB/TC', 'Điều kiện tiên quyết', 'Điều kiện học trước', 'Khối kiến thức', 'Tên chuyên ngành/chuyên sâu', 'Ghi chú', 'Mã BM', 'BM phụ trách', 'Học kỳ', 'Năm thứ'];
  const row = [1, '71ITSE31003', 'Lập trình Python nâng cao', '', 3, '', '', '', '', 'TC309', 'Không', 'Không', 'Kiến thức chuyên ngành hoặc chuyên sâu', 'Tự chọn Chuyên ngành', '', '', '', 1, 3, '', 2, 3];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, row]), 'Catalog');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Mã Bộ môn', 'Tên Bộ môn'], ['200110701', 'Khoa học dữ liệu']]), 'MaBoMon');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const parsed = parseCurriculumWorkbook(buffer, { filename: 'conflict.xlsx' });
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.sheetRoles.find(s => s.sheet === 'MaBoMon').role, 'lookup');
  const preview = await previewCurriculumImport({ buffer, filename: 'conflict.xlsx', curriculumId: baseline.curriculum[0]._id });
  assert.equal(preview.rows[0].changeType, 'conflict');
  await assert.rejects(confirmCurriculumImport({ previewToken: preview.previewToken, selectedRowIndices: [1] }), /cần xác nhận/);
  await assert.rejects(confirmCurriculumImport({ previewToken: preview.previewToken, selectedRowIndices: [1], resolutions: { 1: { semesterRecommended: '99' } } }), /cần xác nhận/);
  await confirmCurriculumImport({ previewToken: preview.previewToken, rows: [{ rowIndex: 1, data: { credits: 999 } }], resolutions: { 1: { semesterRecommended: '8' } } });
  const saved = (await curriculumRepo.findById(baseline.curriculum[0]._id)).sections.flatMap(s => s.courses).find(c => c.code === '71ITSE31003');
  assert.equal(saved.credits, 3);
  assert.equal(saved.semesterRecommended, '8');
  assert.deepEqual(saved.conflicts, []);
});

test('stale preview cannot replace a newer curriculum revision; duplicate rows never create memberships', async () => {
  reset();
  const old = course('71ITMA10403');
  const row = ['K30 CNTT', old.sectionName, old.code, old.name, 5, '', '', 'BB'];
  const preview = await previewCurriculumImport({ buffer: mappedWorkbook([row, row]), filename: 'duplicate.xlsx', curriculumId: baseline.curriculum[0]._id });
  assert.equal(preview.summary.invalid, 1);
  const current = await curriculumRepo.findById(baseline.curriculum[0]._id);
  await curriculumRepo.upsert({ ...current, revision: 50 });
  await assert.rejects(confirmCurriculumImport({ previewToken: preview.previewToken, selectedRowIndices: [1] }), /Khung đã thay đổi/);
  assert.equal((await curriculumRepo.findById(current._id)).revision, 50);
});

test('partial K30 rules are completed without replacing configured policies, while another school gets no K30 defaults', async () => {
  reset();
  const target = await curriculumRepo.findById(baseline.curriculum[0]._id);
  target.rules = { groups: { TC209: { requiredCredits: 12 } }, policies: { retake: 'latest' } };
  await curriculumRepo.upsert(target);
  const old = course('71ITMA10403');
  const buffer = mappedWorkbook([['K30 CNTT', old.sectionName, old.code, old.name, 4, '', '', 'BB']]);
  const preview = await previewCurriculumImport({ buffer, filename: 'partial.xlsx', curriculumId: target._id });
  await confirmCurriculumImport({ previewToken: preview.previewToken, selectedRowIndices: [1] });
  const updated = await curriculumRepo.findById(target._id);
  assert.equal(updated.rules.groups.TC209.requiredCredits, 12);
  assert.equal(updated.rules.groups.TC209.requiredCourses, 3);
  assert.equal(updated.rules.groups.TC309.requiredCredits, 9);
  assert.equal(updated.rules.policies.retake, 'latest');
  const other = await previewCurriculumImport({ buffer: mappedWorkbook([['Other CS', 'Core', 'CS101', 'Programming', 0, '', '', 'BB']]), filename: 'other.xlsx', defaultProgram: 'Other CS' });
  await confirmCurriculumImport({ previewToken: other.previewToken, selectedRowIndices: [1] });
  const saved = await curriculumRepo.findByProgram('Other CS');
  assert.equal(saved.rules, null);
  assert.equal(saved.totalCredits, null);
  assert.equal(saved.sections[0].courses[0].credits, 0);
});

test('manual framework edit increments revision and existing identity cannot be moved to another version', async () => {
  reset();
  const current = await curriculumRepo.findById(baseline.curriculum[0]._id);
  const updated = await curriculumRepo.upsert({ _id: current._id, program: current.program, major: 'Updated major title' });
  assert.equal(updated.revision, current.revision + 1);
  await assert.rejects(curriculumRepo.upsert({ ...updated, scope: { ...updated.scope, version: 'another' } }), /khung riêng/);
});

test.after(() => {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('unimate-curriculum-test-'));
  fs.rmSync(resolved, { recursive: true, force: true });
});
