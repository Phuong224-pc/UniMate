import 'dotenv/config';
import { initDataProvider, userRepo, studentRepo, scheduleRepo, curriculumRepo, courseRepo, promptRepo, resetDemoStore } from '../src/repositories/index.js';
import * as authService from '../src/services/authService.js';
import * as studentService from '../src/services/studentService.js';
import * as scheduleService from '../src/services/scheduleService.js';
import * as curriculumService from '../src/services/curriculumService.js';
import * as adminService from '../src/services/adminService.js';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TÍCH HỢP HỆ THỐNG DATA PROVIDER & SECURITY');
  console.log('======================================================\n');

  // 1. Force DEMO mode for test
  process.env.DATA_MODE = 'demo';
  const provider = await initDataProvider();
  resetDemoStore(); // Khôi phục kho demo sạch trước khi bắt đầu
  console.log(`[TEST 1] Khởi tạo Data Provider: Mode = ${provider.mode}, isDemo = ${provider.isDemo}`);
  if (provider.mode !== 'demo' || !provider.isDemo) {
    throw new Error('TEST 1 FAILED: Expected demo mode');
  }
  console.log('✅ TEST 1 PASSED: Data Provider khởi tạo chế độ Demo thành công.\n');

  // 2. Test Login Demo Accounts
  console.log('[TEST 2] Kiểm thử đăng nhập các tài khoản Demo có sẵn...');
  
  // 2a. Admin Login
  const adminLogin = await authService.loginUser({
    identifier: 'admin@vanlanguni.vn',
    password: 'Admin@2025!'
  });
  console.log(`   - Admin login OK: role = ${adminLogin.user.role}, token = ${adminLogin.token.substring(0, 15)}...`);
  if (adminLogin.user.role !== 'admin' || !adminLogin.token) {
    throw new Error('TEST 2a FAILED: Admin login failed');
  }

  // 2b. Student Login
  const studentLogin = await authService.loginUser({
    identifier: '2474802010458',
    password: 'Vlu@2025!'
  });
  console.log(`   - Student login OK: mssv = ${studentLogin.user.mssv}, fullName = ${studentLogin.profile?.fullName}`);
  if (studentLogin.user.mssv !== '2474802010458' || !studentLogin.token) {
    throw new Error('TEST 2b FAILED: Student login failed');
  }

  // 2c. Lecturer Login
  const lecturerLogin = await authService.loginUser({
    identifier: 'gv.hoangnam@vanlanguni.vn',
    password: 'Gv@2025!'
  });
  console.log(`   - Lecturer login OK: role = ${lecturerLogin.user.role}, fullName = ${lecturerLogin.profile?.fullName}`);
  if (lecturerLogin.user.role !== 'lecturer') {
    throw new Error('TEST 2c FAILED: Lecturer login failed');
  }
  console.log('✅ TEST 2 PASSED: Đăng nhập các tài khoản mẫu thành công.\n');

  // 3. Test Student Registration in Demo Mode
  console.log('[TEST 3] Kiểm thử đăng ký sinh viên mới trong Demo mode...');
  const testEmail = `test.student.${Date.now()}@vanlanguni.vn`;
  const regResult = await authService.registerStudent({
    fullName: 'Sinh Viên Kiểm Thử Mới',
    email: testEmail,
    password: 'Password@2025!',
    mssv: '2474999999999'
  });
  console.log(`   - Tạo thành công sinh viên: ${regResult.user.email}, mssv = ${regResult.user.mssv}`);
  const foundStudent = await studentService.getStudentByMssv('2474999999999');
  if (!foundStudent || foundStudent.fullName !== 'Sinh Viên Kiểm Thử Mới') {
    throw new Error('TEST 3 FAILED: New registered student not found');
  }
  console.log('✅ TEST 3 PASSED: Đăng ký sinh viên mới lưu thành công vào demo store.\n');

  // 4. Test Student Updating Own Profile
  console.log('[TEST 4] Kiểm thử cập nhật thông tin cá nhân sinh viên...');
  const updatedStudent = await studentService.updateStudentProfile('2474999999999', {
    phone: '0988 777 666',
    address: 'Quận 1, TP.HCM',
    completedCourses: ['71ITBS10103', '71ITBS10203']
  }, false); // isUserAdmin = false
  if (updatedStudent.phone !== '0988 777 666' || !updatedStudent.completedCourses.includes('71ITBS10103')) {
    throw new Error('TEST 4 FAILED: Student update did not persist');
  }
  console.log('✅ TEST 4 PASSED: Cập nhật thông tin sinh viên thành công.\n');

  // 5. Test Schedule Query & Creation
  console.log('[TEST 5] Kiểm thử truy vấn & thêm lịch học mới...');
  const studentSchedule = await scheduleService.getScheduleForStudent({
    mssv: '2474802010458',
    semester: '2025-2026 HK01'
  });
  console.log(`   - Lịch học sinh viên 2474802010458: tìm thấy ${studentSchedule.length} tiết`);
  if (studentSchedule.length === 0) {
    throw new Error('TEST 5 FAILED: Expected schedules for student 2474802010458');
  }

  const newScheduleItem = await scheduleService.createScheduleItem({
    semester: '2025-2026 HK02',
    academicYear: '2025-2026',
    courseCode: '71ITPR99999',
    courseName: 'Thực tập tốt nghiệp',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Hoàng Trọng Nam',
    dayOfWeek: 4,
    startPeriod: 1,
    endPeriod: 3,
    startTime: '07:30',
    endTime: '10:00',
    room: 'Lab B.03.01',
    mssvList: ['2474802010458']
  });
  console.log(`   - Tạo mới lịch học ID: ${newScheduleItem._id}, môn: ${newScheduleItem.courseName}`);
  
  // Cleanup test schedule
  await scheduleService.deleteScheduleItem(newScheduleItem._id);
  console.log('✅ TEST 5 PASSED: Thời khóa biểu hoạt động chính xác.\n');

  // 6. Test Curriculum & Courses
  console.log('[TEST 6] Kiểm thử Chương trình đào tạo & danh mục môn học...');
  const curriculum = await curriculumService.getCurriculum('K30 CNTT');
  console.log(`   - Khung CTĐT: ${curriculum.program}, số nhóm: ${curriculum.sections?.length}, tổng tín chỉ: ${curriculum.totalCredits}`);
  if (!curriculum.sections || curriculum.sections.length === 0) {
    throw new Error('TEST 6 FAILED: Curriculum has no sections');
  }

  const coursesSearch = await curriculumService.searchCourses('lập trình');
  console.log(`   - Tìm kiếm 'lập trình': tìm thấy ${coursesSearch.length} môn học`);
  if (coursesSearch.length === 0) {
    throw new Error('TEST 6 FAILED: Course search failed');
  }
  console.log('✅ TEST 6 PASSED: Khung chương trình và tìm kiếm môn học hoạt động tốt.\n');

  // 7. Test System Prompts
  console.log('[TEST 7] Kiểm thử System Prompts...');
  const prompts = await adminService.getPrompts();
  console.log(`   - Danh sách prompt keys:`, Object.keys(prompts));
  if (!prompts.default || !prompts.advisor) {
    throw new Error('TEST 7 FAILED: Missing default or advisor prompt');
  }
  console.log('✅ TEST 7 PASSED: System Prompts đầy đủ.\n');

  // 8. Test Clean Up Test Student & Reset Demo Store
  console.log('[TEST 8] Kiểm thử dọn dẹp & Reset kho Demo về trạng thái ban đầu...');
  await studentService.deleteStudent('2474999999999', { forceHardDelete: true });
  resetDemoStore();
  const resetStudentCount = await studentRepo.count();
  console.log(`   - Số sinh viên sau khi reset: ${resetStudentCount}`);
  if (resetStudentCount !== 7) {
    throw new Error(`TEST 8 FAILED: Expected 7 students in demo seed, got ${resetStudentCount}`);
  }
  console.log('✅ TEST 8 PASSED: Reset kho demo thành công.\n');

  console.log('======================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ 100%!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ BÀI KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
