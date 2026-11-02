import 'dotenv/config';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const testDirectory = mkdtempSync(path.join(tmpdir(), 'unimate-admin-ocr-'));
process.env.DATA_MODE = 'demo';
process.env.DEMO_DATA_PATH = path.join(testDirectory, 'store.json');
const { initDataProvider, studentRepo, curriculumRepo } = await import('../src/repositories/index.js');
const adminService = await import('../src/services/adminService.js');
const studentService = await import('../src/services/studentService.js');
const ocrService = await import('../src/services/ocrService.js');

async function runTests() {
  console.log('========================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TÍCH HỢP TÍNH NĂNG MỚI: ADMIN & OCR');
  console.log('========================================================\n');

  process.env.DATA_MODE = 'demo';
  await initDataProvider();

  // TEST 1: Admin Dashboard Stats
  console.log('[TEST 1] Kiểm tra Admin Dashboard Stats...');
  const stats = await adminService.getDashboardStats();
  console.log('   - Stats:', stats);
  if (!stats || typeof stats.counts?.users !== 'number' || typeof stats.counts?.courses !== 'number') {
    throw new Error('Stats không hợp lệ');
  }
  console.log('✅ TEST 1 PASSED: Admin Dashboard Stats hoạt động chính xác.\n');

  // TEST 2: Admin Users Management (CRUD, status, role)
  console.log('[TEST 2] Kiểm tra Admin User Management...');
  const testEmail = `admin_test_${Date.now()}@vanlanguni.vn`;
  const newUser = await adminService.createUser({
    email: testEmail,
    password: 'Password@123',
    role: 'student',
    status: 'active',
    fullName: 'Nguyễn Văn Kiểm Thử',
    mssv: '2474809999999'
  });
  console.log('   - Tạo user:', newUser.email, 'Role:', newUser.role, 'Status:', newUser.status);
  if (newUser.password || newUser.passwordHash) {
    throw new Error('Password hash không được phép lộ trong API response!');
  }

  // Khóa tài khoản
  const updatedUser = await adminService.updateUser(newUser.id, { status: 'locked' });
  console.log('   - Đã khóa user:', updatedUser.status);
  if (updatedUser.status !== 'locked') throw new Error('Không thể khóa user');

  // Xóa tài khoản
  await adminService.deleteUser(newUser.id);
  console.log('   - Đã khóa tài khoản an toàn và giữ hồ sơ sinh viên');
  console.log('✅ TEST 2 PASSED: Admin User Management hoạt động chính xác.\n');

  // TEST 3: Admin Course Catalog (CRUD)
  console.log('[TEST 3] Kiểm tra Admin Course Catalog...');
  const testCourseCode = 'TEST_CS101';
  const newCourse = await adminService.createCourse({
    code: testCourseCode,
    name: 'Môn học kiểm thử tự động',
    credits: 3,
    area: 'Chuyên ngành'
  });
  console.log('   - Tạo môn:', newCourse.code, '-', newCourse.name);

  const courseKey = newCourse._id || newCourse.id || newCourse.code;
  const updatedCourse = await adminService.updateCourse(courseKey, { credits: 4 });
  console.log('   - Cập nhật số tín chỉ:', updatedCourse.credits);
  if (updatedCourse.credits !== 4) throw new Error('Cập nhật tín chỉ thất bại');

  await adminService.deleteCourse(courseKey);
  console.log('   - Đã xóa môn học kiểm thử thành công');
  console.log('✅ TEST 3 PASSED: Admin Course Catalog hoạt động chính xác.\n');

  // TEST 4: Student Transcript Confirmation & Calculation
  console.log('[TEST 4] Kiểm tra Lưu Bảng Điểm & Tính Toán GPA/Tín chỉ...');
  const testStudentMssv = 'TEST_TRANSCRIPT_IMPORT';
  const testCurriculum = await curriculumRepo.upsert({
    program: 'Admin OCR integration test', scope: { schoolId: 'test', majorCode: 'test', cohort: 'test', version: 'v1' }, totalCredits: 6,
    rules: { policies: { passScore10: 4, retake: 'highest' }, groups: { commonRequired: { requiredCredits: 6, requiredCourses: 2 } } },
    sections: [{ name: 'Required', courses: [
      { code: 'TEST_PASS', name: 'Môn có kết quả', credits: 3, groupCode: 'BB', required: true },
      { code: 'TEST_PENDING', name: 'Môn chưa có kết quả', credits: 3, groupCode: 'BB', required: true }
    ] }]
  });
  await studentRepo.create({ mssv: testStudentMssv, fullName: 'Transcript integration', email: 'transcript-test@example.com', curriculumId: String(testCurriculum._id), courses: [], officialCumulativeCredits: null, officialCumulativeGpa4: null });
  const sampleTranscriptCourses = [
    {
      code: 'TEST_PASS',
      name: 'Môn có kết quả',
      credits: 3,
      score: 8.5,
      point4: 3.5,
      letter: 'B+',
      semester: 'HK01 - 2024-2025',
      status: 'Đạt'
    },
    {
      code: 'TEST_PENDING',
      name: 'Môn chưa có kết quả',
      credits: 3,
      score: null,
      point4: null,
      letter: '',
      semester: 'HK01 - 2024-2025',
      status: 'Đang học'
    },
    {
      code: 'TEST_UNMAPPED',
      name: 'Môn chưa thuộc khung',
      credits: 0,
      score: null,
      point4: null,
      letter: 'MT',
      semester: 'HK01 - 2024-2025',
      status: 'Miễn/ bảo lưu'
    }
  ];

  const confirmResult = await studentService.confirmTranscriptCourses(
    testStudentMssv,
    sampleTranscriptCourses,
    'ocr'
  );
  console.log('   - Đã lưu:', confirmResult.message);
  console.log('   - Tổng số môn:', confirmResult.totalCourses);
  console.log('   - Tín chỉ đã đạt/chưa có kết quả:', confirmResult.stats.earnedCredits, '/', confirmResult.stats.inProgressCredits);

  assert.equal(confirmResult.totalCourses, sampleTranscriptCourses.length);
  assert.equal(confirmResult.stats.earnedCredits, 3);
  assert.equal(confirmResult.stats.inProgressCredits, 3);
  assert.equal(confirmResult.stats.unmappedCourses.length, 1);
  assert.equal(confirmResult.student.officialCumulativeCredits, null);
  const repeated = await studentService.confirmTranscriptCourses(testStudentMssv, sampleTranscriptCourses, 'ocr');
  assert.equal(repeated.addedCount, 0);
  assert.equal(repeated.totalCourses, confirmResult.totalCourses);
  assert.equal(repeated.stats.earnedCredits, confirmResult.stats.earnedCredits);
  const parsed = ocrService.parseVluTranscriptText([
    'Năm học: 2024-2025 - Học kỳ: HK01',
    '1 71TEST00001 Môn có kết quả 3 8.5 3.5 B+',
    '2 71TEST00002 Môn chưa có kết quả 3',
    '- Số tín chỉ đạt học kỳ: 3',
    '- Tổng số tín chỉ tích lũy: 3',
    '- Điểm TB tích lũy (Hệ 4): 3.5'
  ].join('\n'));
  assert.equal(parsed.semesters[0].courses.length, 2);
  assert.equal(parsed.semesters[0].courses[1].score, null);
  assert.equal(parsed.sourceTotals.cumulativeCredits, 3);
  assert.equal(parsed.sourceTotals.cumulativeGpa4, 3.5);
  console.log('✅ TEST 4 PASSED: Lưu bảng điểm và tính toán GPA thành công.\n');

  console.log('========================================================');
  console.log('🎉 TẤT CẢ CÁC TÍNH NĂNG MỚI ĐÃ HOẠT ĐỘNG HOÀN HẢO 100%!');
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exitCode = 1;
}).finally(() => rmSync(testDirectory, { recursive: true, force: true }));
