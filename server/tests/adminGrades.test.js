import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import * as XLSX from 'xlsx';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'unimate-admin-grades-'));
process.env.DATA_MODE = 'demo';
process.env.DEMO_DATA_PATH = path.join(directory, 'store.json');
const { initDataProvider, studentRepo, curriculumRepo } = await import('../src/repositories/index.js');
const { adminImportService } = await import('../src/services/adminImportService.js');
const { getAcademicProgress } = await import('../src/services/academicService.js');
await initDataProvider();
const curriculum = (await curriculumRepo.findMany())[0];
const mssv = 'ADMIN_GRADE_IMPORT';
await studentRepo.create({ mssv, fullName: 'Grade import', email: 'grade-import@example.com', curriculumId: curriculum._id, specialization: 'software', courses: [] });
after(() => {
  assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
  fs.rmSync(directory, { recursive: true, force: true });
});

function workbook(row) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['MSSV', 'Mã Môn Học', 'Tên Học Phần', 'Số Tín Chỉ', 'Điểm Hệ 10', 'Điểm Hệ 4', 'Điểm Chữ', 'Học Kỳ'], row
  ]), 'Grades');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

test('admin Excel grade path preserves zero credits, missing marks and official source observations', async () => {
  const buffer = workbook(['', '71ENG010000', 'Entry test', 0, '', '', '', '2026-2027 HK01']);
  const preview = await adminImportService.previewImport({ buffer, filename: 'grades.xlsx', dataType: 'grades', targetMssv: mssv });
  assert.equal(preview.rows[0].status, 'valid');
  assert.equal(preview.rows[0].data.credits, 0);
  const result = await adminImportService.confirmImport({ dataType: 'grades', rows: preview.rows, conflictMode: 'update' });
  assert.equal(result.errorCount, 0);
  const student = await studentRepo.findByMssv(mssv);
  assert.equal(student.courses[0].credits, 0);
  assert.equal(student.courses[0].score, null);
  assert.equal(student.courses[0].point4, null);
  assert.equal(student.courses[0].status, 'Đang học');
  assert.equal(student.officialCumulativeCredits, undefined);
});

test('explicit admin target must match student identifiers present in the file', async () => {
  const buffer = workbook(['OTHER_STUDENT', '71ITBS10103', 'Introduction', 3, 8, 3.2, 'B', '2024-2025 HK01']);
  const preview = await adminImportService.previewImport({ buffer, filename: 'wrong-target.xlsx', dataType: 'grades', targetMssv: mssv });
  assert.equal(preview.rows[0].status, 'invalid');
  assert.ok(preview.rows[0].errors.some(e => e.includes('MSSV đích')));
});

test('admin original PDF preview and repeated confirm use the same academic service', { skip: !process.env.SAMPLE_TRANSCRIPT_PDF }, async () => {
  const buffer = fs.readFileSync(process.env.SAMPLE_TRANSCRIPT_PDF);
  const preview = await adminImportService.previewImport({ buffer, filename: 'transcript.pdf', mimetype: 'application/pdf', dataType: 'grades', targetMssv: mssv });
  assert.equal(preview.isScanned, false);
  assert.equal(preview.rows.length, 45);
  assert.equal(preview.summary.invalid, 0);
  assert.equal(preview.sourceTotals.cumulativeCredits, 88);
  const first = await adminImportService.confirmImport({ dataType: 'grades', rows: preview.rows, conflictMode: 'update' });
  assert.equal(first.errorCount, 0);
  const before = await studentRepo.findByMssv(mssv);
  const progress = await getAcademicProgress(before);
  assert.equal(progress.earnedCredits, 88);
  assert.equal(progress.inProgressCredits, 19);
  assert.equal(progress.calculatedGpa4, 3.28);
  assert.equal(progress.sourceTotals.cumulativeGpa4, 3.28);
  assert.ok(before.courses.every(c => c.source?.fileHash));
  const again = await adminImportService.confirmImport({ dataType: 'grades', rows: preview.rows, conflictMode: 'update' });
  assert.equal(again.errorCount, 0);
  const after = await studentRepo.findByMssv(mssv);
  assert.equal(after.courses.length, before.courses.length);
  assert.equal((await getAcademicProgress(after)).earnedCredits, progress.earnedCredits);
});
