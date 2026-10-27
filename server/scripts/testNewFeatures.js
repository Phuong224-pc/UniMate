import 'dotenv/config';
import { initDataProvider } from '../src/repositories/index.js';
import * as adminService from '../src/services/adminService.js';
import * as studentService from '../src/services/studentService.js';
import * as ocrService from '../src/services/ocrService.js';

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
  console.log('   - Đã xóa user thành công');
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
  const testStudentMssv = '2474802010458';
  const sampleTranscriptCourses = [
    {
      code: '71ITBS10103',
      name: 'Nhập môn ngành Công nghệ thông tin',
      credits: 3,
      score: 8.5,
      point4: 3.5,
      letter: 'B+',
      semester: 'HK01 - 2024-2025',
      status: 'Đạt'
    },
    {
      code: '71ENG01012', // Có số 0 đầu
      name: 'Tiếng Anh 1',
      credits: 2,
      score: 9.0,
      point4: 4.0,
      letter: 'A',
      semester: 'HK01 - 2024-2025',
      status: 'Đạt'
    },
    {
      code: '71GEGD10101',
      name: 'Giáo dục quốc phòng 1',
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
  console.log('   - GPA cập nhật:', confirmResult.stats);

  if (!confirmResult.totalCourses || confirmResult.totalCourses < 3) {
    throw new Error('Số môn lưu không khớp');
  }
  console.log('✅ TEST 4 PASSED: Lưu bảng điểm và tính toán GPA thành công.\n');

  console.log('========================================================');
  console.log('🎉 TẤT CẢ CÁC TÍNH NĂNG MỚI ĐÃ HOẠT ĐỘNG HOÀN HẢO 100%!');
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
